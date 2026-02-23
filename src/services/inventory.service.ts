import { AuthenticatedUser } from 'auth';
import { InventoryModel } from '../models/inventory.model';
import { CategoryService } from './category.service';
import { Category } from 'categoty';
import { CartItem } from 'order';
import { InventoryItem } from 'inventory-item';

export class InventoryService {
    static async getInventorySummary(auth: AuthenticatedUser): Promise<{
        totalStock: number;
        newStock: number;
        expiringSoon: number;
        expired: number;
    }> {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const inventoryItems = await InventoryModel.findActive(auth);

        return {
            totalStock: inventoryItems.filter(item => item.status !== 'void').length,
            newStock: inventoryItems.filter(item => {
                if (!item.createdAt || item.status === 'void') return false;
                const createdDate = new Date(item.createdAt);
                return createdDate >= oneWeekAgo;
            }).length,
            expiringSoon: inventoryItems.filter(item => {
                if (!item.expirationDate || item.status === 'void') return false;
                const expirationDate = new Date(item.expirationDate);
                return expirationDate >= now && expirationDate <= thirtyDaysFromNow;
            }).length,
            expired: inventoryItems.filter(item => {
                if (!item.expirationDate || item.status === 'void') return false;
                const expirationDate = new Date(item.expirationDate);
                return expirationDate < now;
            }).length
        };
    }

    static async getInventoryOverview(
        auth: AuthenticatedUser,
        options: {
            search?: string;
            filter?: string;
            categoryId?: string;
            startDate?: string;
            endDate?: string;
        } = {}
    ) {
        return await InventoryModel.getInventoryOverview(auth, options);
    }

    static async getTopValueInventoryItems(auth: AuthenticatedUser, limit = 10) {
        return await InventoryModel.getTopValueInventoryItems(auth, limit);
    }

    static async getInventoryItemByUuid(productId: string, auth: AuthenticatedUser): Promise<InventoryItem | any | null> {
        return await InventoryModel.findById(productId, auth);
    }

    static async getActiveInventoryItems(auth: AuthenticatedUser): Promise<InventoryItem[]> {
        return await InventoryModel.findActive(auth);
    }

    static async getInventoryItemsWithCategories(
        auth: AuthenticatedUser,
        page = 1,
        perPage = 10,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string,
        groupByProduct = false
    ): Promise<{ inventoryItems?: InventoryItem[]; products?: any[]; total: number; totalPages: number }> {
        const skip = (page - 1) * perPage;

        if (groupByProduct) {
            const { products, total } = await InventoryModel.findProductsWithVariants(
                auth,
                skip,
                perPage,
                search,
                filter,
                categoryId,
                startDate,
                endDate
            );

            const totalPages = Math.ceil(total / perPage);

            return {
                products,
                total,
                totalPages
            };
        }

        const categories: Category[] = await CategoryService.getAllCategories(auth);

        const categoryMap = new Map<string, Category>();
        categories.forEach((category) => {
            if (category.categoryId) {
                categoryMap.set(category.categoryId, category);
            }
        });

        const inventoryItems: InventoryItem[] = await InventoryModel.findActiveWithPagination(
            auth,
            skip,
            perPage,
            search,
            filter,
            categoryId,
            startDate,
            endDate
        );

        const totalItems = await InventoryModel.getFilteredCount(auth, search, filter, categoryId, startDate, endDate);
        const totalPages = Math.ceil(totalItems / perPage);
        const enhancedItems = inventoryItems.map((item) => ({
            ...item,
            categoryDetails: item.categoryId ? categoryMap.get(item.categoryId) : undefined
        }));

        return {
            inventoryItems: enhancedItems,
            total: totalItems,
            totalPages
        };
    }

    static async createInventoryItem(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        await InventoryModel.create(inventoryData, auth);

        if (inventoryData.categoryId) {
            try {
                await CategoryService.syncCategoryItemCounts([inventoryData.categoryId], auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after inventory item creation:', error);
            }
        }
    }

    static async updateInventoryItem(productId: string, inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<number> {
        const currentItem = await InventoryModel.findById(productId, auth);

        const result = await InventoryModel.updateWithValidation(productId, inventoryData, auth);

        const categoriesToSync = new Set<string>();

        if (currentItem?.categoryId) {
            categoriesToSync.add(currentItem.categoryId);
        }

        if (inventoryData.categoryId && inventoryData.categoryId !== currentItem?.categoryId) {
            categoriesToSync.add(inventoryData.categoryId);
        }

        if (categoriesToSync.size > 0) {
            try {
                await CategoryService.syncCategoryItemCounts(Array.from(categoriesToSync), auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after inventory item update:', error);
            }
        }

        return result;
    }

    static async voidInventoryItem(productId: string, auth: AuthenticatedUser): Promise<number> {
        const inventoryItem = await InventoryModel.findById(productId, auth);

        const result = await InventoryModel.voidWithCheck(productId, auth);

        if (inventoryItem?.categoryId) {
            try {
                await CategoryService.syncCategoryItemCounts([inventoryItem.categoryId], auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after inventory item void:', error);
            }
        }

        return result;
    }

    static async deleteInventoryItem(productId: string, auth: AuthenticatedUser): Promise<number> {
        const inventoryItem = await InventoryModel.findById(productId, auth);

        const result = await InventoryModel.deleteWithCheck(productId, auth);

        if (inventoryItem?.categoryId) {
            try {
                await CategoryService.syncCategoryItemCounts([inventoryItem.categoryId], auth);
            } catch (error) {
                console.warn('Failed to sync category item counts after inventory item deletion:', error);
            }
        }

        return result;
    }

    static async findInventoryItemBySku(sku: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        return await InventoryModel.findBySku(sku, auth);
    }

    static async decrementInventory(products: CartItem[], auth: AuthenticatedUser): Promise<void> {
        return await InventoryModel.decrementInventory(products, auth);
    }

    static async getInventoryItemCounts(auth: AuthenticatedUser): Promise<{
        totalItems: number;
        incompleteItems: number;
        itemsInStock: number;
        lowStockItems: number;
        expiredItems: number;
    }> {
        return await InventoryModel.getDetailedCounts(auth);
    }

    static async inventoryItemExists(productUuid: string, auth: AuthenticatedUser): Promise<boolean> {
        return await InventoryModel.exists(productUuid, auth);
    }

    static async updateInventoryItemQuantity(productUuid: string, quantity: number, auth: AuthenticatedUser): Promise<number> {
        const exists = await InventoryModel.exists(productUuid, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }

        return await InventoryModel.updateQuantity(productUuid, quantity, auth);
    }

    static async getInventoryItemsByCategory(categoryId: string, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const items = await InventoryModel.findActive(auth);
        return items.filter(item => item.categoryId === categoryId);
    }

    static async getInventoryItemsByStatus(status: string, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const items = await InventoryModel.findActive(auth);
        return items.filter(item => item.status === status);
    }

    static async getAllInventoryItems(auth: AuthenticatedUser, _includeVoided = false): Promise<InventoryItem[]> {
        // Note: The new model doesn't have a generic find method for all items including voided
        // For now, just return active items regardless of includeVoided flag
        return await InventoryModel.findActive(auth);
    }

    static async searchInventoryItems(searchTerm: string, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const inventoryItems = await InventoryModel.findActive(auth);

        return inventoryItems.filter(item =>
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.barcode?.toString().includes(searchTerm)
        );
    }

    static async bulkUpdateInventoryItems(updates: Array<{ productUuid: string, data: Record<string, any> }>, auth: AuthenticatedUser): Promise<void> {
        const categoriesToSync = new Set<string>();

        for (const { productUuid, data } of updates) {
            const currentItem = await InventoryModel.findById(productUuid, auth);

            if (currentItem?.categoryId) {
                categoriesToSync.add(currentItem.categoryId);
            }

            if (data.categoryId && data.categoryId !== currentItem?.categoryId) {
                categoriesToSync.add(data.categoryId);
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

    static async getInventoryItemsWithLowStock(threshold: number, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const inventoryItems = await InventoryModel.findActive(auth);

        return inventoryItems.filter(item =>
            item.quantity !== undefined &&
            item.quantity !== null &&
            parseInt(item.quantity.toString()) < threshold
        );
    }

    static async adjustInventory(productUuid: string, adjustment: number, auth: AuthenticatedUser): Promise<number> {
        const inventoryItem = await InventoryModel.findById(productUuid, auth);
        if (!inventoryItem) {
            throw new Error('Inventory item not found or access denied');
        }

        const currentQuantity = parseInt(inventoryItem.quantity?.toString() || '0');
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0) {
            throw new Error('Adjustment would result in negative inventory');
        }

        return await InventoryModel.updateQuantity(productUuid, newQuantity, auth);
    }

    static async syncAllCategoryItemCounts(auth: AuthenticatedUser): Promise<void> {
        try {
            const categories = await CategoryService.getAllCategories(auth);
            const categoryIds = categories.map(category => category.categoryId);

            if (categoryIds.length > 0) {
                await CategoryService.syncCategoryItemCounts(categoryIds, auth);
            }
        } catch (error) {
            console.error('Error syncing all category item counts:', error);
            throw new Error('Failed to sync all category item counts');
        }
    }


    static async moveInventoryItemsToCategory(
        productUuids: string[],
        newcategoryId: string,
        auth: AuthenticatedUser
    ): Promise<void> {
        const categoriesToSync = new Set<string>();
        categoriesToSync.add(newcategoryId);

        for (const productUuid of productUuids) {
            const inventoryItem = await InventoryModel.findById(productUuid, auth);
            if (inventoryItem?.categoryId) {
                categoriesToSync.add(inventoryItem.categoryId);
            }
        }

        const updates = productUuids.map(productUuid => ({
            productUuid,
            data: { categoryId: newcategoryId }
        }));

        await this.bulkUpdateInventoryItems(updates, auth);

        try {
            await CategoryService.syncCategoryItemCounts(Array.from(categoriesToSync), auth);
        } catch (error) {
            console.warn('Failed to sync category item counts after moving inventory items:', error);
        }
    }
}