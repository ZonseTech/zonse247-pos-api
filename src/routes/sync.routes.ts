/**
 * Sync Routes
 * 
 * Endpoints for receiving sync data from offline terminals.
 * 
 * PUBLIC ENDPOINTS (no auth required for testing - should be secured in production):
 * - POST /batch              - Bulk sync all tables
 * - POST /sales              - Sync sales
 * - POST /sale-items         - Sync sale items
 * - POST /sale-payments      - Sync sale payments
 * - POST /returns            - Sync returns
 * - POST /return-items       - Sync return items
 * - POST /stock-movements    - Sync stock movements
 * - POST /customers          - Sync customers
 * - POST /orders             - Sync orders
 * - GET  /status             - Get terminal sync status
 * 
 * SECURITY NOTE:
 * In production, these endpoints should be protected with terminal authentication.
 * Use the authRequired middleware after testing.
 */

import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
// import { authRequired } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/sync/batch
 * @desc    Bulk sync all tables in one request
 * @access  Terminal (should require auth in production)
 */
router.post('/batch', SyncController.batchSync);

/**
 * @route   POST /api/v1/sync/sales
 * @desc    Sync sales from terminal
 * @access  Terminal
 */
router.post('/sales', SyncController.syncSales);

/**
 * @route   POST /api/v1/sync/sale-items
 * @desc    Sync sale items from terminal
 * @access  Terminal
 */
router.post('/sale-items', SyncController.syncSaleItems);

/**
 * @route   POST /api/v1/sync/sale-payments
 * @desc    Sync sale payments from terminal
 * @access  Terminal
 */
router.post('/sale-payments', SyncController.syncSalePayments);

/**
 * @route   POST /api/v1/sync/returns
 * @desc    Sync returns from terminal
 * @access  Terminal
 */
router.post('/returns', SyncController.syncReturns);

/**
 * @route   POST /api/v1/sync/return-items
 * @desc    Sync return items from terminal
 * @access  Terminal
 */
router.post('/return-items', SyncController.syncReturnItems);

/**
 * @route   POST /api/v1/sync/stock-movements
 * @desc    Sync stock movements from terminal
 * @access  Terminal
 */
router.post('/stock-movements', SyncController.syncStockMovements);

/**
 * @route   POST /api/v1/sync/customers
 * @desc    Sync customers from terminal
 * @access  Terminal
 */
router.post('/customers', SyncController.syncCustomers);

/**
 * @route   POST /api/v1/sync/orders
 * @desc    Sync orders from terminal
 * @access  Terminal
 */
router.post('/orders', SyncController.syncOrders);

/**
 * @route   GET /api/v1/sync/status
 * @desc    Get sync status for a terminal
 * @access  Terminal
 */
router.get('/status', SyncController.getSyncStatus);

export default router;
