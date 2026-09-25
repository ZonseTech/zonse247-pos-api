import type { PullTableName, PushTableConfig, PushTableName } from '../types/sync.types';

export const SYNC_DEFAULTS = {
    INTERVAL_MS: 30_000,
    BATCH_SIZE: 100,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1_000,
    REQUEST_TIMEOUT_MS: 30_000,
    PULL_LIMIT: 500,
} as const;


/**
 * Tables that flow from Terminal → Server (PUSH)
 * Order matters - respects foreign key dependencies
 */
export const PUSH_TABLE_CONFIGS: readonly PushTableConfig[] = [
    { name: 'customers', endpoint: '/sync/customers', orderField: 'updatedAt' },
    { name: 'categories', endpoint: '/sync/categories', orderField: 'updatedAt' },
    { name: 'suppliers', endpoint: '/sync/suppliers', orderField: 'updatedAt' },
    { name: 'expenseCategories', endpoint: '/sync/expense-categories', orderField: 'updatedAt' },
    { name: 'sales', endpoint: '/sync/sales', orderField: 'updatedAt' },
    { name: 'saleItems', endpoint: '/sync/sale-items', orderField: 'updatedAt', parentTable: 'sales' },
    { name: 'salePayments', endpoint: '/sync/sale-payments', orderField: 'updatedAt', parentTable: 'sales' },
    { name: 'returns', endpoint: '/sync/returns', orderField: 'updatedAt' },
    { name: 'returnItems', endpoint: '/sync/return-items', orderField: 'updatedAt', parentTable: 'returns' },
    { name: 'stockMovements', endpoint: '/sync/stock-movements', orderField: 'createdAt' },
    { name: 'orders', endpoint: '/sync/orders', orderField: 'updatedAt' },
    { name: 'users', endpoint: '/sync/users', orderField: 'updatedAt' },
    { name: 'expenses', endpoint: '/sync/expenses', orderField: 'updatedAt' },
] as const;

/**
 * Tables that flow from Server → Terminal (PULL)
 * Order matters - respects foreign key dependencies
 */
export const PULL_TABLE_NAMES: readonly PullTableName[] = [
    'tenants',
    'branchSubscriptions',
    'branches',
    'roles',
    'permissions',
    'rolePermissions',
    'categories',
    'products',
    'productVariants',
    'inventory',
    'paymentMethods',
    'paymentServiceProviders',
    'stockMovements',
    'customers',
    'suppliers',
    'users',
    'expenseCategories',
    'expenses',
] as const;

/**
 * Valid table names for pull validation
 */
export const VALID_PULL_TABLES = new Set<PullTableName>(PULL_TABLE_NAMES);

/**
 * Multipliers for batch sizes per table type
 * Higher multipliers mean more records fetched per sync
 */
export const BATCH_MULTIPLIERS: Record<PushTableName, number> = {
    sales: 5,
    saleItems: 10,
    salePayments: 5,
    returns: 2,
    returnItems: 5,
    stockMovements: 10,
    customers: 2,
    categories: 2,
    suppliers: 2,
    orders: 2,
    users: 1,
    expenseCategories: 2,
    expenses: 2,
} as const;

export const SYNC_HEADERS = {
    TERMINAL_ID: 'x-terminal-id',
    TENANT_ID: 'x-tenant-id',
    BRANCH_ID: 'x-branch-id',
    CLIENT_TYPE: 'x-client-type',
} as const;

export const LOG_PREFIX = {
    JOB: '[SyncJob]',
    RECEIVER: '[SyncReceiver]',
    CONTROLLER: '[Sync]',
} as const;
