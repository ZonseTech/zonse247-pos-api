import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { StockMovementService } from '../services/inventory/stock-movement.service';
import { AuthRequest } from '../lib/express.type';
import { AuditService, getAuditContext } from '../services/audit.service';

/**
 * Controller for specific stock adjustment operations
 * (Stock Counts, Damages, Expiry, Transfers)
 */
export class StockAdjustmentController extends BaseController {
    /**
     * Record a stock count adjustment
     * POST /stock-movements/stock-count
     * 
     * Use when physical count differs from system quantity
     */
    static async recordStockCount(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, actualQuantity, unitCost, notes } = req.body;

            if (!inventoryId) {
                BaseController.sendResponse(res, 400, false, 'inventoryId is required');
                return;
            }

            if (actualQuantity === undefined || actualQuantity < 0) {
                BaseController.sendResponse(res, 400, false, 'actualQuantity must be a non-negative number');
                return;
            }

            const result = await StockMovementService.recordStockCount(
                {
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                    terminalId: req.verifiedMetadata?.terminalId,
                    inventoryId,
                    actualQuantity,
                    unitCost,
                    notes,
                    movedBy: req.auth.userId,
                }
            );

            const message = result.variance === 0
                ? 'Stock count matches system - no adjustment needed'
                : `Stock count recorded. Variance: ${result.variance > 0 ? '+' : ''}${result.variance}`;

            AuditService.logCreate(getAuditContext(req), 'StockCount', (result as any).movementId || inventoryId, inventoryId, { actualQuantity, variance: result.variance });

            BaseController.sendResponse(res, 200, true, message, result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record stock count', undefined, error.message);
        }
    }

    /**
     * Record damaged stock
     * POST /stock-movements/damage
     */
    static async recordDamage(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, quantity, unitCost, notes } = req.body;

            if (!inventoryId) {
                BaseController.sendResponse(res, 400, false, 'inventoryId is required');
                return;
            }

            if (!quantity || quantity <= 0) {
                BaseController.sendResponse(res, 400, false, 'quantity must be a positive number');
                return;
            }

            const result = await StockMovementService.recordDamage(
                {
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                    terminalId: req.verifiedMetadata?.terminalId,
                    inventoryId,
                    quantity,
                    unitCost,
                    notes,
                    movedBy: req.auth.userId,
                }
            );

            BaseController.sendResponse(res, 201, true, `Recorded ${quantity} damaged items`, result);

            AuditService.logCreate(getAuditContext(req), 'StockDamage', (result as any).movementId || inventoryId, inventoryId, { quantity, notes });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record damage', undefined, error.message);
        }
    }

    /**
     * Record expired stock
     * POST /stock-movements/expiry
     */
    static async recordExpiry(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, quantity, unitCost, expiryDate, notes } = req.body;

            if (!inventoryId) {
                BaseController.sendResponse(res, 400, false, 'inventoryId is required');
                return;
            }

            if (!quantity || quantity <= 0) {
                BaseController.sendResponse(res, 400, false, 'quantity must be a positive number');
                return;
            }

            const result = await StockMovementService.recordExpiry(
                {
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                    terminalId: req.verifiedMetadata?.terminalId,
                    inventoryId,
                    quantity,
                    unitCost,
                    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                    notes,
                    movedBy: req.auth.userId,
                }
            );

            BaseController.sendResponse(res, 201, true, `Recorded ${quantity} expired items`, result);

            AuditService.logCreate(getAuditContext(req), 'StockExpiry', (result as any).movementId || inventoryId, inventoryId, { quantity, expiryDate });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record expiry', undefined, error.message);
        }
    }

    /**
     * Record stock transfer between branches
     * POST /stock-movements/transfer
     */
    static async recordTransfer(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const {
                sourceInventoryId,
                destinationBranchId,
                destinationInventoryId,
                quantity,
                unitCost,
                transferId,
                notes
            } = req.body;

            if (!sourceInventoryId || !destinationBranchId || !destinationInventoryId) {
                BaseController.sendResponse(
                    res,
                    400,
                    false,
                    'sourceInventoryId, destinationBranchId, and destinationInventoryId are required'
                );
                return;
            }

            if (!quantity || quantity <= 0) {
                BaseController.sendResponse(res, 400, false, 'quantity must be a positive number');
                return;
            }

            if (!transferId) {
                BaseController.sendResponse(res, 400, false, 'transferId is required');
                return;
            }

            const result = await StockMovementService.recordTransfer(
                {
                    tenantId: req.auth.tenantId,
                    sourceBranchId: req.auth.activeBranchId || req.auth.branchId,
                    sourceInventoryId,
                    destinationBranchId,
                    destinationInventoryId,
                    quantity,
                    unitCost: unitCost || undefined, // Let service auto-resolve from source avg cost
                    transferId,
                    terminalId: req.verifiedMetadata?.terminalId,
                    notes,
                    movedBy: req.auth.userId,
                }
            );

            BaseController.sendResponse(
                res,
                201,
                true,
                `Transferred ${quantity} items successfully`,
                result
            );

            AuditService.logCreate(getAuditContext(req), 'StockTransfer', transferId, sourceInventoryId, { quantity, destinationBranchId, destinationInventoryId });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record transfer', undefined, error.message);
        }
    }

    /**
     * Record a generic stock adjustment (+ or -)
     * POST /stock-movements/adjust
     */
    static async recordAdjustment(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, quantity, unitCost, notes } = req.body;

            if (!inventoryId) {
                BaseController.sendResponse(res, 400, false, 'inventoryId is required');
                return;
            }

            if (quantity === undefined || quantity === 0) {
                BaseController.sendResponse(res, 400, false, 'quantity must be a non-zero number');
                return;
            }

            const result = await StockMovementService.recordAdjustment(
                {
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                    terminalId: req.verifiedMetadata?.terminalId,
                    inventoryId,
                    quantity, // Can be positive or negative
                    unitCost,
                    notes,
                    movedBy: req.auth.userId,
                }
            );

            const direction = quantity > 0 ? 'increased' : 'decreased';
            BaseController.sendResponse(
                res,
                201,
                true,
                `Stock ${direction} by ${Math.abs(quantity)}`,
                result
            );

            AuditService.logCreate(getAuditContext(req), 'StockAdjustment', (result as any).movementId || inventoryId, inventoryId, { quantity, notes });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record adjustment', undefined, error.message);
        }
    }

    /**
     * Record a correction movement to reverse a previous movement
     * POST /stock-movements/correction
     * 
     * Use this when a movement was recorded incorrectly.
     * IMMUTABLE LEDGER: We never delete movements, we create compensating movements.
     */
    static async recordCorrection(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { originalMovementId, reason } = req.body;

            if (!originalMovementId) {
                BaseController.sendResponse(res, 400, false, 'originalMovementId is required');
                return;
            }

            if (!reason || reason.trim().length < 5) {
                BaseController.sendResponse(res, 400, false, 'reason is required (min 5 characters)');
                return;
            }

            const result = await StockMovementService.recordCorrectionMovement(
                {
                    originalMovementId,
                    reason,
                    correctedBy: req.auth.userId,
                    tenantId: req.auth.tenantId,
                    branchId: req.auth.activeBranchId || req.auth.branchId,
                }
            );

            BaseController.sendResponse(
                res,
                201,
                true,
                `Correction recorded: ${result.correctionType} applied`,
                {
                    movementId: result.movementId,
                    correctionType: result.correctionType,
                    previousQuantity: result.previousQuantity,
                    newQuantity: result.newQuantity,
                }
            );

            AuditService.logCreate(getAuditContext(req), 'StockCorrection', result.movementId, originalMovementId, { correctionType: result.correctionType, reason, previousQuantity: result.previousQuantity, newQuantity: result.newQuantity });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record correction', undefined, error.message);
        }
    }
}
