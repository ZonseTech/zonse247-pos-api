import { ProductModel } from './product.model';
import { AuthenticatedUser } from 'auth';
import { Product } from 'product';
import { CartItem } from 'order';
import prisma from '../databases/prisma/client';
import { InventoryStatus } from '../databases/prisma/generated/prisma/enums';

export class InventoryModel {

    static async findById(productId: string, auth: AuthenticatedUser): Promise<Product | null> {
        const product = await prisma.inventory.findFirst({
            where: {
                productId: productId,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        });

        return this.mapPrismaToProduct(product);
    }

    static async findByUuid(uuid: string): Promise<Product | null> {
        const product = await prisma.inventory.findUnique({
            where: { productId: uuid }
        });

        return this.mapPrismaToProduct(product);
    }

    static async find(criteria: Record<string, any>, auth: AuthenticatedUser): Promise<Product[]> {
        const baseCriteria = {
            ...criteria,
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        const whereClause = this.buildWhereClause(baseCriteria);

        const products = await prisma.inventory.findMany({
            where: whereClause
        });

        return products.map(p => this.mapPrismaToProduct(p));
    }

    static async findActive(auth: AuthenticatedUser): Promise<Product[]> {
        const products = await prisma.inventory.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                NOT: { status: InventoryStatus.inactive }
            }
        });

        return products.map(p => this.mapPrismaToProduct(p));
    }

    static async findActiveWithPagination(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: number
    ): Promise<Product[]> {
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
            whereClause.categoryUuid = categoryId.toString();
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

        return products.map(p => this.mapPrismaToProduct(p));
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
            whereClause.categoryUuid = categoryId.toString();
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

    static async findBySku(sku: string, auth: AuthenticatedUser): Promise<Product | null> {
        const product = await prisma.inventory.findFirst({
            where: {
                barcode: sku,
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        });

        return this.mapPrismaToProduct(product);
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

    static async decrementInventory(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<void> {
        try {
            const successful: string[] = [];
            const failed: Array<{ productId: string; error: string }> = [];
            const skipped: Array<{ productId: string; reason: string }> = [];

            // Process each product update in a transaction
            for (const item of products) {
                try {
                    // Check if product exists and has sufficient quantity
                    const existingProduct = await prisma.inventory.findFirst({
                        where: {
                            productId: item.productId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId
                        }
                    });

                    if (!existingProduct) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Product not found'
                        });
                        continue;
                    }

                    if (existingProduct.status === InventoryStatus.inactive) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Product is voided'
                        });
                        continue;
                    }

                    // Check if sufficient quantity
                    const newQuantity = parseInt(existingProduct.quantity) - item.quantity;
                    if (newQuantity < 0) {
                        failed.push({
                            productId: item.productId,
                            error: 'Insufficient quantity'
                        });
                        continue;
                    }

                    // Update the product
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
                    // Check product existence and status
                    const existingProduct = await tx.inventory.findFirst({
                        where: {
                            productId: item.productId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId,
                            NOT: { status: InventoryStatus.inactive }
                        }
                    });

                    if (!existingProduct) {
                        skipped.push({
                            productId: item.productId,
                            reason: 'Product not found or voided'
                        });
                        continue;
                    }

                    // Check quantity
                    const newQuantity = parseInt(existingProduct.quantity) - item.quantity;
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

    static async create(productData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        const productModel = ProductModel.create(productData, auth);

        if (!productModel.validate()) {
            throw new Error('Product validation failed');
        }

        await this.insert(productModel.toJSON());
    }

    static async updateWithValidation(productId: string, productData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const productModel = ProductModel.fromParams(productData, auth);

        if (!productModel.validate()) {
            throw new Error('Product validation failed');
        }

        const existingProduct = await this.findById(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found or access denied');
        }

        return await this.update(productId, productModel.toJSON());
    }

    static async voidWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const existingProduct = await this.findById(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found or access denied');
        }

        return await this.void(productId, auth);
    }

    static async deleteWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const existingProduct = await this.findById(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found or access denied');
        }

        return await this.delete(productId);
    }

    static async exists(productId: string, auth: AuthenticatedUser): Promise<boolean> {
        const product = await this.findById(productId, auth);
        return product !== null;
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
        // Convert data types and handle special fields
        const preparedData: any = { ...data };

        // Handle decimal fields
        if (preparedData.price) {
            preparedData.price = parseFloat(preparedData.price);
        }
        if (preparedData.cost) {
            preparedData.cost = parseFloat(preparedData.cost);
        }

        // Handle integer fields
        if (preparedData.quantity) {
            preparedData.quantity = parseInt(preparedData.quantity);
        }
        if (preparedData.minStock) {
            preparedData.minStock = parseInt(preparedData.minStock);
        }
        if (preparedData.maxStock) {
            preparedData.maxStock = parseInt(preparedData.maxStock);
        }

        // Ensure timestamps
        if (!preparedData.updatedAt) {
            preparedData.updatedAt = new Date();
        }

        return preparedData;
    }

    private static mapPrismaToProduct(prismaProduct): Product | null {
        if (!prismaProduct) return null;

        return {
            ...prismaProduct,
            // Convert Decimal to number if needed
            price: prismaProduct.price ? Number(prismaProduct.price) : 0,
            cost: prismaProduct.cost ? Number(prismaProduct.cost) : 0,
            // Add any other transformations here
        } as Product;
    }

    // Cleanup method
    static async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}