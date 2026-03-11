/**
 * Onboarding Module - Barrel Exports
 * 
 * This module handles terminal onboarding and initial data synchronization
 * between cloud and local Electron POS application.
 * 
 * Main exports:
 * - Services: OnboardingService, InitialSyncService, MasterDataFetchService
 * - Types: FetchParams, SyncResult, PaginatedResult, etc.
 * - Constants: INITIAL_SYNC_TABLES, STEP_TO_TABLES_MAP, etc.
 * - Errors: OnboardingError, ValidationError, SyncError, etc.
 */

// ==========================================
// Services
// ==========================================

export { OnboardingService } from './onboarding.service';
export { OnboardingFetchService } from './onboarding-fetch.service';
export { OnboardingSyncService } from './onboarding-sync.service';
export { InitialSyncService, INITIAL_SYNC_TABLES, STEP_TO_TABLES_MAP } from './initial-sync.service';
export { MasterDataFetchService } from './master-data-fetch.service';

// ==========================================
// Types
// ==========================================

export type {
    TenantBranchParams,
    OnboardingParams,
    FetchParams,
    PaginationParams,
    PaginationMeta,
    PaginatedResult,
    BatchFetchResult,
    SyncSummary,
    SyncResult,
    TableSyncResult,
    InitialSyncSummary,
    InitialSyncResult,
    AllTablesDataResult,
    EntitySaveResult,
    TerminalSaveResult,
    TableConfig,
    BatchProgressCallback,
    TableCompleteCallback,
    FetchAllOptions,
    BatchFetchOptions,
    ValidationError as ValidationErrorType,
    ValidationResult,
} from './types';

// ==========================================
// Constants
// ==========================================

export {
    InitialSyncTable,
    BATCH_SETTINGS,
    INT_ID_TABLES,
    TABLE_ID_FIELDS,
    ONBOARDING_ERRORS,
    ONBOARDING_MESSAGES,
    HTTP_STATUS,
    DEFAULTS,
} from './constants';

// ==========================================
// Errors
// ==========================================

export {
    OnboardingError,
    ValidationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
    SubscriptionError,
    SyncError,
    PartialSuccessError,
    getErrorMessage,
    mapErrorToStatusCode,
} from './errors';

// ==========================================
// Base Utilities (for extending)
// ==========================================

export {
    createEmptySyncResult,
    createEmptyTableSyncResult,
    syncRecords,
    syncTableRecords,
    getPrismaModel,
    getIdField,
    stripRelations,
    parseNumeric,
    parseBoolean,
    parseDate,
    toDisplayName,
    calculateSummary,
    formatSyncSummaryMessage,
} from './base-sync.service';

// ==========================================
// Table Configurations
// ==========================================

export { TABLE_SYNC_HANDLERS, syncTable } from './table-sync-configs';
export { TABLE_CONFIG, getTableConfig, hasIntegerId, parseCursor, shouldFilterByActive } from './table-fetch-configs';

// ==========================================
// Validation Helpers
// ==========================================

export {
    isNonEmptyString,
    isValidArray,
    isValidTable,
    validateTenantBranchParams,
    validateOnboardingParams,
    validateArrayField,
    validateDataObject,
    validateTableName,
    validateTableList,
    validateStepType,
    validateTerminalSaveData,
    validateActivationCode,
    parsePaginationParams,
    parseOptionalTenantBranchParams,
} from './validation';
