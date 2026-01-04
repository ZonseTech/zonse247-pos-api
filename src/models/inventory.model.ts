import { CartItem } from 'order';
import { AuthenticatedUser } from 'auth';
import { InventoryItem } from 'inventory-item';
import prisma from '../databases/prisma/client';
import { InventoryItemModel } from '../serializers/inventory-item.serializer';
import { InventoryStatus } from '../databases/prisma/generated/prisma/enums';

export class InventoryModel {

    static async findById(productId: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        const product = await prisma.inventory.findFirst({
            where: {
                productId: productId,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        });

        return this.mapPrismaToInventoryItem(product);
    }

    static async findByUuid(uuid: string): Promise<InventoryItem | null> {
        const product = await prisma.inventory.findUnique({
            where: { productId: uuid }
        });

        return this.mapPrismaToInventoryItem(product);
    }

    static async find(criteria: Record<string, any>, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const baseCriteria = {
            ...criteria,
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        const whereClause = this.buildWhereClause(baseCriteria);

        const products = await prisma.inventory.findMany({
            where: whereClause
        });

        return products.map(p => this.mapPrismaToInventoryItem(p));
    }

    static async findActive(auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const products = await prisma.inventory.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                NOT: { status: InventoryStatus.inactive }
            }
        });

        return products.map(p => this.mapPrismaToInventoryItem(p));
    }

    static async findActiveWithPagination(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: number
    ): Promise<InventoryItem[]> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (filter === 'all') {
            whereClause.NOT = { status: InventoryStatus.inactive };
        } else if (filter === 'new') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.NOT = { status: InventoryStatus.inactive };
        } else if (filter === 'expiring') {
            const now = new Date();
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            whereClause.expirationDate = {
                gt: now,
                lte: thirtyDaysLater
            };
            whereClause.NOT = { status: InventoryStatus.inactive };
        } else if (filter === 'expired') {
            const now = new Date();
            whereClause.expirationDate = { lte: now };
        }

        if (categoryId) {
            whereClause.categoryId = categoryId.toString();
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' as const } },
                { barcode: { contains: search, mode: 'insensitive' as const } }
            ];
        }

        const products = await prisma.inventory.findMany({
            where: whereClause,
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return products.map(p => this.mapPrismaToInventoryItem(p));
    }

    static async getFilteredCount(
        auth: AuthenticatedUser,
        search = '',
        filter = 'all',
        categoryId?: number
    ): Promise<number> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (categoryId) {
            whereClause.categoryId = categoryId.toString();
        }

        if (filter === 'all') {
            whereClause.NOT = { status: InventoryStatus.inactive };
        } else if (filter === 'new') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.NOT = { status: InventoryStatus.inactive };
        } else if (filter === 'expiring') {
            const now = new Date();
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            whereClause.expirationDate = {
                gt: now,
                lte: thirtyDaysLater
            };
            whereClause.NOT = { status: InventoryStatus.inactive };
        } else if (filter === 'expired') {
            const now = new Date();
            whereClause.expirationDate = { lte: now };
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' as const } },
                { barcode: { contains: search, mode: 'insensitive' as const } }
            ];
        }

        return await prisma.inventory.count({
            where: whereClause
        });
    }

    static async findBySku(sku: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        const product = await prisma.inventory.findFirst({
            where: {
                barcode: sku,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        });

        return this.mapPrismaToInventoryItem(product);
    }

    static async insert(productData: Record<string, any>): Promise<void> {
        await prisma.inventory.create({
            data: this.prepareProductData(productData)
        });
    }

    static async update(productId: string, updateData: Record<string, any>): Promise<number> {
        const result = await prisma.inventory.update({
            where: { productId: productId },
            data: this.prepareProductData(updateData)
        });

        return result ? 1 : 0;
    }

    static async updateWithUser(productId: string, updateData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const dataWithUser = {
            ...updateData,
            userId: auth.userId
        };

        const result = await prisma.inventory.update({
            where: { productId: productId },
            data: this.prepareProductData(dataWithUser)
        });

        return result ? 1 : 0;
    }

    static async void(productId: string, auth: AuthenticatedUser): Promise<number> {
        const result = await prisma.inventory.update({
            where: { productId: productId },
            data: {
                status: InventoryStatus.inactive,
                userId: auth.userId,
                updatedAt: new Date()
            }
        });

        return result ? 1 : 0;
    }

    static async delete(productId: string): Promise<number> {
        try {
            await prisma.inventory.delete({
                where: { productId: productId }
            });
            return 1;
        } catch (error) {
            console.error('Error deleting product:', error);
            return 0;
        }
    }

    static async updateQuantity(productId: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        const result = await prisma.inventory.update({
            where: { productId: productId },
            data: {
                quantity: quantity.toString(),
                userId: auth.userId,
                updatedAt: new Date()
            }
        });

        return result ? 1 : 0;
    }

    static async incrementInventory(
        products: Array<{ productId: string; quantity: number }>,
        auth: AuthenticatedUser
    ): Promise<void> {
        try {
            const successful: string[] = [];
            const failed: Array<{ productId: string; error: string }> = [];
            const skipped: Array<{ productId: string; reason: string }> = [];

            for (const item of products) {
                try {
                    const existingItem = await prisma.inventory.findFirst({
                        where: {
                            productId: item.productId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId
                        }
                    });

                    if (!existingItem) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Inventory item not found'
                        });
                        continue;
                    }

                    if (existingItem.status === InventoryStatus.inactive) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Inventory item is voided'
                        });
                        continue;
                    }

                    // Increment the inventory quantity
                    const newQuantity = parseInt(existingItem.quantity) + item.quantity;

                    // Update the inventory item
                    await prisma.inventory.update({
                        where: { productId: item.productId },
                        data: {
                            quantity: newQuantity.toString(),
                            userId: auth.userId,
                            updatedAt: new Date()
                        }
                    });

                    successful.push(item.productId);
                } catch (error) {
                    failed.push({
                        productId: item.productId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            console.log('Inventory Increment Results:', {
                successful: successful.length,
                failed: failed.length,
                skipped: skipped.length
            });

            if (failed.length > 0) {
                console.error('Failed inventory increments:', failed);
                throw new Error(`${failed.length} inventory increments failed`);
            }

        } catch (error) {
            console.error('incrementInventory error:', error);
            throw error;
        }
    }

    static async decrementInventory(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<void> {
        try {
            const successful: string[] = [];
            const failed: Array<{ productId: string; error: string }> = [];
            const skipped: Array<{ productId: string; reason: string }> = [];

            // Process each inventory item update in a transaction
            for (const item of products) {
                try {
                    // Check if inventory item exists and has sufficient quantity
                    const existingItem = await prisma.inventory.findFirst({
                        where: {
                            productId: item.productId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId
                        }
                    });

                    if (!existingItem) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Inventory item not found'
                        });
                        continue;
                    }

                    if (existingItem.status === InventoryStatus.inactive) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Inventory item is voided'
                        });
                        continue;
                    }

                    // Check if sufficient quantity
                    const newQuantity = parseInt(existingItem.quantity) - item.quantity;
                    if (newQuantity < 0) {
                        failed.push({
                            productId: item.productId,
                            error: 'Insufficient quantity'
                        });
                        continue;
                    }

                    // Update the inventory item
                    await prisma.inventory.update({
                        where: { productId: item.productId },
                        data: {
                            quantity: newQuantity.toString(),
                            userId: auth.userId,
                            updatedAt: new Date()
                        }
                    });

                    successful.push(item.productId);
                } catch (error) {
                    failed.push({
                        productId: item.productId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            console.log('Inventory Update Results:', {
                successful: successful.length,
                failed: failed.length,
                skipped: skipped.length
            });

            if (failed.length > 0) {
                console.error('Failed inventory updates:', failed);
                throw new Error(`${failed.length} inventory updates failed`);
            }

        } catch (error) {
            console.error('decrementInventory error:', error);
            throw error;
        }
    }

    static async decrementInventoryWithDetailedResults(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<{
        successful: number;
        failed: Array<{ productId: string; error: string }>;
        skipped: Array<{ productId: string; reason: string }>;
    }> {
        const successful: string[] = [];
        const failed: Array<{ productId: string; error: string }> = [];
        const skipped: Array<{ productId: string; reason: string }> = [];

        // Use transaction for atomic updates
        await prisma.$transaction(async (tx) => {
            for (const item of products) {
                try {
                    // Check inventory item existence and status
                    const existingItem = await tx.inventory.findFirst({
                        where: {
                            productId: item.productId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId,
                            NOT: { status: InventoryStatus.inactive }
                        }
                    });

                    if (!existingItem) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Inventory item not found or voided'
                        });
                        continue;
                    }

                    // Check quantity
                    const newQuantity = parseInt(existingItem.quantity) - item.quantity;
                    if (newQuantity < 0) {
                        failed.push({
                            productId: item.productId,
                            error: 'Insufficient quantity'
                        });
                        continue;
                    }

                    // Update quantity
                    await tx.inventory.update({
                        where: { productId: item.productId },
                        data: {
                            quantity: newQuantity.toString(),
                            userId: auth.userId,
                            updatedAt: new Date()
                        }
                    });

                    successful.push(item.productId);
                } catch (error) {
                    failed.push({
                        productId: item.productId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });

        return {
            successful: successful.length,
            failed,
            skipped
        };
    }

    static async create(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        const inventoryItemModel = InventoryItemModel.create(inventoryData, auth);

        if (!inventoryItemModel.validate()) {
            throw new Error('Inventory item validation failed');
        }

        await this.insert(inventoryItemModel.toJSON());
    }

    static async updateWithValidation(productId: string, inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const inventoryItemModel = InventoryItemModel.fromParams(inventoryData, auth);

        if (!inventoryItemModel.validate()) {
            throw new Error('Inventory item validation failed');
        }

        const existingItem = await this.findById(productId, auth);
        if (!existingItem) {
            throw new Error('Inventory item not found or access denied');
        }

        return await this.update(productId, inventoryItemModel.toJSON());
    }

    static async voidWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const existingItem = await this.findById(productId, auth);
        if (!existingItem) {
            throw new Error('Inventory item not found or access denied');
        }

        return await this.void(productId, auth);
    }

    static async deleteWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const existingItem = await this.findById(productId, auth);
        if (!existingItem) {
            throw new Error('Inventory item not found or access denied');
        }

        return await this.delete(productId);
    }

    static async exists(productId: string, auth: AuthenticatedUser): Promise<boolean> {
        const inventoryItem = await this.findById(productId, auth);
        return inventoryItem !== null;
    }

    static async getCount(auth: AuthenticatedUser, includeVoided = false): Promise<number> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (!includeVoided) {
            whereClause.NOT = { status: InventoryStatus.inactive };
        }

        return await prisma.inventory.count({
            where: whereClause
        });
    }

    // Helper methods
    private static buildWhereClause(criteria: Record<string, any>): any {
        const where: any = {};

        for (const [key, value] of Object.entries(criteria)) {
            if (key === '$or') {
                where.OR = value;
            } else if (key === '$ne') {
                // Handle not equals - assuming criteria like { status: { $ne: 'void' } }
                where.NOT = value;
            } else if (typeof value === 'object' && value !== null) {
                // Handle operators like $gte, $lte, etc.
                const operators: Record<string, string> = {
                    '$gte': 'gte',
                    '$lte': 'lte',
                    '$gt': 'gt',
                    '$lt': 'lt',
                    '$regex': 'contains',
                    '$options': 'mode'
                };

                const prismaOperators: any = {};
                for (const [op, val] of Object.entries(value)) {
                    if (op === '$regex') {
                        prismaOperators.contains = val;
                        if (value.$options === 'i') {
                            prismaOperators.mode = 'insensitive';
                        }
                    } else if (op in operators) {
                        prismaOperators[operators[op]] = val;
                    }
                }

                where[key] = prismaOperators;
            } else {
                where[key] = value;
            }
        }

        return where;
    }

    private static prepareProductData(data: Record<string, any>): any {
        // Convert data types and handle special fields to match database schema
        const preparedData: any = {};

        // Map fields to database columns
        if (data.productId !== undefined) preparedData.productId = data.productId;
        if (data.branchId !== undefined) preparedData.branchId = data.branchId;
        if (data.tenantId !== undefined) preparedData.tenantId = data.tenantId;
        if (data.userId !== undefined) preparedData.userId = data.userId;
        if (data.categoryId !== undefined) preparedData.categoryId = data.categoryId;
        if (data.barcode !== undefined) preparedData.barcode = String(data.barcode);
        if (data.sku !== undefined) preparedData.sku = data.sku;
        if (data.name !== undefined) preparedData.name = data.name;
        if (data.description !== undefined) preparedData.description = data.description;
        if (data.brand !== undefined) preparedData.brand = data.brand;
        if (data.unit !== undefined) preparedData.unit = data.unit;

        // Handle decimal/price fields
        if (data.costPrice !== undefined) preparedData.costPrice = parseFloat(data.costPrice) || 0;
        if (data.sellPrice !== undefined) preparedData.sellPrice = parseFloat(data.sellPrice) || 0;
        if (data.promoPrice !== undefined) preparedData.promoPrice = data.promoPrice ? parseFloat(data.promoPrice) : null;
        if (data.weight !== undefined) preparedData.weight = data.weight ? parseFloat(data.weight) : null;

        // Handle date fields - convert to Date objects or null for optional DateTime fields
        if (data.promoStart !== undefined) preparedData.promoStart = this.parseDate(data.promoStart);
        if (data.promoEnd !== undefined) preparedData.promoEnd = this.parseDate(data.promoEnd);
        if (data.expirationDate !== undefined) preparedData.expirationDate = this.parseDate(data.expirationDate);
        if (data.manufactureDate !== undefined) preparedData.manufactureDate = this.parseDate(data.manufactureDate);

        // Handle quantity fields (stored as string in DB)
        if (data.quantity !== undefined) preparedData.quantity = String(data.quantity || '0');
        if (data.originalQuantity !== undefined) preparedData.originalQuantity = String(data.originalQuantity || '0');
        if (data.reservedQuantity !== undefined) preparedData.reservedQuantity = parseInt(data.reservedQuantity) || 0;

        // Handle integer fields
        if (data.minStock !== undefined) preparedData.minStock = parseInt(data.minStock) || 0;
        if (data.maxStock !== undefined) preparedData.maxStock = data.maxStock ? parseInt(data.maxStock) : null;
        if (data.reorderLevel !== undefined) preparedData.reorderLevel = data.reorderLevel ? parseInt(data.reorderLevel) : null;

        // Handle string fields
        if (data.dimensions !== undefined) preparedData.dimensions = data.dimensions;
        if (data.color !== undefined) preparedData.color = data.color;
        if (data.size !== undefined) preparedData.size = data.size;

        // Handle JSON fields
        if (data.properties !== undefined) preparedData.properties = data.properties;
        if (data.imageUrls !== undefined) preparedData.imageUrls = data.imageUrls;

        // Handle status and boolean fields
        if (data.status !== undefined) preparedData.status = data.status;
        if (data.trackInventory !== undefined) preparedData.trackInventory = Boolean(data.trackInventory);
        if (data.allowNegativeStock !== undefined) preparedData.allowNegativeStock = Boolean(data.allowNegativeStock);
        if (data.isTaxable !== undefined) preparedData.isTaxable = Boolean(data.isTaxable);

        // Handle supplier fields
        if (data.supplierName !== undefined) preparedData.supplierName = data.supplierName;
        if (data.supplierCode !== undefined) preparedData.supplierCode = data.supplierCode;

        // Handle audit fields
        if (data.createdBy !== undefined) preparedData.createdBy = data.createdBy;
        if (data.lastUpdatedBy !== undefined) preparedData.lastUpdatedBy = data.lastUpdatedBy;
        if (data.synced !== undefined) preparedData.synced = parseInt(data.synced) || 0;

        // Ensure timestamps
        if (!preparedData.updatedAt) {
            preparedData.updatedAt = new Date();
        }
        if (data.createdAt !== undefined) preparedData.createdAt = data.createdAt;

        return preparedData;
    }

    /**
     * Parse date string or Date object to a valid Date object for Prisma DateTime fields.
     * Handles various date formats including ISO-8601, date-only strings (YYYY-MM-DD), etc.
     * Returns null for empty/falsy values.
     */
    private static parseDate(value: any): Date | null {
        if (!value) return null;

        // If it's already a Date object, return it
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }

        // If it's a string, try to parse it
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;

            // If it's a date-only string (YYYY-MM-DD), append time to make it a valid ISO-8601 DateTime
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const date = new Date(trimmed + 'T00:00:00.000Z');
                return isNaN(date.getTime()) ? null : date;
            }

            // Otherwise, try to parse as-is
            const date = new Date(trimmed);
            return isNaN(date.getTime()) ? null : date;
        }

        return null;
    }

    /**
     * Map Prisma inventory record to InventoryItem interface
     */
    private static mapPrismaToInventoryItem(prismaItem: any): InventoryItem | null {
        if (!prismaItem) return null;

        return {
            productId: prismaItem.productId,
            branchId: prismaItem.branchId,
            tenantId: prismaItem.tenantId,
            userId: prismaItem.userId,
            categoryId: prismaItem.categoryId,
            barcode: prismaItem.barcode,
            sku: prismaItem.sku,
            name: prismaItem.name,
            description: prismaItem.description,
            brand: prismaItem.brand,
            unit: prismaItem.unit,
            color: prismaItem.color,
            size: prismaItem.size,
            dimensions: prismaItem.dimensions,
            weight: prismaItem.weight ? Number(prismaItem.weight) : undefined,
            properties: prismaItem.properties,
            costPrice: Number(prismaItem.costPrice || 0),
            sellPrice: Number(prismaItem.sellPrice || 0),
            promoPrice: prismaItem.promoPrice ? Number(prismaItem.promoPrice) : undefined,
            promoStart: prismaItem.promoStart,
            promoEnd: prismaItem.promoEnd,
            quantity: prismaItem.quantity || '0',
            originalQuantity: prismaItem.originalQuantity || '0',
            reservedQuantity: prismaItem.reservedQuantity,
            minStock: prismaItem.minStock,
            maxStock: prismaItem.maxStock,
            stock: prismaItem.stock,
            reorderLevel: prismaItem.reorderLevel,
            status: prismaItem.status,
            trackInventory: prismaItem.trackInventory,
            allowNegativeStock: prismaItem.allowNegativeStock,
            isTaxable: prismaItem.isTaxable,
            expirationDate: prismaItem.expirationDate,
            manufactureDate: prismaItem.manufactureDate,
            imageUrls: prismaItem.imageUrls,
            supplierName: prismaItem.supplierName,
            supplierCode: prismaItem.supplierCode,
            createdBy: prismaItem.createdBy,
            lastUpdatedBy: prismaItem.lastUpdatedBy,
            synced: prismaItem.synced,
            createdAt: prismaItem.createdAt,
            updatedAt: prismaItem.updatedAt
        };
    }

    // Cleanup method
    static async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}