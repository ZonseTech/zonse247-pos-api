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

    // ==================== PULL OPERATIONS ====================
    // These endpoints allow terminals to pull data from the server

    /**
     * Pull all changed data from server
     * POST /api/v1/sync/pull
     * 
     * This is the main endpoint for the PULL phase of bidirectional sync.
     * Terminals call this after pushing their changes to receive:
     * - Products, ProductVariants, Categories (master data)
     * - Inventory (recalculated quantities)
     * - PaymentMethods
     * - StockMovements from other terminals
     * - Customers
     */
    static async pullData(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            const tenantId = req.headers['x-tenant-id'] as string || req.body.tenantId;
            const branchId = req.headers['x-branch-id'] as string || req.body.branchId;
            const { since, tables, limit } = req.body;

            if (!terminalId || !tenantId || !branchId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID, Tenant ID, and Branch ID are required',
                });
                return;
            }

            // Parse since date if provided
            const sinceDate = since ? new Date(since) : null;

            const result = await SyncReceiverService.getPullData(
                tenantId,
                branchId,
                terminalId,
                sinceDate,
                { tables, limit }
            );

            res.status(result.success ? 200 : 500).json({
                success: result.success,
                data: result.data,
                counts: result.counts,
                serverTime: result.serverTime.toISOString(),
                errors: result.errors,
            });
        } catch (error: any) {
            console.error('[Sync] Pull data error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to pull data',
                error: error.message,
            });
        }
    }

    /**
     * Pull data for a specific table
     * POST /api/v1/sync/pull/:tableName
     * 
     * Useful for incremental sync of individual tables when bandwidth is limited.
     */
    static async pullTableData(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tableName = req.params.tableName as string;
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            const tenantId = req.headers['x-tenant-id'] as string || req.body.tenantId;
            const branchId = req.headers['x-branch-id'] as string || req.body.branchId;
            const { since, limit } = req.body;

            if (!terminalId || !tenantId || !branchId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID, Tenant ID, and Branch ID are required',
                });
                return;
            }

            const validTables = [
                'products', 'productVariants', 'categories',
                'inventory', 'paymentMethods', 'stockMovements', 'customers'
            ];

            if (!validTables.includes(tableName)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid table name. Valid tables: ${validTables.join(', ')}`,
                });
                return;
            }

            const sinceDate = since ? new Date(since) : null;

            const result = await SyncReceiverService.getTableDelta(
                tableName as any,
                tenantId,
                branchId,
                terminalId,
                sinceDate,
                limit || 500
            );

            res.status(200).json({
                success: true,
                tableName,
                records: result.records,
                count: result.count,
                hasMore: result.hasMore,
                serverTime: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Pull table data error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to pull table data',
                error: error.message,
            });
        }
    }

    /**
     * Bidirectional sync - push then pull in one request
     * POST /api/v1/sync/bidirectional
     * 
     * Convenience endpoint that combines push and pull into a single request.
     * Order: Push first (to send local changes), then Pull (to receive updates).
     */
    static async bidirectionalSync(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
            const tenantId = req.headers['x-tenant-id'] as string || req.body.tenantId;
            const branchId = req.headers['x-branch-id'] as string || req.body.branchId;

            if (!terminalId || !tenantId || !branchId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID, Tenant ID, and Branch ID are required',
                });
                return;
            }

            const {
                push: pushData,
                pullSince,
                pullTables,
                pullLimit,
            } = req.body;

            // Phase 1: PUSH - Process incoming data from terminal
            let pushResult: any = { summary: { total: 0, accepted: 0, rejected: 0, skipped: 0 } };

            if (pushData && Object.keys(pushData).length > 0) {
                pushResult = await SyncReceiverService.processSyncBatch(pushData, terminalId);
            }

            // Phase 2: PULL - Get data for terminal to pull
            const sinceDate = pullSince ? new Date(pullSince) : null;
            const pullResult = await SyncReceiverService.getPullData(
                tenantId,
                branchId,
                terminalId,
                sinceDate,
                { tables: pullTables, limit: pullLimit }
            );

            // Return combined result
            res.status(200).json({
                success: pushResult.summary.rejected === 0 && pullResult.success,
                push: {
                    summary: pushResult.summary,
                    results: pushResult.results || {},
                },
                pull: {
                    data: pullResult.data,
                    counts: pullResult.counts,
                    errors: pullResult.errors,
                },
                serverTime: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error('[Sync] Bidirectional sync error:', error);
            res.status(500).json({
                success: false,
                message: 'Bidirectional sync failed',
                error: error.message,
            });
        }
    }
}

export default SyncController;
