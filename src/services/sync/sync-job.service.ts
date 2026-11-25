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
    PushTableName,
} from './types/sync.types';
import {
    SYNC_DEFAULTS,
    PUSH_TABLE_CONFIGS,
    PULL_TABLE_NAMES,
    SYNC_HEADERS,
    LOG_PREFIX,
    BATCH_MULTIPLIERS,
} from './constants/sync.constants';
import {
    fetchPendingRecords,
    markRecordsSynced,
    upsertPulledRecord,
    chunk,
} from './handlers';
import {
    loadPushState,
    savePushState,
    clearPushState,
    emptyPushState,
    type PushState,
    type RetryEntry,
} from './push-state.store';

interface SendOutcome {
    sent: number;
    accepted: number;
    rejected: number;
    errors: string[];
    rejectedIds: Map<string, string>;
    failed: boolean;
}

const MAX_RETRY_ENTRIES_PER_TABLE = 1000;

/** Fields that identify a pushed record in the server's rejection list. */
const RECORD_ID_FIELDS = ['id', 'returnItemId', 'customerId', 'categoryId', 'orderId', 'userId', 'supplierId', 'expenseId'];

function orderValue(record: unknown, tableConfig: PushTableConfig): Date {
    return new Date((record as Record<string, any>)[tableConfig.orderField]);
}

function recordKey(record: unknown, rejectedIds: Map<string, string>): string {
    const r = record as Record<string, unknown>;
    for (const field of RECORD_ID_FIELDS) {
        const value = r[field];
        if (value !== undefined && value !== null && rejectedIds.has(String(value))) return String(value);
    }
    return String(r.id ?? '');
}

function errorText(e: string | { id?: unknown; error?: unknown }): string {
    return typeof e === 'string' ? e : `${e.id ?? 'unknown'}: ${e.error ?? 'Rejected'}`;
}

function addRetryEntry(state: PushState, table: PushTableName, record: unknown, error: string): void {
    const snapshot = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
    const id = String(snapshot.id ?? snapshot.returnItemId ?? snapshot.customerId ?? snapshot.userId ?? '');
    const entries = (state.retry[table] ?? []).filter((e) => e.id !== id);
    entries.push({ id, record: snapshot, attempts: 1, lastError: error, firstRejectedAt: new Date().toISOString() });

    if (entries.length > MAX_RETRY_ENTRIES_PER_TABLE) {
        const dropped = entries.splice(0, entries.length - MAX_RETRY_ENTRIES_PER_TABLE);
        console.error(`${LOG_PREFIX.JOB} ${table}: retry list full, giving up on ${dropped.map((d) => d.id).join(', ')}`);
    }
    state.retry[table] = entries;
}

/**
 * Tables with a real FK dependency on another pulled table, applied in this
 * exact order before the rest of the pull batch runs in parallel:
 * - `branchSubscriptions` before `branches` (branch.branchSubscriptionId
 *   references it — a resubscribe mints a brand-new subscription ID)
 * - `roles` and `permissions` before `rolePermissions` (a link row needs
 *   both sides to exist locally first)
 */
const PULL_DEPENDENCY_ORDER: readonly PullTableName[] = [
    'branchSubscriptions',
    'branches',
    'roles',
    'permissions',
    'rolePermissions',
];

/**
 * Offline Sync Job Service
 * Runs on terminals for bidirectional sync with the server.
 *
 * IMPROVEMENTS:
 * - Independent tables pushed in parallel (customers, orders, users)
 * - Separate push / pull timestamps (no cross-contamination)
 * - Bidirectional endpoint used when both push + pull are enabled
 * - Gzip compression requested via Accept-Encoding
 * - Adaptive interval: backs off when no data to sync
 * - Batch upsert for pulled records
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
        await clearPushState(this.config.terminalId);
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
            const lastPull = await this.getLastPullTimestamp();

            await this.executePushPhase(result);

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

    /**
     * Push phase — sends local changes to server.
     *
     * Each table keeps its own cursor (see push-state.store), so a table that
     * is behind or failing never holds back the others. Records the server
     * rejects go to a retry list instead of freezing the cursor.
     *
     * Independent tables (customers, orders, users) are pushed in parallel
     * once all dependency-ordered tables are done.
     */
    private async executePushPhase(result: SyncCycleResult): Promise<void> {
        const state = await this.loadPushState();
        const ceilings = new Map<PushTableName, Date | null>();

        // Separate tables into dependency-ordered and independent
        const dependencyOrdered: PushTableConfig[] = [];
        const independent: PushTableConfig[] = [];

        const dependentTables = new Set(['sales', 'saleItems', 'salePayments', 'returns', 'returnItems', 'stockMovements']);

        for (const tableConfig of PUSH_TABLE_CONFIGS) {
            if (dependentTables.has(tableConfig.name)) {
                dependencyOrdered.push(tableConfig);
            } else {
                independent.push(tableConfig);
            }
        }

        const collect = (tableResult: SyncBatchResult) => {
            result.pushTables.push(tableResult);
            result.totalSent += tableResult.sent;
            result.totalAccepted += tableResult.accepted;
            result.totalRejected += tableResult.rejected;

            if (!tableResult.success) {
                result.success = false;
            }
        };

        // Phase 1: Sequential push for dependency-ordered tables
        for (const tableConfig of dependencyOrdered) {
            collect(await this.syncTable(tableConfig, state, ceilings));
        }

        // Phase 2: Parallel push for independent tables
        if (independent.length > 0) {
            const parallelResults = await Promise.all(
                independent.map((tableConfig) => this.syncTable(tableConfig, state, ceilings))
            );
            parallelResults.forEach(collect);
        }

        await savePushState(this.config.terminalId, state);

        // terminals.lastSyncAt stays a safe lower bound: everything before it
        // has been sent. It is only read when the push state is missing.
        const cursors = Object.values(state.cursors).filter(Boolean).map((c) => new Date(c as string).getTime());
        if (cursors.length > 0) {
            await this.updateLastPushTimestamp(new Date(Math.min(...cursors)));
        }
    }

    private async loadPushState(): Promise<PushState> {
        const stored = await loadPushState(this.config.terminalId);
        if (stored) return stored;

        // First run with per-table cursors: start every table from the old
        // single push timestamp so nothing pending since then is skipped.
        const state = emptyPushState();
        const legacy = await this.getLastPushTimestamp();
        if (legacy) {
            for (const { name } of PUSH_TABLE_CONFIGS) state.cursors[name] = legacy.toISOString();
        }
        return state;
    }

    private async syncTable(
        tableConfig: PushTableConfig,
        state: PushState,
        ceilings: Map<PushTableName, Date | null>
    ): Promise<SyncBatchResult> {
        const name = tableConfig.name;
        const result: SyncBatchResult = {
            success: true,
            table: name,
            sent: 0,
            accepted: 0,
            rejected: 0,
            errors: [],
        };
        const since = state.cursors[name] ? new Date(state.cursors[name] as string) : null;
        ceilings.set(name, since ?? new Date(0));

        try {
            await this.retryRejected(tableConfig, state, result);

            const { records, full } = await this.fetchPage(tableConfig, since);
            if (records.length === 0) {
                ceilings.set(name, null);
                return result;
            }

            const outcome = await this.sendRecords(tableConfig.endpoint, records);
            result.sent += outcome.sent;
            result.accepted += outcome.accepted;
            result.rejected += outcome.rejected;
            result.errors.push(...outcome.errors);

            const sentRecords = records.slice(0, outcome.sent);
            const last = sentRecords.length ? orderValue(sentRecords[sentRecords.length - 1], tableConfig) : null;

            // Where every record up to has been sent. A full page may have
            // more records with the last timestamp, so stop 1 ms before it.
            let next: Date | null = last && (full || outcome.failed) ? new Date(last.getTime() - 1) : last;
            let caughtUp = !full && !outcome.failed;

            const parentCeiling = tableConfig.parentTable ? ceilings.get(tableConfig.parentTable) : null;
            if (next && parentCeiling && next > parentCeiling) {
                next = parentCeiling;
                caughtUp = false;
            }

            if (next && (!since || next > since)) {
                state.cursors[name] = next.toISOString();
            }
            ceilings.set(name, caughtUp ? null : new Date(state.cursors[name] ?? 0));

            const cursorAt = state.cursors[name] ? new Date(state.cursors[name] as string) : null;
            const accepted: unknown[] = [];
            for (const record of sentRecords) {
                const error = outcome.rejectedIds.get(recordKey(record, outcome.rejectedIds));
                if (error === undefined) {
                    accepted.push(record);
                } else if (cursorAt && orderValue(record, tableConfig) <= cursorAt) {
                    // Behind the cursor now, so it would never be fetched again
                    addRetryEntry(state, name, record, error);
                }
            }

            if (outcome.failed) result.success = false;

            if (accepted.length > 0) {
                await markRecordsSynced(name, accepted as Array<{ id?: string; customerId?: string }>);
            }
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        return result;
    }

    /**
     * Fetch the next page after the cursor. If the whole page shares one
     * timestamp the cursor could not move, so the page is widened.
     */
    private async fetchPage(
        tableConfig: PushTableConfig,
        since: Date | null
    ): Promise<{ records: unknown[]; full: boolean }> {
        for (let factor = 1; ; factor *= 10) {
            const batchSize = this.config.batchSize * factor;
            const records = await fetchPendingRecords(tableConfig.name, {
                tenantId: this.config.tenantId,
                branchId: this.config.branchId,
                terminalId: this.config.terminalId,
                batchSize,
            }, since);

            const full = records.length >= batchSize * BATCH_MULTIPLIERS[tableConfig.name];
            if (!full || !since) return { records, full };

            const last = orderValue(records[records.length - 1], tableConfig);
            if (last.getTime() - 1 > since.getTime()) return { records, full };

            if (factor >= 100) {
                console.warn(`${LOG_PREFIX.JOB} ${tableConfig.name}: more than ${records.length} records share one timestamp; moving past it`);
                return { records, full: false };
            }
        }
    }

    /**
     * Resend records the server rejected before. Accepted ones leave the list.
     */
    private async retryRejected(tableConfig: PushTableConfig, state: PushState, result: SyncBatchResult): Promise<void> {
        const entries = state.retry[tableConfig.name];
        if (!entries?.length) return;

        const outcome = await this.sendRecords(tableConfig.endpoint, entries.map((e) => e.record));
        result.sent += outcome.sent;
        result.accepted += outcome.accepted;
        result.rejected += outcome.rejected;
        result.errors.push(...outcome.errors);

        const remaining: RetryEntry[] = [];
        entries.forEach((entry, i) => {
            if (i >= outcome.sent) {
                remaining.push(entry);
                return;
            }
            const error = outcome.rejectedIds.get(recordKey(entry.record, outcome.rejectedIds));
            if (error !== undefined) {
                remaining.push({ ...entry, attempts: entry.attempts + 1, lastError: error });
            }
        });
        state.retry[tableConfig.name] = remaining;
    }

    /**
     * Send records in batches. Stops at the first batch that fails as a whole
     * (network, server error), so the caller does not move past it.
     */
    private async sendRecords(endpoint: string, records: unknown[]): Promise<SendOutcome> {
        const outcome: SendOutcome = { sent: 0, accepted: 0, rejected: 0, errors: [], rejectedIds: new Map(), failed: false };

        for (let i = 0; i < records.length; i += this.config.batchSize) {
            const batch = records.slice(i, i + this.config.batchSize);
            const batchResult = await this.sendBatchWithRetry(endpoint, batch);

            const batchErrors = batchResult.errors as Array<string | { id?: unknown; error?: unknown }>;
            const failedAsWhole =
                batchResult.failed ||
                batchErrors.some((e) => typeof e === 'object' && e !== null && e.id === 'batch');
            if (failedAsWhole) {
                outcome.failed = true;
                outcome.errors.push(...batchErrors.map(errorText));
                break;
            }

            outcome.sent += batch.length;
            outcome.accepted += batchResult.accepted;
            outcome.rejected += batchResult.rejected;
            for (const e of batchErrors) {
                outcome.errors.push(errorText(e));
                if (typeof e === 'object' && e !== null && e.id !== undefined) {
                    outcome.rejectedIds.set(String(e.id), String(e.error ?? 'Rejected'));
                }
            }
            const unidentified = batchResult.rejected - batchErrors.filter((e) => typeof e === 'object' && e?.id !== undefined).length;
            if (unidentified > 0) {
                console.warn(`${LOG_PREFIX.JOB} ${endpoint}: ${unidentified} record(s) rejected without an id; they cannot be retried`);
            }
        }

        return outcome;
    }

    private async sendBatchWithRetry(
        endpoint: string,
        records: unknown[]
    ): Promise<{ accepted: number; rejected: number; errors: string[]; failed?: boolean }> {
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
            failed: true,
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

            // A handful of tables have real FK dependencies on each other
            // (a resubscribe's new branchSubscriptionId must exist before the
            // branch row that references it is applied; a role-permission
            // link needs both its role and permission to exist first). Pulled
            // together in one batch, applying them all in parallel can race —
            // and since the ChangeLog cursor advances regardless of whether an
            // individual record's FK-dependent write succeeds, a lost race
            // isn't retried on the next cycle. Apply these strictly in order
            // first; everything else has no such dependency and stays parallel.
            const orderedResults: PullBatchResult[] = [];
            for (const tableName of PULL_DEPENDENCY_ORDER) {
                const records = data[tableName];
                if (records?.length > 0) {
                    orderedResults.push(await this.savePulledRecords(tableName, records));
                }
            }

            const remainingTables = PULL_TABLE_NAMES.filter(
                (tableName) => !PULL_DEPENDENCY_ORDER.includes(tableName)
            );
            const tablePromises = remainingTables
                .filter((tableName) => data[tableName]?.length > 0)
                .map((tableName) =>
                    this.savePulledRecords(tableName, data[tableName])
                );

            const tableResults = [...orderedResults, ...await Promise.all(tablePromises)];

            for (const tableResult of tableResults) {
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

    /**
     * Save pulled records — processes in chunks for better throughput
     */
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

        // Process in chunks to avoid blocking the event loop too long
        const recordChunks = chunk(records, 50);

        for (const recordChunk of recordChunks) {
            const chunkPromises = recordChunk.map(async (record) => {
                try {
                    return await upsertPulledRecord(tableName, record);
                } catch (error) {
                    result.errors.push(`${record.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
                    return 'error' as const;
                }
            });

            const outcomes = await Promise.all(chunkPromises);

            for (const outcome of outcomes) {
                if (outcome === 'inserted') result.inserted++;
                else if (outcome === 'updated') result.updated++;
                else if (outcome === 'error') { /* already pushed to errors */ }
                else result.skipped++;
            }
        }

        result.success = result.errors.length === 0;
        return result;
    }

    // ==========================================
    // Separate push / pull timestamps
    // ==========================================

    private async getLastPushTimestamp(): Promise<Date | null> {
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

    private async updateLastPushTimestamp(timestamp: Date): Promise<void> {
        try {
            await prisma.terminal.update({
                where: { terminalId: this.config.terminalId },
                data: { lastSyncAt: timestamp },
            });
        } catch (error) {
            console.error(`${LOG_PREFIX.JOB} Failed to update push timestamp:`, error);
        }
    }

    private async getLastPullTimestamp(): Promise<Date | null> {
        try {
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId: this.config.terminalId },
                select: { lastSeenAt: true },
            });
            return terminal?.lastSeenAt ?? null;
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
            // Request gzip compression — reduces payload size by ~70-80%
            // for JSON data, significantly improving sync speed on slow connections
            decompress: true,
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
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
