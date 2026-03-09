import axios, { AxiosInstance, AxiosError } from 'axios';
import prisma from '../../databases/prisma/client';
import type {
    SyncJobConfig,
    SyncStats,
    SyncBatchResult,
    PullBatchResult,
    SyncCycleResult,
    PullTableName,
    PushTableConfig,
} from './types/sync.types';
import {
    SYNC_DEFAULTS,
    PUSH_TABLE_CONFIGS,
    PULL_TABLE_NAMES,
    SYNC_HEADERS,
    LOG_PREFIX,
} from './constants/sync.constants';
import {
    fetchPendingRecords,
    markRecordsSynced,
    upsertPulledRecord,
} from './handlers';

/**
 * Offline Sync Job Service
 * Runs on terminals for bidirectional sync with the server
 */
export class SyncJobService {
    private readonly config: Required<SyncJobConfig>;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly httpClient: AxiosInstance;
    private stats: SyncStats;

    constructor(config: SyncJobConfig) {
        this.config = this.normalizeConfig(config);
        this.httpClient = this.createHttpClient();
        this.stats = this.createInitialStats();
    }

    /** Get the terminal ID this sync job is configured for */
    get terminalId(): string {
        return this.config.terminalId;
    }

    /**
     * Start the sync job
     * Runs sync immediately then at configured interval
     */
    start(): void {
        if (this.stats.isRunning) return;

        this.stats.isRunning = true;
        this.runSyncCycle().catch(console.error);

        this.intervalId = setInterval(() => {
            this.runSyncCycle().catch(console.error);
        }, this.config.intervalMs);
    }

    /**
     * Stop the sync job
     */
    stop(): void {
        if (!this.stats.isRunning) return;

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
     * Reset sync timestamps to force full re-sync
     */
    async resetSyncTimestamps(): Promise<void> {
        try {
            await prisma.terminal.update({
                where: { terminalId: this.config.terminalId },
                data: { lastSyncAt: null, lastSeenAt: null },
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.JOB} Failed to reset sync timestamps:`, error);
        }
    }

    /**
     * Run a single sync cycle (push then pull)
     */
    async runSyncCycle(): Promise<SyncCycleResult> {
        if (this.stats.isSyncing) {
            return this.createEmptyCycleResult();
        }

        this.stats.isSyncing = true;
        this.stats.lastSyncAt = new Date();

        const result = this.createEmptyCycleResult();

        try {
            const lastSync = await this.getLastSyncTimestamp();
            const lastPull = await this.getLastPullTimestamp();

            await this.executePushPhase(result, lastSync);

            if (this.config.enablePull) {
                await this.executePullPhase(result, lastPull);
            }

            this.updateStatsOnSuccess(result);
        } catch (error) {
            this.handleCycleError(result, error);
        } finally {
            this.stats.isSyncing = false;
            result.completedAt = new Date();
        }

        return result;
    }

    private async executePushPhase(result: SyncCycleResult, lastSync: Date | null): Promise<void> {
        for (const tableConfig of PUSH_TABLE_CONFIGS) {
            const tableResult = await this.syncTable(tableConfig, lastSync);
            result.pushTables.push(tableResult);
            result.totalSent += tableResult.sent;
            result.totalAccepted += tableResult.accepted;
            result.totalRejected += tableResult.rejected;

            if (!tableResult.success) {
                result.success = false;
            }
        }

        if (result.totalSent > 0 && result.totalRejected === 0) {
            await this.updateLastSyncTimestamp(new Date());
        }
    }

    private async syncTable(
        tableConfig: PushTableConfig,
        since: Date | null
    ): Promise<SyncBatchResult> {
        const result: SyncBatchResult = {
            success: true,
            table: tableConfig.name,
            sent: 0,
            accepted: 0,
            rejected: 0,
            errors: [],
        };

        try {
            const records = await fetchPendingRecords(tableConfig.name, {
                tenantId: this.config.tenantId,
                branchId: this.config.branchId,
                terminalId: this.config.terminalId,
                batchSize: this.config.batchSize,
            }, since);

            if (records.length === 0) return result;

            result.sent = records.length;

            for (let i = 0; i < records.length; i += this.config.batchSize) {
                const batch = records.slice(i, i + this.config.batchSize);
                const batchResult = await this.sendBatchWithRetry(tableConfig.endpoint, batch);

                result.accepted += batchResult.accepted;
                result.rejected += batchResult.rejected;
                result.errors.push(...batchResult.errors);
            }

            if (result.accepted > 0) {
                await markRecordsSynced(
                    tableConfig.name,
                    records.slice(0, result.accepted) as Array<{ id?: string; customerId?: string }>
                );
            }
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        return result;
    }

    private async sendBatchWithRetry(
        endpoint: string,
        records: unknown[]
    ): Promise<{ accepted: number; rejected: number; errors: string[] }> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
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
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');

                if (this.shouldNotRetry(error)) break;
                if (attempt < this.config.maxRetries) {
                    await this.sleep(SYNC_DEFAULTS.RETRY_DELAY_MS * Math.pow(2, attempt - 1));
                }
            }
        }

        return {
            accepted: 0,
            rejected: records.length,
            errors: [lastError?.message ?? 'Unknown error'],
        };
    }

    private async executePullPhase(result: SyncCycleResult, lastPull: Date | null): Promise<void> {
        const pullResult = await this.pullFromServer(lastPull);

        result.pullTables = pullResult.tables;
        result.totalPulled = pullResult.totalReceived;
        result.totalInserted = pullResult.totalInserted;
        result.totalUpdated = pullResult.totalUpdated;

        if (!pullResult.success) {
            result.success = false;
        }

        if (pullResult.totalReceived > 0) {
            await this.updateLastPullTimestamp(new Date());
        }
    }

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
            const response = await this.httpClient.post('/sync/pull', {
                tenantId: this.config.tenantId,
                branchId: this.config.branchId,
                terminalId: this.config.terminalId,
                since: since?.toISOString(),
                tables: PULL_TABLE_NAMES,
            });

            if (!response.data.success) {
                throw new Error(response.data.errors?.join(', ') || 'Pull failed');
            }

            const { data } = response.data;

            for (const tableName of PULL_TABLE_NAMES) {
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
        } catch (error) {
            result.success = false;
        }

        return result;
    }

    private async savePulledRecords(
        tableName: PullTableName,
        records: Record<string, unknown>[]
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
                const outcome = await upsertPulledRecord(tableName, record);

                if (outcome === 'inserted') result.inserted++;
                else if (outcome === 'updated') result.updated++;
                else result.skipped++;
            } catch (error) {
                result.errors.push(`${record.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
        }

        result.success = result.errors.length === 0;
        return result;
    }

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

    private async updateLastSyncTimestamp(timestamp: Date): Promise<void> {
        try {
            await prisma.terminal.update({
                where: { terminalId: this.config.terminalId },
                data: { lastSyncAt: timestamp },
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.JOB} Failed to update sync timestamp:`, error);
        }
    }

    private async getLastPullTimestamp(): Promise<Date | null> {
        try {
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId: this.config.terminalId },
                select: { lastSyncAt: true, lastSeenAt: true },
            });
            return terminal?.lastSyncAt ?? terminal?.lastSeenAt ?? null;
        } catch {
            return null;
        }
    }

    private async updateLastPullTimestamp(timestamp: Date): Promise<void> {
        try {
            await prisma.terminal.update({
                where: { terminalId: this.config.terminalId },
                data: { lastSeenAt: timestamp },
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.JOB} Failed to update pull timestamp:`, error);
        }
    }

    private normalizeConfig(config: SyncJobConfig): Required<SyncJobConfig> {
        return {
            serverUrl: config.serverUrl,
            apiKey: config.apiKey ?? '',
            terminalId: config.terminalId,
            tenantId: config.tenantId,
            branchId: config.branchId,
            clientType: config.clientType ?? 'desktop',
            intervalMs: config.intervalMs ?? SYNC_DEFAULTS.INTERVAL_MS,
            batchSize: config.batchSize ?? SYNC_DEFAULTS.BATCH_SIZE,
            maxRetries: config.maxRetries ?? SYNC_DEFAULTS.MAX_RETRIES,
            enablePull: config.enablePull ?? true,
        };
    }

    private createHttpClient(): AxiosInstance {
        return axios.create({
            baseURL: this.config.serverUrl,
            timeout: SYNC_DEFAULTS.REQUEST_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
                [SYNC_HEADERS.TERMINAL_ID]: this.config.terminalId,
                [SYNC_HEADERS.TENANT_ID]: this.config.tenantId,
                [SYNC_HEADERS.BRANCH_ID]: this.config.branchId,
                [SYNC_HEADERS.CLIENT_TYPE]: this.config.clientType,
                ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
            },
        });
    }

    private createInitialStats(): SyncStats {
        return {
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
    }

    private createEmptyCycleResult(): SyncCycleResult {
        return {
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
    }

    private updateStatsOnSuccess(result: SyncCycleResult): void {
        this.stats.lastSuccessAt = new Date();
        this.stats.totalSynced += result.totalAccepted;
        this.stats.totalFailed += result.totalRejected;
        this.stats.totalPulled += result.totalPulled;
    }

    private handleCycleError(result: SyncCycleResult, error: unknown): void {
        result.success = false;
        this.stats.lastErrorAt = new Date();
        this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`${LOG_PREFIX.JOB} Sync cycle failed:`, this.stats.lastError);
    }

    private shouldNotRetry(error: unknown): boolean {
        if (error instanceof AxiosError && error.response?.status) {
            const status = error.response.status;

            return status >= 400 && status < 500 && status !== 429;
        }
        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

let syncJobInstance: SyncJobService | null = null;

/**
 * Initialize and start the sync job for this terminal
 */
export function initSyncJob(config: SyncJobConfig): SyncJobService {
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

/**
 * Reset sync timestamps to force full re-sync
 */
export async function resetSyncTimestamps(terminalId?: string): Promise<void> {
    const targetTerminalId = terminalId || syncJobInstance?.terminalId;

    if (!targetTerminalId) {
        console.warn(`${LOG_PREFIX.JOB} No terminalId provided and no sync job instance`);
        return;
    }

    try {
        await prisma.terminal.update({
            where: { terminalId: targetTerminalId },
            data: { lastSyncAt: null, lastSeenAt: null },
        });
    } catch (error) {
        console.error(`${LOG_PREFIX.JOB} Failed to reset sync timestamps:`, error);
    }
}

export default SyncJobService;
