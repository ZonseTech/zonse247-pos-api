import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { StockMovementService } from '../services/inventory/stock-movement.service';
import { AuthRequest } from '../lib/express.type';
import { SyncMovementInput } from '../models/stock-movement.model';

export class StockMovementController extends BaseController {
    /**
     * Record a single stock movement
     * POST /stock-movements
     */
    static async recordMovement(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { variantId, inventoryId, movementType, quantity, referenceType, referenceId, unitCost, notes } = req.body;

            const result = await StockMovementService.recordMovementFromAPI(
                {
                    variantId,
                    inventoryId,
                    movementType,
                    quantity,
                    referenceType,
                    referenceId,
                    unitCost,
                    notes,
                },
                {
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                    userId: req.auth.userId,
                    terminalId: req.verifiedMetadata?.terminalId,
                }
            );

            BaseController.sendResponse(
                res,
                201,
                true,
                'Stock movement recorded successfully',
                result
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to record stock movement',
                undefined,
                error.message
            );
        }
    }

    /**
     * Sync stock movements from offline terminal
     * POST /stock-movements/sync
     */
    static async syncFromOffline(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { movements } = req.body;

            if (!Array.isArray(movements)) {
                BaseController.sendResponse(
                    res,
                    400,
                    false,
                    'movements must be an array',
                    undefined,
                    'Invalid request body'
                );
                return;
            }

            // Validate and filter movements for this tenant
            const validMovements: SyncMovementInput[] = movements.filter(
                (m: any) => m.tenantId === req.auth.tenantId
            );

            if (validMovements.length !== movements.length) {
                console.warn(`Filtered ${movements.length - validMovements.length} movements with mismatched tenantId`);
            }

            const result = await StockMovementService.syncMovementsFromOffline(validMovements);

            BaseController.sendResponse(
                res,
                200,
                result.success,
                result.success ? 'Stock movements synced successfully' : 'Sync completed with errors',
                result
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                500,
                false,
                'Failed to sync stock movements',
                undefined,
                error.message
            );
        }
    }

    /**
     * Recalculate inventory from stock movements
     * POST /stock-movements/recalculate/:inventoryId
     */
    static async recalculateInventory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId } = req.params;

            const result = await StockMovementService.recalculateInventory(inventoryId as string);

            BaseController.sendResponse(
                res,
                200,
                true,
                result.wasCorrected ? 'Inventory recalculated and corrected' : 'Inventory already correct',
                result
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to recalculate inventory',
                undefined,
                error.message
            );
        }
    }

    /**
     * Recalculate all inventory for a branch
     * POST /stock-movements/recalculate-branch
     */
    static async recalculateBranchInventory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const result = await StockMovementService.recalculateBranchInventory(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                `Recalculated ${result.total} inventories, corrected ${result.corrected}`,
                result
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                500,
                false,
                'Failed to recalculate branch inventory',
                undefined,
                error.message
            );
        }
    }

    /**
     * Get a single stock movement by ID
     * GET /stock-movements/:id
     */
    static async getMovementById(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const movement = await StockMovementService.getMovementById(
                id as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            if (!movement) {
                BaseController.sendResponse(
                    res,
                    404,
                    false,
                    'Stock movement not found'
                );
                return;
            }

            BaseController.sendResponse(
                res,
                200,
                true,
                'Stock movement retrieved successfully',
                movement
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to get stock movement',
                undefined,
                error.message
            );
        }
    }

    /**
     * Get stock movements for a variant
     */
    static async getVariantMovements(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { variantId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const perPage = parseInt(req.query.perPage as string) || parseInt(req.query.limit as string) || 50;
            const movementType = req.query.movementType as string | undefined;

            const tenantId = (req.query.tenantId as string) || req.auth.tenantId;
            const branchId = req.auth.activeBranchId || (req.query.branchId as string) || req.auth.branchId;

            const { movements, total, totalPages } = await StockMovementService.getMovementsByVariant(
                variantId as string,
                tenantId,
                branchId,
                page,
                perPage,
                movementType
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Stock movements retrieved successfully',
                {
                    movements,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: perPage
                    }
                }
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to get stock movements',
                undefined,
                error.message
            );
        }
    }

    /**
     * Get stock movements for a branch
     */
    static async getBranchMovements(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { movementType, startDate, endDate, page, limit } = req.query;

            const result = await StockMovementService.getMovementsByBranch(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    movementType: movementType as any,
                    startDate: startDate ? new Date(startDate as string) : undefined,
                    endDate: endDate ? new Date(endDate as string) : undefined,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Stock movements retrieved successfully',
                {
                    movements: result.movements,
                    pagination: {
                        currentPage: page ? parseInt(page as string) : 1,
                        totalPages: result.totalPages,
                        totalItems: result.total,
                        itemsPerPage: limit ? parseInt(limit as string) : 100
                    }
                }
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to get stock movements',
                undefined,
                error.message
            );
        }
    }
}
