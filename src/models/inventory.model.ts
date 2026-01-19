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
 * New Inventory Model using Product + Inventory tables
 * This replaces the old inventory_old table-based implementation
 */
export class InventoryModel {

    /**
     * Find inventory item by product ID
     */
    static async findById(productId: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        const result = await prisma.product.findFirst({
            where: {
                id: productId,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            },
            include: {
                inventories: {
                    where: {
                        branchId: auth.branchId
                    }
                },
                productBarcodes: {
                    where: { isActive: true }
                },
                category: true
            }
        });

        return this.mapToInventoryItem(result);
    }

    /**
     * Find inventory item by UUID (alias for findById)
     */
    static async findByUuid(uuid: string): Promise<InventoryItem | null> {
        const result = await prisma.product.findUnique({
            where: { id: uuid },
            include: {
                inventories: true,
                productBarcodes: {
                    where: { isActive: true }
                },
                category: true
            }
        });

        return this.mapToInventoryItem(result);
    }

    /**
     * Find active inventory items
     */
    static async findActive(auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const results = await prisma.product.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true
            },
            include: {
                inventories: {
                    where: {
                        branchId: auth.branchId
                    }
                },
                productBarcodes: {
                    where: { isActive: true }
                },
                category: true
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
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
        } else if (filter === 'low-stock') {
            whereClause.isActive = true;
            // We'll filter this in post-processing since we need to compare inventory fields
        } else if (filter === 'expiring-soon') {
            whereClause.isActive = true;
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expirationDate = {
                gte: now,
                lte: thirtyDaysFromNow
            };
        } else if (filter === 'expired') {
            whereClause.isActive = true;
            const now = new Date();
            whereClause.expirationDate = {
                lt: now
            };
        }

        // Date range
        if (startDate || endDate) {
            whereClause.createdAt = {};
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
            whereClause.categoryId = categoryId;
        }

        // Search
        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    productBarcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        const results = await prisma.product.findMany({
            where: whereClause,
            include: {
                inventories: {
                    where: {
                        branchId: auth.branchId
                    }
                },
                productBarcodes: {
                    where: { isActive: true }
                },
                category: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
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
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
        } else if (filter === 'expiring-soon') {
            whereClause.isActive = true;
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expirationDate = {
                gte: now,
                lte: thirtyDaysFromNow
            };
        } else if (filter === 'expired') {
            whereClause.isActive = true;
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
            whereClause.categoryId = categoryId;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    productBarcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        // For low-stock, we need to get all and filter
        if (filter === 'low-stock') {
            const results = await prisma.product.findMany({
                where: whereClause,
                include: {
                    inventories: {
                        where: {
                            branchId: auth.branchId
                        }
                    }
                }
            });

            return results.filter(r => {
                const inventory = r.inventories[0];
                if (!inventory || !inventory.reorderPoint) return false;
                return inventory.availableQuantity <= inventory.reorderPoint;
            }).length;
        }

        return await prisma.product.count({
            where: whereClause
        });
    }

    /**
     * Find by SKU or barcode
     */
    static async findBySku(sku: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        const result = await prisma.product.findFirst({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                OR: [
                    { sku: sku },
                    { primaryBarcode: sku },
                    {
                        productBarcodes: {
                            some: {
                                barcode: sku,
                                isActive: true
                            }
                        }
                    }
                ]
            },
            include: {
                inventories: {
                    where: {
                        branchId: auth.branchId
                    }
                },
                productBarcodes: {
                    where: { isActive: true }
                },
                category: true
            }
        });

        return this.mapToInventoryItem(result);
    }

    /**
     * Create new product with inventory
     * Validates input and handles database errors gracefully
     */
    static async create(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        try {
            // Validate required fields
            const validationErrors: Record<string, string> = {};

            if (!inventoryData.name || inventoryData.name.trim().length === 0) {
                validationErrors.name = 'Product name is required.';
            }

            if (!inventoryData.sku && !inventoryData.barcode) {
                validationErrors.sku = 'SKU or barcode is required.';
            }

            // Validate price values
            const sellPrice = parseFloat(inventoryData.sellPrice || inventoryData.sellingPrice || 0);
            if (sellPrice < 0) {
                validationErrors.sellingPrice = ProductErrors.INVALID_PRICE;
            }

            const quantity = parseInt(inventoryData.quantity || 0);
            if (quantity < 0) {
                validationErrors.quantity = ProductErrors.INVALID_QUANTITY;
            }

            // Validate min/max stock relationship
            const minStock = inventoryData.minStock ? parseInt(inventoryData.minStock) : null;
            const maxStock = inventoryData.maxStock ? parseInt(inventoryData.maxStock) : null;
            if (minStock !== null && maxStock !== null && minStock > maxStock) {
                validationErrors.minStock = InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock);
            }

            if (Object.keys(validationErrors).length > 0) {
                throw new ValidationError('Inventory item validation failed', validationErrors);
            }

            // Check for duplicate barcodes
            const primaryBarcode = inventoryData.barcode || inventoryData.primaryBarcode;
            const additionalBarcodes = inventoryData.additionalBarcodes?.map((bc: any) => ({
                barcode: typeof bc === 'string' ? bc : bc.code || bc.barcode
            }));

            await ProductService.validateBarcodesForDuplicates(
                primaryBarcode,
                additionalBarcodes,
                auth.tenantId,
                auth.branchId
            );

            // Check for duplicate SKU
            const sku = inventoryData.sku || inventoryData.barcode;
            const existingSku = await prisma.product.findFirst({
                where: {
                    sku,
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    isActive: true,
                },
                select: { id: true, name: true },
            });

            if (existingSku) {
                throw new ConflictError(ProductErrors.SKU_EXISTS(sku), 'sku');
            }

            // Verify category exists if provided
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

            // Create product and inventory in transaction
            await prisma.$transaction(async (tx) => {
                const product = await tx.product.create({
                    data: {
                        id: uuidv4(),
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        sku: sku,
                        name: inventoryData.name.trim(),
                        categoryId: inventoryData.categoryId || null,
                        description: inventoryData.description || null,
                        unit: inventoryData.unit || 'piece',
                        sellingPrice: sellPrice,
                        primaryBarcode: primaryBarcode,
                        // Product attributes
                        brand: inventoryData.brand || null,
                        color: inventoryData.color || null,
                        size: inventoryData.size || null,
                        dimensions: inventoryData.dimensions || null,
                        weight: inventoryData.weight ? parseFloat(inventoryData.weight) : null,
                        // Promotional pricing
                        promoPrice: inventoryData.promoPrice ? parseFloat(inventoryData.promoPrice) : null,
                        promoStart: inventoryData.promoStart ? new Date(inventoryData.promoStart) : null,
                        promoEnd: inventoryData.promoEnd ? new Date(inventoryData.promoEnd) : null,
                        // Tax
                        isTaxable: inventoryData.isTaxable !== false,
                        // Dates
                        expirationDate: inventoryData.expirationDate ? new Date(inventoryData.expirationDate) : null,
                        manufactureDate: inventoryData.manufactureDate ? new Date(inventoryData.manufactureDate) : null,
                        // Supplier info
                        supplierName: inventoryData.supplierName || null,
                        supplierCode: inventoryData.supplierCode || null,
                        isActive: inventoryData.status !== 'inactive'
                    }
                });

                await tx.inventory.create({
                    data: {
                        id: uuidv4(),
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                        productId: product.id,
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
                        await tx.productBarcode.create({
                            data: {
                                id: uuidv4(),
                                productId: product.id,
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
     * Update product and inventory
     */
    static async update(productId: string, updateData: Record<string, any>): Promise<number> {
        await prisma.$transaction(async (tx) => {
            const productUpdate: any = {};
            if (updateData.name !== undefined) productUpdate.name = updateData.name;
            if (updateData.description !== undefined) productUpdate.description = updateData.description || null;
            if (updateData.unit !== undefined) productUpdate.unit = updateData.unit;
            if (updateData.sellPrice !== undefined || updateData.sellingPrice !== undefined) {
                productUpdate.sellingPrice = parseFloat(updateData.sellPrice || updateData.sellingPrice);
            }
            if (updateData.barcode !== undefined || updateData.primaryBarcode !== undefined) {
                productUpdate.primaryBarcode = updateData.barcode || updateData.primaryBarcode;
            }
            if (updateData.categoryId !== undefined) {
                productUpdate.categoryId = updateData.categoryId || null;
            }
            if (updateData.status !== undefined) {
                productUpdate.isActive = updateData.status !== 'inactive';
            }
            // Product attributes
            if (updateData.brand !== undefined) productUpdate.brand = updateData.brand || null;
            if (updateData.color !== undefined) productUpdate.color = updateData.color || null;
            if (updateData.size !== undefined) productUpdate.size = updateData.size || null;
            if (updateData.dimensions !== undefined) productUpdate.dimensions = updateData.dimensions || null;
            if (updateData.weight !== undefined) productUpdate.weight = updateData.weight ? parseFloat(updateData.weight) : null;
            // Promotional pricing
            if (updateData.promoPrice !== undefined) productUpdate.promoPrice = updateData.promoPrice ? parseFloat(updateData.promoPrice) : null;
            if (updateData.promoStart !== undefined) productUpdate.promoStart = updateData.promoStart ? new Date(updateData.promoStart) : null;
            if (updateData.promoEnd !== undefined) productUpdate.promoEnd = updateData.promoEnd ? new Date(updateData.promoEnd) : null;
            // Tax
            if (updateData.isTaxable !== undefined) productUpdate.isTaxable = updateData.isTaxable;
            // Dates
            if (updateData.expirationDate !== undefined) productUpdate.expirationDate = updateData.expirationDate ? new Date(updateData.expirationDate) : null;
            if (updateData.manufactureDate !== undefined) productUpdate.manufactureDate = updateData.manufactureDate ? new Date(updateData.manufactureDate) : null;
            // Supplier info
            if (updateData.supplierName !== undefined) productUpdate.supplierName = updateData.supplierName || null;
            if (updateData.supplierCode !== undefined) productUpdate.supplierCode = updateData.supplierCode || null;

            if (Object.keys(productUpdate).length > 0) {
                await tx.product.update({
                    where: { id: productId },
                    data: productUpdate
                });
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
                await tx.inventory.updateMany({
                    where: { productId },
                    data: inventoryUpdate
                });
            }
        });

        return 1;
    }

    /**
     * Update with user context
     */
    static async updateWithUser(productId: string, updateData: Record<string, any>, _auth: AuthenticatedUser): Promise<number> {
        return await this.update(productId, updateData);
    }

    /**
     * Void/deactivate product
     */
    static async void(productId: string, _auth: AuthenticatedUser): Promise<number> {
        await prisma.product.update({
            where: { id: productId },
            data: { isActive: false }
        });
        return 1;
    }

    /**
     * Delete product
     */
    static async delete(productId: string): Promise<number> {
        await prisma.product.delete({
            where: { id: productId }
        });
        return 1;
    }

    /**
     * Update quantity
     */
    static async updateQuantity(productId: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        await prisma.inventory.updateMany({
            where: {
                productId: productId,
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
     */
    static async incrementInventory(
        products: Array<{ productId: string; quantity: number }>,
        auth: AuthenticatedUser
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            for (const item of products) {
                const inventory = await tx.inventory.findFirst({
                    where: {
                        productId: item.productId,
                        branchId: auth.branchId
                    }
                });

                if (!inventory) {
                    throw new Error(`Inventory not found for product ${item.productId}`);
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
                            productId: item.productId,
                            branchId: auth.branchId
                        },
                        include: {
                            product: {
                                select: { name: true }
                            }
                        }
                    });

                    if (!inventory) {
                        throw new NotFoundError('Inventory', item.productId);
                    }

                    const newQuantity = inventory.availableQuantity - item.quantity;

                    if (newQuantity < 0 && !inventory.allowNegativeStock) {
                        const productName = inventory.product?.name || item.productId;
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
     * Get inventory count
     */
    static async getCount(auth: AuthenticatedUser, includeVoided = false): Promise<number> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (!includeVoided) {
            whereClause.isActive = true;
        }

        return await prisma.product.count({
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
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
        } else if (filter === 'low-stock') {
            whereClause.isActive = true;
        } else if (filter === 'expiring-soon') {
            whereClause.isActive = true;
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expirationDate = {
                gte: now,
                lte: thirtyDaysFromNow
            };
        } else if (filter === 'expired') {
            whereClause.isActive = true;
            const now = new Date();
            whereClause.expirationDate = {
                lt: now
            };
        }

        // Category filter
        if (categoryId) {
            whereClause.categoryId = categoryId;
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
                { name: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    productBarcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        // Get filtered products with their inventories
        let products = await prisma.product.findMany({
            where: whereClause,
            include: {
                inventories: {
                    where: {
                        branchId: auth.branchId
                    }
                },
                category: true
            }
        });

        // Post-process for low-stock filter
        if (filter === 'low-stock') {
            products = products.filter(product => {
                const inventory = product.inventories[0];
                if (!inventory?.reorderPoint) return false;
                return inventory.availableQuantity <= inventory.reorderPoint;
            });
        }

        const totalProducts = products.length;
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

        for (const product of products) {
            const inventory = product.inventories[0];
            const availableQty = inventory?.availableQuantity || 0;
            const avgCost = Number(inventory?.averageCost || 0);
            const sellingPrice = Number(product.sellingPrice || 0);
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

            // Category breakdown
            const categoryKey = product.categoryId || 'uncategorized';
            const categoryName = product.category?.name || 'Uncategorized';

            if (!categoryMap.has(categoryKey)) {
                categoryMap.set(categoryKey, {
                    categoryId: product.categoryId,
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
        const products = await prisma.product.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true
            },
            include: {
                inventories: {
                    where: {
                        branchId: auth.branchId
                    }
                },
                category: true
            }
        });

        const itemValues = products.map(product => {
            const inventory = product.inventories[0];
            const availableQty = inventory?.availableQuantity || 0;
            const avgCost = Number(inventory?.averageCost || 0);
            const sellingPrice = Number(product.sellingPrice || 0);
            const totalCostValue = availableQty * avgCost;
            const totalRetailValue = availableQty * sellingPrice;

            return {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                categoryName: product.category?.name || null,
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
     * Check if product exists
     */
    static async exists(productId: string, auth: AuthenticatedUser): Promise<boolean> {
        const count = await prisma.product.count({
            where: {
                id: productId,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        });
        return count > 0;
    }

    /**
     * Map Product + Inventory to InventoryItem interface
     */
    private static mapToInventoryItem(data: any): InventoryItem | null {
        if (!data) return null;

        const inventory = data.inventories?.[0];
        if (!inventory) {
            return {
                productId: data.id,
                inventoryId: '',
                sku: data.sku,
                name: data.name,
                description: data.description,
                unit: data.unit,
                sellingPrice: Number(data.sellingPrice),
                primaryBarcode: data.primaryBarcode,
                isActive: data.isActive,
                // Product attributes
                brand: data.brand,
                color: data.color,
                size: data.size,
                dimensions: data.dimensions,
                weight: data.weight ? Number(data.weight) : undefined,
                // Promotional pricing
                promoPrice: data.promoPrice ? Number(data.promoPrice) : undefined,
                promoStart: data.promoStart,
                promoEnd: data.promoEnd,
                // Tax
                isTaxable: data.isTaxable,
                // Dates
                expirationDate: data.expirationDate,
                manufactureDate: data.manufactureDate,
                // Supplier info
                supplierName: data.supplierName,
                supplierCode: data.supplierCode,
                availableQuantity: 0,
                reservedQuantity: 0,
                damagedQuantity: 0,
                averageCost: 0,
                lastPurchaseCost: 0,
                trackInventory: true,
                allowNegativeStock: false,
                tenantId: data.tenantId,
                branchId: data.branchId,
                categoryId: data.categoryId,
                categoryDetails: data.category ? {
                    categoryId: data.category.id,
                    name: data.category.name,
                    description: data.category.description,
                    isDefault: data.category.isDefault,
                    tenantId: data.category.tenantId,
                    branchId: data.category.branchId,
                    userId: data.category.userId
                } : undefined,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                barcode: data.primaryBarcode || '',
                quantity: '0',
                costPrice: 0,
                sellPrice: Number(data.sellingPrice),
                status: data.isActive ? 'active' : 'inactive',
                barcodes: data.productBarcodes?.map((b: any) => ({
                    barcode: b.barcode,
                    barcodeType: b.barcodeType,
                    barcodeSource: b.barcodeSource,
                    isActive: b.isActive
                })) || []
            };
        }

        return {
            productId: data.id,
            inventoryId: inventory.id,
            sku: data.sku,
            name: data.name,
            description: data.description,
            unit: data.unit,
            sellingPrice: Number(data.sellingPrice),
            primaryBarcode: data.primaryBarcode,
            isActive: data.isActive,
            // Product attributes
            brand: data.brand,
            color: data.color,
            size: data.size,
            dimensions: data.dimensions,
            weight: data.weight ? Number(data.weight) : undefined,
            // Promotional pricing
            promoPrice: data.promoPrice ? Number(data.promoPrice) : undefined,
            promoStart: data.promoStart,
            promoEnd: data.promoEnd,
            // Tax
            isTaxable: data.isTaxable,
            // Dates
            expirationDate: data.expirationDate,
            manufactureDate: data.manufactureDate,
            // Supplier info
            supplierName: data.supplierName,
            supplierCode: data.supplierCode,
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
            categoryId: data.categoryId,
            categoryDetails: data.category ? {
                categoryId: data.category.id,
                name: data.category.name,
                description: data.category.description,
                isDefault: data.category.isDefault,
                tenantId: data.category.tenantId,
                branchId: data.category.branchId,
                userId: data.category.userId
            } : undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            barcode: data.primaryBarcode || '',
            quantity: inventory.availableQuantity.toString(),
            originalQuantity: inventory.availableQuantity.toString(),
            costPrice: Number(inventory.averageCost),
            sellPrice: Number(data.sellingPrice),
            status: data.isActive ? 'active' : 'inactive',
            minStock: inventory.reorderPoint,
            totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
            barcodes: data.productBarcodes?.map((b: any) => ({
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
    static async updateWithValidation(productId: string, inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        try {
            // Verify product exists and belongs to tenant/branch
            const exists = await this.exists(productId, auth);
            if (!exists) {
                throw new NotFoundError('Product', productId);
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
                    productId
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

            return await this.update(productId, inventoryData);
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

    static async voidWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const exists = await this.exists(productId, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }
        return await this.void(productId, auth);
    }

    static async deleteWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const exists = await this.exists(productId, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }
        return await this.delete(productId);
    }

    static async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}
