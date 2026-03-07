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
 * │  │ HTTP Client  │    └───────────────────┘                 │
 * │  └──────────────┘                                          │
 * │         │                                                  │
 * └─────────│──────────────────────────────────────────────────┘
 *           │
 *           │ PUSH (POST /api/v1/sync/*)
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
 * │  │ StockMovement    ││                   │                 │
 * │  │ Service          │└───────────────────┘                 │
 * │  │ (recalculate)    │                                      │
 * │  └──────────────────┘                                      │
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
 *    // Start sync job when terminal is authenticated
 *    initSyncJob({
 *      serverUrl: 'https://api.example.com/api/v1',
 *      apiKey: 'terminal-jwt-token',
 *      terminalId: 'term-001',
 *      tenantId: 'tenant-001',
 *      branchId: 'branch-001',
 *      intervalMs: 30000, // 30 seconds (default)
 *    });
 * 
 * 2. ON SERVER:
 * 
 *    Server exposes endpoints to receive sync data:
 *    - POST /api/v1/sync/sales
 *    - POST /api/v1/sync/sale-items
 *    - POST /api/v1/sync/stock-movements
 *    - etc.
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
    stopSyncJob 
} from './sync-job.service';

export { 
    SyncReceiverService 
} from './sync-receiver.service';
