import { getPrisma } from '../databases/prisma/client';
import { BaseService } from './base.service';
import { getConfig } from '../config/app.config';
import { OutboundSyncResult } from '../types/sync';

/**
 * Sync Outbound Service
 * Handles sending unsynced local data to the remote server
 * This runs on the local/offline API and pushes data to the cloud server
 */

// Use the exported type from sync.ts as alias for backwards compatibility
type SyncOutboundResult = OutboundSyncResult;

// Tables that should be synced to remote server
const SYNC_ENABLED_TABLES = [
    'sale',
    'saleItem',
    'transaction',
    'customer',
    'inventory',
    'stockMovement',
    'auditLog',
] as const;

type SyncEnabledTable = typeof SYNC_ENABLED_TABLES[number];

// Map table names to their remote API endpoints
const TABLE_ENDPOINTS: Record<SyncEnabledTable, string> = {
    sale: '/sync/incoming/sales',
    saleItem: '/sync/incoming/sale-items',
    transaction: '/sync/incoming/transactions',
    customer: '/sync/incoming/customers',
    inventory: '/sync/incoming/inventory',
    stockMovement: '/sync/incoming/stock-movements',
    auditLog: '/sync/incoming/audit-logs',
};

// Fields to exclude when sending to remote
const EXCLUDE_FIELDS = ['synced', 'syncedAt', 'localVersion'];

export class SyncOutboundService {
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private syncIntervalMs = 60000; // 1 minute default
    private batchSize = 50;

    /**
     * Start the automatic sync process
     */
    startAutoSync(intervalMs = 60000): void {
        if (this.syncInterval) {
            this.stopAutoSync();
        }

        this.syncIntervalMs = intervalMs;
        console.log(`[SyncOutbound] Starting auto-sync with interval: ${intervalMs}ms`);

        // Run immediately
        this.syncAllTables();

        // Then set interval
        this.syncInterval = setInterval(() => {
            this.syncAllTables();
        }, intervalMs);
    }

    /**
     * Stop the automatic sync process
     */
    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[SyncOutbound] Auto-sync stopped');
        }
    }

    /**
     * Check if sync is currently running
     */
    isAutoSyncRunning(): boolean {
        return this.syncInterval !== null;
    }

    /**
     * Get auto-sync status
     */
    getStatus(): {
        isRunning: boolean;
        isSyncing: boolean;
        intervalMs: number;
        tables: string[];
    } {
        return {
            isRunning: this.syncInterval !== null,
            isSyncing: this.isSyncing,
            intervalMs: this.syncIntervalMs,
            tables: [...SYNC_ENABLED_TABLES],
        };
    }

    /**
     * Sync all enabled tables to remote server
     */
    async syncAllTables(): Promise<Record<string, SyncOutboundResult>> {
        if (this.isSyncing) {
            console.log('[SyncOutbound] Sync already in progress, skipping...');
            return {};
        }

        const config = getConfig();
        if (!config.liveApiUrl) {
            console.log('[SyncOutbound] No remote API URL configured, skipping sync');
            return {};
        }

        this.isSyncing = true;
        const results: Record<string, SyncOutboundResult> = {};

        console.log('[SyncOutbound] Starting sync for all tables...');

        try {
            for (const tableName of SYNC_ENABLED_TABLES) {
                try {
                    results[tableName] = await this.syncTable(tableName);
                } catch (error: any) {
                    results[tableName] = {
                        success: false,
                        tableName,
                        recordsSent: 0,
                        recordsAccepted: 0,
                        recordsFailed: 0,
                        errors: [error.message],
                        timestamp: new Date().toISOString(),
                    };
                }
            }
        } finally {
            this.isSyncing = false;
        }

        console.log('[SyncOutbound] Sync completed for all tables');
        return results;
    }

    /**
     * Sync a specific table to remote server
     */
    async syncTable(tableName: SyncEnabledTable): Promise<SyncOutboundResult> {
        const result: SyncOutboundResult = {
            success: false,
            tableName,
            recordsSent: 0,
            recordsAccepted: 0,
            recordsFailed: 0,
            errors: [],
            timestamp: new Date().toISOString(),
        };

        try {
            const client = await getPrisma();

            // Get unsynced records
            const unsyncedRecords = await this.getUnsyncedRecords(client, tableName);

            if (unsyncedRecords.length === 0) {
                result.success = true;
                return result;
            }

            result.recordsSent = unsyncedRecords.length;
            console.log(`[SyncOutbound] Found ${unsyncedRecords.length} unsynced ${tableName} records`);

            // Process in batches
            const batches = this.createBatches(unsyncedRecords, this.batchSize);

            for (const batch of batches) {
                const batchResult = await this.processBatch(client, tableName, batch);
                result.recordsAccepted += batchResult.accepted;
                result.recordsFailed += batchResult.failed;
                result.errors.push(...batchResult.errors);
            }

            result.success = result.recordsFailed === 0;

        } catch (error: any) {
            result.errors.push(`Sync error: ${error.message}`);
            console.error(`[SyncOutbound] Error syncing ${tableName}:`, error);
        }

        return result;
    }

    /**
     * Get unsynced records from a table
     */
    private async getUnsyncedRecords(client: any, tableName: string): Promise<any[]> {
        try {
            // Try to get records where synced = false or null
            return await client[tableName].findMany({
                where: {
                    OR: [
                        { synced: false },
                        { synced: null },
                        { synced: 0 },
                    ]
                },
                take: this.batchSize * 10, // Limit total records per sync run
                orderBy: { createdAt: 'asc' }
            });
        } catch {
            // Table might not have synced field, skip
            console.log(`[SyncOutbound] Table ${tableName} does not support sync tracking`);
            return [];
        }
    }

    /**
     * Process a batch of records
     */
    private async processBatch(
        client: any,
        tableName: SyncEnabledTable,
        records: any[]
    ): Promise<{ accepted: number; failed: number; errors: string[] }> {
        const result = { accepted: 0, failed: 0, errors: [] as string[] };
        const endpoint = TABLE_ENDPOINTS[tableName];

        // Prepare payload - transform records for API
        const payload = records.map(record => this.transformForRemote(record));

        try {
            // Try batch send first
            const response = await BaseService.post<{
                success: boolean;
                accepted: string[];
                rejected: { id: string; reason: string }[];
            }>(endpoint, { records: payload });

            if (response.success && response.data) {
                const acceptedIds = response.data.accepted || [];
                const rejectedIds = response.data.rejected || [];

                result.accepted = acceptedIds.length;
                result.failed = rejectedIds.length;

                // Mark accepted records as synced
                if (acceptedIds.length > 0) {
                    await this.markRecordsAsSynced(client, tableName, acceptedIds);
                }

                // Log rejected records
                rejectedIds.forEach(r => {
                    result.errors.push(`Record ${r.id}: ${r.reason}`);
                });

            } else {
                // Batch failed, try individual records
                for (const record of records) {
                    const singleResult = await this.syncSingleRecord(client, tableName, record);
                    if (singleResult.success) {
                        result.accepted++;
                    } else {
                        result.failed++;
                        result.errors.push(singleResult.error || 'Unknown error');
                    }
                }
            }

        } catch (error: any) {
            // Batch endpoint not available or failed, fall back to individual sync
            console.log(`[SyncOutbound] Batch sync failed for ${tableName}, trying individual records...`);

            for (const record of records) {
                const singleResult = await this.syncSingleRecord(client, tableName, record);
                if (singleResult.success) {
                    result.accepted++;
                } else {
                    result.failed++;
                    result.errors.push(singleResult.error || 'Unknown error');
                }
            }
        }

        return result;
    }

    /**
     * Sync a single record to remote
     */
    private async syncSingleRecord(
        client: any,
        tableName: SyncEnabledTable,
        record: any
    ): Promise<{ success: boolean; error?: string }> {
        const endpoint = TABLE_ENDPOINTS[tableName];
        const payload = this.transformForRemote(record);
        const recordId = record.id || record.uuid;

        try {
            // Try to create/update on remote
            const response = await BaseService.post(`${endpoint}/single`, payload);

            if (response.success) {
                await this.markRecordsAsSynced(client, tableName, [recordId]);
                return { success: true };
            } else {
                return { success: false, error: response.message || 'Failed to sync record' };
            }

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark records as synced in local database
     */
    private async markRecordsAsSynced(
        client: any,
        tableName: string,
        recordIds: string[]
    ): Promise<void> {
        try {
            await client[tableName].updateMany({
                where: { id: { in: recordIds } },
                data: {
                    synced: true,
                    syncedAt: new Date(),
                }
            });
            console.log(`[SyncOutbound] Marked ${recordIds.length} ${tableName} records as synced`);
        } catch (error: any) {
            console.error(`[SyncOutbound] Failed to mark records as synced:`, error.message);
        }
    }

    /**
     * Transform record for remote API
     */
    private transformForRemote(record: any): Record<string, any> {
        const transformed: Record<string, any> = {};

        Object.entries(record).forEach(([key, value]) => {
            // Skip excluded fields
            if (EXCLUDE_FIELDS.includes(key)) return;

            // Convert camelCase to snake_case for API
            const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            transformed[snakeCaseKey] = value;
        });

        return transformed;
    }

    /**
     * Create batches from records
     */
    private createBatches<T>(records: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < records.length; i += batchSize) {
            batches.push(records.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Manually trigger sync for a specific table
     */
    async triggerSync(tableName?: SyncEnabledTable): Promise<SyncOutboundResult | Record<string, SyncOutboundResult>> {
        if (tableName) {
            return this.syncTable(tableName);
        }
        return this.syncAllTables();
    }

    /**
     * Get pending sync count for all tables
     */
    async getPendingSyncCount(): Promise<Record<string, number>> {
        const counts: Record<string, number> = {};
        const client = await getPrisma();

        for (const tableName of SYNC_ENABLED_TABLES) {
            try {
                const count = await client[tableName].count({
                    where: {
                        OR: [
                            { synced: false },
                            { synced: null },
                            { synced: 0 },
                        ]
                    }
                });
                counts[tableName] = count;
            } catch {
                counts[tableName] = 0;
            }
        }

        return counts;
    }
}

const syncOutboundService = new SyncOutboundService();
export default syncOutboundService;
