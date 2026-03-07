/**
 * Offline Sync Job Service
 * 
 * Handles automatic BIDIRECTIONAL synchronization with the server.
 * This service runs on OFFLINE TERMINALS.
 * 
 * ARCHITECTURE:
 * -------------
 * Terminal (SQLite) ──push──> Server (MySQL)
 *                   <──pull──
 * 
 * This service handles BOTH phases:
 * - PUSH: Terminal → Server (sales, returns, stock movements)
 * - PULL: Server → Terminal (products, categories, inventory, etc.)
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
 * PUSH ORDER:
 * 1. Sales → SaleItems → SalePayments → StockMovements
 * 2. Returns → ReturnItems → StockMovements
 * 3. Customers (independent)
 * 4. Orders (independent)
 * 
 * PULL ORDER:
 * 1. Categories (parent of products)
 * 2. Products → ProductVariants
 * 3. Inventory (depends on variants)
 * 4. PaymentMethods
 * 5. StockMovements (from other terminals)
 * 6. Customers
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

import axios, { AxiosInstance } from 'axios';
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
    clientType?: 'web' | 'mobile' | 'desktop';
    intervalMs?: number;
    batchSize?: number;
    maxRetries?: number;
    enablePull?: boolean; // Enable pull phase (default: true)
}

interface SyncStats {
    lastSyncAt: Date | null;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastError: string | null;
    totalSynced: number;
    totalFailed: number;
    totalPulled: number;
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

interface PullBatchResult {
    success: boolean;
    table: string;
    received: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
}

interface SyncCycleResult {
    success: boolean;
    startedAt: Date;
    completedAt: Date;
    // Push phase results
    pushTables: SyncBatchResult[];
    totalSent: number;
    totalAccepted: number;
    totalRejected: number;
    // Pull phase results
    pullTables: PullBatchResult[];
    totalPulled: number;
    totalInserted: number;
    totalUpdated: number;
}

/**
 * Tables to PUSH in dependency order (Terminal → Server)
 */
const PUSH_TABLES = [
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

/**
 * Tables to PULL in dependency order (Server → Terminal)
 */
const PULL_TABLES = [
    'categories',
    'products',
    'productVariants',
    'inventory',
    'paymentMethods',
    'stockMovements',
    'customers',
] as const;

// Keep SYNC_TABLES for backward compatibility
const SYNC_TABLES = PUSH_TABLES;

type SyncTableName = typeof PUSH_TABLES[number]['name'];
type PullTableName = typeof PULL_TABLES[number];

/**
 * Offline Sync Job Service
 * Runs on terminals for bidirectional sync with the server
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
        totalPulled: 0,
        isRunning: false,
        isSyncing: false,
    };

    constructor(config: SyncConfig) {
        this.config = {
            intervalMs: DEFAULT_SYNC_INTERVAL,
            batchSize: DEFAULT_BATCH_SIZE,
            maxRetries: DEFAULT_MAX_RETRIES,
            enablePull: true, // Enable pull by default
            clientType: 'desktop', // Default client type
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
                'X-Client-Type': this.config.clientType || 'desktop',
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
     * Run a single sync cycle (push then pull)
     */
    async runSyncCycle(): Promise<SyncCycleResult> {
        if (this.stats.isSyncing) {
            console.log('[SyncJob] Sync already in progress, skipping');
            return {
                success: false,
                startedAt: new Date(),
                completedAt: new Date(),
                pushTables: [],
                totalSent: 0,
                totalAccepted: 0,
                totalRejected: 0,
                pullTables: [],
                totalPulled: 0,
                totalInserted: 0,
                totalUpdated: 0,
            };
        }

        this.stats.isSyncing = true;
        this.stats.lastSyncAt = new Date();

        const result: SyncCycleResult = {
            success: true,
            startedAt: new Date(),
            completedAt: new Date(),
            pushTables: [],
            totalSent: 0,
            totalAccepted: 0,
            totalRejected: 0,
            pullTables: [],
            totalPulled: 0,
            totalInserted: 0,
            totalUpdated: 0,
        };

        try {
            console.log('[SyncJob] Starting sync cycle...');

            // Get last sync timestamp
            const lastSync = await this.getLastSyncTimestamp();
            const lastPull = await this.getLastPullTimestamp();

            // ==================== PHASE 1: PUSH ====================
            // Push local changes to server
            console.log('[SyncJob] Phase 1: PUSH - Sending local changes to server...');

            for (const table of PUSH_TABLES) {
                const tableResult = await this.syncTable(table, lastSync);
                result.pushTables.push(tableResult);
                result.totalSent += tableResult.sent;
                result.totalAccepted += tableResult.accepted;
                result.totalRejected += tableResult.rejected;

                if (!tableResult.success) {
                    result.success = false;
                }
            }

            // Update last push timestamp
            if (result.totalSent > 0) {
                await this.updateLastSyncTimestamp(new Date());
            }

            // ==================== PHASE 2: PULL ====================
            // Pull changes from server (if enabled)
            if (this.config.enablePull !== false) {
                console.log('[SyncJob] Phase 2: PULL - Fetching updates from server...');

                const pullResult = await this.pullFromServer(lastPull);
                result.pullTables = pullResult.tables;
                result.totalPulled = pullResult.totalReceived;
                result.totalInserted = pullResult.totalInserted;
                result.totalUpdated = pullResult.totalUpdated;

                if (!pullResult.success) {
                    result.success = false;
                }

                // Update last pull timestamp
                if (pullResult.totalReceived > 0) {
                    await this.updateLastPullTimestamp(new Date());
                }
            }

            result.completedAt = new Date();
            this.stats.lastSuccessAt = new Date();
            this.stats.totalSynced += result.totalAccepted;
            this.stats.totalFailed += result.totalRejected;
            this.stats.totalPulled += result.totalPulled;

            console.log(`[SyncJob] Sync cycle complete: ${result.totalAccepted} pushed, ${result.totalPulled} pulled`);

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

    // ==================== PULL METHODS ====================

    /**
     * Pull data from server and save locally
     */
    private async pullFromServer(since: Date | null): Promise<{
        success: boolean;
        tables: PullBatchResult[];
        totalReceived: number;
        totalInserted: number;
        totalUpdated: number;
    }> {
        const result = {
            success: true,
            tables: [] as PullBatchResult[],
            totalReceived: 0,
            totalInserted: 0,
            totalUpdated: 0,
        };

        try {
            // Call the server's pull endpoint
            const response = await this.httpClient.post('/sync/pull', {
                tenantId: this.config.tenantId,
                branchId: this.config.branchId,
                terminalId: this.config.terminalId,
                since: since?.toISOString(),
                tables: PULL_TABLES,
            });

            if (!response.data.success) {
                throw new Error(response.data.errors?.join(', ') || 'Pull failed');
            }

            const { data, counts: _counts } = response.data;

            // Process each pulled table
            for (const tableName of PULL_TABLES) {
                const records = data[tableName] || [];
                if (records.length === 0) continue;

                const tableResult = await this.savePulledRecords(tableName, records);
                result.tables.push(tableResult);
                result.totalReceived += tableResult.received;
                result.totalInserted += tableResult.inserted;
                result.totalUpdated += tableResult.updated;

                if (!tableResult.success) {
                    result.success = false;
                }
            }

            console.log(`[SyncJob] Pull complete: ${result.totalReceived} received, ${result.totalInserted} inserted, ${result.totalUpdated} updated`);

        } catch (error: any) {
            result.success = false;
            console.error('[SyncJob] Pull failed:', error.message);
        }

        return result;
    }

    /**
     * Save pulled records to local database (upsert)
     */
    private async savePulledRecords(
        tableName: PullTableName,
        records: any[]
    ): Promise<PullBatchResult> {
        const result: PullBatchResult = {
            success: true,
            table: tableName,
            received: records.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };

        for (const record of records) {
            try {
                const saved = await this.upsertPulledRecord(tableName, record);
                if (saved === 'inserted') {
                    result.inserted++;
                } else if (saved === 'updated') {
                    result.updated++;
                } else {
                    result.skipped++;
                }
            } catch (error: any) {
                result.errors.push(`${record.id}: ${error.message}`);
            }
        }

        result.success = result.errors.length === 0;
        return result;
    }

    /**
     * Upsert a single pulled record
     */
    private async upsertPulledRecord(
        tableName: PullTableName,
        record: any
    ): Promise<'inserted' | 'updated' | 'skipped'> {
        switch (tableName) {
            case 'products':
                return this.upsertProduct(record);
            case 'productVariants':
                return this.upsertProductVariant(record);
            case 'categories':
                return this.upsertCategory(record);
            case 'inventory':
                return this.upsertInventory(record);
            case 'paymentMethods':
                return this.upsertPaymentMethod(record);
            case 'stockMovements':
                return this.upsertStockMovement(record);
            case 'customers':
                return this.upsertCustomer(record);
            default:
                return 'skipped';
        }
    }

    private async upsertProduct(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        const existing = await prisma.product.findUnique({ where: { id: record.id } });
        if (existing) {
            // Only update if server version is newer
            if (new Date(record.updatedAt) > (existing.updatedAt || new Date(0))) {
                await prisma.product.update({ where: { id: record.id }, data: record });
                return 'updated';
            }
            return 'skipped';
        }
        await prisma.product.create({ data: record });
        return 'inserted';
    }

    private async upsertProductVariant(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        const existing = await prisma.productVariant.findUnique({ where: { id: record.id } });
        if (existing) {
            if (new Date(record.updatedAt) > (existing.updatedAt || new Date(0))) {
                await prisma.productVariant.update({ where: { id: record.id }, data: record });
                return 'updated';
            }
            return 'skipped';
        }
        await prisma.productVariant.create({ data: record });
        return 'inserted';
    }

    private async upsertCategory(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        const categoryData = {
            categoryId: record.categoryId,
            branchId: record.branchId,
            tenantId: record.tenantId,
            userId: record.userId,
            terminalId: record.terminalId || null,
            name: record.name,
            description: record.description || null,
            color: record.color || null,
            isActive: record.isActive ?? true,
            isDefault: record.isDefault ?? false,
            sortOrder: record.sortOrder ?? 0,
            itemCount: record.itemCount || null,
            lastSyncedAt: record.lastSyncedAt ? new Date(record.lastSyncedAt) : null,
            version: record.version ?? 1,
            deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
            createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
            updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
        };

        const existing = await prisma.category.findUnique({ where: { categoryId: record.categoryId } });
        if (existing) {
            if (new Date(record.updatedAt) > (existing.updatedAt || new Date(0))) {
                await prisma.category.update({ where: { categoryId: record.categoryId }, data: categoryData });
                return 'updated';
            }
            return 'skipped';
        }
        await prisma.category.create({ data: categoryData });
        return 'inserted';
    }

    private async upsertInventory(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        const existing = await prisma.inventory.findUnique({ where: { id: record.id } });
        if (existing) {
            if (new Date(record.updatedAt) > (existing.updatedAt || new Date(0))) {
                await prisma.inventory.update({ where: { id: record.id }, data: record });
                return 'updated';
            }
            return 'skipped';
        }
        await prisma.inventory.create({ data: record });
        return 'inserted';
    }

    private async upsertPaymentMethod(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        const existing = await prisma.paymentMethod.findUnique({ where: { methodId: record.methodId } });
        if (existing) {
            if (new Date(record.updatedAt) > (existing.updatedAt || new Date(0))) {
                await prisma.paymentMethod.update({ where: { methodId: record.methodId }, data: record });
                return 'updated';
            }
            return 'skipped';
        }
        await prisma.paymentMethod.create({ data: record });
        return 'inserted';
    }

    private async upsertStockMovement(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        // Stock movements are immutable - only insert if not exists
        const existing = await prisma.stockMovement.findUnique({ where: { id: record.id } });
        if (existing) {
            return 'skipped';
        }
        await prisma.stockMovement.create({ data: record });
        return 'inserted';
    }

    private async upsertCustomer(record: any): Promise<'inserted' | 'updated' | 'skipped'> {
        const existing = await prisma.customer.findUnique({ where: { customerId: record.customerId } });
        if (existing) {
            if (new Date(record.updatedAt) > (existing.updatedAt || new Date(0))) {
                await prisma.customer.update({ where: { customerId: record.customerId }, data: record });
                return 'updated';
            }
            return 'skipped';
        }
        await prisma.customer.create({ data: record });
        return 'inserted';
    }

    /**
     * Get last pull timestamp from local storage
     * Falls back to lastSyncAt if lastPullAt is not available
     */
    private async getLastPullTimestamp(): Promise<Date | null> {
        try {
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId: this.config.terminalId },
                select: {
                    lastSyncAt: true,
                    lastSeenAt: true,
                },
            });
            // Use lastSyncAt as fallback since pull happens right after push
            return terminal?.lastSyncAt ?? terminal?.lastSeenAt ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Update last pull timestamp in local storage
     * Uses lastSeenAt field to store pull timestamp to avoid schema changes
     */
    private async updateLastPullTimestamp(timestamp: Date): Promise<void> {
        try {
            await prisma.terminal.update({
                where: { terminalId: this.config.terminalId },
                data: { lastSeenAt: timestamp },
            });
        } catch (error) {
            console.error('[SyncJob] Failed to update pull timestamp:', error);
        }
    }

    // ==================== PUSH METHODS ====================

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
            const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;
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
        const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;

        switch (tableName) {
            case 'sales':
                return prisma.sale.findMany({
                    where: {
                        ...whereWithTerminal,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 5, // Get more since we batch
                });

            case 'saleItems':
                return prisma.saleItem.findMany({
                    where: {
                        ...whereBase,
                        terminalId,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 10,
                });

            case 'salePayments':
                return prisma.salePayment.findMany({
                    where: {
                        ...whereBase,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 5,
                });

            case 'returns':
                return prisma.return.findMany({
                    where: {
                        ...whereWithTerminal,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 2,
                });

            case 'returnItems':
                return prisma.returnItem.findMany({
                    where: {
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 5,
                });

            case 'stockMovements':
                return prisma.stockMovement.findMany({
                    where: {
                        ...whereBase,
                        terminalId,
                        ...(since && { createdAt: { gt: since } }),
                    },
                    orderBy: { createdAt: 'asc' },
                    take: batchSize * 10,
                });

            case 'customers':
                return prisma.customer.findMany({
                    where: {
                        ...whereBase,
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 2,
                });

            case 'orders':
                return prisma.order.findMany({
                    where: {
                        ...(since && { updatedAt: { gt: since } }),
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: batchSize * 2,
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
        const maxRetries = this.config.maxRetries ?? DEFAULT_MAX_RETRIES;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                if (attempt < maxRetries) {
                    const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt - 1);
                    console.log(`[SyncJob] Retry ${attempt}/${maxRetries} in ${delay}ms`);
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
