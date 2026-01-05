import { CartItem } from 'order';
import { AuthenticatedUser } from 'auth';
import { InventoryItem } from 'inventory-item';
import prisma from '../databases/prisma/client';

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
                }
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
                }
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
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
        } else if (filter === 'low-stock') {
            whereClause.isActive = true;
            // We'll filter this in post-processing since we need to compare inventory fields
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
                }
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
                }
            }
        });

        return this.mapToInventoryItem(result);
    }

    /**
     * Create new product with inventory
     */
    static async create(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    sku: inventoryData.sku || inventoryData.barcode,
                    name: inventoryData.name,
                    description: inventoryData.description,
                    unit: inventoryData.unit || 'piece',
                    sellingPrice: parseFloat(inventoryData.sellPrice || inventoryData.sellingPrice || 0),
                    primaryBarcode: inventoryData.barcode || inventoryData.primaryBarcode,
                    isActive: inventoryData.status !== 'inactive'
                }
            });

            await tx.inventory.create({
                data: {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    productId: product.id,
                    availableQuantity: parseInt(inventoryData.quantity || 0),
                    reservedQuantity: parseInt(inventoryData.reservedQuantity || 0),
                    damagedQuantity: 0,
                    averageCost: parseFloat(inventoryData.costPrice || 0),
                    lastPurchaseCost: parseFloat(inventoryData.costPrice || 0),
                    reorderPoint: inventoryData.minStock ? parseInt(inventoryData.minStock) : null,
                    maxStock: inventoryData.maxStock ? parseInt(inventoryData.maxStock) : null,
                    trackInventory: inventoryData.trackInventory !== false,
                    allowNegativeStock: inventoryData.allowNegativeStock || false
                }
            });

            if (inventoryData.additionalBarcodes && Array.isArray(inventoryData.additionalBarcodes)) {
                for (const barcode of inventoryData.additionalBarcodes) {
                    await tx.productBarcode.create({
                        data: {
                            productId: product.id,
                            barcode: barcode.code || barcode,
                            barcodeType: barcode.type || 'EAN13',
                            barcodeSource: barcode.source || 'STORE',
                            isActive: true
                        }
                    });
                }
            }
        });
    }

    /**
     * Update product and inventory
     */
    static async update(productId: string, updateData: Record<string, any>): Promise<number> {
        await prisma.$transaction(async (tx) => {
            // Update product
            const productUpdate: any = {};
            if (updateData.name !== undefined) productUpdate.name = updateData.name;
            if (updateData.description !== undefined) productUpdate.description = updateData.description;
            if (updateData.unit !== undefined) productUpdate.unit = updateData.unit;
            if (updateData.sellPrice !== undefined || updateData.sellingPrice !== undefined) {
                productUpdate.sellingPrice = parseFloat(updateData.sellPrice || updateData.sellingPrice);
            }
            if (updateData.barcode !== undefined || updateData.primaryBarcode !== undefined) {
                productUpdate.primaryBarcode = updateData.barcode || updateData.primaryBarcode;
            }
            if (updateData.status !== undefined) {
                productUpdate.isActive = updateData.status !== 'inactive';
            }

            if (Object.keys(productUpdate).length > 0) {
                await tx.product.update({
                    where: { id: productId },
                    data: productUpdate
                });
            }

            // Update inventory
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
                    where: { productId: productId },
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
     */
    static async decrementInventory(
        products: CartItem[],
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

                const newQuantity = inventory.availableQuantity - item.quantity;
                if (newQuantity < 0 && !inventory.allowNegativeStock) {
                    throw new Error(`Insufficient quantity for product ${item.productId}`);
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
            // Product without inventory record
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
                availableQuantity: 0,
                reservedQuantity: 0,
                damagedQuantity: 0,
                averageCost: 0,
                lastPurchaseCost: 0,
                trackInventory: true,
                allowNegativeStock: false,
                tenantId: data.tenantId,
                branchId: data.branchId,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                // Legacy compatibility
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
            tenantId: data.tenantId,
            branchId: data.branchId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            // Legacy compatibility fields
            barcode: data.primaryBarcode || '',
            quantity: inventory.availableQuantity.toString(),
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
    static async updateWithValidation(productId: string, inventoryData: Record<string, any>, _auth: AuthenticatedUser): Promise<number> {
        return await this.update(productId, inventoryData);
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
