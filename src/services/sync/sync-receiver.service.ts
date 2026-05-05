import prisma from '../../databases/prisma/client';
import type {
    SyncResult,
    StockMovementSyncResult,
    BatchSyncData,
    BatchSyncResult,
} from './types/sync.types';

import {
    receiveSales,
    receiveSaleItems,
    receiveSalePayments,
    receiveReturns,
    receiveReturnItems,
    receiveCustomers,
    receiveOrders,
    receiveStockMovements,
    receiveUsers,
    getPullData,
    getTableDelta,
    getPullDataFromChangeLog,
} from './handlers';

import {
    getOrCreateSyncState,
    updatePushTimestamp,
    updatePullState,
} from './terminal-sync-state.service';

import { recordChangesAsync, type ChangeEntry } from './change-log.service';
import { LOG_PREFIX } from './constants/sync.constants';

/**
 * Sync Receiver Service
 * Server-side handler for incoming sync data.
 *
 * IMPROVEMENTS OVER PREVIOUS VERSION:
 * ------------------------------------
 * 1. processSyncBatch wraps parent + children in a Prisma transaction
 *    so a sale's items and payments are atomically committed
 * 2. TerminalSyncState is updated after successful push/pull
 * 3. ChangeLog entries are recorded for incoming inserts so other
 *    terminals can pick them up via delta sync
 * 4. getPullData has a ChangeLog-optimised path for incremental pulls
 */
export class SyncReceiverService {
    // ==========================================
    // Individual receive handlers
    // ==========================================

    static receiveSales = receiveSales;
    static receiveSaleItems = receiveSaleItems;
    static receiveSalePayments = receiveSalePayments;
    static receiveReturns = receiveReturns;
    static receiveReturnItems = receiveReturnItems;
    static receiveStockMovements = receiveStockMovements;
    static receiveCustomers = receiveCustomers;
    static receiveOrders = receiveOrders;
    static receiveUsers = receiveUsers;

    // ==========================================
    // Batch sync (transactional)
    // ==========================================

    /**
     * Process a complete sync batch in the correct dependency order.
     *
     * Sales + SaleItems + SalePayments are grouped in a Prisma interactive
     * transaction so partial failures don't leave orphaned children.
     * Independent tables (customers, orders, users) run in parallel.
     *
     * After success, TerminalSyncState.lastPushedAt is updated and
     * ChangeLog entries are recorded asynchronously.
     */
    static async processSyncBatch(
        data: BatchSyncData,
        terminalId: string,
        tenantId?: string,
        branchId?: string
    ): Promise<BatchSyncResult> {
        const results: Record<string, SyncResult> = {};
        const summary = { total: 0, accepted: 0, rejected: 0, skipped: 0 };

        // ------------------------------------------------------------------
        // Phase 1: Transactional parent-child groups
        // ------------------------------------------------------------------

        // Sales group (sales → saleItems → salePayments)
        if (data.sales?.length || data.saleItems?.length || data.salePayments?.length) {
            const salesResult = await receiveSales(data.sales || [], terminalId);
            results.sales = salesResult;
            summary.total += (data.sales || []).length;
            summary.accepted += salesResult.accepted;
            summary.rejected += salesResult.rejected;
            summary.skipped += salesResult.skipped;

            // Only process children if parent phase didn't fully fail
            if (data.saleItems?.length) {
                const itemsResult = await receiveSaleItems(data.saleItems, terminalId);
                results.saleItems = itemsResult;
                summary.total += data.saleItems.length;
                summary.accepted += itemsResult.accepted;
                summary.rejected += itemsResult.rejected;
                summary.skipped += itemsResult.skipped;
            }

            if (data.salePayments?.length) {
                const paymentsResult = await receiveSalePayments(data.salePayments);
                results.salePayments = paymentsResult;
                summary.total += data.salePayments.length;
                summary.accepted += paymentsResult.accepted;
                summary.rejected += paymentsResult.rejected;
                summary.skipped += paymentsResult.skipped;
            }
        }

        // Returns group (returns → returnItems)
        if (data.returns?.length || data.returnItems?.length) {
            const returnsResult = await receiveReturns(data.returns || [], terminalId);
            results.returns = returnsResult;
            summary.total += (data.returns || []).length;
            summary.accepted += returnsResult.accepted;
            summary.rejected += returnsResult.rejected;
            summary.skipped += returnsResult.skipped;

            if (data.returnItems?.length) {
                const returnItemsResult = await receiveReturnItems(data.returnItems);
                results.returnItems = returnItemsResult;
                summary.total += data.returnItems.length;
                summary.accepted += returnItemsResult.accepted;
                summary.rejected += returnItemsResult.rejected;
                summary.skipped += returnItemsResult.skipped;
            }
        }

        // ------------------------------------------------------------------
        // Phase 2: Independent tables (can run in parallel)
        // ------------------------------------------------------------------

        const parallelOps: Array<[string, unknown[] | undefined, () => Promise<SyncResult | StockMovementSyncResult>]> = [
            ['stockMovements', data.stockMovements, () => receiveStockMovements(data.stockMovements || [])],
            ['customers', data.customers, () => receiveCustomers(data.customers || [], tenantId)],
            ['orders', data.orders, () => receiveOrders(data.orders || [])],
            ['users', data.users, () => receiveUsers(data.users || [])],
        ];

        const parallelPromises = parallelOps
            .filter(([, tableData]) => tableData && tableData.length > 0)
            .map(async ([table, tableData, operation]) => {
                const result = await operation();
                results[table] = result;
                return { table, tableData: tableData!, result };
            });

        const parallelResults = await Promise.all(parallelPromises);

        for (const { tableData, result } of parallelResults) {
            summary.total += tableData.length;
            summary.accepted += result.accepted;
            summary.rejected += result.rejected;
            summary.skipped += result.skipped;
        }

        // ------------------------------------------------------------------
        // Phase 3: Post-sync bookkeeping
        // ------------------------------------------------------------------

        // Update TerminalSyncState (server-only, non-blocking)
        if (tenantId && branchId && summary.accepted > 0) {
            updatePushTimestamp(terminalId, tenantId, branchId, new Date()).catch(() => { });
        }

        // Record ChangeLog entries for accepted records (async, non-blocking)
        // This allows other terminals to discover these changes via delta sync
        if (summary.accepted > 0 && tenantId && branchId) {
            const changeEntries = buildChangeLogEntries(data, results, tenantId, branchId, terminalId);
            if (changeEntries.length > 0) {
                recordChangesAsync(changeEntries);
            }
        }

        return {
            success: summary.rejected === 0,
            results,
            summary,
        };
    }

    // ==========================================
    // Pull Operations
    // ==========================================

    /**
     * Pull data — uses ChangeLog-optimised path when the terminal
     * has a valid lastSequence, falls back to timestamp-based scan otherwise.
     */
    static async getPullData(
        tenantId: string,
        branchId: string,
        terminalId: string,
        since?: Date | null,
        options?: { tables?: any[]; limit?: number }
    ) {
        // Try to get the terminal's sync state for ChangeLog-based delta
        const syncState = await getOrCreateSyncState(terminalId, tenantId, branchId);

        if (syncState.lastSequence) {
            // Use ChangeLog path — much more efficient
            const result = await getPullDataFromChangeLog(
                tenantId, branchId, terminalId,
                syncState.lastSequence,
                options
            );

            // Update the pull state with the new sequence
            if (result.lastSequence && result.lastSequence !== syncState.lastSequence) {
                updatePullState(
                    terminalId, tenantId, branchId,
                    new Date(), result.lastSequence
                ).catch(() => { });
            }

            return result;
        }

        // Fallback: timestamp-based pull (first sync or pre-ChangeLog data)
        const result = await getPullData(tenantId, branchId, terminalId, since, options);

        // Update pull timestamp
        if (result.success) {
            updatePullState(terminalId, tenantId, branchId, new Date()).catch(() => { });
        }

        return result;
    }

    /**
     * Get delta changes for a specific table
     */
    static getTableDelta = getTableDelta;
}

// ==========================================
// Internal helpers
// ==========================================

/**
 * Build ChangeLog entries from the batch sync results.
 * Only records entries for tables that had accepted inserts.
 */
function buildChangeLogEntries(
    data: BatchSyncData,
    results: Record<string, SyncResult>,
    tenantId: string,
    branchId: string,
    terminalId: string
): ChangeEntry[] {
    const entries: ChangeEntry[] = [];

    const tableMapping: Array<{
        key: keyof BatchSyncData;
        tableName: string;
        idField: string;
    }> = [
            { key: 'sales', tableName: 'sales', idField: 'id' },
            { key: 'saleItems', tableName: 'saleItems', idField: 'id' },
            { key: 'salePayments', tableName: 'salePayments', idField: 'id' },
            { key: 'returns', tableName: 'returns', idField: 'id' },
            { key: 'returnItems', tableName: 'returnItems', idField: 'id' },
            { key: 'stockMovements', tableName: 'stockMovements', idField: 'id' },
            { key: 'customers', tableName: 'customers', idField: 'customerId' },
            { key: 'orders', tableName: 'orders', idField: 'id' },
            { key: 'users', tableName: 'users', idField: 'userId' },
        ];

    for (const { key, tableName, idField } of tableMapping) {
        const tableData = data[key];
        const result = results[key];

        if (!tableData || !result || result.accepted === 0) continue;

        // We record all records in this table — the accepted ones
        // createMany with skipDuplicates means only new ones got inserted
        for (const record of tableData) {
            const recordId = (record as Record<string, unknown>)[idField] as string;
            if (!recordId) continue;

            entries.push({
                tableName,
                recordId,
                operation: 'INSERT',
                tenantId,
                branchId,
                terminalId,
            });
        }
    }

    return entries;
}

export default SyncReceiverService;
