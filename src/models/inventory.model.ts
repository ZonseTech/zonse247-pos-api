import { sealDBModel } from '../databases/local';
import { ProductModel } from './product.model';
import { INVENTORY_DB } from '../databases/local/tables';

export class InventoryModel {
    static async findById(productUuid: string, auth: AuthenticatedUser): Promise<Product | null> {
        return await sealDBModel.findById(INVENTORY_DB, {
            uuid: productUuid,
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid
        });
    }

    static async findByUuid(productUuid: string): Promise<Product | null> {
        return await sealDBModel.findById(INVENTORY_DB, productUuid);
    }

    static async find(criteria: Record<string, any>, auth: AuthenticatedUser): Promise<Product[]> {
        const baseCriteria = {
            ...criteria,
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid
        };

        return await sealDBModel.find(INVENTORY_DB, baseCriteria);
    }

    static async findActive(auth: AuthenticatedUser): Promise<Product[]> {
        return await sealDBModel.find(INVENTORY_DB, {
            status: { $ne: 'void' },
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid
        });
    }

    static async findBySku(sku: string, auth: AuthenticatedUser): Promise<Product | null> {
        const products = await sealDBModel.find(INVENTORY_DB, {
            barcode: parseInt(sku),
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid
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
            userUuid: auth.userUuid
        };

        return await sealDBModel.update(INVENTORY_DB, productId, dataWithUser);
    }

    static async void(productId: string, auth: AuthenticatedUser): Promise<number> {
        return await sealDBModel.update(INVENTORY_DB, productId, {
            status: 'void',
            userUuid: auth.userUuid
        });
    }

    static async delete(productId: string): Promise<number> {
        return await sealDBModel.delete(INVENTORY_DB, productId);
    }

    static async updateQuantity(productId: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        return await sealDBModel.update(INVENTORY_DB, productId, {
            quantity: quantity,
            userUuid: auth.userUuid
        });
    }

    static async decrementInventory(
        products: CartItem[],
        auth: AuthenticatedUser
    ): Promise<void> {
        try {
            const inventoryUpdates = products.map(item => ({
                productUuid: item.productUuid,
                quantityToDecrement: item.quantity,
                userId: auth.userUuid
            }));

            const result = await sealDBModel.bulkInventoryUpdate(
                INVENTORY_DB,
                inventoryUpdates,
                {
                    clientUuid: auth.clientUuid,
                    shopUuid: auth.shopUuid
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
        failed: Array<{ productUuid: string; error: string }>;
        skipped: Array<{ productUuid: string; reason: string }>;
    }> {
        const inventoryUpdates = products.map(item => ({
            productUuid: item.productUuid,
            quantityToDecrement: item.quantity,
            userId: auth.userUuid
        }));

        return await sealDBModel.bulkInventoryUpdate(
            INVENTORY_DB,
            inventoryUpdates,
            {
                clientUuid: auth.clientUuid,
                shopUuid: auth.shopUuid
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

    static async updateWithValidation(productUuid: string, productData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const productModel = ProductModel.fromParams(productData, auth);

        if (!productModel.validate()) {
            throw new Error('Product validation failed');
        }

        const existingProduct = await this.findById(productUuid, auth);
        if (!existingProduct) {
            throw new Error('Product not found or access denied');
        }

        return await this.update(productUuid, productModel.toJSON());
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
    static async getCount(auth: AuthenticatedUser, includeVoided: boolean = false): Promise<number> {
        const criteria: Record<string, any> = {
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid
        };

        if (!includeVoided) {
            criteria.status = { $ne: 'void' };
        }

        const products = await this.find(criteria, auth);
        return products.length;
    }
}