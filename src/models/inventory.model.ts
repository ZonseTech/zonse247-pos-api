/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 as uuidv4 } from 'uuid';
import { CartItem } from 'order';
import { AuthenticatedUser } from 'auth';
import { InventoryItem } from 'inventory-item';
import prisma from '../databases/prisma/client';
import { ProductService } from '../services/product.service';
import { StockMovementService } from '../services/stock-movement.service';
import {
    DbErrorHandler,
    ValidationError,
    ConflictError,
    NotFoundError,
    BusinessLogicError,
    ProductErrors,
    InventoryErrors,
} from '../utils/db-error-handler.util';

/**
 * Inventory Model - Now works with ProductVariant + Inventory tables
 * 
 * GOLDEN RULE: Never update inventory quantities directly.
 * Always record a stock movement and derive current inventory from movements.
 * Use StockMovementService for all quantity changes.
 * 
 * In the new schema:
 * - Product is the parent/master product (e.g., "Nivea Lotion")
 * - ProductVariant is the sellable unit (e.g., "Nivea 50ml", "Nivea 200ml")
 * - Inventory tracks stock for a ProductVariant (1:1 relationship)
 * 
 * This model queries ProductVariant to provide the flattened InventoryItem interface
 * for backward compatibility with the POS terminal and other endpoints.
 * 
 * DEPRECATED METHODS (use StockMovementService instead):
 * - updateQuantity() - use StockMovementService.recordAdjustment()
 * - incrementInventory() - use StockMovementService.recordPurchaseReceipt() or recordReturn()
 * - decrementInventory() - use StockMovementService.recordSale()
 */
export class InventoryModel {

    /**
     * Find inventory item by variant ID or product ID
     * First tries to find a variant, then falls back to finding a product with its variants
     */
    static async findById(id: string, auth: AuthenticatedUser): Promise<InventoryItem | any | null> {
        // First try to find as a variant
        const variantResult = await prisma.productVariant.findFirst({
            where: {
                id: id,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true,
                barcodes: {
                    where: { isActive: true }
                }
            }
        });

        if (variantResult) {
            return this.mapToInventoryItem(variantResult);
        }

        // If not found as variant, try to find as a product
        const productResult = await prisma.product.findFirst({
            where: {
                id: id,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            },
            include: {
                category: true,
                variants: {
                    where: { isActive: true },
                    orderBy: [{ isDefault: 'desc' }, { variantName: 'asc' }],
                    include: {
                        inventories: true,
                        barcodes: { where: { isActive: true } }
                    }
                }
            }
        });

        if (productResult) {
            return this.mapToProductWithVariants(productResult);
        }

        return null;
    }

    /**
     * Find inventory item by UUID (alias for findById)
     */
    static async findByUuid(uuid: string): Promise<InventoryItem | null> {
        const result = await prisma.productVariant.findUnique({
            where: { id: uuid },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true,
                barcodes: {
                    where: { isActive: true }
                }
            }
        });

        return this.mapToInventoryItem(result);
    }

    /**
     * Find active inventory items (returns all active variants)
     */
    static async findActive(auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const results = await prisma.productVariant.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true,
                product: { isActive: true }
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true,
                barcodes: {
                    where: { isActive: true }
                }
            }
        });

        return results.map(r => this.mapToInventoryItem(r)).filter((item): item is InventoryItem => item !== null);
    }

    /**
     * Find active inventory items with pagination and filters
     */
    static async findActiveWithPagination(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<InventoryItem[]> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        // Filter logic
        if (filter === 'all') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'low-stock') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            // We'll filter this in post-processing since we need to compare inventory fields
        } else if (filter === 'expiring-soon') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expirationDate = {
                gte: now,
                lte: thirtyDaysFromNow
            };
        } else if (filter === 'expired') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            const now = new Date();
            whereClause.expirationDate = {
                lt: now
            };
        }

        // Date range
        if (startDate || endDate) {
            whereClause.createdAt = whereClause.createdAt || {};
            if (startDate) {
                whereClause.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = endDateTime;
            }
        }

        // Category filter - categories are on Product
        if (categoryId) {
            whereClause.product = {
                ...(whereClause.product || {}),
                categoryId
            };
        }

        // Search across variant and product fields
        if (search) {
            whereClause.OR = [
                { product: { name: { contains: search } } },
                { variantName: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    barcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        const results = await prisma.productVariant.findMany({
            where: whereClause,
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true,
                barcodes: {
                    where: { isActive: true }
                }
            },
            skip,
            take: limit,
            orderBy: [
                { product: { name: 'asc' } },
                { isDefault: 'desc' },
                { variantName: 'asc' }
            ]
        });

        let items = results.map(r => this.mapToInventoryItem(r)).filter((item): item is InventoryItem => item !== null);

        // Post-process for low-stock filter
        if (filter === 'low-stock') {
            items = items.filter(item => {
                if (!item.reorderPoint) return false;
                return item.availableQuantity <= item.reorderPoint;
            });
        }

        return items;
    }

    /**
     * Get filtered count
     */
    static async getFilteredCount(
        auth: AuthenticatedUser,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<number> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (filter === 'all' || filter === 'low-stock') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'expiring-soon') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expirationDate = {
                gte: now,
                lte: thirtyDaysFromNow
            };
        } else if (filter === 'expired') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            const now = new Date();
            whereClause.expirationDate = {
                lt: now
            };
        }

        if (startDate || endDate) {
            whereClause.createdAt = whereClause.createdAt || {};
            if (startDate) {
                whereClause.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = endDateTime;
            }
        }

        // Category filter
        if (categoryId) {
            whereClause.product = {
                ...(whereClause.product || {}),
                categoryId
            };
        }

        if (search) {
            whereClause.OR = [
                { product: { name: { contains: search } } },
                { variantName: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    barcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        // For low-stock, we need to get all and filter
        if (filter === 'low-stock') {
            const results = await prisma.productVariant.findMany({
                where: whereClause,
                include: {
                    inventories: true
                }
            });

            return results.filter(r => {
                const inventory = r.inventories?.[0];
                if (!inventory || !inventory.reorderPoint) return false;
                return inventory.availableQuantity <= inventory.reorderPoint;
            }).length;
        }

        return await prisma.productVariant.count({
            where: whereClause
        });
    }

    /**
     * Find by SKU or barcode
     */
    static async findBySku(sku: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        // First try exact match on variant SKU
        let result = await prisma.productVariant.findFirst({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                sku: sku,
                isActive: true,
                product: { isActive: true }
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true,
                barcodes: {
                    where: { isActive: true }
                }
            }
        });

        if (result) return this.mapToInventoryItem(result);

        // Try primary barcode
        result = await prisma.productVariant.findFirst({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                primaryBarcode: sku,
                isActive: true,
                product: { isActive: true }
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true,
                barcodes: {
                    where: { isActive: true }
                }
            }
        });

        if (result) return this.mapToInventoryItem(result);

        // Try alternative barcodes
        const barcodeResult = await prisma.variantBarcode.findFirst({
            where: {
                barcode: sku,
                isActive: true,
                variant: {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    isActive: true,
                    product: { isActive: true }
                }
            },
            include: {
                variant: {
                    include: {
                        product: {
                            include: {
                                category: true
                            }
                        },
                        inventories: true,
                        barcodes: {
                            where: { isActive: true }
                        }
                    }
                }
            }
        });

        if (barcodeResult) {
            return this.mapToInventoryItem(barcodeResult.variant);
        }

        return null;
    }

    /**
     * Create new product with variant(s) and inventory
     * Supports both single variant (flat) and multi-variant (variants array) formats
     * Validates input and handles database errors gracefully
     */
    static async create(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        try {
            if (!inventoryData.name || inventoryData.name.trim().length === 0) {
                throw new ValidationError('Product name is required and cannot be empty.', {}, 'name');
            }

            if (inventoryData.categoryId) {
                const categoryExists = await prisma.category.findFirst({
                    where: {
                        categoryId: inventoryData.categoryId,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                    },
                });
                if (!categoryExists) {
                    throw new ValidationError(
                        `Category with ID "${inventoryData.categoryId}" was not found.`,
                        {},
                        'categoryId'
                    );
                }
            }

            const variants = inventoryData.variants && Array.isArray(inventoryData.variants)
                ? inventoryData.variants
                : [inventoryData];

            if (variants.length === 0) {
                throw new ValidationError(
                    'At least one product variant is required.',
                    {},
                    'variants'
                );
            }

            for (let i = 0; i < variants.length; i++) {
                const variant = variants[i];
                const variantLabel = variants.length > 1 ? ` (Variant ${i + 1})` : '';
                const variantField = variants.length > 1 ? `variants[${i}]` : 'variant';

                const sellPrice = parseFloat(variant.sellPrice || variant.sellingPrice || 0);
                if (sellPrice < 0) {
                    throw new ValidationError(
                        `Selling price${variantLabel} cannot be negative. Received: ${sellPrice}`,
                        {},
                        `${variantField}.sellPrice`
                    );
                }

                const quantity = parseInt(variant.quantity || 0);
                if (quantity < 0) {
                    throw new ValidationError(
                        `Quantity${variantLabel} cannot be negative. Received: ${quantity}`,
                        {},
                        `${variantField}.quantity`
                    );
                }

                const minStock = variant.minStock ? parseInt(variant.minStock) : null;
                const maxStock = variant.maxStock ? parseInt(variant.maxStock) : null;
                if (minStock !== null && maxStock !== null && minStock > maxStock) {
                    throw new ValidationError(
                        `Minimum stock${variantLabel} (${minStock}) cannot exceed maximum stock (${maxStock}).`,
                        {},
                        `${variantField}.minStock`
                    );
                }

                const primaryBarcode = variant.primaryBarcode || variant.barcode;
                const additionalBarcodes = variant.additionalBarcodes?.map((bc: any) => ({
                    barcode: typeof bc === 'string' ? bc : bc.code || bc.barcode
                }));

                await ProductService.validateBarcodesForDuplicates(
                    primaryBarcode,
                    additionalBarcodes,
                    auth.tenantId,
                    auth.branchId
                );
            }

            const productId = uuidv4();

            await prisma.$transaction(async (tx) => {
                const firstVariant = variants[0];

                await tx.product.create({
                    data: {
                        id: productId,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        name: inventoryData.name.trim(),
                        categoryId: inventoryData.categoryId || null,
                        description: firstVariant.description || inventoryData.description || null,
                        brand: firstVariant.brand || inventoryData.brand || null,
                        isTaxable: firstVariant.isTaxable !== false,
                        supplierName: firstVariant.supplierName || inventoryData.supplierName || null,
                        supplierCode: firstVariant.supplierCode || inventoryData.supplierCode || null,
                        defaultUnit: inventoryData.unit || firstVariant.unit || 'piece',
                        isActive: firstVariant.status !== 'inactive'
                    }
                });

                for (let i = 0; i < variants.length; i++) {
                    const variant = variants[i];
                    const variantId = variant.id || uuidv4();

                    const sellPrice = parseFloat(variant.sellPrice || variant.sellingPrice || 0);
                    const quantity = parseInt(variant.quantity || 0);
                    const minStock = variant.minStock ? parseInt(variant.minStock) : null;
                    const maxStock = variant.maxStock ? parseInt(variant.maxStock) : null;
                    const primaryBarcode = variant.primaryBarcode || variant.barcode || null;
                    const sku = variant.sku || variant.barcode || null;

                    await tx.productVariant.create({
                        data: {
                            id: variantId,
                            productId: productId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId,
                            sku: sku,
                            variantName: variant.variantName || inventoryData.name.trim(),
                            primaryBarcode: primaryBarcode,
                            sellingPrice: sellPrice,
                            costPrice: parseFloat(variant.costPrice || 0),
                            unit: variant.unit || inventoryData.unit || 'piece',
                            description: variant.description || null,
                            brand: variant.brand || null,
                            size: variant.size || null,
                            weight: variant.weight ? parseFloat(variant.weight) : null,
                            dimensions: variant.dimensions || null,
                            promoPrice: variant.promoPrice ? parseFloat(variant.promoPrice) : null,
                            promoStart: variant.promoStart ? new Date(variant.promoStart) : null,
                            promoEnd: variant.promoEnd ? new Date(variant.promoEnd) : null,
                            isTaxable: variant.isTaxable !== false,
                            expirationDate: variant.expirationDate ? new Date(variant.expirationDate) : null,
                            manufactureDate: variant.manufactureDate ? new Date(variant.manufactureDate) : null,
                            supplierName: variant.supplierName || null,
                            supplierCode: variant.supplierCode || null,
                            isDefault: i === 0 || variant.isDefault === true,
                            isActive: variant.status !== 'inactive'
                        }
                    });

                    // GOLDEN RULE: Create inventory with 0 quantity, then record movement
                    const inventoryId = uuidv4();
                    const costPrice = parseFloat(variant.costPrice || 0);

                    await tx.inventory.create({
                        data: {
                            id: inventoryId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId,
                            productId: productId,
                            variantId: variantId,
                            availableQuantity: 0, // Start at 0, stock movement will set the quantity
                            reservedQuantity: parseInt(variant.reservedQuantity || 0),
                            damagedQuantity: 0,
                            averageCost: costPrice,
                            lastPurchaseCost: costPrice,
                            reorderPoint: minStock,
                            maxStock: maxStock,
                            trackInventory: variant.trackInventory !== false,
                            allowNegativeStock: variant.allowNegativeStock || false
                        }
                    });

                    // Record initial stock movement if quantity > 0
                    if (quantity > 0) {
                        await StockMovementService.recordInitialStock(
                            {
                                tenantId: auth.tenantId,
                                branchId: auth.branchId,
                                inventoryId: inventoryId,
                                quantity: quantity,
                                unitCost: costPrice,
                                notes: 'Initial stock on product creation',
                                movedBy: auth.userId,
                            },
                            tx
                        );
                    }

                    if (variant.additionalBarcodes && Array.isArray(variant.additionalBarcodes)) {
                        for (const barcode of variant.additionalBarcodes) {
                            const barcodeValue = typeof barcode === 'string' ? barcode : barcode.code || barcode.barcode;
                            if (barcodeValue) {
                                await tx.variantBarcode.create({
                                    data: {
                                        id: uuidv4(),
                                        variantId: variantId,
                                        barcode: barcodeValue,
                                        barcodeType: barcode.type || 'EAN13',
                                        barcodeSource: barcode.source || 'STORE',
                                        isActive: true
                                    }
                                });
                            }
                        }
                    }
                }
            });
        } catch (error) {
            if (error instanceof ValidationError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof BusinessLogicError) {
                throw error;
            }

            console.log(error)

            throw DbErrorHandler.handlePrismaError(error);
        }
    }

    /**
     * Update variant and inventory
     * Note: productId parameter is actually variantId in the new schema
     */
    static async update(variantId: string, updateData: Record<string, any>): Promise<number> {
        await prisma.$transaction(async (tx) => {
            const variantUpdate: any = {};

            if (updateData.description !== undefined) variantUpdate.description = updateData.description || null;
            if (updateData.unit !== undefined) variantUpdate.unit = updateData.unit;
            if (updateData.sellPrice !== undefined || updateData.sellingPrice !== undefined) {
                variantUpdate.sellingPrice = parseFloat(updateData.sellPrice || updateData.sellingPrice);
            }
            if (updateData.barcode !== undefined || updateData.primaryBarcode !== undefined) {
                variantUpdate.primaryBarcode = updateData.barcode || updateData.primaryBarcode;
            }
            if (updateData.status !== undefined) {
                variantUpdate.isActive = updateData.status !== 'inactive';
            }
            if (updateData.brand !== undefined) variantUpdate.brand = updateData.brand || null;
            if (updateData.size !== undefined) variantUpdate.size = updateData.size || null;
            if (updateData.dimensions !== undefined) variantUpdate.dimensions = updateData.dimensions || null;
            if (updateData.weight !== undefined) variantUpdate.weight = updateData.weight ? parseFloat(updateData.weight) : null;
            if (updateData.promoPrice !== undefined) variantUpdate.promoPrice = updateData.promoPrice ? parseFloat(updateData.promoPrice) : null;
            if (updateData.promoStart !== undefined) variantUpdate.promoStart = updateData.promoStart ? new Date(updateData.promoStart) : null;
            if (updateData.promoEnd !== undefined) variantUpdate.promoEnd = updateData.promoEnd ? new Date(updateData.promoEnd) : null;
            if (updateData.isTaxable !== undefined) variantUpdate.isTaxable = updateData.isTaxable;
            if (updateData.expirationDate !== undefined) variantUpdate.expirationDate = updateData.expirationDate ? new Date(updateData.expirationDate) : null;
            if (updateData.manufactureDate !== undefined) variantUpdate.manufactureDate = updateData.manufactureDate ? new Date(updateData.manufactureDate) : null;
            if (updateData.supplierName !== undefined) variantUpdate.supplierName = updateData.supplierName || null;
            if (updateData.supplierCode !== undefined) variantUpdate.supplierCode = updateData.supplierCode || null;

            if (Object.keys(variantUpdate).length > 0) {
                await tx.productVariant.update({
                    where: { id: variantId },
                    data: variantUpdate
                });
            }

            const productUpdate: any = {};
            if (updateData.name !== undefined) productUpdate.name = updateData.name;
            if (updateData.categoryId !== undefined) productUpdate.categoryId = updateData.categoryId || null;

            if (Object.keys(productUpdate).length > 0) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: variantId },
                    select: { productId: true }
                });
                if (variant) {
                    await tx.product.update({
                        where: { id: variant.productId },
                        data: productUpdate
                    });
                }
            }

            const inventoryUpdate: any = {};
            if (updateData.quantity !== undefined) {
                inventoryUpdate.availableQuantity = parseInt(updateData.quantity);
            }
            if (updateData.reservedQuantity !== undefined) {
                inventoryUpdate.reservedQuantity = parseInt(updateData.reservedQuantity);
            }
            if (updateData.costPrice !== undefined) {
                inventoryUpdate.averageCost = parseFloat(updateData.costPrice);
                inventoryUpdate.lastPurchaseCost = parseFloat(updateData.costPrice);
            }
            if (updateData.minStock !== undefined) {
                inventoryUpdate.reorderPoint = updateData.minStock ? parseInt(updateData.minStock) : null;
            }
            if (updateData.reorderLevel !== undefined) {
                inventoryUpdate.reorderPoint = updateData.reorderLevel ? parseInt(updateData.reorderLevel) : null;
            }
            if (updateData.maxStock !== undefined) {
                inventoryUpdate.maxStock = updateData.maxStock ? parseInt(updateData.maxStock) : null;
            }
            if (updateData.trackInventory !== undefined) {
                inventoryUpdate.trackInventory = updateData.trackInventory;
            }
            if (updateData.allowNegativeStock !== undefined) {
                inventoryUpdate.allowNegativeStock = updateData.allowNegativeStock;
            }

            if (Object.keys(inventoryUpdate).length > 0) {
                // Always increment version on any inventory update
                inventoryUpdate.version = { increment: 1 };
                await tx.inventory.updateMany({
                    where: { variantId },
                    data: inventoryUpdate
                });
            }
        });

        return 1;
    }

    /**
     * Update a product with all its variants
     * Handles the case where a product ID is passed with nested variants array
     */
    static async updateProductWithVariants(productId: string, updateData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        await prisma.$transaction(async (tx) => {
            const productUpdate: any = {};

            if (updateData.name !== undefined) productUpdate.name = updateData.name;
            if (updateData.categoryId !== undefined) productUpdate.categoryId = updateData.categoryId || null;
            if (updateData.description !== undefined) productUpdate.description = updateData.description || null;
            if (updateData.brand !== undefined) productUpdate.brand = updateData.brand || null;
            if (updateData.isTaxable !== undefined) productUpdate.isTaxable = updateData.isTaxable;
            if (updateData.supplierName !== undefined) productUpdate.supplierName = updateData.supplierName || null;
            if (updateData.supplierCode !== undefined) productUpdate.supplierCode = updateData.supplierCode || null;
            if (updateData.defaultUnit !== undefined || updateData.unit !== undefined) {
                productUpdate.defaultUnit = updateData.defaultUnit || updateData.unit;
            }
            if (updateData.imageUrl !== undefined) productUpdate.imageUrl = updateData.imageUrl || null;
            if (updateData.isActive !== undefined) productUpdate.isActive = updateData.isActive;

            if (Object.keys(productUpdate).length > 0) {
                await tx.product.update({
                    where: { id: productId },
                    data: productUpdate
                });
            }

            if (updateData.variants && Array.isArray(updateData.variants)) {
                for (const variantData of updateData.variants) {
                    if (variantData.id) {
                        const variantUpdate: any = {};

                        if (variantData.variantName !== undefined) variantUpdate.variantName = variantData.variantName;
                        if (variantData.sku !== undefined) variantUpdate.sku = variantData.sku || null;
                        if (variantData.primaryBarcode !== undefined || variantData.barcode !== undefined) {
                            variantUpdate.primaryBarcode = variantData.primaryBarcode || variantData.barcode || null;
                        }

                        if (variantData.sellingPrice !== undefined || variantData.sellPrice !== undefined) {
                            variantUpdate.sellingPrice = parseFloat(variantData.sellingPrice ?? variantData.sellPrice);
                        }
                        if (variantData.costPrice !== undefined) {
                            variantUpdate.costPrice = parseFloat(variantData.costPrice);
                        }

                        if (variantData.unit !== undefined) variantUpdate.unit = variantData.unit;

                        if (variantData.description !== undefined) variantUpdate.description = variantData.description || null;
                        if (variantData.brand !== undefined) variantUpdate.brand = variantData.brand || null;
                        if (variantData.imageUrl !== undefined) variantUpdate.imageUrl = variantData.imageUrl || null;
                        if (variantData.isTaxable !== undefined) variantUpdate.isTaxable = variantData.isTaxable;
                        if (variantData.supplierName !== undefined) variantUpdate.supplierName = variantData.supplierName || null;
                        if (variantData.supplierCode !== undefined) variantUpdate.supplierCode = variantData.supplierCode || null;

                        if (variantData.size !== undefined) variantUpdate.size = variantData.size || null;
                        if (variantData.weight !== undefined) variantUpdate.weight = variantData.weight ? parseFloat(variantData.weight) : null;
                        if (variantData.weightUnit !== undefined) variantUpdate.weightUnit = variantData.weightUnit || null;
                        if (variantData.volume !== undefined) variantUpdate.volume = variantData.volume ? parseFloat(variantData.volume) : null;
                        if (variantData.volumeUnit !== undefined) variantUpdate.volumeUnit = variantData.volumeUnit || null;
                        if (variantData.dimensions !== undefined) variantUpdate.dimensions = variantData.dimensions || null;
                        if (variantData.color !== undefined) variantUpdate.customAttributes = JSON.stringify({ color: variantData.color });

                        if (variantData.promoPrice !== undefined) variantUpdate.promoPrice = variantData.promoPrice ? parseFloat(variantData.promoPrice) : null;
                        if (variantData.promoStart !== undefined) variantUpdate.promoStart = variantData.promoStart && variantData.promoStart !== '' ? new Date(variantData.promoStart) : null;
                        if (variantData.promoEnd !== undefined) variantUpdate.promoEnd = variantData.promoEnd && variantData.promoEnd !== '' ? new Date(variantData.promoEnd) : null;

                        if (variantData.expirationDate !== undefined) variantUpdate.expirationDate = variantData.expirationDate && variantData.expirationDate !== '' ? new Date(variantData.expirationDate) : null;
                        if (variantData.manufactureDate !== undefined) variantUpdate.manufactureDate = variantData.manufactureDate && variantData.manufactureDate !== '' ? new Date(variantData.manufactureDate) : null;
                        if (variantData.expiryDateAlert !== undefined) variantUpdate.expiryDateAlert = variantData.expiryDateAlert && variantData.expiryDateAlert !== '' ? parseInt(variantData.expiryDateAlert) : null;

                        if (variantData.isDefault !== undefined) variantUpdate.isDefault = variantData.isDefault;
                        if (variantData.isActive !== undefined) variantUpdate.isActive = variantData.isActive;
                        if (variantData.status !== undefined) variantUpdate.isActive = variantData.status === 'active';

                        if (Object.keys(variantUpdate).length > 0) {
                            await tx.productVariant.update({
                                where: { id: variantData.id },
                                data: variantUpdate
                            });
                        }

                        const inventoryUpdate: any = {};
                        if (variantData.quantity !== undefined || variantData.availableQuantity !== undefined) {
                            inventoryUpdate.availableQuantity = parseInt(variantData.quantity ?? variantData.availableQuantity);
                        }
                        if (variantData.reservedQuantity !== undefined) {
                            inventoryUpdate.reservedQuantity = parseInt(variantData.reservedQuantity);
                        }
                        if (variantData.costPrice !== undefined) {
                            inventoryUpdate.averageCost = parseFloat(variantData.costPrice);
                            inventoryUpdate.lastPurchaseCost = parseFloat(variantData.costPrice);
                        }
                        if (variantData.minStock !== undefined || variantData.reorderLevel !== undefined) {
                            const reorderValue = variantData.minStock ?? variantData.reorderLevel;
                            inventoryUpdate.reorderPoint = reorderValue ? parseInt(reorderValue) : null;
                        }
                        if (variantData.maxStock !== undefined) {
                            inventoryUpdate.maxStock = variantData.maxStock ? parseInt(variantData.maxStock) : null;
                        }
                        if (variantData.trackInventory !== undefined) {
                            inventoryUpdate.trackInventory = variantData.trackInventory;
                        }
                        if (variantData.allowNegativeStock !== undefined) {
                            inventoryUpdate.allowNegativeStock = variantData.allowNegativeStock;
                        }

                        if (Object.keys(inventoryUpdate).length > 0) {
                            // Always increment version on any inventory update
                            inventoryUpdate.version = { increment: 1 };
                            await tx.inventory.updateMany({
                                where: { variantId: variantData.id },
                                data: inventoryUpdate
                            });
                        }
                    } else {
                        const newVariantId = uuidv4();

                        const sellPrice = parseFloat(variantData.sellPrice || variantData.sellingPrice || 0);
                        const quantity = parseInt(variantData.quantity || variantData.availableQuantity || 0);
                        const minStock = variantData.minStock || variantData.reorderLevel ? parseInt(variantData.minStock || variantData.reorderLevel) : null;
                        const maxStock = variantData.maxStock ? parseInt(variantData.maxStock) : null;
                        const primaryBarcode = variantData.primaryBarcode || variantData.barcode || null;
                        const sku = variantData.sku || variantData.barcode || null;
                        const costPrice = parseFloat(variantData.costPrice || 0);

                        await tx.productVariant.create({
                            data: {
                                id: newVariantId,
                                productId: productId,
                                tenantId: auth.tenantId,
                                branchId: auth.branchId,
                                sku: sku,
                                variantName: variantData.variantName || updateData.name || 'Default',
                                primaryBarcode: primaryBarcode,
                                sellingPrice: sellPrice,
                                costPrice: costPrice,
                                unit: variantData.unit || updateData.defaultUnit || updateData.unit || 'piece',
                                description: variantData.description || null,
                                brand: variantData.brand || null,
                                imageUrl: variantData.imageUrl || null,
                                size: variantData.size || null,
                                weight: variantData.weight ? parseFloat(variantData.weight) : null,
                                weightUnit: variantData.weightUnit || null,
                                volume: variantData.volume ? parseFloat(variantData.volume) : null,
                                volumeUnit: variantData.volumeUnit || null,
                                dimensions: variantData.dimensions || null,
                                customAttributes: variantData.color ? JSON.stringify({ color: variantData.color }) : null,
                                promoPrice: variantData.promoPrice ? parseFloat(variantData.promoPrice) : null,
                                promoStart: variantData.promoStart && variantData.promoStart !== '' ? new Date(variantData.promoStart) : null,
                                promoEnd: variantData.promoEnd && variantData.promoEnd !== '' ? new Date(variantData.promoEnd) : null,
                                isTaxable: variantData.isTaxable !== false,
                                expirationDate: variantData.expirationDate && variantData.expirationDate !== '' ? new Date(variantData.expirationDate) : null,
                                manufactureDate: variantData.manufactureDate && variantData.manufactureDate !== '' ? new Date(variantData.manufactureDate) : null,
                                expiryDateAlert: variantData.expiryDateAlert ? parseInt(variantData.expiryDateAlert) : null,
                                supplierName: variantData.supplierName || null,
                                supplierCode: variantData.supplierCode || null,
                                isDefault: variantData.isDefault === true,
                                isActive: variantData.status !== 'inactive' && variantData.isActive !== false
                            }
                        });

                        // GOLDEN RULE: Create inventory with 0 quantity, then record movement
                        const newInventoryId = uuidv4();

                        await tx.inventory.create({
                            data: {
                                id: newInventoryId,
                                tenantId: auth.tenantId,
                                branchId: auth.branchId,
                                productId: productId,
                                variantId: newVariantId,
                                availableQuantity: 0, // Start at 0, stock movement will set the quantity
                                reservedQuantity: parseInt(variantData.reservedQuantity || 0),
                                damagedQuantity: 0,
                                averageCost: costPrice,
                                lastPurchaseCost: costPrice,
                                reorderPoint: minStock,
                                maxStock: maxStock,
                                trackInventory: variantData.trackInventory !== false,
                                allowNegativeStock: variantData.allowNegativeStock || false
                            }
                        });

                        // Record initial stock movement if quantity > 0
                        if (quantity > 0) {
                            await StockMovementService.recordInitialStock(
                                {
                                    tenantId: auth.tenantId,
                                    branchId: auth.branchId,
                                    inventoryId: newInventoryId,
                                    quantity: quantity,
                                    unitCost: costPrice,
                                    notes: 'Initial stock on variant creation',
                                    movedBy: auth.userId,
                                },
                                tx
                            );
                        }

                        if (variantData.additionalBarcodes && Array.isArray(variantData.additionalBarcodes)) {
                            for (const barcode of variantData.additionalBarcodes) {
                                const barcodeValue = typeof barcode === 'string' ? barcode : barcode.code || barcode.barcode;
                                if (barcodeValue) {
                                    await tx.variantBarcode.create({
                                        data: {
                                            id: uuidv4(),
                                            variantId: newVariantId,
                                            barcode: barcodeValue,
                                            barcodeType: barcode.type || 'EAN13',
                                            barcodeSource: barcode.source || 'STORE',
                                            isActive: true
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });

        return 1;
    }

    /**
     * Update with user context
     */
    static async updateWithUser(variantId: string, updateData: Record<string, any>, _auth: AuthenticatedUser): Promise<number> {
        return await this.update(variantId, updateData);
    }

    /**
     * Void/deactivate variant
     */
    static async void(variantId: string, _auth: AuthenticatedUser): Promise<number> {
        await prisma.productVariant.update({
            where: { id: variantId },
            data: { isActive: false }
        });
        return 1;
    }

    /**
     * Delete variant
     */
    static async delete(variantId: string): Promise<number> {
        await prisma.productVariant.delete({
            where: { id: variantId }
        });
        return 1;
    }

    /**
     * Update quantity
     * @deprecated VIOLATES GOLDEN RULE - use StockMovementService.recordAdjustment() instead
     * This method is kept for backward compatibility but should not be used for new code.
     */
    static async updateQuantity(variantId: string, newQuantity: number, auth: AuthenticatedUser): Promise<number> {
        console.warn('DEPRECATED: InventoryModel.updateQuantity() violates the golden rule. Use StockMovementService.recordAdjustment() instead.');

        // Find the inventory record
        const inventory = await prisma.inventory.findFirst({
            where: {
                variantId: variantId,
                branchId: auth.branchId,
                tenantId: auth.tenantId,
            },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for variant ${variantId}`);
        }

        const currentQuantity = inventory.availableQuantity;
        const adjustment = newQuantity - currentQuantity;

        if (adjustment === 0) {
            return 1; // No change needed
        }

        // GOLDEN RULE: Use StockMovementService instead of direct update
        await StockMovementService.recordAdjustment({
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            inventoryId: inventory.id,
            quantity: adjustment,
            unitCost: Number(inventory.averageCost || 0),
            notes: `Quantity update from ${currentQuantity} to ${newQuantity} (via deprecated updateQuantity)`,
            movedBy: auth.userId,
        });

        return 1;
    }

    /**
     * Increment inventory (for purchase receipts, returns, etc.)
     * Note: productId in items is actually variantId now
     * @deprecated VIOLATES GOLDEN RULE - use StockMovementService.recordReturn() or recordPurchaseReceipt() instead
     */
    static async incrementInventory(
        products: Array<{ productId: string; quantity: number }>,
        auth: AuthenticatedUser
    ): Promise<void> {
        console.warn('DEPRECATED: InventoryModel.incrementInventory() violates the golden rule. Use StockMovementService.recordReturn() or recordPurchaseReceipt() instead.');

        for (const item of products) {
            const inventory = await prisma.inventory.findFirst({
                where: {
                    OR: [
                        { variantId: item.productId },
                        { productId: item.productId }
                    ],
                    branchId: auth.branchId,
                    tenantId: auth.tenantId,
                }
            });

            if (!inventory) {
                throw new Error(`Inventory not found for variant ${item.productId}`);
            }

            // GOLDEN RULE: Use StockMovementService instead of direct update
            await StockMovementService.recordReturn({
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                inventoryId: inventory.id,
                quantity: item.quantity,
                unitCost: Number(inventory.averageCost || 0),
                referenceId: `increment-${Date.now()}`,
                notes: 'Inventory increment (via deprecated incrementInventory)',
                movedBy: auth.userId,
            });
        }
    }

    /**
     * Decrement inventory (for sales)
     * Validates stock availability and handles errors gracefully
     * Note: productId in items is actually variantId now
     * @deprecated VIOLATES GOLDEN RULE - use StockMovementService.recordSale() instead
     */
    static async decrementInventory(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<void> {
        console.warn('DEPRECATED: InventoryModel.decrementInventory() violates the golden rule. Use StockMovementService.recordSale() instead.');

        try {
            for (const item of products) {
                const inventory = await prisma.inventory.findFirst({
                    where: {
                        OR: [
                            { variantId: item.productId },
                            { productId: item.productId }
                        ],
                        branchId: auth.branchId,
                        tenantId: auth.tenantId,
                    },
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: { name: true }
                                }
                            }
                        }
                    }
                });

                if (!inventory) {
                    throw new NotFoundError('Inventory', item.productId);
                }

                const newQuantity = inventory.availableQuantity - item.quantity;

                if (newQuantity < 0 && !inventory.allowNegativeStock) {
                    const productName = inventory.variant?.variantName !== 'Default'
                        ? `${inventory.variant?.product?.name} - ${inventory.variant?.variantName}`
                        : inventory.variant?.product?.name || item.productId;
                    throw new BusinessLogicError(
                        InventoryErrors.INSUFFICIENT_STOCK(productName, inventory.availableQuantity, item.quantity),
                        {
                            productId: item.productId,
                            productName,
                            availableQuantity: inventory.availableQuantity,
                            requestedQuantity: item.quantity
                        }
                    );
                }

                // GOLDEN RULE: Use StockMovementService instead of direct update
                await StockMovementService.recordSale({
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    inventoryId: inventory.id,
                    quantity: item.quantity,
                    unitCost: Number(inventory.averageCost || 0),
                    referenceId: `sale-${Date.now()}`,
                    notes: `Sale of ${item.name || item.productId} (via deprecated decrementInventory)`,
                    movedBy: auth.userId,
                });
            }
        } catch (error) {
            // Re-throw if it's already a handled error
            if (error instanceof ValidationError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof BusinessLogicError) {
                throw error;
            }

            // Handle Prisma errors
            throw DbErrorHandler.handlePrismaError(error);
        }
    }

    /**
     * Get detailed inventory counts
     * Returns: totalItems, incompleteItems, itemsInStock, lowStockItems, expiredItems
     */
    static async getDetailedCounts(auth: AuthenticatedUser): Promise<{
        totalItems: number;
        incompleteItems: number;
        itemsInStock: number;
        lowStockItems: number;
        expiredItems: number;
    }> {
        const baseWhereClause = {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            isActive: true,
            product: { isActive: true }
        };

        const now = new Date();

        // Run all counts in parallel for efficiency
        const [totalItems, incompleteItems, itemsInStock, _lowStockItems, expiredItems] = await Promise.all([
            // Total items count
            prisma.productVariant.count({
                where: baseWhereClause
            }),
            // Incomplete items: missing stock quantity, low stock alert, cost price, expiry date, or barcode
            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    OR: [
                        // Missing barcode
                        { primaryBarcode: null },
                        { primaryBarcode: '' },
                        // Missing expiry date
                        { expirationDate: null },
                        // Missing cost price (0 or null)
                        { costPrice: { equals: 0 } },
                        // Missing stock quantity (no inventory record or availableQuantity is 0/null)
                        { inventory: null },
                        { inventory: { availableQuantity: { equals: 0 } } },
                        // Missing low stock alert (reorderPoint is 0 or null)
                        { inventory: { reorderPoint: null } },
                        { inventory: { reorderPoint: { equals: 0 } } }
                    ]
                }
            }),
            // Items in stock: availableQuantity > 0
            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    inventory: {
                        availableQuantity: { gt: 0 }
                    }
                }
            }),
            // Low stock items: availableQuantity > 0 AND availableQuantity <= reorderPoint
            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    inventory: {
                        AND: [
                            { availableQuantity: { gt: 0 } },
                            { reorderPoint: { gt: 0 } },
                            {
                                // This raw check is needed because Prisma doesn't support field-to-field comparison
                                // We'll handle this with a raw query or by filtering in memory
                            }
                        ]
                    }
                }
            }).catch(() => 0), // Fallback if the above fails
            // Expired items: expirationDate < now
            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    expirationDate: {
                        not: null,
                        lt: now
                    }
                }
            })
        ]);

        // For low stock items, we need a more accurate count using raw query or fetching variants
        const lowStockVariants = await prisma.productVariant.findMany({
            where: {
                ...baseWhereClause,
                inventory: {
                    availableQuantity: { gt: 0 },
                    reorderPoint: { gt: 0 }
                }
            },
            select: {
                id: true,
                inventory: {
                    select: {
                        availableQuantity: true,
                        reorderPoint: true
                    }
                }
            }
        });

        const accurateLowStockCount = lowStockVariants.filter(
            v => v.inventory && v.inventory.availableQuantity <= (v.inventory.reorderPoint || 0)
        ).length;

        return {
            totalItems,
            incompleteItems,
            itemsInStock,
            lowStockItems: accurateLowStockCount,
            expiredItems
        };
    }

    /**
     * Get comprehensive inventory overview with stock valuation
     */
    static async getInventoryOverview(
        auth: AuthenticatedUser,
        options: {
            search?: string;
            filter?: string;
            categoryId?: string;
            startDate?: string;
            endDate?: string;
        } = {}
    ): Promise<{
        totalProducts: number;
        totalStockQuantity: number;
        totalStockValue: number;
        totalRetailValue: number;
        potentialProfit: number;
        profitMargin: number;
        averageCostPerUnit: number;
        averageSellingPricePerUnit: number;
        lowStockCount: number;
        outOfStockCount: number;
        categoryBreakdown: Array<{
            categoryId: string | null;
            categoryName: string;
            productCount: number;
            totalQuantity: number;
            totalCostValue: number;
            totalRetailValue: number;
        }>;
        stockHealthSummary: {
            healthy: number;
            lowStock: number;
            outOfStock: number;
            overstocked: number;
        };
        filters: {
            search: string;
            filter: string;
            categoryId: string | null;
            startDate: string | null;
            endDate: string | null;
        };
    }> {
        const { search = '', filter = 'all', categoryId, startDate, endDate } = options;

        // Build where clause with filters
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        // Filter logic
        if (filter === 'all') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'low-stock') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        } else if (filter === 'expiring-soon') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expirationDate = {
                gte: now,
                lte: thirtyDaysFromNow
            };
        } else if (filter === 'expired') {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
            const now = new Date();
            whereClause.expirationDate = {
                lt: now
            };
        }

        // Category filter
        if (categoryId) {
            whereClause.product = {
                ...(whereClause.product || {}),
                categoryId
            };
        }

        // Date range
        if (startDate || endDate) {
            whereClause.createdAt = whereClause.createdAt || {};
            if (startDate) {
                whereClause.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = endDateTime;
            }
        }

        // Search
        if (search) {
            whereClause.OR = [
                { product: { name: { contains: search } } },
                { variantName: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    barcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        // Get filtered variants with their inventories
        let variants = await prisma.productVariant.findMany({
            where: whereClause,
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true
            }
        });

        // Post-process for low-stock filter
        if (filter === 'low-stock') {
            variants = variants.filter(variant => {
                const inventory = variant.inventories?.[0];
                if (!inventory?.reorderPoint) return false;
                return inventory.availableQuantity <= inventory.reorderPoint;
            });
        }

        const totalProducts = variants.length;
        let totalStockQuantity = 0;
        let totalStockValue = 0;
        let totalRetailValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let overstockedCount = 0;
        let healthyCount = 0;

        // Map for category breakdown
        const categoryMap = new Map<string, {
            categoryId: string | null;
            categoryName: string;
            productCount: number;
            totalQuantity: number;
            totalCostValue: number;
            totalRetailValue: number;
        }>();

        for (const variant of variants) {
            const inventory = variant.inventories?.[0];
            const availableQty = inventory?.availableQuantity || 0;
            const avgCost = Number(inventory?.averageCost || 0);
            const sellingPrice = Number(variant.sellingPrice || 0);
            const reorderPoint = inventory?.reorderPoint || 0;
            const maxStock = inventory?.maxStock || 0;

            // Calculate totals
            totalStockQuantity += availableQty;
            totalStockValue += availableQty * avgCost;
            totalRetailValue += availableQty * sellingPrice;

            // Stock health check
            if (availableQty === 0) {
                outOfStockCount++;
            } else if (reorderPoint > 0 && availableQty <= reorderPoint) {
                lowStockCount++;
            } else if (maxStock > 0 && availableQty > maxStock) {
                overstockedCount++;
            } else {
                healthyCount++;
            }

            // Category breakdown (from parent product)
            const categoryKey = variant.product.categoryId || 'uncategorized';
            const categoryName = variant.product.category?.name || 'Uncategorized';

            if (!categoryMap.has(categoryKey)) {
                categoryMap.set(categoryKey, {
                    categoryId: variant.product.categoryId,
                    categoryName,
                    productCount: 0,
                    totalQuantity: 0,
                    totalCostValue: 0,
                    totalRetailValue: 0
                });
            }

            const categoryData = categoryMap.get(categoryKey)!;
            categoryData.productCount++;
            categoryData.totalQuantity += availableQty;
            categoryData.totalCostValue += availableQty * avgCost;
            categoryData.totalRetailValue += availableQty * sellingPrice;
        }

        const potentialProfit = totalRetailValue - totalStockValue;
        const profitMargin = totalRetailValue > 0 ? (potentialProfit / totalRetailValue) * 100 : 0;
        const averageCostPerUnit = totalStockQuantity > 0 ? totalStockValue / totalStockQuantity : 0;
        const averageSellingPricePerUnit = totalStockQuantity > 0 ? totalRetailValue / totalStockQuantity : 0;

        return {
            totalProducts,
            totalStockQuantity,
            totalStockValue: Math.round(totalStockValue * 100) / 100,
            totalRetailValue: Math.round(totalRetailValue * 100) / 100,
            potentialProfit: Math.round(potentialProfit * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            averageCostPerUnit: Math.round(averageCostPerUnit * 100) / 100,
            averageSellingPricePerUnit: Math.round(averageSellingPricePerUnit * 100) / 100,
            lowStockCount,
            outOfStockCount,
            categoryBreakdown: Array.from(categoryMap.values()).map(cat => ({
                ...cat,
                totalCostValue: Math.round(cat.totalCostValue * 100) / 100,
                totalRetailValue: Math.round(cat.totalRetailValue * 100) / 100
            })).sort((a, b) => b.totalRetailValue - a.totalRetailValue),
            stockHealthSummary: {
                healthy: healthyCount,
                lowStock: lowStockCount,
                outOfStock: outOfStockCount,
                overstocked: overstockedCount
            },
            filters: {
                search,
                filter,
                categoryId: categoryId || null,
                startDate: startDate || null,
                endDate: endDate || null
            }
        };
    }

    /**
     * Get top valuable inventory items
     */
    static async getTopValueInventoryItems(auth: AuthenticatedUser, limit = 10): Promise<Array<{
        productId: string;
        name: string;
        sku: string;
        categoryName: string | null;
        availableQuantity: number;
        averageCost: number;
        sellingPrice: number;
        totalCostValue: number;
        totalRetailValue: number;
        potentialProfit: number;
    }>> {
        const variants = await prisma.productVariant.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true,
                product: { isActive: true }
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventories: true
            }
        });

        const itemValues = variants.map(variant => {
            const inventory = variant.inventories?.[0];
            const availableQty = inventory?.availableQuantity || 0;
            const avgCost = Number(inventory?.averageCost || 0);
            const sellingPrice = Number(variant.sellingPrice || 0);
            const totalCostValue = availableQty * avgCost;
            const totalRetailValue = availableQty * sellingPrice;

            const displayName = variant.variantName !== 'Default'
                ? `${variant.product.name} - ${variant.variantName}`
                : variant.product.name;

            return {
                productId: variant.id, // Return variant ID as productId for compatibility
                name: displayName,
                sku: variant.sku || '',
                categoryName: variant.product.category?.name || null,
                availableQuantity: availableQty,
                averageCost: Math.round(avgCost * 100) / 100,
                sellingPrice: Math.round(sellingPrice * 100) / 100,
                totalCostValue: Math.round(totalCostValue * 100) / 100,
                totalRetailValue: Math.round(totalRetailValue * 100) / 100,
                potentialProfit: Math.round((totalRetailValue - totalCostValue) * 100) / 100
            };
        });

        // Sort by total retail value descending
        return itemValues
            .sort((a, b) => b.totalRetailValue - a.totalRetailValue)
            .slice(0, limit);
    }

    /**
     * Check if variant exists
     */
    static async exists(variantId: string, auth: AuthenticatedUser): Promise<boolean> {
        const count = await prisma.productVariant.count({
            where: {
                id: variantId,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        });
        return count > 0;
    }

    /**
     * Map ProductVariant + Inventory to InventoryItem interface
     * Provides backward compatibility with the existing POS terminal interface
     */
    private static mapToInventoryItem(data: any): InventoryItem | null {
        if (!data) return null;

        const inventory = data.inventory;
        const product = data.product;

        // Build display name
        const displayName = data.variantName && data.variantName !== 'Default'
            ? `${product?.name || ''} - ${data.variantName}`
            : product?.name || '';

        if (!inventory) {
            return {
                productId: data.id, // Variant ID for POS operations
                inventoryId: '',
                sku: data.sku,
                name: displayName,
                description: data.description || product?.description,
                unit: data.unit,
                sellingPrice: Number(data.sellingPrice),
                primaryBarcode: data.primaryBarcode,
                isActive: data.isActive && (product?.isActive ?? true),
                // Variant attributes (inherit from product if null)
                brand: data.brand || product?.brand,
                size: data.size,
                dimensions: data.dimensions,
                weight: data.weight ? Number(data.weight) : undefined,
                // Promotional pricing
                promoPrice: data.promoPrice ? Number(data.promoPrice) : undefined,
                promoStart: data.promoStart,
                promoEnd: data.promoEnd,
                // Tax
                isTaxable: data.isTaxable ?? product?.isTaxable,
                // Dates
                expirationDate: data.expirationDate,
                manufactureDate: data.manufactureDate,
                expiryDateAlert: data.expiryDateAlert,
                // Supplier info
                supplierName: data.supplierName || product?.supplierName,
                supplierCode: data.supplierCode || product?.supplierCode,
                availableQuantity: 0,
                reservedQuantity: 0,
                damagedQuantity: 0,
                averageCost: 0,
                lastPurchaseCost: 0,
                trackInventory: true,
                allowNegativeStock: false,
                tenantId: data.tenantId,
                branchId: data.branchId,
                categoryId: product?.categoryId,
                categoryDetails: product?.category ? {
                    categoryId: product.category.categoryId || product.category.id,
                    name: product.category.name,
                    description: product.category.description,
                    isDefault: product.category.isDefault,
                    tenantId: product.category.tenantId,
                    branchId: product.category.branchId,
                    userId: product.category.userId
                } : undefined,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                barcode: data.primaryBarcode || '',
                quantity: '0',
                costPrice: 0,
                sellPrice: Number(data.sellingPrice),
                status: data.isActive && (product?.isActive ?? true) ? 'active' : 'inactive',
                barcodes: data.barcodes?.map((b: any) => ({
                    barcode: b.barcode,
                    barcodeType: b.barcodeType,
                    barcodeSource: b.barcodeSource,
                    isActive: b.isActive
                })) || []
            };
        }

        return {
            productId: data.id, // Variant ID for POS operations
            inventoryId: inventory.id,
            sku: data.sku,
            name: displayName,
            description: data.description || product?.description,
            unit: data.unit,
            sellingPrice: Number(data.sellingPrice),
            primaryBarcode: data.primaryBarcode,
            isActive: data.isActive && (product?.isActive ?? true),
            // Variant attributes (inherit from product if null)
            brand: data.brand || product?.brand,
            size: data.size,
            dimensions: data.dimensions,
            weight: data.weight ? Number(data.weight) : undefined,
            // Promotional pricing
            promoPrice: data.promoPrice ? Number(data.promoPrice) : undefined,
            promoStart: data.promoStart,
            promoEnd: data.promoEnd,
            // Tax
            isTaxable: data.isTaxable ?? product?.isTaxable,
            // Dates
            expirationDate: data.expirationDate,
            manufactureDate: data.manufactureDate,
            expiryDateAlert: data.expiryDateAlert,
            // Supplier info
            supplierName: data.supplierName || product?.supplierName,
            supplierCode: data.supplierCode || product?.supplierCode,
            availableQuantity: inventory.availableQuantity,
            reservedQuantity: inventory.reservedQuantity,
            damagedQuantity: inventory.damagedQuantity,
            averageCost: Number(inventory.averageCost),
            lastPurchaseCost: Number(inventory.lastPurchaseCost),
            reorderPoint: inventory.reorderPoint,
            reorderLevel: inventory.reorderPoint,
            maxStock: inventory.maxStock,
            trackInventory: inventory.trackInventory,
            allowNegativeStock: inventory.allowNegativeStock,
            lastRestockedAt: inventory.lastRestockedAt,
            lastSoldAt: inventory.lastSoldAt,
            tenantId: data.tenantId,
            branchId: data.branchId,
            categoryId: product?.categoryId,
            categoryDetails: product?.category ? {
                categoryId: product.category.categoryId || product.category.id,
                name: product.category.name,
                description: product.category.description,
                isDefault: product.category.isDefault,
                tenantId: product.category.tenantId,
                branchId: product.category.branchId,
                userId: product.category.userId
            } : undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            barcode: data.primaryBarcode || '',
            quantity: inventory.availableQuantity.toString(),
            originalQuantity: inventory.availableQuantity.toString(),
            costPrice: Number(inventory.averageCost),
            sellPrice: Number(data.sellingPrice),
            status: data.isActive && (product?.isActive ?? true) ? 'active' : 'inactive',
            minStock: inventory.reorderPoint,
            totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
            barcodes: data.barcodes?.map((b: any) => ({
                barcode: b.barcode,
                barcodeType: b.barcodeType,
                barcodeSource: b.barcodeSource,
                isActive: b.isActive
            })) || []
        };
    }

    /**
     * Additional methods for compatibility
     */
    static async updateWithValidation(id: string, inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        try {
            const isProductUpdate = inventoryData.variants && Array.isArray(inventoryData.variants);

            if (isProductUpdate) {
                const productExists = await prisma.product.findFirst({
                    where: {
                        id: id,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId
                    }
                });

                if (!productExists) {
                    throw new NotFoundError('Product', id);
                }

                if (inventoryData.categoryId !== undefined && inventoryData.categoryId !== null) {
                    const categoryExists = await prisma.category.findFirst({
                        where: {
                            categoryId: inventoryData.categoryId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId,
                        },
                    });
                    if (!categoryExists) {
                        throw new NotFoundError('Category', inventoryData.categoryId);
                    }
                }

                for (const variantData of inventoryData.variants) {
                    if (!variantData.id) continue;

                    const newBarcode = variantData.barcode || variantData.primaryBarcode;
                    if (newBarcode !== undefined && newBarcode !== null && newBarcode !== '') {
                        const duplicateCheck = await ProductService.checkDuplicateBarcode(
                            newBarcode,
                            auth.tenantId,
                            auth.branchId,
                            variantData.id
                        );
                        if (duplicateCheck.exists) {
                            throw new ConflictError(
                                ProductErrors.BARCODE_EXISTS(newBarcode, duplicateCheck.productName),
                                'barcode'
                            );
                        }
                    }

                    const minStock = variantData.minStock !== undefined ? parseInt(variantData.minStock) : null;
                    const maxStock = variantData.maxStock !== undefined ? parseInt(variantData.maxStock) : null;
                    if (minStock !== null && maxStock !== null && minStock > maxStock) {
                        throw new ValidationError(
                            'Invalid stock configuration',
                            { minStock: InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock) }
                        );
                    }
                }

                return await this.updateProductWithVariants(id, inventoryData, auth);
            }

            const exists = await this.exists(id, auth);
            if (!exists) {
                throw new NotFoundError('Product', id);
            }

            const minStock = inventoryData.minStock !== undefined ? parseInt(inventoryData.minStock) : null;
            const maxStock = inventoryData.maxStock !== undefined ? parseInt(inventoryData.maxStock) : null;

            if (minStock !== null && maxStock !== null && minStock > maxStock) {
                throw new ValidationError(
                    'Invalid stock configuration',
                    { minStock: InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock) }
                );
            }

            const newBarcode = inventoryData.barcode || inventoryData.primaryBarcode;
            if (newBarcode !== undefined) {
                const duplicateCheck = await ProductService.checkDuplicateBarcode(
                    newBarcode,
                    auth.tenantId,
                    auth.branchId,
                    id
                );
                if (duplicateCheck.exists) {
                    throw new ConflictError(
                        ProductErrors.BARCODE_EXISTS(newBarcode, duplicateCheck.productName),
                        'barcode'
                    );
                }
            }

            if (inventoryData.categoryId !== undefined && inventoryData.categoryId !== null) {
                const categoryExists = await prisma.category.findFirst({
                    where: {
                        categoryId: inventoryData.categoryId,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                    },
                });
                if (!categoryExists) {
                    throw new NotFoundError('Category', inventoryData.categoryId);
                }
            }

            return await this.update(id, inventoryData);
        } catch (error) {
            if (error instanceof ValidationError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof BusinessLogicError) {
                throw error;
            }

            throw DbErrorHandler.handlePrismaError(error);
        }
    }

    static async voidWithCheck(variantId: string, auth: AuthenticatedUser): Promise<number> {
        const exists = await this.exists(variantId, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }
        return await this.void(variantId, auth);
    }

    static async deleteWithCheck(variantId: string, auth: AuthenticatedUser): Promise<number> {
        const exists = await this.exists(variantId, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }
        return await this.delete(variantId);
    }

    /**
     * Find products with their variants grouped (for inventory listing)
     * Returns products with nested variants instead of flat inventory items
     */
    static async findProductsWithVariants(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<{ products: any[]; total: number }> {
        // Build product-level where clause
        const productWhere: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
        };

        if (filter === 'all' || filter === 'active') {
            productWhere.isActive = true;
        } else if (filter === 'inactive') {
            productWhere.isActive = false;
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            productWhere.createdAt = { gte: oneWeekAgo };
            productWhere.isActive = true;
        } else {
            productWhere.isActive = true;
        }

        // Date range filter
        if (startDate || endDate) {
            productWhere.createdAt = productWhere.createdAt || {};
            if (startDate) {
                productWhere.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                productWhere.createdAt.lte = endDateTime;
            }
        }

        if (categoryId) {
            productWhere.categoryId = categoryId;
        }

        if (search) {
            productWhere.OR = [
                { name: { contains: search } },
                { brand: { contains: search } },
                { description: { contains: search } },
                { variants: { some: { sku: { contains: search } } } },
                { variants: { some: { primaryBarcode: { contains: search } } } },
                { variants: { some: { variantName: { contains: search } } } },
                { variants: { some: { barcodes: { some: { barcode: { contains: search } } } } } },
            ];
        }

        // Build variant filter based on filter type
        const variantWhere: any = { isActive: true };
        if (filter === 'expiring-soon') {
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            variantWhere.expirationDate = { gte: now, lte: thirtyDaysFromNow };
        } else if (filter === 'expired') {
            const now = new Date();
            variantWhere.expirationDate = { lt: now };
        }

        const [results, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: productWhere,
                include: {
                    category: true,
                    variants: {
                        where: variantWhere,
                        orderBy: [{ isDefault: 'desc' }, { variantName: 'asc' }],
                        include: {
                            inventories: true,
                            barcodes: { where: { isActive: true } },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            prisma.product.count({ where: productWhere }),
        ]);

        // Filter out products with no variants after variant filtering
        let filteredResults = results.filter(p => p.variants.length > 0);

        // Apply low-stock filter at variant level
        if (filter === 'low-stock') {
            filteredResults = filteredResults.map(product => ({
                ...product,
                variants: product.variants.filter((v: any) => {
                    const inv = v.inventory;
                    if (!inv || !inv.reorderPoint) return false;
                    return inv.availableQuantity <= inv.reorderPoint;
                })
            })).filter(p => p.variants.length > 0);
        }

        const products = filteredResults.map((product) => this.mapToProductWithVariants(product));

        return { products, total: totalCount };
    }

    /**
     * Get count of products (for grouped view pagination)
     */
    static async getProductCount(
        auth: AuthenticatedUser,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<number> {
        const productWhere: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
        };

        if (filter === 'all' || filter === 'active') {
            productWhere.isActive = true;
        } else if (filter === 'inactive') {
            productWhere.isActive = false;
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            productWhere.createdAt = { gte: oneWeekAgo };
            productWhere.isActive = true;
        } else {
            productWhere.isActive = true;
        }

        if (startDate || endDate) {
            productWhere.createdAt = productWhere.createdAt || {};
            if (startDate) {
                productWhere.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                productWhere.createdAt.lte = endDateTime;
            }
        }

        if (categoryId) {
            productWhere.categoryId = categoryId;
        }

        if (search) {
            productWhere.OR = [
                { name: { contains: search } },
                { brand: { contains: search } },
                { description: { contains: search } },
                { variants: { some: { sku: { contains: search } } } },
                { variants: { some: { primaryBarcode: { contains: search } } } },
                { variants: { some: { variantName: { contains: search } } } },
            ];
        }

        // Ensure products have at least one active variant
        productWhere.variants = { some: { isActive: true } };

        return await prisma.product.count({ where: productWhere });
    }

    /**
     * Map Prisma product result to ProductWithVariants structure
     */
    private static mapToProductWithVariants(data: any): any {
        if (!data) return null;

        const variants = (data.variants || []).map((variant: any) => {
            const inventory = variant.inventories?.[0];
            return {
                id: variant.id,
                sku: variant.sku,
                variantName: variant.variantName,
                primaryBarcode: variant.primaryBarcode,
                sellingPrice: Number(variant.sellingPrice),
                costPrice: Number(variant.costPrice),
                unit: variant.unit,
                description: variant.description,
                brand: variant.brand,
                imageUrl: variant.imageUrl,
                isTaxable: variant.isTaxable,
                supplierName: variant.supplierName,
                supplierCode: variant.supplierCode,
                size: variant.size,
                weight: variant.weight ? Number(variant.weight) : null,
                weightUnit: variant.weightUnit,
                volume: variant.volume ? Number(variant.volume) : null,
                volumeUnit: variant.volumeUnit,
                dimensions: variant.dimensions,
                customAttributes: variant.customAttributes,
                promoPrice: variant.promoPrice ? Number(variant.promoPrice) : null,
                promoStart: variant.promoStart,
                promoEnd: variant.promoEnd,
                expirationDate: variant.expirationDate,
                manufactureDate: variant.manufactureDate,
                expiryDateAlert: variant.expiryDateAlert,
                isDefault: variant.isDefault,
                isActive: variant.isActive,
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt,
                inventory: inventory ? {
                    inventoryId: inventory.id,
                    availableQuantity: inventory.availableQuantity,
                    reservedQuantity: inventory.reservedQuantity,
                    damagedQuantity: inventory.damagedQuantity,
                    averageCost: Number(inventory.averageCost),
                    lastPurchaseCost: Number(inventory.lastPurchaseCost),
                    reorderPoint: inventory.reorderPoint,
                    maxStock: inventory.maxStock,
                    trackInventory: inventory.trackInventory,
                    allowNegativeStock: inventory.allowNegativeStock,
                    lastRestockedAt: inventory.lastRestockedAt,
                    lastSoldAt: inventory.lastSoldAt,
                } : null,
                barcodes: (variant.barcodes || []).map((b: any) => ({
                    barcode: b.barcode,
                    barcodeType: b.barcodeType,
                    barcodeSource: b.barcodeSource,
                    isActive: b.isActive,
                })),
            };
        });

        // Calculate aggregated inventory info for the product
        const totalAvailableQuantity = variants.reduce((sum: number, v: any) => sum + (v.inventory?.availableQuantity || 0), 0);
        const totalReservedQuantity = variants.reduce((sum: number, v: any) => sum + (v.inventory?.reservedQuantity || 0), 0);

        return {
            id: data.id,
            tenantId: data.tenantId,
            branchId: data.branchId,
            categoryId: data.categoryId,
            name: data.name,
            description: data.description,
            brand: data.brand,
            isTaxable: data.isTaxable,
            supplierName: data.supplierName,
            supplierCode: data.supplierCode,
            defaultUnit: data.defaultUnit,
            imageUrl: data.imageUrl,
            isActive: data.isActive,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            categoryDetails: data.category ? {
                categoryId: data.category.categoryId || data.category.id,
                name: data.category.name,
                description: data.category.description,
                isDefault: data.category.isDefault,
            } : null,
            variantCount: variants.length,
            totalAvailableQuantity,
            totalReservedQuantity,
            variants,
        };
    }

    static async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}
