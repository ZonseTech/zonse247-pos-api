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
    getPullData,
    getTableDelta,
} from './handlers';

/**
 * Sync Receiver Service
 * Server-side handler for incoming sync data
 */
export class SyncReceiverService {
    /**
     * Receive and upsert sales from terminal
     */
    static receiveSales = receiveSales;

    /**
     * Receive and upsert sale items from terminal
     */
    static receiveSaleItems = receiveSaleItems;

    /**
     * Receive and upsert sale payments from terminal
     */
    static receiveSalePayments = receiveSalePayments;

    /**
     * Receive and upsert returns from terminal
     */
    static receiveReturns = receiveReturns;

    /**
     * Receive and upsert return items from terminal
     */
    static receiveReturnItems = receiveReturnItems;

    /**
     * Receive and process stock movements from terminal
     */
    static receiveStockMovements = receiveStockMovements;

    /**
     * Receive and upsert customers from terminal
     */
    static receiveCustomers = receiveCustomers;

    /**
     * Receive and upsert orders from terminal
     */
    static receiveOrders = receiveOrders;

    /**
     * Process a complete sync batch in the correct dependency order
     * Main entry point for bulk sync operations
     */
    static async processSyncBatch(
        data: BatchSyncData,
        terminalId: string
    ): Promise<BatchSyncResult> {
        const results: Record<string, SyncResult> = {};
        const summary = { total: 0, accepted: 0, rejected: 0, skipped: 0 };

        const operations: Array<[keyof BatchSyncData, () => Promise<SyncResult | StockMovementSyncResult>]> = [
            ['sales', () => receiveSales(data.sales || [], terminalId)],
            ['saleItems', () => receiveSaleItems(data.saleItems || [], terminalId)],
            ['salePayments', () => receiveSalePayments(data.salePayments || [])],
            ['returns', () => receiveReturns(data.returns || [], terminalId)],
            ['returnItems', () => receiveReturnItems(data.returnItems || [])],
            ['stockMovements', () => receiveStockMovements(data.stockMovements || [])],
            ['customers', () => receiveCustomers(data.customers || [])],
            ['orders', () => receiveOrders(data.orders || [])],
        ];

        for (const [table, operation] of operations) {
            const tableData = data[table];
            if (!tableData || tableData.length === 0) continue;

            const result = await operation();
            results[table] = result;

            summary.total += tableData.length;
            summary.accepted += result.accepted;
            summary.rejected += result.rejected;
            summary.skipped += result.skipped;
        }

        return {
            success: summary.rejected === 0,
            results,
            summary,
        };
    }

    /**
     * Get all data that has changed since a given timestamp
     * Main entry point for the PULL phase of bidirectional sync
     */
    static getPullData = getPullData;

    /**
     * Get delta changes for a specific table
     */
    static getTableDelta = getTableDelta;
}

export default SyncReceiverService;
