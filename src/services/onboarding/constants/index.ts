/**
 * Onboarding Module Constants
 * Centralized constants for onboarding operations
 */

// ==========================================
// Sync Tables Configuration
// ==========================================

/**
 * Master data tables in dependency order (parent tables first)
 * Order matters for foreign key constraints during sync
 */
export const INITIAL_SYNC_TABLES = [
    'districts',
    'roles',
    'permissions',
    'rolePermissions',
    'subscriptionPlans',
    'planFeatures',
    'paymentMethods',
    'paymentServiceProviders',
    'categories',
    'suppliers',
    'customers',
    'products',
    'productVariants',
    'productBarcodes',
    'variantBarcodes',
    'inventory',
    'users',
] as const;

export type InitialSyncTable = typeof INITIAL_SYNC_TABLES[number];

/**
 * Mapping of onboarding step types to their associated tables
 */
export const STEP_TO_TABLES_MAP: Record<string, InitialSyncTable[]> = {
    'SUBSCRIPTION_PLANS_SYNC': ['subscriptionPlans', 'planFeatures'],
    'PAYMENT_METHODS_SYNC': ['paymentMethods'],
    'PAYMENT_PROVIDERS_SYNC': ['paymentServiceProviders'],
    'CATEGORIES_SYNC': ['categories'],
    'CUSTOMERS_SYNC': ['customers'],
    'PRODUCTS_SYNC': ['products', 'productVariants', 'productBarcodes', 'variantBarcodes'],
    'INVENTORY_SYNC': ['inventory'],
    'USERS_SYNC': ['users', 'roles', 'permissions', 'rolePermissions'],
    'SETTINGS_SYNC': ['districts'],
    'SUPPLIERS_SYNC': ['suppliers'],
} as const;

// ==========================================
// Batch Settings
// ==========================================

export const BATCH_SETTINGS = {
    DEFAULT_SIZE: 500,
    MAX_SIZE: 1000,
    MIN_SIZE: 10,
} as const;

// ==========================================
// Table ID Field Configuration
// ==========================================

/**
 * Tables with Int (autoincrement) primary keys
 */
export const INT_ID_TABLES: InitialSyncTable[] = [
    'districts',
    'roles',
    'permissions',
    'rolePermissions',
    'planFeatures',
    'paymentMethods',
    'paymentServiceProviders',
    'categories',
    'customers',
    'users',
];

/**
 * Table primary key field names
 */
export const TABLE_ID_FIELDS: Record<InitialSyncTable, string> = {
    districts: 'districtId',
    roles: 'roleId',
    permissions: 'permissionId',
    rolePermissions: 'rolePermissionId',
    subscriptionPlans: 'subscriptionPlanId',
    planFeatures: 'featureCategoryId',
    paymentMethods: 'methodId',
    paymentServiceProviders: 'providerId',
    categories: 'categoryId',
    suppliers: 'id',
    customers: 'customerId',
    products: 'id',
    productVariants: 'id',
    productBarcodes: 'id',
    variantBarcodes: 'id',
    inventory: 'id',
    users: 'userId',
};

// ==========================================
// Error Messages
// ==========================================

export const ONBOARDING_ERRORS = {
    // Validation errors
    MISSING_TENANT_ID: 'tenantId is required',
    MISSING_BRANCH_ID: 'branchId is required',
    MISSING_TERMINAL_ID: 'terminalId is required',
    MISSING_TERMINAL_DATA: 'Terminal data is required',
    MISSING_TENANT_DATA: 'tenant data is required',
    MISSING_BRANCH_DATA: 'branch data is required',
    MISSING_DATA_OBJECT: 'data object is required with master data tables',
    MISSING_STEP_TYPE: 'stepType is required',
    MISSING_ACTIVATION_CODE: 'Activation code is required',
    MISSING_TABLE_PARAM: 'table query parameter is required',

    // Array validation
    INVALID_PLANS_ARRAY: 'plans array is required',
    INVALID_PAYMENT_METHODS_ARRAY: 'paymentMethods array is required',
    INVALID_PROVIDERS_ARRAY: 'providers array is required',
    INVALID_CATEGORIES_ARRAY: 'categories array is required',
    INVALID_CUSTOMERS_ARRAY: 'customers array is required',

    // Data errors
    INVALID_TABLE: (tables: string[]) => `Invalid table. Valid tables: ${tables.join(', ')}`,
    INVALID_TABLES: (invalid: string[]) => `Invalid tables: ${invalid.join(', ')}`,
    INVALID_ACTIVATION_CODE: 'Invalid activation code',
    TERMINAL_NOT_FOUND: 'Terminal not found',
    TERMINAL_ALREADY_ACTIVATED: 'Terminal already activated',
    TERMINAL_BLOCKED: 'Terminal is blocked',
    NO_ACTIVE_SUBSCRIPTION: 'No active subscription',

    // Sync errors
    SYNC_FAILED: (entity: string, message: string) => `Failed to sync ${entity}: ${message}`,
    SAVE_FAILED: (message: string) => `Failed to save terminal details: ${message}`,
    RECORD_MISSING_ID: (entity: string) => `${entity} missing required ID field`,

    // Unknown error
    UNKNOWN_ERROR: 'Unknown error occurred',
    INTERNAL_ERROR: 'Internal server error',
} as const;

// ==========================================
// Success Messages
// ==========================================

export const ONBOARDING_MESSAGES = {
    TERMINAL_ACTIVATED: 'Terminal activated successfully',
    TERMINAL_DETAILS_SAVED: 'Terminal details saved successfully',
    SYNC_COMPLETED: (entity: string, saved: number, skipped: number, failed: number) =>
        `${entity} sync completed. Saved: ${saved}, Skipped: ${skipped}, Failed: ${failed}`,
    FETCH_COMPLETED: (entity: string, count: number) =>
        `Fetched ${count} ${entity}`,
    INITIAL_SYNC_COMPLETED: (inserted: number, skipped: number) =>
        `Initial sync completed. Inserted: ${inserted}, Skipped: ${skipped}`,
    INITIAL_SYNC_WITH_ERRORS: (inserted: number, failed: number) =>
        `Initial sync completed with errors. Inserted: ${inserted}, Failed: ${failed}`,
    STEP_SYNC_COMPLETED: (inserted: number, skipped: number) =>
        `Step sync completed. Inserted: ${inserted}, Skipped: ${skipped}`,
    STEP_SYNC_WITH_ERRORS: (inserted: number, failed: number) =>
        `Step sync completed with errors. Inserted: ${inserted}, Failed: ${failed}`,
    TABLES_RETRIEVED: 'Initial sync tables retrieved',
    COUNTS_RETRIEVED: (tableCount: number) => `Got counts for ${tableCount} tables`,
    ALL_DATA_FETCHED: (records: number, tables: number) =>
        `Fetched ${records} total records from ${tables} tables`,
} as const;

// ==========================================
// HTTP Status Codes
// ==========================================

export const HTTP_STATUS = {
    OK: 200,
    MULTI_STATUS: 207,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
} as const;

// ==========================================
// Default Values
// ==========================================

export const DEFAULTS = {
    CURRENCY_CODE: 'MWK',
    CURRENCY_SYMBOL: 'K',
    UNIT: 'piece',
    BUSINESS_TYPE: 'PRODUCT_BASED',
    STATUS: 'active',
    MRA_STATUS: 'PENDING',
    MSONKHO_STATUS: 'PENDING',
    VERIFICATION_TOKEN: 'offline',
} as const;
