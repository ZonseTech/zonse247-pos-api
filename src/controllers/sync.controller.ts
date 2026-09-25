/**
 * Sync Controller
 *
 * HTTP endpoints for bidirectional sync between terminals and server.
 *
 * ENDPOINTS:
 * ----------
 * PUSH (Terminal → Server):
 *   POST /sync/batch          - Bulk sync all tables
 *   POST /sync/sales          - Sync sales
 *   POST /sync/sale-items     - Sync sale items
 *   POST /sync/sale-payments  - Sync sale payments
 *   POST /sync/returns        - Sync returns
 *   POST /sync/return-items   - Sync return items
 *   POST /sync/stock-movements - Sync stock movements
 *   POST /sync/customers      - Sync customers
 *   POST /sync/orders         - Sync orders
 *   POST /sync/users          - Sync user credential/profile changes
 *
 * PULL (Server → Terminal):
 *   POST /sync/pull           - Pull all changed data
 *   POST /sync/pull/:table    - Pull specific table
 *
 * COMBINED:
 *   POST /sync/bidirectional  - Push then pull in one request
 *   GET  /sync/status         - Get terminal sync status
 *
 * IMPROVEMENTS:
 * - Request body validation (rejects malformed payloads early)
 * - tenantId / branchId passed to processSyncBatch for TerminalSyncState
 * - Compression-aware responses (gzip via express middleware)
 * - Proper 207 Multi-Status for partial success
 */

import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SyncReceiverService } from '../services/sync/sync-receiver.service';
import type { AuthRequest } from '../lib/express.type';
import type { SyncResult, PullTableName } from '../services/sync/types/sync.types';
import { SYNC_HEADERS, VALID_PULL_TABLES, LOG_PREFIX, SYNC_DEFAULTS } from '../services/sync/constants/sync.constants';
import prisma from '../databases/prisma/client';

// ==========================================
// Types
// ==========================================

type SyncRequest = Request & AuthRequest;

interface SyncHandlerConfig {
    requireTerminalId?: boolean;
    handler: (records: unknown[], terminalId: string) => Promise<SyncResult>;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Extract terminal ID from request headers or body
 */
function getTerminalId(req: SyncRequest): string | undefined {
    return (req.headers[SYNC_HEADERS.TERMINAL_ID] as string) || req.body.terminalId;
}

/**
 * Extract tenant ID from authenticated request.
 * Falls back to headers/body for legacy/unauthenticated paths.
 * Auth is the source of truth — never trust client-supplied tenantId
 * when an authenticated tenant is available.
 */
function getTenantId(req: SyncRequest): string | undefined {
    return (
        req.auth?.tenantId ||
        (req.headers[SYNC_HEADERS.TENANT_ID] as string) ||
        req.body.tenantId
    );
}

/**
 * Extract branch ID from request headers or body
 */
function getBranchId(req: SyncRequest): string | undefined {
    return (req.headers[SYNC_HEADERS.BRANCH_ID] as string) || req.body.branchId;
}

/**
 * Create a standard sync response
 */
function createSyncResponse(result: SyncResult & { inventoriesRecalculated?: number }) {
    return {
        success: result.success,
        accepted: result.accepted,
        rejected: result.rejected,
        skipped: result.skipped,
        errors: result.errors,
        ...(result.inventoriesRecalculated !== undefined && {
            inventoriesRecalculated: result.inventoriesRecalculated,
        }),
        timestamp: new Date().toISOString(),
    };
}

/**
 * Generic sync endpoint handler to reduce code duplication
 */
async function handleSyncEndpoint(
    req: SyncRequest,
    res: Response,
    logContext: string,
    config: SyncHandlerConfig
): Promise<void> {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            res.status(400).json({
                success: false,
                message: 'Records array is required',
            });
            return;
        }

        const terminalId = getTerminalId(req) || '';

        if (config.requireTerminalId && !terminalId) {
            res.status(400).json({
                success: false,
                message: 'Terminal ID is required',
            });
            return;
        }

        const result = await config.handler(records, terminalId);

        res.status(200).json(createSyncResponse(result));
    } catch (error) {
        console.error(`${LOG_PREFIX.CONTROLLER} ${logContext} error:`, error);
        res.status(500).json({
            success: false,
            message: 'Sync failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

// ==========================================
// Controller
// ==========================================

export class SyncController extends BaseController {
    // ==========================================
    // Batch Sync
    // ==========================================

    /**
     * Batch sync - process all tables in one request
     * POST /v1/sync/batch
     *
     * Now passes tenantId/branchId for TerminalSyncState tracking
     * and ChangeLog recording.
     */
    static async batchSync(req: SyncRequest, res: Response): Promise<void> {
        try {
            const terminalId = getTerminalId(req);
            const tenantId = getTenantId(req);
            const branchId = getBranchId(req);

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
                users,
            } = req.body;

            // Validate that at least one table has data
            const hasData = [sales, saleItems, salePayments, returns, returnItems, stockMovements, customers, orders, users]
                .some((arr) => Array.isArray(arr) && arr.length > 0);

            if (!hasData) {
                res.status(200).json({
                    success: true,
                    message: 'No data to sync',
                    data: { summary: { total: 0, accepted: 0, rejected: 0, skipped: 0 }, results: {} },
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            const result = await SyncReceiverService.processSyncBatch(
                { sales, saleItems, salePayments, returns, returnItems, stockMovements, customers, orders, users },
                terminalId,
                tenantId,
                branchId
            );

            res.status(result.success ? 200 : 207).json({
                success: result.success,
                message: result.success ? 'Sync completed successfully' : 'Sync completed with some errors',
                data: {
                    summary: result.summary,
                    results: result.results,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.CONTROLLER} Batch sync error:`, error);
            res.status(500).json({
                success: false,
                message: 'Sync failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // ==========================================
    // Individual Table Sync Endpoints
    // ==========================================

    /**
     * Sync sales
     * POST /v1/sync/sales
     */
    static async syncSales(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Sales sync', {
            requireTerminalId: true,
            handler: (records, terminalId) =>
                SyncReceiverService.receiveSales(records as Parameters<typeof SyncReceiverService.receiveSales>[0], terminalId),
        });
    }

    /**
     * Sync sale items
     * POST /v1/sync/sale-items
     */
    static async syncSaleItems(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Sale items sync', {
            requireTerminalId: true,
            handler: (records, terminalId) =>
                SyncReceiverService.receiveSaleItems(records as Parameters<typeof SyncReceiverService.receiveSaleItems>[0], terminalId),
        });
    }

    /**
     * Sync sale payments
     * POST /v1/sync/sale-payments
     */
    static async syncSalePayments(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Sale payments sync', {
            handler: (records) =>
                SyncReceiverService.receiveSalePayments(records as Parameters<typeof SyncReceiverService.receiveSalePayments>[0]),
        });
    }

    /**
     * Sync returns
     * POST /v1/sync/returns
     */
    static async syncReturns(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Returns sync', {
            requireTerminalId: true,
            handler: (records, terminalId) =>
                SyncReceiverService.receiveReturns(records as Parameters<typeof SyncReceiverService.receiveReturns>[0], terminalId),
        });
    }

    /**
     * Sync return items
     * POST /v1/sync/return-items
     */
    static async syncReturnItems(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Return items sync', {
            handler: (records) =>
                SyncReceiverService.receiveReturnItems(records as Parameters<typeof SyncReceiverService.receiveReturnItems>[0]),
        });
    }

    /**
     * Sync stock movements
     * POST /v1/sync/stock-movements
     */
    static async syncStockMovements(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Stock movements sync', {
            handler: (records) =>
                SyncReceiverService.receiveStockMovements(records as Parameters<typeof SyncReceiverService.receiveStockMovements>[0]),
        });
    }

    /**
     * Sync customers
     * POST /v1/sync/customers
     *
     * tenantId is taken from the authenticated request, not the payload.
     */
    static async syncCustomers(req: SyncRequest, res: Response): Promise<void> {
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            res.status(401).json({
                success: false,
                message: 'Authenticated tenant is required',
            });
            return;
        }

        await handleSyncEndpoint(req, res, 'Customers sync', {
            handler: (records) =>
                SyncReceiverService.receiveCustomers(
                    records as Parameters<typeof SyncReceiverService.receiveCustomers>[0],
                    tenantId
                ),
        });
    }

    /**
     * Sync categories
     * POST /v1/sync/categories
     *
     * tenantId is taken from the authenticated request, not the payload.
     */
    static async syncCategories(req: SyncRequest, res: Response): Promise<void> {
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            res.status(401).json({
                success: false,
                message: 'Authenticated tenant is required',
            });
            return;
        }

        await handleSyncEndpoint(req, res, 'Categories sync', {
            handler: (records) =>
                SyncReceiverService.receiveCategories(
                    records as Parameters<typeof SyncReceiverService.receiveCategories>[0],
                    tenantId
                ),
        });
    }

    /**
     * Sync suppliers
     * POST /v1/sync/suppliers
     *
     * tenantId is taken from the authenticated request, not the payload.
     */
    static async syncSuppliers(req: SyncRequest, res: Response): Promise<void> {
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            res.status(401).json({
                success: false,
                message: 'Authenticated tenant is required',
            });
            return;
        }

        await handleSyncEndpoint(req, res, 'Suppliers sync', {
            handler: (records) =>
                SyncReceiverService.receiveSuppliers(
                    records as Parameters<typeof SyncReceiverService.receiveSuppliers>[0],
                    tenantId
                ),
        });
    }

    /**
     * Sync expense categories
     * POST /v1/sync/expense-categories
     *
     * tenantId is taken from the authenticated request, not the payload.
     */
    static async syncExpenseCategories(req: SyncRequest, res: Response): Promise<void> {
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            res.status(401).json({
                success: false,
                message: 'Authenticated tenant is required',
            });
            return;
        }

        await handleSyncEndpoint(req, res, 'Expense categories sync', {
            handler: (records) =>
                SyncReceiverService.receiveExpenseCategories(
                    records as Parameters<typeof SyncReceiverService.receiveExpenseCategories>[0],
                    tenantId
                ),
        });
    }

    /**
     * Sync orders
     * POST /v1/sync/orders
     */
    static async syncOrders(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Orders sync', {
            handler: (records) =>
                SyncReceiverService.receiveOrders(records as Parameters<typeof SyncReceiverService.receiveOrders>[0]),
        });
    }

    /**
     * Sync users (credential/profile changes from terminal)
     * POST /v1/sync/users
     */
    static async syncUsers(req: SyncRequest, res: Response): Promise<void> {
        await handleSyncEndpoint(req, res, 'Users sync', {
            handler: (records) =>
                SyncReceiverService.receiveUsers(records as Parameters<typeof SyncReceiverService.receiveUsers>[0]),
        });
    }

    /**
     * Sync expenses recorded offline from terminal
     * POST /v1/sync/expenses
     *
     * tenantId is taken from the authenticated request, not the payload.
     */
    static async syncExpenses(req: SyncRequest, res: Response): Promise<void> {
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            res.status(401).json({
                success: false,
                message: 'Authenticated tenant is required',
            });
            return;
        }

        await handleSyncEndpoint(req, res, 'Expenses sync', {
            requireTerminalId: true,
            handler: (records, terminalId) =>
                SyncReceiverService.receiveExpenses(
                    records as Parameters<typeof SyncReceiverService.receiveExpenses>[0],
                    terminalId,
                    tenantId
                ),
        });
    }

    // ==========================================
    // Status
    // ==========================================

    /**
     * Get sync status for a terminal
     * GET /v1/sync/status
     *
     * Now includes TerminalSyncState data (separate push/pull timestamps
     * and ChangeLog sequence).
     */
    static async getSyncStatus(req: SyncRequest, res: Response): Promise<void> {
        try {
            const terminalId = getTerminalId(req) || (req.query.terminalId as string);
            const tenantId = getTenantId(req) || (req.query.tenantId as string);
            const branchId = getBranchId(req) || (req.query.branchId as string);

            if (!terminalId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID is required',
                });
                return;
            }

            const [terminal, syncState] = await Promise.all([
                prisma.terminal.findUnique({
                    where: { terminalId },
                    select: {
                        terminalId: true,
                        name: true,
                        lastSyncAt: true,
                        status: true,
                        updatedAt: true,
                    },
                }),
                // Fetch TerminalSyncState if tenant/branch provided
                tenantId && branchId
                    ? prisma.terminalSyncState.findUnique({
                        where: {
                            unique_terminal_sync: { tenantId, branchId, terminalId },
                        },
                        select: {
                            lastPulledAt: true,
                            lastPushedAt: true,
                            lastSequence: true,
                        },
                    }).catch(() => null)
                    : null,
            ]);

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
                    // Extended sync state
                    syncState: syncState
                        ? {
                            lastPulledAt: syncState.lastPulledAt,
                            lastPushedAt: syncState.lastPushedAt,
                            lastSequence: syncState.lastSequence?.toString() ?? null,
                        }
                        : null,
                },
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.CONTROLLER} Get status error:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sync status',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // ==========================================
    // Pull Operations
    // ==========================================

    /**
     * Pull all changed data from server
     * POST /v1/sync/pull
     *
     * Now auto-routes to ChangeLog-based delta when available.
     */
    static async pullData(req: SyncRequest, res: Response): Promise<void> {
        try {
            const terminalId = getTerminalId(req);
            const tenantId = getTenantId(req);
            const branchId = getBranchId(req);
            const { since, tables, limit } = req.body;

            if (!terminalId || !tenantId || !branchId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID, Tenant ID, and Branch ID are required',
                });
                return;
            }

            // Cap the limit to prevent abuse
            const cappedLimit = Math.min(
                Number(limit) || SYNC_DEFAULTS.PULL_LIMIT,
                SYNC_DEFAULTS.PULL_LIMIT * 4
            );

            const sinceDate = since ? new Date(since) : null;

            const result = await SyncReceiverService.getPullData(
                tenantId,
                branchId,
                terminalId,
                sinceDate,
                { tables, limit: cappedLimit }
            );

            res.status(result.success ? 200 : 500).json({
                success: result.success,
                data: result.data,
                counts: result.counts,
                serverTime: result.serverTime.toISOString(),
                errors: result.errors,
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.CONTROLLER} Pull data error:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to pull data',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Pull data for a specific table
     * POST /v1/sync/pull/:tableName
     */
    static async pullTableData(req: SyncRequest, res: Response): Promise<void> {
        try {
            const tableName = req.params.tableName as PullTableName;
            const terminalId = getTerminalId(req);
            const tenantId = getTenantId(req);
            const branchId = getBranchId(req);
            const { since, limit } = req.body;

            if (!terminalId || !tenantId || !branchId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID, Tenant ID, and Branch ID are required',
                });
                return;
            }

            if (!VALID_PULL_TABLES.has(tableName)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid table name. Valid tables: ${[...VALID_PULL_TABLES].join(', ')}`,
                });
                return;
            }

            const sinceDate = since ? new Date(since) : null;

            const result = await SyncReceiverService.getTableDelta(
                tableName,
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
        } catch (error) {
            console.error(`${LOG_PREFIX.CONTROLLER} Pull table data error:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to pull table data',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // ==========================================
    // Bidirectional Sync
    // ==========================================

    /**
     * Bidirectional sync - push then pull in one request
     * POST /v1/sync/bidirectional
     */
    static async bidirectionalSync(req: SyncRequest, res: Response): Promise<void> {
        try {
            const terminalId = getTerminalId(req);
            const tenantId = getTenantId(req);
            const branchId = getBranchId(req);

            if (!terminalId || !tenantId || !branchId) {
                res.status(400).json({
                    success: false,
                    message: 'Terminal ID, Tenant ID, and Branch ID are required',
                });
                return;
            }

            const { push: pushData, pullSince, pullTables, pullLimit } = req.body;

            // Phase 1: PUSH
            let pushResult = { summary: { total: 0, accepted: 0, rejected: 0, skipped: 0 }, results: {} };

            if (pushData && Object.keys(pushData).length > 0) {
                pushResult = await SyncReceiverService.processSyncBatch(pushData, terminalId, tenantId, branchId);
            }

            // Phase 2: PULL
            const sinceDate = pullSince ? new Date(pullSince) : null;
            const pullResult = await SyncReceiverService.getPullData(
                tenantId,
                branchId,
                terminalId,
                sinceDate,
                { tables: pullTables, limit: pullLimit }
            );

            res.status(200).json({
                success: pushResult.summary.rejected === 0 && pullResult.success,
                push: {
                    summary: pushResult.summary,
                    results: pushResult.results,
                },
                pull: {
                    data: pullResult.data,
                    counts: pullResult.counts,
                    errors: pullResult.errors,
                },
                serverTime: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.CONTROLLER} Bidirectional sync error:`, error);
            res.status(500).json({
                success: false,
                message: 'Bidirectional sync failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}

export default SyncController;
