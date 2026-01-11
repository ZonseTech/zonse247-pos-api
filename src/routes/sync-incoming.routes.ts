import { Router } from 'express';
import syncIncomingController from '../controllers/sync-incoming.controller';

const router = Router();

// ==========================================
// INCOMING SYNC ROUTES (for remote server)
// These endpoints receive data pushed from local terminals
// ==========================================

// Sales
router.post('/incoming/sales', syncIncomingController.receiveSales);
router.post('/incoming/sales/single', syncIncomingController.receiveSingleSale);

// Sale Items
router.post('/incoming/sale-items', syncIncomingController.receiveSaleItems);
router.post('/incoming/sale-items/single', syncIncomingController.receiveSingleSaleItem);

// Transactions
router.post('/incoming/transactions', syncIncomingController.receiveTransactions);
router.post('/incoming/transactions/single', syncIncomingController.receiveSingleTransaction);

// Customers
router.post('/incoming/customers', syncIncomingController.receiveCustomers);
router.post('/incoming/customers/single', syncIncomingController.receiveSingleCustomer);

// Inventory
router.post('/incoming/inventory', syncIncomingController.receiveInventory);
router.post('/incoming/inventory/single', syncIncomingController.receiveSingleInventory);

// Stock Movements
router.post('/incoming/stock-movements', syncIncomingController.receiveStockMovements);
router.post('/incoming/stock-movements/single', syncIncomingController.receiveSingleStockMovement);

// Audit Logs
router.post('/incoming/audit-logs', syncIncomingController.receiveAuditLogs);
router.post('/incoming/audit-logs/single', syncIncomingController.receiveSingleAuditLog);

// Sync Statistics (for remote server dashboard)
router.get('/incoming/stats', syncIncomingController.getSyncStats);

// ==========================================
// OUTBOUND SYNC ROUTES (for local terminals)
// These control the outbound sync from local to remote
// ==========================================

// Control outbound sync
router.post('/outbound/start', syncIncomingController.startOutboundSync);
router.post('/outbound/stop', syncIncomingController.stopOutboundSync);
router.get('/outbound/status', syncIncomingController.getOutboundSyncStatus);
router.post('/outbound/trigger', syncIncomingController.triggerOutboundSync);

export default router;
