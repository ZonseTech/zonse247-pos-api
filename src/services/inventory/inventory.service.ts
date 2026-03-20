import { AuthenticatedUser } from 'auth';
import { InventoryModel } from '../../models/inventory.model';
import { CategoryService } from '../category.service';
import { StockMovementService } from './stock-movement.service';
import { ProductService } from './product.service';
import { Category } from 'categoty';
import { InventoryItem } from 'inventory-item';
import prisma from '../../databases/prisma/client';
import { ConvertToVariantInput, ConvertToVariantResult } from '../../types/product.types';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../../utils/pagination.utils';

/**
 * InventoryService - Facade for all inventory-related operations
*/
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

    static async listActiveInventoryItems(
        auth: AuthenticatedUser,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<InventoryItem>> {
        const items = await InventoryModel.findActive(auth);
        const total = items.length;
        const paged = items.slice(pagination.skip, pagination.skip + pagination.limit);

        return {
            data: paged,
            pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
        };
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

    /**
     * Update inventory item quantity via stock adjustment
     */
    static async updateInventoryItemQuantity(productUuid: string, newQuantity: number, auth: AuthenticatedUser): Promise<number> {
        const exists = await InventoryModel.exists(productUuid, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }

        const inventory = await prisma.inventory.findFirst({
            where: {
                OR: [
                    { variantId: productUuid },
                    { productId: productUuid }
                ],
                branchId: auth.branchId,
                tenantId: auth.tenantId,
            },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for ${productUuid}`);
        }

        const currentQuantity = inventory.availableQuantity;
        const adjustment = newQuantity - currentQuantity;

        if (adjustment === 0) {
            return 1
        }

        await StockMovementService.recordAdjustment({
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            inventoryId: inventory.id,
            quantity: adjustment,
            unitCost: Number(inventory.averageCost || 0),
            notes: `Manual quantity adjustment from ${currentQuantity} to ${newQuantity}`,
            movedBy: auth.userId,
        });

        return 1;
    }

    static async getInventoryItemsByCategory(categoryId: string, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const items = await InventoryModel.findActive(auth);
        return items.filter(item => item.categoryId === categoryId);
    }

    static async listInventoryItemsByCategory(
        categoryId: string,
        auth: AuthenticatedUser,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<InventoryItem>> {
        const items = await InventoryModel.findActive(auth);
        const filtered = items.filter(item => item.categoryId === categoryId);
        const total = filtered.length;
        const paged = filtered.slice(pagination.skip, pagination.skip + pagination.limit);

        return {
            data: paged,
            pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
        };
    }

    static async getInventoryItemsByStatus(status: string, auth: AuthenticatedUser): Promise<InventoryItem[]> {
        const items = await InventoryModel.findActive(auth);
        return items.filter(item => item.status === status);
    }

    static async listInventoryItemsByStatus(
        status: string,
        auth: AuthenticatedUser,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<InventoryItem>> {
        const items = await InventoryModel.findActive(auth);
        const filtered = items.filter(item => item.status === status);
        const total = filtered.length;
        const paged = filtered.slice(pagination.skip, pagination.skip + pagination.limit);

        return {
            data: paged,
            pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
        };
    }

    /**
     * Get all inventory items
     * @param auth - Authentication context
     * @param includeVoided - If true, includes inactive/voided items
     */
    static async getAllInventoryItems(auth: AuthenticatedUser, includeVoided = false): Promise<InventoryItem[]> {
        return await InventoryModel.findAll(auth, includeVoided);
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

    static async listLowStockItems(
        threshold: number,
        auth: AuthenticatedUser,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<InventoryItem>> {
        const inventoryItems = await InventoryModel.findActive(auth);
        const filtered = inventoryItems.filter(item =>
            item.quantity !== undefined &&
            item.quantity !== null &&
            parseInt(item.quantity.toString()) < threshold
        );
        const total = filtered.length;
        const paged = filtered.slice(pagination.skip, pagination.skip + pagination.limit);

        return {
            data: paged,
            pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
        };
    }

    /**
     * Adjust inventory by a delta amount
     */
    static async adjustInventory(productUuid: string, adjustment: number, auth: AuthenticatedUser): Promise<number> {
        const inventoryItem = await InventoryModel.findById(productUuid, auth);
        if (!inventoryItem) {
            throw new Error('Inventory item not found or access denied');
        }

        const inventory = await prisma.inventory.findFirst({
            where: {
                OR: [
                    { variantId: productUuid },
                    { productId: productUuid }
                ],
                branchId: auth.branchId,
                tenantId: auth.tenantId,
            },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for ${productUuid}`);
        }

        const currentQuantity = inventory.availableQuantity;
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0 && !inventory.allowNegativeStock) {
            throw new Error('Adjustment would result in negative inventory');
        }

        if (adjustment === 0) {
            return 1;
        }

        await StockMovementService.recordAdjustment({
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            inventoryId: inventory.id,
            quantity: adjustment,
            unitCost: Number(inventory.averageCost || 0),
            notes: `Inventory adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`,
            movedBy: auth.userId,
        });

        return 1;
    }

    static async syncAllCategoryItemCounts(auth: AuthenticatedUser): Promise<void> {
        try {
            const categories = await CategoryService.getAllCategories(auth);
            const categoryIds = categories.map(category => category.categoryId);

            if (categoryIds.length > 0) {
                await CategoryService.syncCategoryItemCounts(categoryIds, auth);
            }
        } catch (error) {
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

    /**
     * Recalculate inventory quantity from stock movements
     * Use this when syncing offline data or for data integrity checks
     */
    static async recalculateInventory(
        inventoryId: string,
        _auth: AuthenticatedUser
    ): Promise<{ calculatedQuantity: number; previousCachedQuantity: number; wasCorrected: boolean }> {
        return await StockMovementService.recalculateInventory(inventoryId);
    }

    /**
     * Recalculate all inventory for a branch
     * Useful for data integrity checks or after syncing offline data
     */
    static async recalculateBranchInventory(
        auth: AuthenticatedUser
    ): Promise<{ total: number; corrected: number; errors: string[] }> {
        return await StockMovementService.recalculateBranchInventory(auth.tenantId, auth.branchId);
    }

    /**
     * Record a stock movement (pass-through to StockMovementService)
     * This is the proper way to change inventory quantities
     */
    static async recordStockMovement(
        data: {
            inventoryId: string;
            movementType: 'PURCHASE_RECEIPT' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DAMAGE' | 'EXPIRY';
            quantity: number;
            referenceType?: 'PURCHASE_ORDER' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER';
            referenceId?: string;
            unitCost: number;
            notes?: string;
        },
        auth: AuthenticatedUser
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return await StockMovementService.recordMovement({
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            ...data,
            movedBy: auth.userId,
        });
    }

    /**
     * Convert a variant to become a variant of a different product.
     * This allows moving an existing product's variant to become a variant of another product.
     * 
     * Use cases:
     * - Moving a standalone product to become a variant of another product
     * - Reorganizing variants between products
     * 
     * @param data - The conversion input data containing variantId and targetProductId
     * @param auth - Authenticated user context
     * @returns The converted variant and info about whether the original product was deleted
     */
    static async convertToVariant(
        data: ConvertToVariantInput,
        auth: AuthenticatedUser
    ): Promise<ConvertToVariantResult> {
        return await ProductService.convertToVariant(data, auth.tenantId, auth.branchId);
    }
}