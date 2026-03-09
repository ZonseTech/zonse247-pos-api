import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { InventoryService } from '../services/inventory/inventory.service';
import { AuthRequest } from '../lib/express.type';
import {
    ValidationError,
    ConflictError,
    NotFoundError,
    BusinessLogicError,
    DatabaseError,
    TransactionError,
} from '../utils/db-error-handler.util';

export class InventoryController extends BaseController {
    private static getAuthContext(req: Request & AuthRequest) {
        return {
            tenantId: req.auth?.tenantId || '',
            branchId: req.auth?.activeBranchId || req.auth?.branchId || '',
            userId: req.auth?.userId || ''
        };
    }

    /**
     * Handle errors consistently using BaseController format
     */
    private static handleError(res: Response, error: unknown, context?: string): void {
        if (context) {
            console.error(`Error in ${context}:`, error);
        }

        if (error instanceof ValidationError) {
            if (error.field) {
                BaseController.sendBadRequest(res, error.message, error.field);
                return;
            }
            BaseController.sendValidationError(res, error.message, error.errors);
            return;
        }

        if (error instanceof ConflictError) {
            BaseController.sendBadRequest(res, error.message, error.field);
            return;
        }

        if (error instanceof NotFoundError) {
            BaseController.sendNotFound(res, error.message);
            return;
        }

        if (error instanceof BusinessLogicError) {
            BaseController.sendBadRequest(res, error.message, JSON.stringify(error.details));
            return;
        }

        if (error instanceof TransactionError) {
            const statusCode = error.statusCode;
            if (statusCode === 409) {
                BaseController.sendResponse(res, 409, false, error.message, { retryable: error.isRetryable });
            } else if (statusCode === 504) {
                BaseController.sendResponse(res, 504, false, error.message);
            } else {
                BaseController.sendServerError(res, error.message);
            }
            return;
        }

        if (error instanceof DatabaseError) {
            const statusCode = error.statusCode;
            if (statusCode === 404) {
                BaseController.sendNotFound(res, error.message);
            } else if (statusCode === 409) {
                BaseController.sendBadRequest(res, error.message, error.field);
            } else if (statusCode >= 500) {
                BaseController.sendServerError(res, error.message);
            } else {
                BaseController.sendBadRequest(res, error.message, error.field);
            }
            return;
        }

        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('deadlock') || message.includes('write conflict') || message.includes('transaction')) {
                BaseController.sendResponse(res, 409, false, 'A database conflict occurred. Please try again.');
                return;
            }

            if (message.includes('not found') || message.includes('access denied')) {
                BaseController.sendNotFound(res, error.message);
                return;
            }

            if (message.includes('duplicate') || message.includes('already assigned') || message.includes('already exists')) {
                BaseController.sendBadRequest(res, error.message);
                return;
            }

            if (message.includes('validation') || message.includes('invalid')) {
                BaseController.sendBadRequest(res, error.message);
                return;
            }

            if (message.includes('insufficient') || message.includes('negative')) {
                BaseController.sendBadRequest(res, error.message);
                return;
            }

            BaseController.sendServerError(res, 'An unexpected error occurred');
            return;
        }

        BaseController.sendServerError(res, 'An unexpected error occurred');
    }

    static async getSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const summary = await InventoryService.getInventorySummary(auth);
            BaseController.sendSuccess(res, 'Inventory summary retrieved successfully.', summary);
        } catch (error) {
            InventoryController.handleError(res, error, 'getSummary');
        }
    }

    static async getOverview(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);

            const search = req.query.search as string || '';
            const filter = req.query.filter as string || 'all';
            const categoryId = req.query.categoryId as string | undefined;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;

            const overview = await InventoryService.getInventoryOverview(auth, {
                search,
                filter,
                categoryId,
                startDate,
                endDate
            });
            BaseController.sendSuccess(res, 'Inventory overview retrieved successfully.', overview);
        } catch (error) {
            InventoryController.handleError(res, error, 'getOverview');
        }
    }

    static async getTopValueItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const limit = parseInt(req.query.limit as string) || 10;

            if (limit < 1 || limit > 100) {
                BaseController.sendBadRequest(res, 'Limit must be between 1 and 100');
                return;
            }

            const topItems = await InventoryService.getTopValueInventoryItems(auth, limit);
            BaseController.sendSuccess(res, 'Top value inventory items retrieved successfully.', {
                count: topItems.length,
                items: topItems
            });
        } catch (error) {
            InventoryController.handleError(res, error, 'getTopValueItems');
        }
    }

    static async getCount(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const counts = await InventoryService.getInventoryItemCounts(auth);
            BaseController.sendSuccess(res, 'Inventory counts retrieved successfully.', counts);
        } catch (error) {
            InventoryController.handleError(res, error, 'getCount');
        }
    }

    static async getInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.params.itemId) {
                BaseController.sendBadRequest(res, 'Inventory item ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.getInventoryItemByUuid(req.params.itemId as string, auth);

            if (!inventoryItem) {
                BaseController.sendNotFound(res, `Inventory item with ID "${req.params.itemId}" not found.`);
                return;
            }

            BaseController.sendSuccess(res, 'Inventory item retrieved successfully.', inventoryItem);
        } catch (error) {
            InventoryController.handleError(res, error, 'getInventoryItem');
        }
    }

    static async getInventoryItemsOnly(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getActiveInventoryItems(auth);
            BaseController.sendSuccess(res, 'Inventory items retrieved successfully.', inventoryItems);
        } catch (error) {
            InventoryController.handleError(res, error, 'getInventoryItemsOnly');
        }
    }

    static async getInventoryItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const page = parseInt(req.query.page as string) || 1;
            const perPage = parseInt(req.query.perPage as string) || 10;
            const search = req.query.search as string || '';
            const filter = req.query.filter as string || 'all';
            const categoryId = req.query.categoryId as string | undefined;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;
            const groupByProduct = req.query.groupByProduct === 'true';

            if (page < 1) {
                BaseController.sendBadRequest(res, 'Page number must be at least 1');
                return;
            }
            if (perPage < 1 || perPage > 100) {
                BaseController.sendBadRequest(res, 'Items per page must be between 1 and 100');
                return;
            }

            const result = await InventoryService.getInventoryItemsWithCategories(
                auth,
                page,
                perPage,
                search,
                filter,
                categoryId,
                startDate,
                endDate,
                groupByProduct
            );

            if (groupByProduct) {
                BaseController.sendSuccess(res, 'Products with variants retrieved successfully.', {
                    products: result.products,
                    pagination: {
                        currentPage: page,
                        totalPages: result.totalPages,
                        totalItems: result.total,
                        itemsPerPage: perPage
                    }
                });
            } else {
                BaseController.sendSuccess(res, 'Inventory items with categories retrieved successfully.', {
                    inventoryItems: result.inventoryItems,
                    pagination: {
                        currentPage: page,
                        totalPages: result.totalPages,
                        totalItems: result.total,
                        itemsPerPage: perPage
                    }
                });
            }
        } catch (error) {
            InventoryController.handleError(res, error, 'getInventoryItems');
        }
    }

    static async searchInventoryItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const searchTerm = req.query.q as string;
            if (!searchTerm || searchTerm.trim().length === 0) {
                BaseController.sendBadRequest(res, 'Search term is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.searchInventoryItems(searchTerm.trim(), auth);
            BaseController.sendSuccess(res, 'Search results retrieved successfully.', inventoryItems);
        } catch (error) {
            InventoryController.handleError(res, error, 'searchInventoryItems');
        }
    }

    static async findInventoryItemBySku(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { skuCode } = req.body;
            if (!skuCode || skuCode.trim().length === 0) {
                BaseController.sendBadRequest(res, 'SKU code is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.findInventoryItemBySku(skuCode.trim(), auth);

            if (!inventoryItem) {
                BaseController.sendNotFound(res, `Inventory item with SKU "${skuCode}" not found.`);
                return;
            }

            BaseController.sendSuccess(res, 'Inventory item found successfully.', inventoryItem);
        } catch (error) {
            InventoryController.handleError(res, error, 'findInventoryItemBySku');
        }
    }

    static async findInventoryItemByBarcode(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const barcode = req.params.barcode as string;
            if (!barcode || barcode.trim().length === 0) {
                BaseController.sendBadRequest(res, 'Barcode is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.findInventoryItemBySku(barcode.trim(), auth);

            if (!inventoryItem) {
                BaseController.sendNotFound(res, `Inventory item with barcode "${barcode}" not found.`);
                return;
            }

            BaseController.sendSuccess(res, 'Inventory item found successfully.', inventoryItem);
        } catch (error) {
            InventoryController.handleError(res, error, 'findInventoryItemByBarcode');
        }
    }

    static async getInventoryItemsByCategory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const categoryId = req.params.categoryId;
            if (!categoryId) {
                BaseController.sendBadRequest(res, 'Category ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getInventoryItemsByCategory(categoryId as string, auth);
            BaseController.sendSuccess(res, 'Inventory items by category retrieved successfully.', inventoryItems);
        } catch (error) {
            InventoryController.handleError(res, error, 'getInventoryItemsByCategory');
        }
    }

    static async getInventoryItemsByStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const status = req.params.status as string;
            if (!status) {
                BaseController.sendBadRequest(res, 'Status is required.');
                return;
            }

            const validStatuses = ['active', 'inactive', 'void'];
            if (!validStatuses.includes(status.toLowerCase())) {
                BaseController.sendBadRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getInventoryItemsByStatus(status as string, auth);
            BaseController.sendSuccess(res, 'Inventory items by status retrieved successfully.', inventoryItems);
        } catch (error) {
            InventoryController.handleError(res, error, 'getInventoryItemsByStatus');
        }
    }

    static async getLowStockItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const threshold = parseInt(req.query.threshold as string) || 10;

            if (threshold < 0) {
                BaseController.sendBadRequest(res, 'Threshold must be a non-negative number.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getInventoryItemsWithLowStock(threshold, auth);
            BaseController.sendSuccess(res, 'Low stock items retrieved successfully.', {
                threshold,
                count: inventoryItems.length,
                items: inventoryItems
            });
        } catch (error) {
            InventoryController.handleError(res, error, 'getLowStockItems');
        }
    }

    static async createInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const newInventoryItem = await InventoryService.createInventoryItem(req.body, auth);
            BaseController.sendCreated(res, 'Inventory item created successfully.', newInventoryItem);
        } catch (error) {
            InventoryController.handleError(res, error, 'createInventoryItem');
        }
    }

    static async updateInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = req.params.itemId;
            if (!itemId) {
                BaseController.sendBadRequest(res, 'Item ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.updateInventoryItem(
                itemId as string,
                req.body,
                auth
            );

            if (numReplaced === 0) {
                BaseController.sendNotFound(res, `Inventory item with ID "${itemId}" not found.`);
            } else {
                BaseController.sendSuccess(res, 'Inventory item updated successfully.');
            }
        } catch (error) {
            InventoryController.handleError(res, error, 'updateInventoryItem');
        }
    }

    static async updateInventoryQuantity(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = req.params.itemId;
            if (!itemId) {
                BaseController.sendBadRequest(res, 'Item ID is required.');
                return;
            }

            const { quantity } = req.body;
            if (quantity === undefined || quantity === null) {
                BaseController.sendBadRequest(res, 'Quantity is required.');
                return;
            }

            const parsedQuantity = parseInt(quantity);
            if (isNaN(parsedQuantity)) {
                BaseController.sendBadRequest(res, 'Quantity must be a valid number.');
                return;
            }

            if (parsedQuantity < 0) {
                BaseController.sendBadRequest(res, 'Quantity cannot be negative.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const result = await InventoryService.updateInventoryItemQuantity(
                itemId as string,
                parsedQuantity,
                auth
            );

            if (result === 0) {
                BaseController.sendNotFound(res, `Inventory item with ID "${itemId}" not found.`);
            } else {
                BaseController.sendSuccess(res, 'Inventory quantity updated successfully.');
            }
        } catch (error) {
            InventoryController.handleError(res, error, 'updateInventoryQuantity');
        }
    }

    static async adjustInventory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = req.params.itemId;
            if (!itemId) {
                BaseController.sendBadRequest(res, 'Item ID is required.');
                return;
            }

            const { adjustment } = req.body;
            if (adjustment === undefined || adjustment === null) {
                BaseController.sendBadRequest(res, 'Adjustment value is required.');
                return;
            }

            const parsedAdjustment = parseInt(adjustment);
            if (isNaN(parsedAdjustment)) {
                BaseController.sendBadRequest(res, 'Adjustment must be a valid number.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const result = await InventoryService.adjustInventory(
                itemId as string,
                parsedAdjustment,
                auth
            );

            if (result === 0) {
                BaseController.sendNotFound(res, `Inventory item with ID "${itemId}" not found.`);
            } else {
                const direction = parsedAdjustment >= 0 ? 'increased' : 'decreased';
                BaseController.sendSuccess(res, `Inventory ${direction} by ${Math.abs(parsedAdjustment)} units.`);
            }
        } catch (error) {
            InventoryController.handleError(res, error, 'adjustInventory');
        }
    }

    static async bulkUpdateInventoryItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { updates } = req.body;
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                BaseController.sendBadRequest(res, 'Updates array is required and must not be empty.');
                return;
            }

            // Validate each update
            const validationErrors: string[] = [];
            for (let i = 0; i < updates.length; i++) {
                const update = updates[i];
                if (!update.productUuid) {
                    validationErrors.push(`Update at index ${i}: productUuid is required.`);
                }
                if (!update.data || typeof update.data !== 'object') {
                    validationErrors.push(`Update at index ${i}: data object is required.`);
                }
            }

            if (validationErrors.length > 0) {
                BaseController.sendValidationError(res, 'Bulk update validation failed', { errors: validationErrors });
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            await InventoryService.bulkUpdateInventoryItems(updates, auth);
            BaseController.sendSuccess(res, `${updates.length} inventory items updated successfully.`);
        } catch (error) {
            InventoryController.handleError(res, error, 'bulkUpdateInventoryItems');
        }
    }

    static async moveToCategory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productIds, categoryId } = req.body;
            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                BaseController.sendBadRequest(res, 'Product IDs array is required and must not be empty.');
                return;
            }
            if (!categoryId) {
                BaseController.sendBadRequest(res, 'Category ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            await InventoryService.moveInventoryItemsToCategory(productIds, categoryId, auth);
            BaseController.sendSuccess(res, `${productIds.length} items moved to category successfully.`);
        } catch (error) {
            InventoryController.handleError(res, error, 'moveToCategory');
        }
    }

    static async voidInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = req.params.itemId;
            if (!itemId) {
                BaseController.sendBadRequest(res, 'Item ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.voidInventoryItem(itemId as string, auth);

            if (numReplaced === 0) {
                BaseController.sendNotFound(res, `Inventory item with ID "${itemId}" not found.`);
            } else {
                BaseController.sendSuccess(res, 'Inventory item voided successfully.');
            }
        } catch (error) {
            InventoryController.handleError(res, error, 'voidInventoryItem');
        }
    }

    static async deleteInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = req.params.itemId;
            if (!itemId) {
                BaseController.sendBadRequest(res, 'Item ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const numDeleted = await InventoryService.deleteInventoryItem(itemId as string, auth);

            if (numDeleted === 0) {
                BaseController.sendNotFound(res, `Inventory item with ID "${itemId}" not found.`);
            } else {
                BaseController.sendSuccess(res, 'Inventory item deleted successfully.');
            }
        } catch (error) {
            InventoryController.handleError(res, error, 'deleteInventoryItem');
        }
    }

    static async syncCategoryItemCounts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            await InventoryService.syncAllCategoryItemCounts(auth);
            BaseController.sendSuccess(res, 'Category item counts synced successfully.');
        } catch (error) {
            InventoryController.handleError(res, error, 'syncCategoryItemCounts');
        }
    }

    static async checkInventoryItemExists(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = req.params.itemId;
            if (!itemId) {
                BaseController.sendBadRequest(res, 'Item ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const exists = await InventoryService.inventoryItemExists(itemId as string, auth);
            BaseController.sendSuccess(res, 'Inventory item existence checked.', { exists });
        } catch (error) {
            InventoryController.handleError(res, error, 'checkInventoryItemExists');
        }
    }

    /**
     * Convert a variant to become a variant of a different product.
     * This allows moving an existing product's variant to become a variant of another product.
     * 
     * @body {string} targetProductId - The ID of the product to move the variant to
     * @body {string} [variantName] - Optional new name for the variant
     * @body {boolean} [deleteOrphanedProduct=true] - Whether to delete the original product if it becomes orphaned
     */
    static async convertToVariant(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const variantId = req.params.variantId;
            if (!variantId) {
                BaseController.sendBadRequest(res, 'Variant ID is required.');
                return;
            }

            const { targetProductId, variantName, deleteOrphanedProduct } = req.body;

            if (!targetProductId) {
                BaseController.sendBadRequest(res, 'Target product ID is required.', 'targetProductId');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const result = await InventoryService.convertToVariant(
                {
                    variantId: variantId as string,
                    targetProductId,
                    variantName,
                    deleteOrphanedProduct,
                },
                auth
            );

            let message = 'Variant converted successfully.';
            if (result.orphanedProductDeleted) {
                message += ' Original product was deleted as it had no remaining variants.';
            }

            BaseController.sendSuccess(res, message, result);
        } catch (error) {
            InventoryController.handleError(res, error, 'convertToVariant');
        }
    }
}