import { InventoryModel } from '../models/inventory.model';
import { CategoryService } from './category.service';

export class InventoryService {

    static async getProductByUuid(productId: string, auth: AuthenticatedUser): Promise<Product | null> {
        return await InventoryModel.findById(productId, auth);
    }

    static async getActiveProducts(auth: AuthenticatedUser): Promise<Product[]> {
        return await InventoryModel.findActive(auth);
    }

    static async getProductsWithCategories(auth: AuthenticatedUser): Promise<Product[]> {
        const categories: Category[] = await CategoryService.getAllCategories(auth);

        const categoryMap = new Map<string, Category>();
        categories.forEach((category) => {
            categoryMap.set(category.uuid.toString(), category);
            if (category.name) {
                categoryMap.set(category.name as string, category);
            }
        });

        const products: Product[] = await InventoryModel.findActive(auth);

        const enhancedProducts = products.map((product) => {
            if (product.categoryUuid) {
                const categoryKey = product.categoryUuid.toString();
                if (categoryMap.has(categoryKey)) {
                    product.categoryDetails = categoryMap.get(categoryKey);
                }
            }
            return product;
        });

        return enhancedProducts;
    }

    static async createProduct(productData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        await InventoryModel.create(productData, auth);

        if (productData.categoryUuid) {
            try {
                await CategoryService.syncCategoryItemCounts([productData.categoryUuid], auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after product creation:', error);
            }
        }
    }

    static async updateProduct(productUuid: string, productData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const currentProduct = await InventoryModel.findById(productUuid, auth);

        const result = await InventoryModel.updateWithValidation(productUuid, productData, auth);

        const categoriesToSync = new Set<string>();

        if (currentProduct?.categoryUuid) {
            categoriesToSync.add(currentProduct.categoryUuid);
        }

        if (productData.categoryUuid && productData.categoryUuid !== currentProduct?.categoryUuid) {
            categoriesToSync.add(productData.categoryUuid);
        }

        if (categoriesToSync.size > 0) {
            try {
                await CategoryService.syncCategoryItemCounts(Array.from(categoriesToSync), auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after product update:', error);
            }
        }

        return result;
    }

    static async voidProduct(productUuid: string, auth: AuthenticatedUser): Promise<number> {
        const product = await InventoryModel.findById(productUuid, auth);

        const result = await InventoryModel.voidWithCheck(productUuid, auth);

        if (product?.categoryUuid) {
            try {
                await CategoryService.syncCategoryItemCounts([product.categoryUuid], auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after product void:', error);
            }
        }

        return result;
    }

    static async deleteProduct(productUuid: string, auth: AuthenticatedUser): Promise<number> {
        const product = await InventoryModel.findById(productUuid, auth);

        const result = await InventoryModel.deleteWithCheck(productUuid, auth);

        if (product?.categoryUuid) {
            try {
                await CategoryService.syncCategoryItemCounts([product.categoryUuid], auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after product deletion:', error);
            }
        }

        return result;
    }

    static async findProductBySku(sku: string, auth: AuthenticatedUser): Promise<Product | null> {
        return await InventoryModel.findBySku(sku, auth);
    }

    static async decrementInventory(products: CartItem[], auth: AuthenticatedUser): Promise<void> {
        return await InventoryModel.decrementInventory(products, auth);
    }

    static async getProductCount(auth: AuthenticatedUser, includeVoided: boolean = false): Promise<number> {
        return await InventoryModel.getCount(auth, includeVoided);
    }

    static async productExists(productUuid: string, auth: AuthenticatedUser): Promise<boolean> {
        return await InventoryModel.exists(productUuid, auth);
    }

    static async updateProductQuantity(productUuid: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        const exists = await InventoryModel.exists(productUuid, auth);
        if (!exists) {
            throw new Error('Product not found or access denied');
        }

        return await InventoryModel.updateQuantity(productUuid, quantity, auth);
    }

    static async getProductsByCategory(categoryId: string, auth: AuthenticatedUser): Promise<Product[]> {
        return await InventoryModel.find({ categoryId }, auth);
    }

    static async getProductsByStatus(status: string, auth: AuthenticatedUser): Promise<Product[]> {
        return await InventoryModel.find({ status }, auth);
    }

    static async getAllProducts(auth: AuthenticatedUser, includeVoided: boolean = false): Promise<Product[]> {
        if (includeVoided) {
            return await InventoryModel.find({}, auth);
        }
        return await InventoryModel.findActive(auth);
    }

    static async searchProducts(searchTerm: string, auth: AuthenticatedUser): Promise<Product[]> {
        const products = await InventoryModel.findActive(auth);

        return products.filter(product =>
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.barcode?.toString().includes(searchTerm)
        );
    }

    static async bulkUpdateProducts(updates: Array<{ productUuid: string, data: Record<string, any> }>, auth: AuthenticatedUser): Promise<void> {
        const categoriesToSync = new Set<string>();

        for (const { productUuid, data } of updates) {
            const currentProduct = await InventoryModel.findById(productUuid, auth);

            if (currentProduct?.categoryUuid) {
                categoriesToSync.add(currentProduct.categoryUuid);
            }

            if (data.categoryUuid && data.categoryUuid !== currentProduct?.categoryUuid) {
                categoriesToSync.add(data.categoryUuid);
            }
        }

        const updatePromises = updates.map(async ({ productUuid, data }) => {
            return await InventoryModel.updateWithValidation(productUuid, data, auth);
        });

        await Promise.all(updatePromises);

        if (categoriesToSync.size > 0) {
            try {
                await CategoryService.syncCategoryItemCounts(Array.from(categoriesToSync), auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after bulk update:', error);
            }
        }
    }

    static async getProductsWithLowStock(threshold: number, auth: AuthenticatedUser): Promise<Product[]> {
        const products = await InventoryModel.findActive(auth);

        return products.filter(product =>
            product.quantity !== undefined &&
            product.quantity !== null &&
            parseInt(product.quantity.toString()) < threshold
        );
    }

    static async adjustInventory(productUuid: string, adjustment: number, auth: AuthenticatedUser): Promise<number> {
        const product = await InventoryModel.findById(productUuid, auth);
        if (!product) {
            throw new Error('Product not found or access denied');
        }

        const currentQuantity = parseInt(product.quantity?.toString() || '0');
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0) {
            throw new Error('Adjustment would result in negative inventory');
        }

        return await InventoryModel.updateQuantity(productUuid, newQuantity, auth);
    }

    static async syncAllCategoryItemCounts(auth: AuthenticatedUser): Promise<void> {
        try {
            const categories = await CategoryService.getAllCategories(auth);
            const categoryUuids = categories.map(category => category.uuid);

            if (categoryUuids.length > 0) {
                await CategoryService.syncCategoryItemCounts(categoryUuids, auth);
            }
        } catch (error) {
            console.error('Error syncing all category item counts:', error);
            throw new Error('Failed to sync all category item counts');
        }
    }


    static async moveProductsToCategory(
        productUuids: string[],
        newCategoryUuid: string,
        auth: AuthenticatedUser
    ): Promise<void> {
        const categoriesToSync = new Set<string>();
        categoriesToSync.add(newCategoryUuid);

        for (const productUuid of productUuids) {
            const product = await InventoryModel.findById(productUuid, auth);
            if (product?.categoryUuid) {
                categoriesToSync.add(product.categoryUuid);
            }
        }

        const updates = productUuids.map(productUuid => ({
            productUuid,
            data: { categoryUuid: newCategoryUuid }
        }));

        await this.bulkUpdateProducts(updates, auth);

        try {
            await CategoryService.syncCategoryItemCounts(Array.from(categoriesToSync), auth);
        } catch (error) {
            console.warn('Failed to sync category item counts after moving products:', error);
        }
    }
}