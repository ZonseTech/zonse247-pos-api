/**
 * Sync Controller
 * 
 * Handles incoming sync requests from offline terminals.
 * These endpoints are called by the SyncJobService running on terminals.
 * 
 * SECURITY:
 * ---------
 * All endpoints require:
 * - Valid JWT token (terminal auth)
 * - Matching tenant/branch IDs in headers
 * - Terminal must be registered and active
 * 
 * ENDPOINTS:
 * ----------
 * POST /api/v1/sync/batch           - Bulk sync all tables in one request
 * POST /api/v1/sync/sales           - Sync sales
 * POST /api/v1/sync/sale-items      - Sync sale items
 * POST /api/v1/sync/sale-payments   - Sync sale payments
 * POST /api/v1/sync/returns         - Sync returns
 * POST /api/v1/sync/return-items    - Sync return items
 * POST /api/v1/sync/stock-movements - Sync stock movements
 * POST /api/v1/sync/customers       - Sync customers
 * POST /api/v1/sync/orders          - Sync orders
 * GET  /api/v1/sync/status          - Get sync status for a terminal
 */

import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SyncReceiverService } from '../services/sync/sync-receiver.service';
import type { AuthRequest } from '../lib/express.type';
import prisma from '../databases/prisma/client';

export class SyncController extends BaseController {

    /**
     * Batch sync - process all tables in one request
     * POST /api/v1/sync/batch
     */
    static async batchSync(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            
            if (!terminalId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID is required',
                });
                return;
            }

            const {
                sales,
                saleItems,
                salePayments,
                returns,
                returnItems,
                stockMovements,
                customers,
                orders,
            } = req.body;

            const result = await SyncReceiverService.processSyncBatch(
                {
                    sales,
                    saleItems,
                    salePayments,
                    returns,
                    returnItems,
                    stockMovements,
                    customers,
                    orders,
                },
                terminalId
            );

            res.status(result.success ? 200 : 207).json({
                success: result.success,
                message: result.success 
                    ? 'Sync completed successfully' 
                    : 'Sync completed with some errors',
                data: {
                    summary: result.summary,
                    results: result.results,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Batch sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync sales
     * POST /api/v1/sync/sales
     */
    static async syncSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveSales(records, terminalId);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Sales sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync sale items
     * POST /api/v1/sync/sale-items
     */
    static async syncSaleItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveSaleItems(records, terminalId);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Sale items sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync sale payments
     * POST /api/v1/sync/sale-payments
     */
    static async syncSalePayments(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveSalePayments(records);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Sale payments sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync returns
     * POST /api/v1/sync/returns
     */
    static async syncReturns(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveReturns(records, terminalId);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Returns sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync return items
     * POST /api/v1/sync/return-items
     */
    static async syncReturnItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveReturnItems(records);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Return items sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync stock movements
     * POST /api/v1/sync/stock-movements
     */
    static async syncStockMovements(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveStockMovements(records);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                inventoriesRecalculated: result.inventoriesRecalculated,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Stock movements sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync customers
     * POST /api/v1/sync/customers
     */
    static async syncCustomers(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveCustomers(records);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Customers sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Sync orders
     * POST /api/v1/sync/orders
     */
    static async syncOrders(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { records } = req.body;

            if (!records || !Array.isArray(records)) {
                res.status(400).json({
                    success: false,
                    message: 'Records array is required',
                });
                return;
            }

            const result = await SyncReceiverService.receiveOrders(records);

            res.status(200).json({
                success: result.success,
                accepted: result.accepted,
                rejected: result.rejected,
                skipped: result.skipped,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Orders sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error.message,
            });
        }
    }

    /**
     * Get sync status for a terminal
     * GET /api/v1/sync/status
     */
    static async getSyncStatus(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.query.terminalId as string;

            if (!terminalId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID is required',
                });
                return;
            }

            // Get terminal info
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId },
                select: {
                    terminalId: true,
                    name: true,
                    lastSyncAt: true,
                    status: true,
                    updatedAt: true,
                },
            });

            if (!terminal) {
                res.status(404).json({
                    success: false,
                    message: 'Terminal not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    terminalId: terminal.terminalId,
                    name: terminal.name,
                    lastSyncAt: terminal.lastSyncAt,
                    status: terminal.status,
                    serverTime: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            console.error('[Sync] Get status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sync status',
                error: error.message,
            });
        }
    }
}

export default SyncController;
