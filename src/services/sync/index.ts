/**
 * Sync Services - Central export barrel
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
 * 
 * USAGE:
 * ------
 * 
 * 1. ON TERMINAL (Electron app):
 * 
 *    import { initSyncJob } from './services/sync';
 *    
 *    // Start bidirectional sync job when terminal is authenticated
 *    initSyncJob({
 *      serverUrl: 'https://api.example.com/api/v1',
 *      apiKey: 'terminal-jwt-token',
 *      terminalId: 'term-001',
 *      tenantId: 'tenant-001',
 *      branchId: 'branch-001',
 *      intervalMs: 30000,   // 30 seconds (default)
 *      enablePull: true,    // Enable pull phase (default: true)
 *    });
 * 
 * 2. ON SERVER:
 * 
 *    Server exposes endpoints for bidirectional sync:
 *    
 *    PUSH (receive from terminal):
 *    - POST /api/v1/sync/sales
 *    - POST /api/v1/sync/sale-items
 *    - POST /api/v1/sync/stock-movements
 *    - POST /api/v1/sync/batch (bulk push)
 *    
 *    PULL (send to terminal):
 *    - POST /api/v1/sync/pull
 *    - POST /api/v1/sync/pull/:tableName
 *    
 *    COMBINED:
 *    - POST /api/v1/sync/bidirectional (push + pull in one request)
 * 
 * 3. MANUAL SYNC TRIGGER:
 * 
 *    import { getSyncJob } from './services/sync';
 *    
 *    const job = getSyncJob();
 *    if (job) {
 *      await job.runSyncCycle(); // Runs push then pull
 *    }
 */

export {
    SyncJobService,
    initSyncJob,
    getSyncJob,
    stopSyncJob
} from './sync-job.service';

export {
    SyncReceiverService
} from './sync-receiver.service';
