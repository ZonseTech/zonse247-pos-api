import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';

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
 * @route   POST /api/v1/sync/users
 * @desc    Sync user credential/profile changes from terminal
 * @access  Terminal
 */
router.post('/users', SyncController.syncUsers);

/**
 * @route   GET /api/v1/sync/status
 * @desc    Get sync status for a terminal
 * @access  Terminal
 */
router.get('/status', SyncController.getSyncStatus);

/**
 * @route   POST /api/v1/sync/pull
 * @desc    Pull all changed data from server since timestamp
 * @access  Terminal
 * @body    { since?: Date, tables?: string[], limit?: number }
 */
router.post('/pull', SyncController.pullData);

/**
 * @route   POST /api/v1/sync/pull/:tableName
 * @desc    Pull data for a specific table
 * @access  Terminal
 * @body    { since?: Date, limit?: number }
 */
router.post('/pull/:tableName', SyncController.pullTableData);

/**
 * @route   POST /api/v1/sync/bidirectional
 * @desc    Push then pull in one request
 * @access  Terminal
 * @body    { push: {...}, pullSince?: Date, pullTables?: string[], pullLimit?: number }
 */
router.post('/bidirectional', SyncController.bidirectionalSync);

export default router;
