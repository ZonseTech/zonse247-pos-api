import { Router } from 'express';
import { StockMovementController } from '../controllers/stock-movement.controller';
import { StockAdjustmentController } from '../controllers/stock-adjustment.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { stockMovementSchemas } from '../validations/stock-movement.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

/**
 * POST /
 * Record a single stock movement
 * @body {string} variantId - Variant UUID
 * @body {string} inventoryId - Inventory UUID
 * @body {string} movementType - Movement type (SALE, RETURN, ADJUSTMENT, etc.)
 * @body {number} quantity - Quantity to move
 * @body {string} [referenceType] - Reference type (SALE, RETURN, ADJUSTMENT, etc.)
 * @body {string} [referenceId] - Reference UUID
 * @body {number} [unitCost] - Unit cost
 * @body {string} [notes] - Additional notes
 */
router.post('/', permissionMiddleware.requireAnyPermission(['inventory.adjust', 'inventory.receive', 'inventory.transfer', 'inventory.waste']), validateBody(stockMovementSchemas.recordMovement), StockMovementController.recordMovement);

/**
 * POST /sync
 * Sync stock movements from offline terminal (bulk insert)
 * @body {Array} movements - Array of stock movements to sync
 */
router.post('/sync', permissionMiddleware.requireAnyPermission(['inventory.adjust', 'inventory.receive', 'inventory.transfer', 'inventory.waste']), validateBody(stockMovementSchemas.syncMovements), StockMovementController.syncFromOffline);

/**
 * POST /recalculate/:inventoryId
 * Recalculate inventory quantity from all movements (rebuild cache)
 * @param {string} inventoryId - Inventory UUID to recalculate
 */
router.post('/recalculate/:inventoryId', permissionMiddleware.requireAnyPermission(['inventory.count', 'inventory.adjust']), StockMovementController.recalculateInventory);

/**
 * POST /recalculate-branch
 * Recalculate all inventory for the current branch
 */
router.post('/recalculate-branch', permissionMiddleware.requireAnyPermission(['inventory.count', 'inventory.adjust']), StockMovementController.recalculateBranchInventory);

/**
 * POST /stock-count
 * Record physical stock count (creates adjustment if variance exists)
 * @body {string} inventoryId - Inventory UUID
 * @body {number} actualQuantity - Physical count quantity
 * @body {string} [notes] - Additional notes
 */
router.post('/stock-count', permissionMiddleware.requirePermission('inventory.count'), validateBody(stockMovementSchemas.stockCount), StockAdjustmentController.recordStockCount);

/**
 * POST /adjust
 * Record manual stock adjustment (positive or negative)
 * @body {string} inventoryId - Inventory UUID
 * @body {number} quantity - Adjustment quantity (positive = add, negative = remove)
 * @body {string} [notes] - Reason for adjustment
 */
router.post('/adjust', permissionMiddleware.requirePermission('inventory.adjust'), validateBody(stockMovementSchemas.adjustment), StockAdjustmentController.recordAdjustment);

/**
 * POST /damage
 * Record damaged stock (decreases inventory)
 * @body {string} inventoryId - Inventory UUID
 * @body {number} quantity - Damaged quantity
 * @body {string} [notes] - Description of damage
 */
router.post('/damage', permissionMiddleware.requirePermission('inventory.waste'), validateBody(stockMovementSchemas.damage), StockAdjustmentController.recordDamage);

/**
 * POST /expiry
 * Record expired stock (decreases inventory)
 * @body {string} inventoryId - Inventory UUID
 * @body {number} quantity - Expired quantity
 * @body {string} [notes] - Additional notes
 */
router.post('/expiry', permissionMiddleware.requirePermission('inventory.waste'), validateBody(stockMovementSchemas.expiry), StockAdjustmentController.recordExpiry);

/**
 * POST /transfer
 * Record stock transfer between branches
 * @body {string} inventoryId - Source inventory UUID
 * @body {string} toBranchId - Destination branch UUID
 * @body {number} quantity - Transfer quantity
 * @body {string} [notes] - Transfer notes
 */
router.post('/transfer', permissionMiddleware.requirePermission('inventory.transfer'), validateBody(stockMovementSchemas.transfer), StockAdjustmentController.recordTransfer);

/**
 * POST /correction
 * Create compensating movement to correct an error (immutable ledger pattern)
 * @body {string} originalMovementId - Movement UUID to correct
 * @body {string} [notes] - Reason for correction
 */
router.post('/correction', permissionMiddleware.requirePermission('inventory.adjust'), validateBody(stockMovementSchemas.correction), StockAdjustmentController.recordCorrection);

/**
 * GET /variant/:variantId
 * Get stock movement history for a specific variant
 * @param {string} variantId - Variant UUID
 * @query {number} [page=1] - Page number
 * @query {number} [perPage=50] - Items per page
 */
router.get('/variant/:variantId', permissionMiddleware.requirePermission('inventory.view'), StockMovementController.getVariantMovements);

/**
 * GET /branch
 * Get stock movements for the current branch with optional filters
 * @query {string} [movementType] - Filter by movement type
 * @query {string} [startDate] - Filter by date range start
 * @query {string} [endDate] - Filter by date range end
 * @query {number} [page=1] - Page number
 * @query {number} [limit=100] - Items per page
 */
router.get('/branch', permissionMiddleware.requirePermission('inventory.view'), StockMovementController.getBranchMovements);

/**
 * GET /:id
 * Get a single stock movement by ID
 * @param {string} id - Movement UUID
 */
router.get('/:id', permissionMiddleware.requirePermission('inventory.view'), StockMovementController.getMovementById);

export default router;
