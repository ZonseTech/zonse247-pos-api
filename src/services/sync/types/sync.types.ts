export interface SyncRecordBase {
    id: string;
    tenantId: string;
    branchId: string;
    terminalId?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface SyncResult {
    success: boolean;
    accepted: number;
    rejected: number;
    skipped: number;
    errors: SyncError[];
}

export interface SyncError {
    id: string;
    error: string;
}

export interface StockMovementSyncResult extends SyncResult {
    inventoriesRecalculated: number;
}

export type PullTableName =
    | 'products'
    | 'productVariants'
    | 'categories'
    | 'inventory'
    | 'paymentMethods'
    | 'stockMovements'
    | 'customers'
    | 'users'
    | 'expenseCategories'
    | 'expenses';

export interface PullDataResult {
    success: boolean;
    data: Record<PullTableName, unknown[]>;
    counts: Record<PullTableName, number>;
    serverTime: Date;
    errors: string[];
}

export interface PullOptions {
    tables?: PullTableName[];
    limit?: number;
}

export interface TableDeltaResult {
    records: unknown[];
    count: number;
    hasMore: boolean;
}

export type PushTableName =
    | 'sales'
    | 'saleItems'
    | 'salePayments'
    | 'returns'
    | 'returnItems'
    | 'stockMovements'
    | 'customers'
    | 'orders'
    | 'users'
    | 'expenses';

export interface PushTableConfig {
    name: PushTableName;
    endpoint: string;
    orderField: string;
    parentTable?: PushTableName;
}

export interface SyncBatchResult {
    success: boolean;
    table: string;
    sent: number;
    accepted: number;
    rejected: number;
    errors: string[];
}

export interface PullBatchResult {
    success: boolean;
    table: string;
    received: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
}

export type SyncRecord = Record<string, unknown> & { id: string };

export interface BatchSyncData {
    sales?: SyncRecord[];
    saleItems?: SyncRecord[];
    salePayments?: SyncRecord[];
    returns?: SyncRecord[];
    returnItems?: SyncRecord[];
    stockMovements?: import('../../../models/stock-movement.model').SyncMovementInput[];
    customers?: SyncRecord[];
    orders?: SyncRecord[];
    users?: SyncRecord[];
}

export interface BatchSyncResult {
    success: boolean;
    results: Record<string, SyncResult>;
    summary: {
        total: number;
        accepted: number;
        rejected: number;
        skipped: number;
    };
}

export interface SyncJobConfig {
    serverUrl: string;
    apiKey?: string;
    terminalId: string;
    tenantId: string;
    branchId: string;
    clientType?: 'web' | 'mobile' | 'desktop';
    intervalMs?: number;
    batchSize?: number;
    maxRetries?: number;
    enablePull?: boolean;
}

export interface SyncStats {
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

export interface SyncCycleResult {
    success: boolean;
    startedAt: Date;
    completedAt: Date;
    pushTables: SyncBatchResult[];
    totalSent: number;
    totalAccepted: number;
    totalRejected: number;
    pullTables: PullBatchResult[];
    totalPulled: number;
    totalInserted: number;
    totalUpdated: number;
}

export type UpsertResult = 'inserted' | 'updated' | 'skipped';

export interface WhereBaseFilter {
    tenantId: string;
    branchId: string;
}

export interface SinceFilter {
    updatedAt?: { gt: Date };
}
