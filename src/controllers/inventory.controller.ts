import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { InventoryService } from '../services/inventory.service';
import { AuthRequest } from '../lib/express.type';

export class InventoryController extends BaseController {
    private static getAuthContext(req: Request & AuthRequest) {
        return {
            tenantId: req.auth?.tenantId || '',
            branchId: req.auth?.branchId || '',
            userId: req.auth?.userId || ''
        };
    }

    static async getSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const summary = await InventoryService.getInventorySummary(auth);
            BaseController.sendSuccess(res, 'Inventory summary retrieved successfully.', summary);
        } catch (error) {
            console.error('Error fetching inventory summary:', error);
            BaseController.sendServerError(res, 'Failed to fetch inventory summary.');
        }
    }

    static async getCount(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const includeVoided = req.query.includeVoided === 'true';
            const count = await InventoryService.getInventoryItemCount(auth, includeVoided);
            BaseController.sendSuccess(res, 'Inventory count retrieved successfully.', { count });
        } catch (error) {
            console.error('Error fetching inventory count:', error);
            BaseController.sendServerError(res, 'Failed to fetch inventory count.');
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
                BaseController.sendNotFound(res, 'Inventory item not found.');
                return;
            }

            BaseController.sendSuccess(res, 'Inventory item retrieved successfully.', inventoryItem);
        } catch (err) {
            console.error('Error fetching inventory item:', err);
            BaseController.sendServerError(res, 'An unexpected error occurred.');
        }
    }

    static async getInventoryItemsOnly(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getActiveInventoryItems(auth);
            BaseController.sendSuccess(res, 'Inventory items retrieved successfully.', inventoryItems);
        } catch (err) {
            console.error('Error fetching inventory items:', err);
            BaseController.sendServerError(res, 'Failed to fetch inventory items.');
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

            const { inventoryItems, total, totalPages } = await InventoryService.getInventoryItemsWithCategories(
                auth,
                page,
                perPage,
                search,
                filter,
                categoryId,
                startDate,
                endDate
            );

            BaseController.sendSuccess(res, 'Inventory items with categories retrieved successfully.', {
                inventoryItems,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: perPage
                }
            });
        } catch (error) {
            console.error('Error fetching inventory items with categories:', error);
            BaseController.sendServerError(res, 'Failed to fetch inventory items with categories.');
        }
    }

    static async getAllInventoryItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const includeVoided = req.query.includeVoided === 'true';
            const inventoryItems = await InventoryService.getAllInventoryItems(auth, includeVoided);
            BaseController.sendSuccess(res, 'All inventory items retrieved successfully.', inventoryItems);
        } catch (error) {
            console.error('Error fetching all inventory items:', error);
            BaseController.sendServerError(res, 'Failed to fetch all inventory items.');
        }
    }

    static async searchInventoryItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const searchTerm = req.query.q as string;
            if (!searchTerm) {
                BaseController.sendBadRequest(res, 'Search term is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.searchInventoryItems(searchTerm, auth);
            BaseController.sendSuccess(res, 'Search results retrieved successfully.', inventoryItems);
        } catch (error) {
            console.error('Error searching inventory items:', error);
            BaseController.sendServerError(res, 'Failed to search inventory items.');
        }
    }

    static async findInventoryItemBySku(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { skuCode } = req.body;
            if (!skuCode) {
                BaseController.sendBadRequest(res, 'SKU code is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.findInventoryItemBySku(skuCode, auth);

            if (!inventoryItem) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
                return;
            }

            BaseController.sendSuccess(res, 'Inventory item found successfully.', inventoryItem);
        } catch (err) {
            console.error('Error finding inventory item by SKU:', err);
            BaseController.sendServerError(res, 'An unexpected error occurred.');
        }
    }

    static async findInventoryItemByBarcode(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const barcode = req.params.barcode;
            if (!barcode) {
                BaseController.sendBadRequest(res, 'Barcode is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.findInventoryItemBySku(barcode as string, auth);

            if (!inventoryItem) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
                return;
            }

            BaseController.sendSuccess(res, 'Inventory item found successfully.', inventoryItem);
        } catch (err) {
            console.error('Error finding inventory item by barcode:', err);
            BaseController.sendServerError(res, 'An unexpected error occurred.');
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
            console.error('Error fetching inventory items by category:', error);
            BaseController.sendServerError(res, 'Failed to fetch inventory items by category.');
        }
    }

    static async getInventoryItemsByStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const status = req.params.status;
            if (!status) {
                BaseController.sendBadRequest(res, 'Status is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getInventoryItemsByStatus(status as string, auth);
            BaseController.sendSuccess(res, 'Inventory items by status retrieved successfully.', inventoryItems);
        } catch (error) {
            console.error('Error fetching inventory items by status:', error);
            BaseController.sendServerError(res, 'Failed to fetch inventory items by status.');
        }
    }

    static async getLowStockItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const threshold = parseInt(req.query.threshold as string) || 10;
            const auth = InventoryController.getAuthContext(req);
            const inventoryItems = await InventoryService.getInventoryItemsWithLowStock(threshold, auth);
            BaseController.sendSuccess(res, 'Low stock items retrieved successfully.', {
                threshold,
                count: inventoryItems.length,
                items: inventoryItems
            });
        } catch (error) {
            console.error('Error fetching low stock items:', error);
            BaseController.sendServerError(res, 'Failed to fetch low stock items.');
        }
    }

    static async createInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const newInventoryItem = await InventoryService.createInventoryItem(req.body, auth);
            BaseController.sendCreated(res, 'Inventory item created successfully.', newInventoryItem);
        } catch (err) {
            console.error('Error creating inventory item:', err);
            if (err instanceof Error) {
                if (err.message === 'Inventory item validation failed') {
                    BaseController.sendBadRequest(res, 'Invalid inventory item data provided.');
                } else if (err.message.includes('Duplicate barcode') || err.message.includes('is already assigned to product')) {
                    BaseController.sendBadRequest(res, err.message);
                } else {
                    BaseController.sendServerError(res, 'An unexpected error occurred.');
                }
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async updateInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.updateInventoryItem(
                req.params.itemId as string,
                req.body,
                auth
            );

            if (numReplaced === 0) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
            } else {
                BaseController.sendSuccess(res, 'Inventory item updated successfully.');
            }
        } catch (err) {
            console.error('Error updating inventory item:', err);
            if (err instanceof Error && (
                err.message === 'Inventory item validation failed' ||
                err.message === 'Inventory item not found or access denied' ||
                err.message.includes('Duplicate barcode') ||
                err.message.includes('is already assigned to product')
            )) {
                BaseController.sendBadRequest(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async updateInventoryQuantity(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { quantity } = req.body;
            if (quantity === undefined || quantity === null) {
                BaseController.sendBadRequest(res, 'Quantity is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const result = await InventoryService.updateInventoryItemQuantity(
                req.params.itemId as string,
                parseInt(quantity),
                auth
            );

            if (result === 0) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
            } else {
                BaseController.sendSuccess(res, 'Inventory quantity updated successfully.');
            }
        } catch (err) {
            console.error('Error updating inventory quantity:', err);
            if (err instanceof Error && err.message === 'Inventory item not found or access denied') {
                BaseController.sendNotFound(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async adjustInventory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { adjustment } = req.body;
            if (adjustment === undefined || adjustment === null) {
                BaseController.sendBadRequest(res, 'Adjustment value is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const result = await InventoryService.adjustInventory(
                req.params.itemId as string,
                parseInt(adjustment),
                auth
            );

            if (result === 0) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
            } else {
                BaseController.sendSuccess(res, 'Inventory adjusted successfully.');
            }
        } catch (err) {
            console.error('Error adjusting inventory:', err);
            if (err instanceof Error) {
                if (err.message === 'Inventory item not found or access denied') {
                    BaseController.sendNotFound(res, err.message);
                } else if (err.message === 'Adjustment would result in negative inventory') {
                    BaseController.sendBadRequest(res, err.message);
                } else {
                    BaseController.sendServerError(res, 'An unexpected error occurred.');
                }
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async bulkUpdateInventoryItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { updates } = req.body;
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                BaseController.sendBadRequest(res, 'Updates array is required and must not be empty.');
                return;
            }

            for (const update of updates) {
                if (!update.productUuid || !update.data) {
                    BaseController.sendBadRequest(res, 'Each update must have productUuid and data fields.');
                    return;
                }
            }

            const auth = InventoryController.getAuthContext(req);
            await InventoryService.bulkUpdateInventoryItems(updates, auth);
            BaseController.sendSuccess(res, `${updates.length} inventory items updated successfully.`);
        } catch (error) {
            console.error('Error bulk updating inventory items:', error);
            BaseController.sendServerError(res, 'Failed to bulk update inventory items.');
        }
    }

    static async moveToCategory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productUuids, categoryId } = req.body;
            if (!productUuids || !Array.isArray(productUuids) || productUuids.length === 0) {
                BaseController.sendBadRequest(res, 'Product UUIDs array is required and must not be empty.');
                return;
            }
            if (!categoryId) {
                BaseController.sendBadRequest(res, 'Category ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            await InventoryService.moveInventoryItemsToCategory(productUuids, categoryId, auth);
            BaseController.sendSuccess(res, `${productUuids.length} items moved to category successfully.`);
        } catch (error) {
            console.error('Error moving items to category:', error);
            BaseController.sendServerError(res, 'Failed to move items to category.');
        }
    }

    static async voidInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.voidInventoryItem(req.params.itemId as string, auth);

            if (numReplaced === 0) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
            } else {
                BaseController.sendSuccess(res, 'Inventory item voided successfully.');
            }
        } catch (err) {
            console.error('Error voiding inventory item:', err);
            if (err instanceof Error && err.message === 'Inventory item not found or access denied') {
                BaseController.sendNotFound(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async deleteInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numDeleted = await InventoryService.deleteInventoryItem(req.params.itemId as string, auth);

            if (numDeleted === 0) {
                BaseController.sendNotFound(res, 'Inventory item not found.');
            } else {
                BaseController.sendSuccess(res, 'Inventory item deleted successfully.');
            }
        } catch (err) {
            console.error('Error deleting inventory item:', err);
            if (err instanceof Error && err.message === 'Inventory item not found or access denied') {
                BaseController.sendNotFound(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async syncCategoryItemCounts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            await InventoryService.syncAllCategoryItemCounts(auth);
            BaseController.sendSuccess(res, 'Category item counts synced successfully.');
        } catch (error) {
            console.error('Error syncing category item counts:', error);
            BaseController.sendServerError(res, 'Failed to sync category item counts.');
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
            console.error('Error checking inventory item existence:', error);
            BaseController.sendServerError(res, 'Failed to check inventory item existence.');
        }
    }
}