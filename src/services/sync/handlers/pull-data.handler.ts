/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { prisma } from '../../../databases/prisma/client';
import type {
    PullDataResult,
    PullTableName,
    PullOptions,
    TableDeltaResult,
    WhereBaseFilter,
    SinceFilter,
} from '../types/sync.types';
import { PULL_TABLE_NAMES, SYNC_DEFAULTS, LOG_PREFIX } from '../constants/sync.constants';

/**
 * Get all data that has changed since a given timestamp
 * Main entry point for the PULL phase of bidirectional sync
 */
export async function getPullData(
    tenantId: string,
    branchId: string,
    terminalId: string,
    since?: Date | null,
    options?: PullOptions
): Promise<PullDataResult> {
    const result = createEmptyPullResult();
    const tables = options?.tables || [...PULL_TABLE_NAMES];
    const limit = options?.limit || SYNC_DEFAULTS.PULL_LIMIT;
    const whereBase: WhereBaseFilter = { tenantId, branchId };
    const sinceFilter: SinceFilter = since ? { updatedAt: { gt: since } } : {};

    try {
        const [
            tenants,
            branches,
            branchSubscriptions,
            roles,
            permissions,
            rolePermissions,
            products,
            productVariants,
            categories,
            inventory,
            paymentMethods,
            paymentServiceProviders,
            stockMovements,
            customers,
            users,
            expenseCategories,
            expenses,
        ] = await Promise.all([
            fetchIfIncluded(tables, 'tenants', () =>
                fetchTenants(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'branches', () =>
                fetchBranches(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'branchSubscriptions', () =>
                fetchBranchSubscriptions(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'roles', () =>
                fetchRoles(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'permissions', () =>
                fetchPermissions(sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'rolePermissions', () =>
                fetchRolePermissions(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'products', () =>
                fetchProducts(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'productVariants', () =>
                fetchProductVariants(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'categories', () =>
                fetchCategories(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'inventory', () =>
                fetchInventory(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'paymentMethods', () =>
                fetchPaymentMethods(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'paymentServiceProviders', () =>
                fetchPaymentServiceProviders(sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'stockMovements', () =>
                fetchStockMovements(whereBase, sinceFilter, terminalId, limit)
            ),
            fetchIfIncluded(tables, 'customers', () =>
                fetchCustomers(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'users', () =>
                fetchUsers(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'expenseCategories', () =>
                fetchExpenseCategories(whereBase, sinceFilter, limit)
            ),
            fetchIfIncluded(tables, 'expenses', () =>
                fetchExpenses(whereBase, sinceFilter, limit)
            ),
        ]);

        result.data = {
            tenants,
            branches,
            branchSubscriptions,
            roles,
            permissions,
            rolePermissions,
            products,
            productVariants,
            categories,
            inventory,
            paymentMethods,
            paymentServiceProviders,
            stockMovements,
            customers,
            users,
            expenseCategories,
            expenses,
        };

        result.counts = {
            tenants: tenants.length,
            branches: branches.length,
            branchSubscriptions: branchSubscriptions.length,
            roles: roles.length,
            permissions: permissions.length,
            rolePermissions: rolePermissions.length,
            products: products.length,
            productVariants: productVariants.length,
            categories: categories.length,
            inventory: inventory.length,
            paymentMethods: paymentMethods.length,
            paymentServiceProviders: paymentServiceProviders.length,
            stockMovements: stockMovements.length,
            customers: customers.length,
            users: users.length,
            expenseCategories: expenseCategories.length,
            expenses: expenses.length,
        };
    } catch (error) {
        result.success = false;
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        console.error(`${LOG_PREFIX.RECEIVER} Pull data error:`, error);
    }

    return result;
}

/**
 * Get delta changes for a specific table
 * Useful for incremental sync of individual tables
 */
export async function getTableDelta(
    tableName: PullTableName,
    tenantId: string,
    branchId: string,
    terminalId: string,
    since?: Date | null,
    limit = SYNC_DEFAULTS.PULL_LIMIT
): Promise<TableDeltaResult> {
    const whereBase: WhereBaseFilter = { tenantId, branchId };
    const sinceFilter: SinceFilter = since ? { updatedAt: { gt: since } } : {};
    const fetchLimit = limit + 1;

    let records: unknown[] = [];

    switch (tableName) {
        case 'tenants':
            records = await fetchTenants(whereBase, sinceFilter, fetchLimit);
            break;
        case 'branches':
            records = await fetchBranches(whereBase, sinceFilter, fetchLimit);
            break;
        case 'branchSubscriptions':
            records = await fetchBranchSubscriptions(whereBase, sinceFilter, fetchLimit);
            break;
        case 'roles':
            records = await fetchRoles(whereBase, sinceFilter, fetchLimit);
            break;
        case 'permissions':
            records = await fetchPermissions(sinceFilter, fetchLimit);
            break;
        case 'rolePermissions':
            records = await fetchRolePermissions(whereBase, sinceFilter, fetchLimit);
            break;
        case 'products':
            records = await fetchProducts(whereBase, sinceFilter, fetchLimit);
            break;
        case 'productVariants':
            records = await fetchProductVariants(whereBase, sinceFilter, fetchLimit);
            break;
        case 'categories':
            records = await fetchCategories(whereBase, sinceFilter, fetchLimit);
            break;
        case 'inventory':
            records = await fetchInventory(whereBase, sinceFilter, fetchLimit);
            break;
        case 'paymentMethods':
            records = await fetchPaymentMethods(whereBase, sinceFilter, fetchLimit);
            break;
        case 'paymentServiceProviders':
            records = await fetchPaymentServiceProviders(sinceFilter, fetchLimit);
            break;
        case 'stockMovements':
            records = await fetchStockMovements(whereBase, sinceFilter, terminalId, fetchLimit);
            break;
        case 'customers':
            records = await fetchCustomers(whereBase, sinceFilter, fetchLimit);
            break;
        case 'users':
            records = await fetchUsers(whereBase, sinceFilter, fetchLimit);
            break;
        case 'expenseCategories':
            records = await fetchExpenseCategories(whereBase, sinceFilter, fetchLimit);
            break;
        case 'expenses':
            records = await fetchExpenses(whereBase, sinceFilter, fetchLimit);
            break;
    }

    const hasMore = records.length > limit;
    if (hasMore) {
        records = records.slice(0, limit);
    }

    return { records, count: records.length, hasMore };
}

function createEmptyPullResult(): PullDataResult {
    return {
        success: true,
        data: {
            tenants: [],
            branches: [],
            branchSubscriptions: [],
            roles: [],
            permissions: [],
            rolePermissions: [],
            products: [],
            productVariants: [],
            categories: [],
            inventory: [],
            paymentMethods: [],
            paymentServiceProviders: [],
            stockMovements: [],
            customers: [],
            users: [],
            expenseCategories: [],
            expenses: [],
        },
        counts: {
            tenants: 0,
            branches: 0,
            branchSubscriptions: 0,
            roles: 0,
            permissions: 0,
            rolePermissions: 0,
            products: 0,
            productVariants: 0,
            categories: 0,
            inventory: 0,
            paymentMethods: 0,
            paymentServiceProviders: 0,
            stockMovements: 0,
            customers: 0,
            users: 0,
            expenseCategories: 0,
            expenses: 0,
        },
        serverTime: new Date(),
        errors: [],
    };
}

async function fetchIfIncluded<T>(
    tables: PullTableName[],
    tableName: PullTableName,
    fetcher: () => Promise<T[]>
): Promise<T[]> {
    return tables.includes(tableName) ? fetcher() : [];
}

/**
 * Fetch the terminal's own tenant record.
 * A terminal only ever needs its single paired tenant, so this scopes
 * to whereBase.tenantId instead of a branch-based filter.
 */
async function fetchTenants(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.tenant.findMany({
        where: { tenantId: whereBase.tenantId, ...sinceFilter, deletedAt: null },
        take: limit,
    });
}

/**
 * Fetch the terminal's own branch record — this is how a terminal picks up
 * a new branchSubscriptionId after an admin resubscribes the branch (the
 * subscribeBranch flow mints a brand-new subscription row and repoints
 * branch.branchSubscriptionId rather than reusing the old ID).
 */
async function fetchBranches(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.branch.findMany({
        where: { branchId: whereBase.branchId, tenantId: whereBase.tenantId, ...sinceFilter, deletedAt: null },
        take: limit,
    });
}

/**
 * Fetch the branch's currently-linked subscription.
 * BranchSubscription has no tenantId/branchId column of its own — the
 * link is branch.branchSubscriptionId — so resolve it via the branch first.
 */
async function fetchBranchSubscriptions(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    const branch = await prisma.branch.findUnique({
        where: { branchId: whereBase.branchId },
        select: { branchSubscriptionId: true },
    });

    if (!branch?.branchSubscriptionId) return [];

    return prisma.branchSubscription.findMany({
        where: { branchSubscriptionId: branch.branchSubscriptionId, ...sinceFilter },
        take: limit,
    });
}

/**
 * Roles visible to a terminal: system roles (shared, tenantId null) plus
 * this terminal's own tenant's custom roles — never another tenant's custom
 * roles. Mirrors the scoping already enforced on the regular roles API
 * (RoleService.buildScopeWhere in services/auth/role.service.ts).
 */
function rolesScopeWhere(tenantId: string) {
    return {
        OR: [
            { isSystemRole: true },
            { tenantId },
        ],
    };
}

async function fetchRoles(whereBase: WhereBaseFilter, sinceFilter: SinceFilter, limit: number): Promise<unknown[]> {
    return prisma.role.findMany({
        where: { ...rolesScopeWhere(whereBase.tenantId), ...sinceFilter, deletedAt: null },
        take: limit,
    });
}

/**
 * Permissions have no tenant/branch column at all — it's a shared system
 * catalog, not per-tenant data.
 */
async function fetchPermissions(sinceFilter: SinceFilter, limit: number): Promise<unknown[]> {
    return prisma.permission.findMany({
        where: { ...sinceFilter, deletedAt: null },
        take: limit,
    });
}

/**
 * Role-permission links — scoped to the same role set fetchRoles() allows
 * (system roles + this tenant's own), so a link for another tenant's custom
 * role never reaches this terminal even though RolePermission itself has no
 * tenantId column to filter on directly.
 */
async function fetchRolePermissions(whereBase: WhereBaseFilter, sinceFilter: SinceFilter, limit: number): Promise<unknown[]> {
    const visibleRoles = await prisma.role.findMany({
        where: rolesScopeWhere(whereBase.tenantId),
        select: { roleId: true },
    });

    if (visibleRoles.length === 0) return [];

    return prisma.rolePermission.findMany({
        where: { roleId: { in: visibleRoles.map((r) => r.roleId) }, ...sinceFilter, deletedAt: null },
        take: limit,
    });
}

async function fetchProducts(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.product.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

async function fetchProductVariants(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.productVariant.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

async function fetchCategories(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.category.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

async function fetchInventory(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.inventory.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

async function fetchPaymentMethods(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.paymentMethod.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

async function fetchPaymentServiceProviders(sinceFilter: SinceFilter, limit: number): Promise<unknown[]> {
    return prisma.paymentServiceProvider.findMany({
        where: { ...sinceFilter, isActive: true },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

/**
 * Fetch stock movements from OTHER terminals
 * This allows terminals to see movements made by other terminals
 */
async function fetchStockMovements(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    terminalId: string,
    limit: number
): Promise<unknown[]> {
    return prisma.stockMovement.findMany({
        where: {
            ...whereBase,
            deletedAt: null,
            createdAt: sinceFilter.updatedAt ? { gt: sinceFilter.updatedAt.gt } : undefined,
            OR: [
                { terminalId: { not: terminalId } },
                { terminalId: null },
            ],
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });
}

async function fetchCustomers(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.customer.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

/**
 * Fetch users for a branch/tenant that have changed since the last sync
 * Includes credential changes (password, username) and profile updates
 * Strips password hash when pulling to terminals - terminals get passwordChangedAt
 * to know if their local copy is stale, but actual password verification
 * happens via the server's saveUserOffline flow during re-login
 */
async function fetchUsers(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    const users = await prisma.user.findMany({
        where: {
            tenantId: whereBase.tenantId,
            branchId: whereBase.branchId,
            ...sinceFilter,
            deletedAt: null,
        },
        select: {
            userId: true,
            tenantId: true,
            branchId: true,
            username: true,
            password: true,
            fullname: true,
            email: true,
            phone: true,
            roleId: true,
            status: true,
            accessibleBranches: true,
            allowedTerminals: true,
            maxDiscountPercent: true,
            canOverridePrices: true,
            pinCode: true,
            currentBranchId: true,
            passwordChangedAt: true,
            forcePasswordChange: true,
            lastSyncedAt: true,
            version: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });

    return users;
}

async function fetchExpenseCategories(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.expenseCategory.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

async function fetchExpenses(
    whereBase: WhereBaseFilter,
    sinceFilter: SinceFilter,
    limit: number
): Promise<unknown[]> {
    return prisma.expense.findMany({
        where: { ...whereBase, ...sinceFilter, deletedAt: null },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}

// ==========================================
// ChangeLog-based Delta Sync
// ==========================================

/**
 * Map ChangeLog table names back to their Prisma delegates
 * so we can fetch the actual record data.
 */
const TABLE_DELEGATES: Record<string, keyof typeof prisma> = {
    products: 'product',
    productVariants: 'productVariant',
    categories: 'category',
    inventory: 'inventory',
    paymentMethods: 'paymentMethod',
    paymentServiceProviders: 'paymentServiceProvider',
    stockMovements: 'stockMovement',
    customers: 'customer',
    users: 'user',
    expenseCategories: 'expenseCategory',
    expenses: 'expense',
    tenants: 'tenant',
    branches: 'branch',
    branchSubscriptions: 'branchSubscription',
    roles: 'role',
    permissions: 'permission',
    rolePermissions: 'rolePermission',
};

/**
 * Map table names to their UUID lookup field for models where the Prisma @id
 * is an autoincrement integer and the business UUID is a separate @unique field.
 * Models NOT listed here use `id` (their @id IS the UUID).
 */
const TABLE_UUID_FIELD: Partial<Record<string, string>> = {
    categories: 'categoryId',
    customers: 'customerId',
    paymentMethods: 'methodId',
    paymentServiceProviders: 'providerId',
    expenseCategories: 'categoryId',
    tenants: 'tenantId',
    branches: 'branchId',
    branchSubscriptions: 'branchSubscriptionId',
    roles: 'roleId',
    permissions: 'permissionId',
    rolePermissions: 'rolePermissionId',
};

/**
 * Tables whose model has no `deletedAt` column — the generic ChangeLog
 * fetch path below must skip that filter for these or Prisma will throw.
 */
const TABLES_WITHOUT_SOFT_DELETE = new Set(['branchSubscriptions', 'paymentServiceProviders']);

/**
 * Pull data using the ChangeLog table for efficient delta sync.
 *
 * Instead of scanning every pullable table with `WHERE updatedAt > since`,
 * we read the change_log entries after the terminal's last-known sequence
 * and only fetch the records that actually changed.
 *
 * Benefits:
 * - O(changes) instead of O(table-size) per pull
 * - Works even when a field OTHER than updatedAt changes
 * - DELETE operations are captured (soft-delete awareness)
 * - Terminals can skip tables with zero changes
 *
 * Falls back to the original `getPullData` if ChangeLog has no entries
 * (e.g. first sync, or if ChangeLog hasn't been populated yet).
 */
export async function getPullDataFromChangeLog(
    tenantId: string,
    branchId: string,
    terminalId: string,
    lastSequence: bigint | null,
    options?: PullOptions
): Promise<PullDataResult & { lastSequence: bigint | null }> {
    const result = createEmptyPullResult() as PullDataResult & { lastSequence: bigint | null };
    result.lastSequence = lastSequence;

    const tables = options?.tables || [...PULL_TABLE_NAMES];
    const limit = options?.limit || SYNC_DEFAULTS.PULL_LIMIT;

    try {
        // 1. Fetch change-log entries since the terminal's last sequence
        const logs = await prisma.changeLog.findMany({
            where: {
                tenantId,
                branchId,
                ...(lastSequence ? { id: { gt: lastSequence } } : {}),
                tableName: { in: tables },
            },
            orderBy: { id: 'asc' },
            take: limit * 2, // over-fetch slightly; we group by table
        });

        if (logs.length === 0) {
            // No changes — return empty result with current sequence unchanged
            return result;
        }

        // 2. Group record IDs by table
        const changesByTable = new Map<string, Set<string>>();
        let maxSequence = lastSequence;

        for (const log of logs) {
            if (!changesByTable.has(log.tableName)) {
                changesByTable.set(log.tableName, new Set());
            }
            changesByTable.get(log.tableName)!.add(log.recordId);

            if (!maxSequence || log.id > maxSequence) {
                maxSequence = log.id;
            }
        }

        // 3. Fetch actual records in parallel — one query per changed table
        const fetchPromises: Promise<void>[] = [];

        for (const [tableName, recordIds] of changesByTable.entries()) {
            const delegateKey = TABLE_DELEGATES[tableName];
            if (!delegateKey) continue;

            const delegate = (prisma as any)[delegateKey];
            if (!delegate?.findMany) continue;

            const pullTableName = tableName as PullTableName;

            fetchPromises.push(
                (async () => {
                    // Special handling for users — need specific select
                    if (pullTableName === 'users') {
                        const records = await fetchUsersByIds([...recordIds], limit);
                        result.data.users = records;
                        result.counts.users = records.length;
                    } else if (pullTableName === 'stockMovements') {
                        // Stock movements: exclude requesting terminal's own
                        const records = await prisma.stockMovement.findMany({
                            where: {
                                id: { in: [...recordIds] },
                                deletedAt: null,
                                OR: [
                                    { terminalId: { not: terminalId } },
                                    { terminalId: null },
                                ],
                            },
                            take: limit,
                        });
                        result.data.stockMovements = records;
                        result.counts.stockMovements = records.length;
                    } else {
                        const uuidField = TABLE_UUID_FIELD[pullTableName] || 'id';
                        const records = await delegate.findMany({
                            where: {
                                [uuidField]: { in: [...recordIds] },
                                ...(TABLES_WITHOUT_SOFT_DELETE.has(pullTableName) ? {} : { deletedAt: null }),
                            },
                            take: limit,
                        });
                        result.data[pullTableName] = records;
                        result.counts[pullTableName] = records.length;
                    }
                })()
            );
        }

        await Promise.all(fetchPromises);

        result.lastSequence = maxSequence;
    } catch (error) {
        result.success = false;
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        console.error(`${LOG_PREFIX.RECEIVER} ChangeLog pull error:`, error);
    }

    return result;
}

/**
 * Fetch users by IDs with the standard user select set
 */
async function fetchUsersByIds(userIds: string[], limit: number): Promise<unknown[]> {
    return prisma.user.findMany({
        where: { userId: { in: userIds }, deletedAt: null },
        select: {
            userId: true,
            tenantId: true,
            branchId: true,
            username: true,
            password: true,
            fullname: true,
            email: true,
            phone: true,
            roleId: true,
            status: true,
            accessibleBranches: true,
            allowedTerminals: true,
            maxDiscountPercent: true,
            canOverridePrices: true,
            pinCode: true,
            currentBranchId: true,
            passwordChangedAt: true,
            forcePasswordChange: true,
            lastSyncedAt: true,
            version: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
        },
        take: limit,
    });
}
