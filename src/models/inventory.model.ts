import { sealDBModel } from '../databases/local';
import { ProductModel } from './product.model';
import { INVENTORY_DB } from '../databases/local/tables';
import { AuthenticatedUser } from 'auth';
import { Product } from 'product';
import { CartItem } from 'order';

export class InventoryModel {
    static async findById(productId: string, auth: AuthenticatedUser): Promise<Product | null> {
        return await sealDBModel.findById(INVENTORY_DB, {
            productId,
            tenantId: auth.tenantId,
            branchId: auth.branchId
        });
    }

    static async findByUuid(productId: string): Promise<Product | null> {
        return await sealDBModel.findById(INVENTORY_DB, productId);
    }

    static async find(criteria: Record<string, any>, auth: AuthenticatedUser): Promise<Product[]> {
        const baseCriteria = {
            ...criteria,
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        return await sealDBModel.find(INVENTORY_DB, baseCriteria);
    }

    static async findActive(auth: AuthenticatedUser): Promise<Product[]> {
        return await sealDBModel.find(INVENTORY_DB, {
            status: { $ne: 'void' },
            tenantId: auth.tenantId,
            branchId: auth.branchId
        });
    }

    static async findActiveWithPagination(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: number
    ): Promise<Product[]> {
        const query: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (filter === 'all') {
            query.status = { $ne: 'void' };
        } else if (filter === 'new') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            query.createdAt = { $gte: oneWeekAgo.toISOString() };
            query.status = { $ne: 'void' };
        } else if (filter === 'expiring') {
            const now = new Date();
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            query.expirationDate = {
                $gt: now.toISOString(),
                $lte: thirtyDaysLater.toISOString()
            };
            query.status = { $ne: 'void' };
        } else if (filter === 'expired') {
            const now = new Date();
            query.expirationDate = { $lte: now.toISOString() };
        }

        if (categoryId) {
            query.categoryUuid = categoryId.toString();
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        return await sealDBModel.findWithPagination(INVENTORY_DB, query, skip, limit);
    }

    static async getFilteredCount(
        auth: AuthenticatedUser,
        search = '',
        filter = 'all',
        categoryId?: number
    ): Promise<number> {
        const query: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (categoryId) {
            query.categoryUuid = categoryId.toString();
        }

        if (filter === 'all') {
            query.status = { $ne: 'void' };
        } else if (filter === 'new') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            query.createdAt = { $gte: oneWeekAgo.toISOString() };
            query.status = { $ne: 'void' };
        } else if (filter === 'expiring') {
            const now = new Date();
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            query.expirationDate = {
                $gt: now.toISOString(),
                $lte: thirtyDaysLater.toISOString()
            };
            query.status = { $ne: 'void' };
        } else if (filter === 'expired') {
            const now = new Date();
            query.expirationDate = { $lte: now.toISOString() };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await sealDBModel.find(INVENTORY_DB, query);
        return Array.isArray(products) ? products.length : 0;
    }

    static async findBySku(sku: string, auth: AuthenticatedUser): Promise<Product | null> {
        const products = await sealDBModel.find(INVENTORY_DB, {
            barcode: parseInt(sku),
            tenantId: auth.tenantId,
            branchId: auth.branchId
        });

        return products.length > 0 ? products[0] : null;
    }

    static async insert(productData: Record<string, any>): Promise<void> {
        await sealDBModel.insert(INVENTORY_DB, productData);
    }

    static async update(productId: string, updateData: Record<string, any>): Promise<number> {
        return await sealDBModel.update(INVENTORY_DB, productId, updateData);
    }

    static async updateWithUser(productId: string, updateData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const dataWithUser = {
            ...updateData,
            userId: auth.userId
        };

        return await sealDBModel.update(INVENTORY_DB, productId, dataWithUser);
    }

    static async void(productId: string, auth: AuthenticatedUser): Promise<number> {
        return await sealDBModel.update(INVENTORY_DB, productId, {
            status: 'void',
            userId: auth.userId
        });
    }

    static async delete(productId: string): Promise<number> {
        return await sealDBModel.delete(INVENTORY_DB, productId);
    }

    static async updateQuantity(productId: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        return await sealDBModel.update(INVENTORY_DB, productId, {
            quantity: quantity,
            userId: auth.userId
        });
    }

    static async decrementInventory(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<void> {
        try {
            const inventoryUpdates = products.map(item => ({
                productId: item.productId,
                quantityToDecrement: item.quantity,
                userId: auth.userId
            }));

            const result = await sealDBModel.bulkInventoryUpdate(
                INVENTORY_DB,
                inventoryUpdates,
                {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId
                }
            );

            console.log('Inventory Update Results:', {
                successful: result.successful,
                failed: result.failed.length,
                skipped: result.skipped.length
            });

            if (result.failed.length > 0) {
                console.error('Failed inventory updates:', result.failed);
                throw new Error(`${result.failed.length} inventory updates failed`);
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
        const inventoryUpdates = products.map(item => ({
            productId: item.productId,
            quantityToDecrement: item.quantity,
            userId: auth.userId
        }));

        return await sealDBModel.bulkInventoryUpdate(
            INVENTORY_DB,
            inventoryUpdates,
            {
                tenantId: auth.tenantId,
                branchId: auth.branchId
            }
        );
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

    /**
     * Delete product with existence check
     */
    static async deleteWithCheck(productId: string, auth: AuthenticatedUser): Promise<number> {
        const existingProduct = await this.findById(productId, auth);
        if (!existingProduct) {
            throw new Error('Product not found or access denied');
        }

        return await this.delete(productId);
    }

    /**
     * Check if product exists and user has access
     */
    static async exists(productId: string, auth: AuthenticatedUser): Promise<boolean> {
        const product = await this.findById(productId, auth);
        return product !== null;
    }

    /**
     * Get product count for a shop
     */
    static async getCount(auth: AuthenticatedUser, includeVoided = false): Promise<number> {
        const criteria: Record<string, any> = {
            tenantId: auth.tenantId,
            branchId: auth.branchId
        };

        if (!includeVoided) {
            criteria.status = { $ne: 'void' };
        }

        const products = await this.find(criteria, auth);
        return products.length;
    }
}