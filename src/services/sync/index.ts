/**
 * Sync Services - Central Export Barrel
 * 
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    TERMINAL (OFFLINE)                       │
 * │                                                             │
 * │  ┌──────────────┐    ┌───────────────────┐                 │
 * │  │ SyncJob      │────│ SQLite Database   │                 │
 * │  │ (30s loop)   │    │                   │                 │
 * │  └──────────────┘    │ - Sales           │                 │
 * │         │            │ - SaleItems       │                 │
 * │         ▼            │ - StockMovements  │                 │
 * │  ┌──────────────┐    │ - Customers       │                 │
 * │  │ HTTP Client  │    │ - Products        │                 │
 * │  │ (gzip)       │    │ - Inventory       │                 │
 * │  └──────────────┘    └───────────────────┘                 │
 * │         │                                                  │
 * └─────────│──────────────────────────────────────────────────┘
 *           │
 *           │ PUSH (POST /v1/sync/batch)
 *           │ ↕ Parallel for independent tables ↕
 *           │ Sequential for dependent: Sales → Items → Payments
 *           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    SERVER (ONLINE)                          │
 * │                                                             │
 * │  ┌──────────────┐    ┌──────────────────┐                  │
 * │  │ SyncReceiver │────│ MySQL Database   │                  │
 * │  │ (batch ops)  │    │                  │                  │
 * │  └──────────────┘    │ ChangeLog table  │← records changes │
 * │         │            │ TerminalSyncState│← per-terminal    │
 * │         ▼            └──────────────────┘   cursors        │
 * │  ┌──────────────────┐                                      │
 * │  │ StockMovement    │                                      │
 * │  │ Service          │                                      │
 * │  │ (recalculate)    │                                      │
 * │  └──────────────────┘                                      │
 * └─────────────────────────────────────────────────────────────┘
 *           │
 *           │ PULL (POST /v1/sync/pull)
 *           │ ChangeLog-based delta when available,
 *           │ timestamp-scan as fallback
 *           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    TERMINAL (OFFLINE)                       │
 * │                                                             │
 * │  Receives and batch-upserts pulled data locally             │
 * │  - Parallel table processing                                │
 * │  - Chunked upsert (50 records per chunk)                    │
 * │  - Separate push/pull timestamps                            │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * USAGE:
 * ------
 * 
 * 1. ON TERMINAL (Electron app):
 * 
 *    import { initSyncJob } from './services/sync';
 *    
 *    initSyncJob({
 *      serverUrl: 'https://api.example.com/v1',
 *      apiKey: 'terminal-jwt-token',
 *      terminalId: 'term-001',
 *      tenantId: 'tenant-001',
 *      branchId: 'branch-001',
 *      intervalMs: 30000,   // 30 seconds (default)
 *      enablePull: true,    // Enable pull phase (default)
 *    });
 * 
 * 2. ON SERVER:
 * 
 *    Server exposes sync endpoints via SyncController:
 *    - POST /v1/sync/batch        (validated, batch-optimised)
 *    - POST /v1/sync/pull         (ChangeLog-based delta)
 *    - POST /v1/sync/bidirectional
 * 
 * 3. MANUAL SYNC TRIGGER:
 * 
 *    import { getSyncJob } from './services/sync';
 *    
 *    const job = getSyncJob();
 *    if (job) {
 *      await job.runSyncCycle();
 *    }
 *
 * 4. RECORDING CHANGES (for delta sync):
 *
 *    import { recordChange, recordChangesAsync } from './services/sync';
 *
 *    // After product update in your CRUD service:
 *    recordChangeAsync({
 *      tableName: 'products', recordId: product.id,
 *      operation: 'UPDATE', tenantId, branchId,
 *    });
 */

export {
    SyncJobService,
    initSyncJob,
    getSyncJob,
    stopSyncJob,
    resetSyncTimestamps,
} from './sync-job.service';
export { SyncReceiverService } from './sync-receiver.service';

// ChangeLog service — record mutations for delta sync
export {
    recordChange,
    recordChanges,
    recordChangeAsync,
    recordChangesAsync,
    purgeOldChangeLogs,
    getLatestSequence,
    type ChangeEntry,
    type ChangeOperation,
} from './change-log.service';

// TerminalSyncState service — per-terminal sync cursors
export {
    getOrCreateSyncState,
    updatePushTimestamp,
    updatePullState,
    resetSyncState,
    type SyncStateSnapshot,
} from './terminal-sync-state.service';

export type {
    SyncRecordBase,
    SyncResult,
    SyncError,
    StockMovementSyncResult,
    PullTableName,
    PullDataResult,
    PullOptions,
    TableDeltaResult,
    PushTableName,
    PushTableConfig,
    SyncBatchResult,
    PullBatchResult,
    BatchSyncData,
    BatchSyncResult,
    SyncJobConfig,
    SyncStats,
    SyncCycleResult,
    UpsertResult,
} from './types';

export {
    SYNC_DEFAULTS,
    PUSH_TABLE_CONFIGS,
    PULL_TABLE_NAMES,
    VALID_PULL_TABLES,
    BATCH_MULTIPLIERS,
    SYNC_HEADERS,
    LOG_PREFIX,
} from './constants';
