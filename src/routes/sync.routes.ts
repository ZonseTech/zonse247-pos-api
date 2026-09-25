import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import {
    validateBatchSync,
    validateTableSync,
    validatePullRequest,
    validateBidirectionalSync,
} from '../services/sync/sync-validation.middleware';

const router = Router();

// ==========================================
// PUSH (Terminal → Server)
// ==========================================

/**
 * @route   POST /v1/sync/batch
 * @desc    Bulk sync all tables in one request
 * @access  Terminal
 */
router.post('/batch', validateBatchSync, SyncController.batchSync);

/**
 * @route   POST /v1/sync/sales
 * @desc    Sync sales from terminal
 * @access  Terminal
 */
router.post('/sales', validateTableSync, SyncController.syncSales);

/**
 * @route   POST /v1/sync/sale-items
 * @desc    Sync sale items from terminal
 * @access  Terminal
 */
router.post('/sale-items', validateTableSync, SyncController.syncSaleItems);

/**
 * @route   POST /v1/sync/sale-payments
 * @desc    Sync sale payments from terminal
 * @access  Terminal
 */
router.post('/sale-payments', validateTableSync, SyncController.syncSalePayments);

/**
 * @route   POST /v1/sync/returns
 * @desc    Sync returns from terminal
 * @access  Terminal
 */
router.post('/returns', validateTableSync, SyncController.syncReturns);

/**
 * @route   POST /v1/sync/return-items
 * @desc    Sync return items from terminal
 * @access  Terminal
 */
router.post('/return-items', validateTableSync, SyncController.syncReturnItems);

/**
 * @route   POST /v1/sync/stock-movements
 * @desc    Sync stock movements from terminal
 * @access  Terminal
 */
router.post('/stock-movements', validateTableSync, SyncController.syncStockMovements);

/**
 * @route   POST /v1/sync/customers
 * @desc    Sync customers from terminal
 * @access  Terminal
 */
router.post('/customers', validateTableSync, SyncController.syncCustomers);

/**
 * @route   POST /v1/sync/categories
 * @desc    Sync categories from terminal
 * @access  Terminal
 */
router.post('/categories', validateTableSync, SyncController.syncCategories);

/**
 * @route   POST /v1/sync/suppliers
 * @desc    Sync suppliers from terminal
 * @access  Terminal
 */
router.post('/suppliers', validateTableSync, SyncController.syncSuppliers);

/**
 * @route   POST /v1/sync/orders
 * @desc    Sync orders from terminal
 * @access  Terminal
 */
router.post('/orders', validateTableSync, SyncController.syncOrders);

/**
 * @route   POST /v1/sync/users
 * @desc    Sync user credential/profile changes from terminal
 * @access  Terminal
 */
router.post('/users', validateTableSync, SyncController.syncUsers);

/**
 * @route   POST /v1/sync/expenses
 * @desc    Sync expenses recorded offline from terminal
 * @access  Terminal
 */
router.post('/expenses', validateTableSync, SyncController.syncExpenses);

// ==========================================
// STATUS
// ==========================================

/**
 * @route   GET /v1/sync/status
 * @desc    Get sync status for a terminal
 * @access  Terminal
 */
router.get('/status', SyncController.getSyncStatus);

// ==========================================
// PULL (Server → Terminal)
// ==========================================

/**
 * @route   POST /v1/sync/pull
 * @desc    Pull all changed data from server since timestamp
 * @access  Terminal
 * @body    { since?: Date, tables?: string[], limit?: number }
 */
router.post('/pull', validatePullRequest, SyncController.pullData);

/**
 * @route   POST /v1/sync/pull/:tableName
 * @desc    Pull data for a specific table
 * @access  Terminal
 * @body    { since?: Date, limit?: number }
 */
router.post('/pull/:tableName', validatePullRequest, SyncController.pullTableData);

// ==========================================
// BIDIRECTIONAL
// ==========================================

/**
 * @route   POST /v1/sync/bidirectional
 * @desc    Push then pull in one request
 * @access  Terminal
 * @body    { push: {...}, pullSince?: Date, pullTables?: string[], pullLimit?: number }
 */
router.post('/bidirectional', validateBidirectionalSync, SyncController.bidirectionalSync);

export default router;
