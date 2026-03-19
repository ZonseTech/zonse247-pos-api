import { Router } from 'express';
import { InventoryValuationController } from '../controllers/inventory-valuation.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { stockMovementSchemas } from '../validations/stock-movement.schemas';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Valuation
// ──────────────────────────────────────────────────────────────

/**
 * GET /
 * Full branch inventory valuation summary (WAC, FIFO, LIFO)
 */
router.get('/summary', InventoryValuationController.getValuationSummary);

/**
 * GET /:inventoryId
 * Single-item valuation with cost-layer breakdown
 * @param inventoryId - Inventory UUID
 */
router.get('/:inventoryId', InventoryValuationController.getItemValuation);

/**
 * GET /:inventoryId/cost-layers
 * Remaining cost layers for an inventory item
 * @param inventoryId - Inventory UUID
 */
router.get('/:inventoryId/cost-layers', InventoryValuationController.getCostLayers);

// ──────────────────────────────────────────────────────────────
// COGS
// ──────────────────────────────────────────────────────────────

/**
 * GET /cogs/period
 * COGS for a date range from the stock-movement ledger (SALE movements)
 * @query startDate - ISO date (required)
 * @query endDate   - ISO date (required)
 * @query [branchId] - Optional branch override
 */
router.get('/cogs/period', InventoryValuationController.getPeriodCOGS);

/**
 * GET /cogs/period-from-sales
 * COGS for a date range from sale_items (unitCost × quantity)
 * Cross-check against /cogs/period (ledger-based) — should match.
 * @query startDate  - ISO date (required)
 * @query endDate    - ISO date (required)
 * @query [branchId] - Optional branch override
 */
router.get('/cogs/period-from-sales', InventoryValuationController.getPeriodCOGSFromSales);

/**
 * GET /gross-profit/by-product
 * Gross profit per product/variant for a date range
 * Revenue from sale_items.totalAmount, COGS from sale_items.unitCost × quantity
 * @query startDate  - ISO date (required)
 * @query endDate    - ISO date (required)
 * @query [branchId] - Optional branch override
 */
router.get('/gross-profit/by-product', InventoryValuationController.getGrossProfitByProduct);

/**
 * GET /aging
 * Inventory aging analysis — days since last sale, slow/dead stock identification
 * @query [thresholdDays] - Days without sale to flag as slow mover (default 90)
 * @query [branchId]      - Optional branch override
 */
router.get('/aging', InventoryValuationController.getInventoryAging);

/**
 * POST /cogs
 * Preview COGS for a given quantity (read-only, does NOT consume layers)
 * @body inventoryId - Inventory UUID
 * @body quantity    - Quantity to calculate COGS for
 * @body [overrideMethod] - Override costing method (WEIGHTED_AVERAGE, FIFO, LIFO)
 */
router.post('/cogs', validateBody(stockMovementSchemas.calculateCOGS), InventoryValuationController.calculateCOGS);

// ──────────────────────────────────────────────────────────────
// Costing Method
// ──────────────────────────────────────────────────────────────

/**
 * PUT /costing-method
 * Change the costing method for an inventory item
 * @body inventoryId - Inventory UUID
 * @body newMethod   - Target costing method (WEIGHTED_AVERAGE, FIFO, LIFO)
 */
router.put('/costing-method', validateBody(stockMovementSchemas.changeCostingMethod), InventoryValuationController.changeCostingMethod);

// ──────────────────────────────────────────────────────────────
// Opening Stock
// ──────────────────────────────────────────────────────────────

/**
 * POST /opening-balance
 * Record opening stock balance (new branch setup / legacy migration)
 * @body inventoryId  - Inventory UUID
 * @body quantity     - Opening quantity
 * @body unitCost     - Unit cost at opening
 * @body [openingDate] - Optional opening date
 * @body [notes]      - Optional notes
 */
router.post('/opening-balance', validateBody(stockMovementSchemas.openingStock), InventoryValuationController.recordOpeningBalance);

// ──────────────────────────────────────────────────────────────
// Cost-Layer Management
// ──────────────────────────────────────────────────────────────

/**
 * POST /rebuild-layers
 * Rebuild cost layers from movement history (data repair)
 * @body inventoryId - Inventory UUID
 */
router.post('/rebuild-layers', validateBody(stockMovementSchemas.rebuildCostLayers), InventoryValuationController.rebuildCostLayers);

export default router;
