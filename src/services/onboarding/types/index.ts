/**
 * Onboarding Module Types
 * Centralized type definitions for onboarding operations
 */

// ==========================================
// Base Parameter Types
// ==========================================

export interface TenantBranchParams {
    tenantId: string;
    branchId: string;
}

export interface OnboardingParams extends TenantBranchParams {
    terminalId: string;
}

export interface FetchParams extends TenantBranchParams {
    terminalId?: string;
}

// ==========================================
// Pagination Types
// ==========================================

export interface PaginationParams {
    cursor?: string;
    limit?: number;
    since?: Date | string | null;
}

export interface PaginationMeta {
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
    fetched: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
}

export interface BatchFetchResult<T> {
    data: T[];
    totalCount: number;
    batchCount: number;
    hasMore: boolean;
    lastCursor: string | null;
}

// ==========================================
// Sync Result Types
// ==========================================

export interface SyncSummary {
    total: number;
    saved: number;
    skipped: number;
    failed: number;
}

export interface SyncResult<T> {
    saved: T[];
    skipped: T[];
    failed: Array<{ data: T; error: string }>;
    summary: SyncSummary;
}

export interface TableSyncResult {
    table: string;
    success: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
}

export interface InitialSyncSummary {
    totalTables: number;
    successfulTables: number;
    failedTables: number;
    totalRecords: number;
    insertedRecords: number;
    skippedRecords: number;
    failedRecords: number;
}

export interface InitialSyncResult {
    success: boolean;
    tables: TableSyncResult[];
    summary: InitialSyncSummary;
    errors: string[];
    completedAt: Date;
}

// ==========================================
// Fetch Result Types
// ==========================================

export interface AllTablesDataResult {
    success: boolean;
    tables: Record<string, unknown[]>;
    counts: Record<string, number>;
    totalRecords: number;
    fetchedAt: Date;
    errors: string[];
}

// ==========================================
// Save Result Types (for terminal onboarding)
// ==========================================

export interface EntitySaveResult<T> {
    saved: boolean;
    exists: boolean;
    data?: T;
}

export interface TerminalSaveResult {
    tenant: EntitySaveResult<unknown>;
    subscriptionPlan: EntitySaveResult<unknown>;
    branchSubscription: EntitySaveResult<unknown>;
    branch: EntitySaveResult<unknown>;
    terminal: EntitySaveResult<unknown>;
}

// ==========================================
// Table Configuration Types
// ==========================================

export interface TableConfig {
    idField: string;
    includeRelations?: Record<string, boolean | object>;
    selectFields?: Record<string, boolean>;
    hasTenantScope: boolean;
    hasBranchScope: boolean;
    softDelete: boolean;
}

// ==========================================
// Callback Types
// ==========================================

export type BatchProgressCallback<T> = (batch: T[], progress: number) => void;
export type TableCompleteCallback = (table: string, count: number, progress: number) => void;

// ==========================================
// Options Types
// ==========================================

export interface FetchAllOptions {
    tables?: string[];
    batchSize?: number;
    since?: Date | string | null;
    onTableComplete?: TableCompleteCallback;
}

export interface BatchFetchOptions<T> {
    batchSize?: number;
    since?: Date | string | null;
    onBatch?: BatchProgressCallback<T>;
}

// ==========================================
// Validation Types
// ==========================================

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
