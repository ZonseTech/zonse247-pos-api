/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 as uuidv4 } from 'uuid';
import { CartItem } from 'order';
import { AuthenticatedUser } from 'auth';
import { InventoryItem } from 'inventory-item';
import prisma from '../databases/prisma/client';
import { ProductService } from '../services/product.service';
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
 * In the new schema:
 * - Product is the parent/master product (e.g., "Nivea Lotion")
 * - ProductVariant is the sellable unit (e.g., "Nivea 50ml", "Nivea 200ml")
 * - Inventory tracks stock for a ProductVariant (1:1 relationship)
 * 
 * This model queries ProductVariant to provide the flattened InventoryItem interface
 * for backward compatibility with the POS terminal and other endpoints.
 */
export class InventoryModel {

    /**
     * Find inventory item by variant ID
     * Note: productId in the API actually refers to variantId now
     */
    static async findById(variantId: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        const result = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                inventory: true,
                barcodes: {
                    where: { isActive: true }
                }
            }
        });

        return this.mapToInventoryItem(result);
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
                inventory: true,
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
                inventory: true,
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
                inventory: true,
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
                    inventory: true
                }
            });

            return results.filter(r => {
                const inventory = r.inventory;
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
                inventory: true,
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
                inventory: true,
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
                        inventory: true,
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
     * Create new product with variant and inventory
     * Validates input and handles database errors gracefully
     */
    static async create(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        try {
            const validationErrors: Record<string, string> = {};

            if (!inventoryData.name || inventoryData.name.trim().length === 0) {
                validationErrors.name = 'Product name is required.';
            }

            const sellPrice = parseFloat(inventoryData.sellPrice || inventoryData.sellingPrice || 0);
            if (sellPrice < 0) {
                validationErrors.sellingPrice = ProductErrors.INVALID_PRICE;
            }

            const quantity = parseInt(inventoryData.quantity || 0);
            if (quantity < 0) {
                validationErrors.quantity = ProductErrors.INVALID_QUANTITY;
            }

            const minStock = inventoryData.minStock ? parseInt(inventoryData.minStock) : null;
            const maxStock = inventoryData.maxStock ? parseInt(inventoryData.maxStock) : null;
            if (minStock !== null && maxStock !== null && minStock > maxStock) {
                validationErrors.minStock = InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock);
            }

            if (Object.keys(validationErrors).length > 0) {
                throw new ValidationError('Inventory item validation failed', validationErrors);
            }

            const primaryBarcode = inventoryData.barcode || inventoryData.primaryBarcode;
            const additionalBarcodes = inventoryData.additionalBarcodes?.map((bc: any) => ({
                barcode: typeof bc === 'string' ? bc : bc.code || bc.barcode
            }));

            // Validate barcodes for duplicates
            await ProductService.validateBarcodesForDuplicates(
                primaryBarcode,
                additionalBarcodes,
                auth.tenantId,
                auth.branchId
            );

            const sku = inventoryData.sku || inventoryData.barcode;

            // Check SKU uniqueness on variants
            if (sku) {
                const existingSku = await prisma.productVariant.findFirst({
                    where: {
                        sku,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        isActive: true,
                    },
                    include: {
                        product: { select: { name: true } }
                    }
                });

                if (existingSku) {
                    throw new ConflictError(ProductErrors.SKU_EXISTS(sku), 'sku');
                }
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
                    throw new NotFoundError('Category', inventoryData.categoryId);
                }
            }

            const productId = uuidv4();
            const variantId = uuidv4();

            await prisma.$transaction(async (tx) => {
                // Create the product (parent)
                await tx.product.create({
                    data: {
                        id: productId,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        name: inventoryData.name.trim(),
                        categoryId: inventoryData.categoryId || null,
                        description: inventoryData.description || null,
                        brand: inventoryData.brand || null,
                        isTaxable: inventoryData.isTaxable !== false,
                        supplierName: inventoryData.supplierName || null,
                        supplierCode: inventoryData.supplierCode || null,
                        defaultUnit: inventoryData.unit || 'piece',
                        isActive: inventoryData.status !== 'inactive'
                    }
                });

                // Create the default variant
                await tx.productVariant.create({
                    data: {
                        id: variantId,
                        productId: productId,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        sku: sku,
                        variantName: inventoryData.variantName || 'Default',
                        primaryBarcode: primaryBarcode,
                        sellingPrice: sellPrice,
                        costPrice: parseFloat(inventoryData.costPrice || 0),
                        unit: inventoryData.unit || 'piece',
                        description: inventoryData.description || null,
                        brand: inventoryData.brand || null,
                        size: inventoryData.size || null,
                        weight: inventoryData.weight ? parseFloat(inventoryData.weight) : null,
                        dimensions: inventoryData.dimensions || null,
                        promoPrice: inventoryData.promoPrice ? parseFloat(inventoryData.promoPrice) : null,
                        promoStart: inventoryData.promoStart ? new Date(inventoryData.promoStart) : null,
                        promoEnd: inventoryData.promoEnd ? new Date(inventoryData.promoEnd) : null,
                        isTaxable: inventoryData.isTaxable !== false,
                        expirationDate: inventoryData.expirationDate ? new Date(inventoryData.expirationDate) : null,
                        manufactureDate: inventoryData.manufactureDate ? new Date(inventoryData.manufactureDate) : null,
                        supplierName: inventoryData.supplierName || null,
                        supplierCode: inventoryData.supplierCode || null,
                        isDefault: true,
                        isActive: inventoryData.status !== 'inactive'
                    }
                });

                // Create inventory for the variant
                await tx.inventory.create({
                    data: {
                        id: uuidv4(),
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        variantId: variantId,
                        availableQuantity: quantity,
                        reservedQuantity: parseInt(inventoryData.reservedQuantity || 0),
                        damagedQuantity: 0,
                        averageCost: parseFloat(inventoryData.costPrice || 0),
                        lastPurchaseCost: parseFloat(inventoryData.costPrice || 0),
                        reorderPoint: minStock,
                        maxStock: maxStock,
                        trackInventory: inventoryData.trackInventory !== false,
                        allowNegativeStock: inventoryData.allowNegativeStock || false
                    }
                });

                // Create additional barcodes
                if (inventoryData.additionalBarcodes && Array.isArray(inventoryData.additionalBarcodes)) {
                    for (const barcode of inventoryData.additionalBarcodes) {
                        const barcodeValue = typeof barcode === 'string' ? barcode : barcode.code || barcode.barcode;
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
            });
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

    /**
     * Update variant and inventory
     * Note: productId parameter is actually variantId in the new schema
     */
    static async update(variantId: string, updateData: Record<string, any>): Promise<number> {
        await prisma.$transaction(async (tx) => {
            const variantUpdate: any = {};

            // Variant-level fields
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
            // Variant attributes
            if (updateData.brand !== undefined) variantUpdate.brand = updateData.brand || null;
            if (updateData.size !== undefined) variantUpdate.size = updateData.size || null;
            if (updateData.dimensions !== undefined) variantUpdate.dimensions = updateData.dimensions || null;
            if (updateData.weight !== undefined) variantUpdate.weight = updateData.weight ? parseFloat(updateData.weight) : null;
            // Promotional pricing
            if (updateData.promoPrice !== undefined) variantUpdate.promoPrice = updateData.promoPrice ? parseFloat(updateData.promoPrice) : null;
            if (updateData.promoStart !== undefined) variantUpdate.promoStart = updateData.promoStart ? new Date(updateData.promoStart) : null;
            if (updateData.promoEnd !== undefined) variantUpdate.promoEnd = updateData.promoEnd ? new Date(updateData.promoEnd) : null;
            // Tax
            if (updateData.isTaxable !== undefined) variantUpdate.isTaxable = updateData.isTaxable;
            // Dates
            if (updateData.expirationDate !== undefined) variantUpdate.expirationDate = updateData.expirationDate ? new Date(updateData.expirationDate) : null;
            if (updateData.manufactureDate !== undefined) variantUpdate.manufactureDate = updateData.manufactureDate ? new Date(updateData.manufactureDate) : null;
            // Supplier info
            if (updateData.supplierName !== undefined) variantUpdate.supplierName = updateData.supplierName || null;
            if (updateData.supplierCode !== undefined) variantUpdate.supplierCode = updateData.supplierCode || null;

            if (Object.keys(variantUpdate).length > 0) {
                await tx.productVariant.update({
                    where: { id: variantId },
                    data: variantUpdate
                });
            }

            // Also update parent product fields if updating name or category
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

            // Inventory updates
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
                await tx.inventory.updateMany({
                    where: { variantId },
                    data: inventoryUpdate
                });
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
     */
    static async updateQuantity(variantId: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        await prisma.inventory.updateMany({
            where: {
                variantId: variantId,
                branchId: auth.branchId
            },
            data: {
                availableQuantity: quantity
            }
        });
        return 1;
    }

    /**
     * Increment inventory (for purchase receipts, returns, etc.)
     * Note: productId in items is actually variantId now
     */
    static async incrementInventory(
        products: Array<{ productId: string; quantity: number }>,
        auth: AuthenticatedUser
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            for (const item of products) {
                const inventory = await tx.inventory.findFirst({
                    where: {
                        variantId: item.productId, // productId is variantId
                        branchId: auth.branchId
                    }
                });

                if (!inventory) {
                    throw new Error(`Inventory not found for variant ${item.productId}`);
                }

                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        availableQuantity: inventory.availableQuantity + item.quantity
                    }
                });
            }
        });
    }

    /**
     * Decrement inventory (for sales)
     * Validates stock availability and handles errors gracefully
     * Note: productId in items is actually variantId now
     */
    static async decrementInventory(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<void> {
        try {
            await prisma.$transaction(async (tx) => {
                for (const item of products) {
                    const inventory = await tx.inventory.findFirst({
                        where: {
                            variantId: item.productId, // productId is variantId
                            branchId: auth.branchId
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

                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: {
                            availableQuantity: newQuantity,
                            lastSoldAt: new Date()
                        }
                    });
                }
            });
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
     * Get inventory count (counts variants, not products)
     */
    static async getCount(auth: AuthenticatedUser, includeVoided = false): Promise<number> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (!includeVoided) {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        }

        return await prisma.productVariant.count({
            where: whereClause
        });
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
                inventory: true
            }
        });

        // Post-process for low-stock filter
        if (filter === 'low-stock') {
            variants = variants.filter(variant => {
                const inventory = variant.inventory;
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
            const inventory = variant.inventory;
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
                inventory: true
            }
        });

        const itemValues = variants.map(variant => {
            const inventory = variant.inventory;
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
    static async updateWithValidation(variantId: string, inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        try {
            // Verify variant exists and belongs to tenant/branch
            const exists = await this.exists(variantId, auth);
            if (!exists) {
                throw new NotFoundError('Product', variantId);
            }

            // Validate min/max stock relationship if both are provided
            const minStock = inventoryData.minStock !== undefined ? parseInt(inventoryData.minStock) : null;
            const maxStock = inventoryData.maxStock !== undefined ? parseInt(inventoryData.maxStock) : null;

            if (minStock !== null && maxStock !== null && minStock > maxStock) {
                throw new ValidationError(
                    'Invalid stock configuration',
                    { minStock: InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock) }
                );
            }

            // Validate barcode if being updated
            const newBarcode = inventoryData.barcode || inventoryData.primaryBarcode;
            if (newBarcode !== undefined) {
                const duplicateCheck = await ProductService.checkDuplicateBarcode(
                    newBarcode,
                    auth.tenantId,
                    auth.branchId,
                    variantId
                );
                if (duplicateCheck.exists) {
                    throw new ConflictError(
                        ProductErrors.BARCODE_EXISTS(newBarcode, duplicateCheck.productName),
                        'barcode'
                    );
                }
            }

            // Validate category if being updated
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

            return await this.update(variantId, inventoryData);
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

    static async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}
