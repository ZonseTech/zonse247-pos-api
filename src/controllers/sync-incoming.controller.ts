import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import syncIncomingService from '../services/sync-incoming.service';
import syncOutboundService from '../services/sync-outbound.service';

/**
 * Sync Incoming Controller
 * Handles incoming sync requests from local/offline POS terminals
 * These endpoints run on the REMOTE/CLOUD server
 */
export class SyncIncomingController extends BaseController {

    // ==========================================
    // SALES ENDPOINTS
    // ==========================================

    /**
     * Receive batch of sales from local terminal
     */
    receiveSales = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processSales(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving sales:', error);
            BaseController.sendServerError(res, 'Failed to process incoming sales', error.message);
        }
    };

    /**
     * Receive single sale from local terminal
     */
    receiveSingleSale = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Sale record is required');
                return;
            }

            const result = await syncIncomingService.processSingleSale(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single sale:', error);
            BaseController.sendServerError(res, 'Failed to process incoming sale', error.message);
        }
    };

    // ==========================================
    // SALE ITEMS ENDPOINTS
    // ==========================================

    /**
     * Receive batch of sale items from local terminal
     */
    receiveSaleItems = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processSaleItems(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving sale items:', error);
            BaseController.sendServerError(res, 'Failed to process incoming sale items', error.message);
        }
    };

    /**
     * Receive single sale item from local terminal
     */
    receiveSingleSaleItem = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Sale item record is required');
                return;
            }

            const result = await syncIncomingService.processSingleSaleItem(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single sale item:', error);
            BaseController.sendServerError(res, 'Failed to process incoming sale item', error.message);
        }
    };

    // ==========================================
    // TRANSACTIONS ENDPOINTS
    // ==========================================

    /**
     * Receive batch of transactions from local terminal
     */
    receiveTransactions = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processTransactions(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving transactions:', error);
            BaseController.sendServerError(res, 'Failed to process incoming transactions', error.message);
        }
    };

    /**
     * Receive single transaction from local terminal
     */
    receiveSingleTransaction = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Transaction record is required');
                return;
            }

            const result = await syncIncomingService.processSingleTransaction(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single transaction:', error);
            BaseController.sendServerError(res, 'Failed to process incoming transaction', error.message);
        }
    };

    // ==========================================
    // CUSTOMERS ENDPOINTS
    // ==========================================

    /**
     * Receive batch of customers from local terminal
     */
    receiveCustomers = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processCustomers(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving customers:', error);
            BaseController.sendServerError(res, 'Failed to process incoming customers', error.message);
        }
    };

    /**
     * Receive single customer from local terminal
     */
    receiveSingleCustomer = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Customer record is required');
                return;
            }

            const result = await syncIncomingService.processSingleCustomer(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single customer:', error);
            BaseController.sendServerError(res, 'Failed to process incoming customer', error.message);
        }
    };

    // ==========================================
    // INVENTORY ENDPOINTS
    // ==========================================

    /**
     * Receive batch of inventory records from local terminal
     */
    receiveInventory = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processInventory(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving inventory:', error);
            BaseController.sendServerError(res, 'Failed to process incoming inventory', error.message);
        }
    };

    /**
     * Receive single inventory record from local terminal
     */
    receiveSingleInventory = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Inventory record is required');
                return;
            }

            const result = await syncIncomingService.processSingleInventory(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single inventory:', error);
            BaseController.sendServerError(res, 'Failed to process incoming inventory', error.message);
        }
    };

    // ==========================================
    // STOCK MOVEMENTS ENDPOINTS
    // ==========================================

    /**
     * Receive batch of stock movements from local terminal
     */
    receiveStockMovements = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processStockMovements(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving stock movements:', error);
            BaseController.sendServerError(res, 'Failed to process incoming stock movements', error.message);
        }
    };

    /**
     * Receive single stock movement from local terminal
     */
    receiveSingleStockMovement = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Stock movement record is required');
                return;
            }

            const result = await syncIncomingService.processSingleStockMovement(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single stock movement:', error);
            BaseController.sendServerError(res, 'Failed to process incoming stock movement', error.message);
        }
    };

    // ==========================================
    // AUDIT LOGS ENDPOINTS
    // ==========================================

    /**
     * Receive batch of audit logs from local terminal
     */
    receiveAuditLogs = async (req: Request, res: Response): Promise<void> => {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                BaseController.sendBadRequest(res, 'Records array is required');
                return;
            }

            const result = await syncIncomingService.processAuditLogs(records);

            res.json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                timestamp: result.timestamp,
            });

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving audit logs:', error);
            BaseController.sendServerError(res, 'Failed to process incoming audit logs', error.message);
        }
    };

    /**
     * Receive single audit log from local terminal
     */
    receiveSingleAuditLog = async (req: Request, res: Response): Promise<void> => {
        try {
            const record = req.body;

            if (!record || Object.keys(record).length === 0) {
                BaseController.sendBadRequest(res, 'Audit log record is required');
                return;
            }

            const result = await syncIncomingService.processSingleAuditLog(record);

            if (result.success) {
                BaseController.sendSuccess(res, result.message, { id: result.id });
            } else {
                BaseController.sendBadRequest(res, result.message, result.error);
            }

        } catch (error: any) {
            console.error('[SyncIncoming] Error receiving single audit log:', error);
            BaseController.sendServerError(res, 'Failed to process incoming audit log', error.message);
        }
    };

    // ==========================================
    // SYNC STATISTICS & STATUS
    // ==========================================

    /**
     * Get sync statistics (for remote server dashboard)
     */
    getSyncStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await syncIncomingService.getSyncStats();

            BaseController.sendSuccess(res, 'Sync statistics retrieved', stats);

        } catch (error: any) {
            console.error('[SyncIncoming] Error getting sync stats:', error);
            BaseController.sendServerError(res, 'Failed to get sync statistics', error.message);
        }
    };

    // ==========================================
    // OUTBOUND SYNC CONTROL (for local terminals)
    // ==========================================

    /**
     * Start outbound sync (local terminal to remote)
     */
    startOutboundSync = async (req: Request, res: Response): Promise<void> => {
        try {
            const { intervalMs = 60000 } = req.body;

            syncOutboundService.startAutoSync(intervalMs);

            BaseController.sendSuccess(res, 'Outbound sync started', {
                intervalMs,
                status: syncOutboundService.getStatus(),
            });

        } catch (error: any) {
            console.error('[SyncOutbound] Error starting sync:', error);
            BaseController.sendServerError(res, 'Failed to start outbound sync', error.message);
        }
    };

    /**
     * Stop outbound sync
     */
    stopOutboundSync = async (req: Request, res: Response): Promise<void> => {
        try {
            syncOutboundService.stopAutoSync();

            BaseController.sendSuccess(res, 'Outbound sync stopped', {
                status: syncOutboundService.getStatus(),
            });

        } catch (error: any) {
            console.error('[SyncOutbound] Error stopping sync:', error);
            BaseController.sendServerError(res, 'Failed to stop outbound sync', error.message);
        }
    };

    /**
     * Get outbound sync status
     */
    getOutboundSyncStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const status = syncOutboundService.getStatus();
            const pendingCounts = await syncOutboundService.getPendingSyncCount();

            BaseController.sendSuccess(res, 'Outbound sync status retrieved', {
                ...status,
                pendingCounts,
            });

        } catch (error: any) {
            console.error('[SyncOutbound] Error getting status:', error);
            BaseController.sendServerError(res, 'Failed to get outbound sync status', error.message);
        }
    };

    /**
     * Trigger manual outbound sync
     */
    triggerOutboundSync = async (req: Request, res: Response): Promise<void> => {
        try {
            const { tableName } = req.body;

            const result = await syncOutboundService.triggerSync(tableName);

            BaseController.sendSuccess(res, 'Outbound sync triggered', result);

        } catch (error: any) {
            console.error('[SyncOutbound] Error triggering sync:', error);
            BaseController.sendServerError(res, 'Failed to trigger outbound sync', error.message);
        }
    };
}

export default new SyncIncomingController();
