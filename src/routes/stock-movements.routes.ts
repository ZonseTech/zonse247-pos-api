import { Router } from 'express';
import { StockMovementController } from '../controllers/stock-movement.controller';
import { StockAdjustmentController } from '../controllers/stock-adjustment.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { stockMovementSchemas } from '../validations/stock-movement.schemas';

const router = Router();

// =============================================================================
// General Stock Movement Endpoints
// =============================================================================

// Record a single stock movement
router.post('/', validateBody(stockMovementSchemas.recordMovement), StockMovementController.recordMovement);

// Sync movements from offline terminal (bulk insert)
router.post('/sync', validateBody(stockMovementSchemas.syncMovements), StockMovementController.syncFromOffline);

// Recalculate inventory from movements
router.post('/recalculate/:inventoryId', StockMovementController.recalculateInventory);

// Recalculate all inventory for a branch
router.post('/recalculate-branch', StockMovementController.recalculateBranchInventory);

// =============================================================================
// Stock Adjustment Endpoints (Counts, Damages, Expiry, Transfers)
// =============================================================================

// Record stock count (physical count vs system)
router.post('/stock-count', validateBody(stockMovementSchemas.stockCount), StockAdjustmentController.recordStockCount);

// Record generic adjustment (+ or -)
router.post('/adjust', validateBody(stockMovementSchemas.adjustment), StockAdjustmentController.recordAdjustment);

// Record damaged stock
router.post('/damage', validateBody(stockMovementSchemas.damage), StockAdjustmentController.recordDamage);

// Record expired stock
router.post('/expiry', validateBody(stockMovementSchemas.expiry), StockAdjustmentController.recordExpiry);

// Record stock transfer between branches
router.post('/transfer', validateBody(stockMovementSchemas.transfer), StockAdjustmentController.recordTransfer);

// Record correction for an incorrect movement (immutable ledger - creates compensating movement)
router.post('/correction', validateBody(stockMovementSchemas.correction), StockAdjustmentController.recordCorrection);

// =============================================================================
// Query Endpoints
// =============================================================================

// Get single movement by ID
router.get('/:id', StockMovementController.getMovementById);

// Get movements for a product
router.get('/product/:productId', StockMovementController.getProductMovements);

// Get movements for a branch (with filters)
router.get('/branch', StockMovementController.getBranchMovements);

export default router;
