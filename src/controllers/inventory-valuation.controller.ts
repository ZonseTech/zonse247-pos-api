import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { InventoryValuationService } from '../services/inventory/inventory-valuation.service';
import { StockMovementService } from '../services/inventory/stock-movement.service';
import { AuthRequest } from '../lib/express.type';
import { CostingMethod } from '../models/inventory-valuation.model';

/**
 * InventoryValuationController
 *
 * Endpoints for perpetual inventory valuation, COGS calculation,
 * opening stock, and costing method management.
 */
export class InventoryValuationController extends BaseController {

    // ──────────────────────────────────────────────────────────────
    // Valuation
    // ──────────────────────────────────────────────────────────────

    /**
     * GET /inventory-valuation/summary
     * Full branch valuation across all costing methods.
     */
    static async getValuationSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const summary = await InventoryValuationService.getValuationSummary(tenantId, branchId);

            BaseController.sendResponse(res, 200, true, 'Inventory valuation retrieved', summary);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to get valuation', undefined, error.message);
        }
    }

    /**
     * GET /inventory-valuation/:inventoryId
     * Single-item valuation with cost-layer breakdown.
     */
    static async getItemValuation(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const inventoryId = req.params.inventoryId as string;
            const valuation = await InventoryValuationService.getItemValuation(inventoryId);

            BaseController.sendResponse(res, 200, true, 'Item valuation retrieved', valuation);
        } catch (error: any) {
            const status = error.message === 'Inventory not found' ? 404 : 500;
            BaseController.sendResponse(res, status, false, 'Failed to get item valuation', undefined, error.message);
        }
    }

    /**
     * GET /inventory-valuation/:inventoryId/cost-layers
     * Get remaining (non-depleted) cost layers for an item.
     */
    static async getCostLayers(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const inventoryId = req.params.inventoryId as string;
            const layers = await InventoryValuationService.getCostLayers(inventoryId);

            BaseController.sendResponse(res, 200, true, 'Cost layers retrieved', layers);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to get cost layers', undefined, error.message);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // COGS
    // ──────────────────────────────────────────────────────────────

    /**
     * GET /inventory-valuation/cogs/period
     * COGS for a date range, aggregated from the stock movement ledger (SALE movements).
     * @query startDate - ISO date string (required)
     * @query endDate   - ISO date string (required)
     */
    static async getPeriodCOGS(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId;
            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;

            if (!startDate || !endDate) {
                BaseController.sendResponse(res, 400, false, 'startDate and endDate query parameters are required');
                return;
            }

            const result = await InventoryValuationService.getPeriodCOGS(
                tenantId,
                branchId,
                new Date(startDate),
                new Date(endDate)
            );

            BaseController.sendResponse(res, 200, true, 'Period COGS retrieved', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to get period COGS', undefined, error.message);
        }
    }

    /**
     * GET /inventory-valuation/cogs/period-from-sales
     * COGS for a date range, aggregated from sale_items (unitCost × quantity).
     * Cross-check: should match /cogs/period (ledger-based). Divergence signals data issues.
     */
    static async getPeriodCOGSFromSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId;
            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;

            if (!startDate || !endDate) {
                BaseController.sendResponse(res, 400, false, 'startDate and endDate query parameters are required');
                return;
            }

            const result = await InventoryValuationService.getPeriodCOGSFromSales(
                tenantId,
                branchId,
                new Date(startDate),
                new Date(endDate)
            );

            BaseController.sendResponse(res, 200, true, 'Period COGS (from sales) retrieved', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to get period COGS from sales', undefined, error.message);
        }
    }

    /**
     * GET /inventory-valuation/gross-profit/by-product
     * Gross profit per product for a date range.
     * Revenue and COGS sourced from sale_items.
     */
    static async getGrossProfitByProduct(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId;
            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;

            if (!startDate || !endDate) {
                BaseController.sendResponse(res, 400, false, 'startDate and endDate query parameters are required');
                return;
            }

            const result = await InventoryValuationService.getGrossProfitByProduct(
                tenantId,
                branchId,
                new Date(startDate),
                new Date(endDate)
            );

            BaseController.sendResponse(res, 200, true, 'Gross profit by product retrieved', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to get gross profit by product', undefined, error.message);
        }
    }

    /**
     * GET /inventory-valuation/aging
     * Inventory aging analysis — buckets by days since last sale, slow/dead stock flags.
     * @query [thresholdDays] - Days without a sale to flag as slow mover (default 90)
     * @query [branchId]      - Optional branch override
     */
    static async getInventoryAging(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId;
            const thresholdDays = req.query.thresholdDays ? parseInt(req.query.thresholdDays as string, 10) : 90;

            if (isNaN(thresholdDays) || thresholdDays < 1) {
                BaseController.sendResponse(res, 400, false, 'thresholdDays must be a positive integer');
                return;
            }

            const result = await InventoryValuationService.getInventoryAging(tenantId, branchId, thresholdDays);

            BaseController.sendResponse(res, 200, true, 'Inventory aging analysis retrieved', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, 'Failed to get inventory aging', undefined, error.message);
        }
    }

    /**
     * POST /inventory-valuation/cogs
     * Preview COGS for a given quantity without consuming layers.
     */
    static async calculateCOGS(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, quantity, overrideMethod } = req.body;

            const cogs = await InventoryValuationService.calculateCOGS(
                inventoryId,
                quantity,
                overrideMethod as CostingMethod | undefined
            );

            BaseController.sendResponse(res, 200, true, 'COGS calculated', cogs);
        } catch (error: any) {
            const status = error.message === 'Inventory not found' ? 404 : 400;
            BaseController.sendResponse(res, status, false, 'Failed to calculate COGS', undefined, error.message);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Costing Method
    // ──────────────────────────────────────────────────────────────

    /**
     * PUT /inventory-valuation/costing-method
     * Change the costing method for an inventory item.
     */
    static async changeCostingMethod(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, newMethod } = req.body;
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const result = await InventoryValuationService.changeCostingMethod({
                tenantId,
                branchId,
                inventoryId,
                newMethod: newMethod as CostingMethod,
                changedBy: req.auth.userId,
            });

            BaseController.sendResponse(res, 200, true, 'Costing method updated', result);
        } catch (error: any) {
            const status = error.message === 'Inventory not found' ? 404 : 400;
            BaseController.sendResponse(res, status, false, 'Failed to change costing method', undefined, error.message);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Opening Stock
    // ──────────────────────────────────────────────────────────────

    /**
     * POST /inventory-valuation/opening-balance
     * Record an opening stock balance.
     */
    static async recordOpeningBalance(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId, quantity, unitCost, openingDate, notes } = req.body;
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const result = await StockMovementService.recordOpeningBalance(
                {
                    tenantId,
                    branchId,
                    terminalId: (req as any).verifiedMetadata?.terminalId,
                    inventoryId,
                    quantity,
                    unitCost,
                    notes,
                    movedBy: req.auth.userId,
                    openingDate: openingDate ? new Date(openingDate) : undefined,
                }
            );

            BaseController.sendResponse(res, 201, true, 'Opening balance recorded', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to record opening balance', undefined, error.message);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Cost-Layer Rebuild
    // ──────────────────────────────────────────────────────────────

    /**
     * POST /inventory-valuation/rebuild-layers
     * Rebuild cost layers from movement history (data repair tool).
     */
    static async rebuildCostLayers(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { inventoryId } = req.body;

            const result = await InventoryValuationService.rebuildCostLayers(inventoryId);

            BaseController.sendResponse(res, 200, true, 'Cost layers rebuilt', result);
        } catch (error: any) {
            const status = error.message === 'Inventory not found' ? 404 : 500;
            BaseController.sendResponse(res, status, false, 'Failed to rebuild cost layers', undefined, error.message);
        }
    }
}
