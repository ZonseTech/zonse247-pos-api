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
 * │  └──────────────┘    │ - Inventory       │                 │
 * │         │            └───────────────────┘                 │
 * │         │                                                  │
 * └─────────│──────────────────────────────────────────────────┘
 *           │
 *           │ PUSH (POST /api/v1/sync/*)
 *           │ Sales, SaleItems, Returns, StockMovements
 *           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    SERVER (ONLINE)                          │
 * │                                                             │
 * │  ┌──────────────┐    ┌───────────────────┐                 │
 * │  │ SyncReceiver │────│ MySQL Database    │                 │
 * │  │ (endpoints)  │    │                   │                 │
 * │  └──────────────┘    │ - Sales           │                 │
 * │         │            │ - SaleItems       │                 │
 * │         ▼            │ - StockMovements  │                 │
 * │  ┌──────────────────┐│ - Customers       │                 │
 * │  │ StockMovement    ││ - Products        │                 │
 * │  │ Service          ││ - Inventory       │                 │
 * │  │ (recalculate)    │└───────────────────┘                 │
 * │  └──────────────────┘                                      │
 * └─────────────────────────────────────────────────────────────┘
 *           │
 *           │ PULL (POST /api/v1/sync/pull)
 *           │ Products, Categories, Inventory, PaymentMethods
 *           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    TERMINAL (OFFLINE)                       │
 * │                                                             │
 * │  Receives and saves pulled data locally (upsert)            │
 * │  - Products, ProductVariants, Categories                    │
 * │  - Inventory (recalculated quantities from server)          │
 * │  - PaymentMethods                                           │
 * │  - StockMovements from other terminals                      │
 * │  - Customers                                                │
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
 *      serverUrl: 'https://api.example.com/api/v1',
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
 *    - POST /api/v1/sync/batch
 *    - POST /api/v1/sync/pull
 *    - POST /api/v1/sync/bidirectional
 * 
 * 3. MANUAL SYNC TRIGGER:
 * 
 *    import { getSyncJob } from './services/sync';
 *    
 *    const job = getSyncJob();
 *    if (job) {
 *      await job.runSyncCycle();
 *    }
 */

export {
    SyncJobService,
    initSyncJob,
    getSyncJob,
    stopSyncJob,
    resetSyncTimestamps,
} from './sync-job.service';
export { SyncReceiverService } from './sync-receiver.service';
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
