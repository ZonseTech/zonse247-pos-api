/**
 * Offline Sync Job Service
 * 
 * Handles automatic push synchronization of offline data to the server.
 * This service runs on OFFLINE TERMINALS to push local changes to the central server.
 * 
 * ARCHITECTURE:
 * -------------
 * Terminal (SQLite) ──push──> Server (MySQL)
 *                   <──pull──
 * 
 * This service handles the PUSH phase: Terminal → Server
 * 
 * SYNC INTERVAL:
 * --------------
 * Default: 30 seconds (reasonable for POS systems)
 * - Frequent enough to keep data fresh
 * - Infrequent enough to not overload the network
 * - Configurable via SYNC_INTERVAL_MS environment variable
 * 
 * SYNC ORDER (Foreign Key Dependencies):
 * --------------------------------------
 * 1. Sales → SaleItems → SalePayments → StockMovements
 * 2. Returns → ReturnItems → StockMovements
 * 3. Customers (independent)
 * 4. Orders (independent)
 * 
 * RETRY STRATEGY:
 * ---------------
 * - Max retries: 3 (configurable)
 * - Backoff: Exponential (1s, 2s, 4s)
 * - On persistent failure: Log and continue with next batch
 * 
 * CONFLICT RESOLUTION:
 * --------------------
 * Server handles conflicts via syncMovementsFromOffline():
 * - Duplicate IDs are skipped (idempotent)
 * - All movements are applied
 * - Inventory is recalculated from movements
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import prisma from '../../databases/prisma/client';

// Configuration from environment
const DEFAULT_SYNC_INTERVAL = 30_000; // 30 seconds
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

interface SyncConfig {
    serverUrl: string;
    apiKey?: string;
    terminalId: string;
    tenantId: string;
    branchId: string;
    intervalMs?: number;
    batchSize?: number;
    maxRetries?: number;
}

interface SyncStats {
    lastSyncAt: Date | null;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastError: string | null;
    totalSynced: number;
    totalFailed: number;
    isRunning: boolean;
    isSyncing: boolean;
}

interface SyncBatchResult {
    success: boolean;
    table: string;
    sent: number;
    accepted: number;
    rejected: number;
    errors: string[];
}

interface SyncCycleResult {
    success: boolean;
    startedAt: Date;
    completedAt: Date;
    tables: SyncBatchResult[];
    totalSent: number;
    totalAccepted: number;
    totalRejected: number;
}

/**
 * Tables to sync in dependency order
 */
const SYNC_TABLES = [
    // Parent tables first
    { name: 'sales', endpoint: '/sync/sales', orderField: 'updatedAt' },
    { name: 'saleItems', endpoint: '/sync/sale-items', orderField: 'updatedAt', parentTable: 'sales' },
    { name: 'salePayments', endpoint: '/sync/sale-payments', orderField: 'updatedAt', parentTable: 'sales' },
    // Returns
    { name: 'returns', endpoint: '/sync/returns', orderField: 'updatedAt' },
    { name: 'returnItems', endpoint: '/sync/return-items', orderField: 'updatedAt', parentTable: 'returns' },
    // Stock movements (depends on sales/returns)
    { name: 'stockMovements', endpoint: '/sync/stock-movements', orderField: 'createdAt' },
    // Independent tables
    { name: 'customers', endpoint: '/sync/customers', orderField: 'updatedAt' },
    { name: 'orders', endpoint: '/sync/orders', orderField: 'updatedAt' },
] as const;

type SyncTableName = typeof SYNC_TABLES[number]['name'];

/**
 * Offline Sync Job Service
 * Runs on terminals to push local changes to the server
 */
export class SyncJobService {
    private config: SyncConfig;
    private intervalId: NodeJS.Timeout | null = null;
    private httpClient: AxiosInstance;
    private stats: SyncStats = {
        lastSyncAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        totalSynced: 0,
        totalFailed: 0,
        isRunning: false,
        isSyncing: false,
    };

    constructor(config: SyncConfig) {
        this.config = {
            intervalMs: DEFAULT_SYNC_INTERVAL,
            batchSize: DEFAULT_BATCH_SIZE,
            maxRetries: DEFAULT_MAX_RETRIES,
            ...config,
        };

        this.httpClient = axios.create({
            baseURL: this.config.serverUrl,
            timeout: 30_000,
            headers: {
                'Content-Type': 'application/json',
                'X-Terminal-Id': this.config.terminalId,
                'X-Tenant-Id': this.config.tenantId,
                'X-Branch-Id': this.config.branchId,
                ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
            },
        });
    }

    /**
     * Start the sync job
     * Runs sync immediately then at configured interval
     */
    start(): void {
        if (this.stats.isRunning) {
            console.log('[SyncJob] Already running');
            return;
        }

        console.log(`[SyncJob] Starting sync job (interval: ${this.config.intervalMs}ms)`);
        this.stats.isRunning = true;

        // Run immediately
        this.runSyncCycle().catch(console.error);

        // Then run at interval
        this.intervalId = setInterval(() => {
            this.runSyncCycle().catch(console.error);
        }, this.config.intervalMs);
    }

    /**
     * Stop the sync job
     */
    stop(): void {
        if (!this.stats.isRunning) {
            console.log('[SyncJob] Not running');
            return;
        }

        console.log('[SyncJob] Stopping sync job');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.stats.isRunning = false;
    }

    /**
     * Get current sync statistics
     */
    getStats(): SyncStats {
        return { ...this.stats };
    }

    /**
     * Run a single sync cycle (push all pending changes)
     */
    async runSyncCycle(): Promise<SyncCycleResult> {
        if (this.stats.isSyncing) {
            console.log('[SyncJob] Sync already in progress, skipping');
            return {
                success: false,
                startedAt: new Date(),
                completedAt: new Date(),
                tables: [],
                totalSent: 0,
                totalAccepted: 0,
                totalRejected: 0,
            };
        }

        this.stats.isSyncing = true;
        this.stats.lastSyncAt = new Date();

        const result: SyncCycleResult = {
            success: true,
            startedAt: new Date(),
            completedAt: new Date(),
            tables: [],
            totalSent: 0,
            totalAccepted: 0,
            totalRejected: 0,
        };

        try {
            console.log('[SyncJob] Starting sync cycle...');

            // Get last sync timestamp
            const lastSync = await this.getLastSyncTimestamp();

            // Sync each table in order
            for (const table of SYNC_TABLES) {
                const tableResult = await this.syncTable(table, lastSync);
                result.tables.push(tableResult);
                result.totalSent += tableResult.sent;
                result.totalAccepted += tableResult.accepted;
                result.totalRejected += tableResult.rejected;

                if (!tableResult.success) {
                    result.success = false;
                }
            }

            // Update last sync timestamp
            if (result.success && result.totalSent > 0) {
                await this.updateLastSyncTimestamp(new Date());
            }

            result.completedAt = new Date();
            this.stats.lastSuccessAt = new Date();
            this.stats.totalSynced += result.totalAccepted;
            this.stats.totalFailed += result.totalRejected;

            console.log(`[SyncJob] Sync cycle complete: ${result.totalAccepted} accepted, ${result.totalRejected} rejected`);

        } catch (error: any) {
            result.success = false;
            this.stats.lastErrorAt = new Date();
            this.stats.lastError = error.message;
            console.error('[SyncJob] Sync cycle failed:', error.message);
        } finally {
            this.stats.isSyncing = false;
        }

        return result;
    }

    /**
     * Sync a single table
     */
    private async syncTable(
        table: typeof SYNC_TABLES[number],
        since: Date | null
    ): Promise<SyncBatchResult> {
        const result: SyncBatchResult = {
            success: true,
            table: table.name,
            sent: 0,
            accepted: 0,
            rejected: 0,
            errors: [],
        };

        try {
            // Fetch pending records
            const records = await this.fetchPendingRecords(table.name, since);

            if (records.length === 0) {
                return result;
            }

            result.sent = records.length;

            // Send to server in batches
            const batchSize = this.config.batchSize!;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const batchResult = await this.sendBatchWithRetry(table.endpoint, batch);

                result.accepted += batchResult.accepted;
                result.rejected += batchResult.rejected;
                result.errors.push(...batchResult.errors);
            }

            // Mark successfully synced records
            if (result.accepted > 0) {
                await this.markRecordsSynced(table.name, records.slice(0, result.accepted));
            }

        } catch (error: any) {
            result.success = false;
            result.errors.push(error.message);
        }

        return result;
    }

    /**
     * Fetch records pending sync from local database
     */
    private async fetchPendingRecords(
        tableName: SyncTableName,
        since: Date | null
    ): Promise<any[]> {
        const { tenantId, branchId, terminalId } = this.config;
        const whereBase = { tenantId, branchId };
        const whereWithTerminal = { ...whereBase, terminalId };

        switch (tableName) {
            case 'sales':
                return prisma.sale.findMany({
                    where: {
                        ...whereWithTerminal,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 5, // Get more since we batch
                });

            case 'saleItems':
                return prisma.saleItem.findMany({
                    where: {
                        ...whereBase,
                        terminalId,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 10,
                });

            case 'salePayments':
                return prisma.salePayment.findMany({
                    where: {
                        ...whereBase,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 5,
                });

            case 'returns':
                return prisma.return.findMany({
                    where: {
                        ...whereWithTerminal,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 2,
                });

            case 'returnItems':
                return prisma.returnItem.findMany({
                    where: {
                        ...whereBase,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 5,
                });

            case 'stockMovements':
                return prisma.stockMovement.findMany({
                    where: {
                        ...whereBase,
                        terminalId,
                        ...(since && { createdAt: { gt: since } }),
                    },
                    orderBy: { createdAt: 'asc' },
                    take: this.config.batchSize! * 10,
                });

            case 'customers':
                return prisma.customer.findMany({
                    where: {
                        ...whereBase,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 2,
                });

            case 'orders':
                return prisma.order.findMany({
                    where: {
                        ...whereBase,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: this.config.batchSize! * 2,
                });

            default:
                return [];
        }
    }

    /**
     * Send batch with exponential backoff retry
     */
    private async sendBatchWithRetry(
        endpoint: string,
        records: any[],
    ): Promise<{ accepted: number; rejected: number; errors: string[] }> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
            try {
                const response = await this.httpClient.post(endpoint, {
                    records,
                    terminalId: this.config.terminalId,
                    timestamp: new Date().toISOString(),
                });

                return {
                    accepted: response.data.accepted ?? records.length,
                    rejected: response.data.rejected ?? 0,
                    errors: response.data.errors ?? [],
                };
            } catch (error: any) {
                lastError = error;
                const isAxiosError = error.isAxiosError;
                const status = error.response?.status;

                // Don't retry client errors (4xx) except 429 (rate limit)
                if (isAxiosError && status && status >= 400 && status < 500 && status !== 429) {
                    break;
                }

                // Exponential backoff
                if (attempt < this.config.maxRetries!) {
                    const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt - 1);
                    console.log(`[SyncJob] Retry ${attempt}/${this.config.maxRetries} in ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }

        return {
            accepted: 0,
            rejected: records.length,
            errors: [lastError?.message ?? 'Unknown error'],
        };
    }

    /**
     * Mark records as synced (update lastSyncedAt)
     */
    private async markRecordsSynced(tableName: SyncTableName, records: any[]): Promise<void> {
        const ids = records.map(r => r.id);
        const now = new Date();

        switch (tableName) {
            case 'sales':
                await prisma.sale.updateMany({
                    where: { id: { in: ids } },
                    data: { updatedAt: now }, // updatedAt serves as sync marker
                });
                break;
            case 'saleItems':
                await prisma.saleItem.updateMany({
                    where: { id: { in: ids } },
                    data: { updatedAt: now },
                });
                break;
            case 'salePayments':
                await prisma.salePayment.updateMany({
                    where: { id: { in: ids } },
                    data: { updatedAt: now },
                });
                break;
            case 'returns':
                await prisma.return.updateMany({
                    where: { id: { in: ids } },
                    data: { updatedAt: now },
                });
                break;
            case 'returnItems':
                await prisma.returnItem.updateMany({
                    where: { id: { in: ids } },
                    data: { updatedAt: now },
                });
                break;
            case 'customers':
                await prisma.customer.updateMany({
                    where: { customerId: { in: ids.map(r => r.customerId || r.id) } },
                    data: { updatedAt: now },
                });
                break;
            case 'orders':
                await prisma.order.updateMany({
                    where: { id: { in: ids } },
                    data: { updatedAt: now },
                });
                break;
            // stockMovements - immutable, no update needed
        }
    }

    /**
     * Get last sync timestamp from local storage
     */
    private async getLastSyncTimestamp(): Promise<Date | null> {
        try {
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId: this.config.terminalId },
                select: { lastSyncAt: true },
            });
            return terminal?.lastSyncAt ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Update last sync timestamp in local storage
     */
    private async updateLastSyncTimestamp(timestamp: Date): Promise<void> {
        try {
            await prisma.terminal.update({
                where: { terminalId: this.config.terminalId },
                data: { lastSyncAt: timestamp },
            });
        } catch (error) {
            console.error('[SyncJob] Failed to update sync timestamp:', error);
        }
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Singleton instance for the current terminal
 */
let syncJobInstance: SyncJobService | null = null;

/**
 * Initialize and start the sync job for this terminal
 */
export function initSyncJob(config: SyncConfig): SyncJobService {
    if (syncJobInstance) {
        syncJobInstance.stop();
    }
    syncJobInstance = new SyncJobService(config);
    syncJobInstance.start();
    return syncJobInstance;
}

/**
 * Get the current sync job instance
 */
export function getSyncJob(): SyncJobService | null {
    return syncJobInstance;
}

/**
 * Stop the sync job
 */
export function stopSyncJob(): void {
    if (syncJobInstance) {
        syncJobInstance.stop();
        syncJobInstance = null;
    }
}

export default SyncJobService;
