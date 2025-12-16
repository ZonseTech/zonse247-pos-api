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

    static async getInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.params.itemId) {
                BaseController.sendBadRequest(res, 'Inventory item ID is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.getInventoryItemByUuid(req.params.itemId, auth);

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
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

            const { inventoryItems, total, totalPages } = await InventoryService.getInventoryItemsWithCategories(
                auth,
                page,
                perPage,
                search,
                filter,
                categoryId
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

    static async createInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const newInventoryItem = await InventoryService.createInventoryItem(req.body, auth);
            BaseController.sendCreated(res, 'Inventory item created successfully.', newInventoryItem);
        } catch (err) {
            console.error('Error creating inventory item:', err);
            if (err instanceof Error && err.message === 'Inventory item validation failed') {
                BaseController.sendBadRequest(res, 'Invalid inventory item data provided.');
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async updateInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.updateInventoryItem(
                req.params.itemId,
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
                err.message === 'Inventory item not found or access denied'
            )) {
                BaseController.sendBadRequest(res, err.message);
            } else {
                BaseController.sendServerError(res, 'An unexpected error occurred.');
            }
        }
    }

    static async voidInventoryItem(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = InventoryController.getAuthContext(req);
            const numReplaced = await InventoryService.voidInventoryItem(req.params.itemId, auth);

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
            const numDeleted = await InventoryService.deleteInventoryItem(req.params.itemId, auth);

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

    static async findInventoryItemBySku(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { skuCode } = req.body;
            if (!skuCode) {
                BaseController.sendBadRequest(res, 'SKU code is required.');
                return;
            }

            const auth = InventoryController.getAuthContext(req);
            const inventoryItem = await InventoryService.findInventoryItemBySku(skuCode, auth);
            BaseController.sendSuccess(res, 'Inventory item found successfully.', inventoryItem);
        } catch (err) {
            console.error('Error finding inventory item by SKU:', err);
            BaseController.sendServerError(res, 'An unexpected error occurred.');
        }
    }
}