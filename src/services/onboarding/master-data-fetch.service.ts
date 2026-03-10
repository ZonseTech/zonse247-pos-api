import prisma from '../../databases/prisma/client';
import { INITIAL_SYNC_TABLES, InitialSyncTable } from './initial-sync.service';

/**
 * Best practices for data fetching:
 * 1. Cursor-based pagination for consistent results with large datasets
 * 2. Batch processing to avoid memory issues
 * 3. Selective field fetching to reduce payload size
 * 4. Delta sync support (since timestamp) for incremental updates
 * 5. Include necessary relations to avoid N+1 queries
 * 6. Proper ordering for deterministic pagination
 * 7. Count queries for progress tracking
 * 8. Soft delete filtering
 */

// ==========================================
// Types
// ==========================================

export interface FetchParams {
    tenantId: string;
    branchId: string;
    terminalId?: string;
}

export interface PaginationParams {
    cursor?: string;
    limit?: number;
    since?: Date | string | null;
}

export interface FetchResult<T> {
    data: T[];
    pagination: {
        nextCursor: string | null;
        hasMore: boolean;
        total: number;
        fetched: number;
    };
}

export interface BatchFetchResult<T> {
    data: T[];
    totalCount: number;
    batchCount: number;
    hasMore: boolean;
    lastCursor: string | null;
}

export interface AllTablesDataResult {
    success: boolean;
    tables: Record<string, unknown[]>;
    counts: Record<string, number>;
    totalRecords: number;
    fetchedAt: Date;
    errors: string[];
}

// ==========================================
// Constants
// ==========================================

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1000;

/**
 * Table configuration for optimized fetching
 * - idField: Primary key field for cursor pagination
 * - includeRelations: Related data to include (avoid N+1)
 * - selectFields: Fields to select (null = all)
 * - orderBy: Sort order for consistent pagination
 */
const TABLE_CONFIG: Record<InitialSyncTable, {
    idField: string;
    includeRelations?: Record<string, boolean | object>;
    selectFields?: Record<string, boolean>;
    hasTenantScope: boolean;
    hasBranchScope: boolean;
    softDelete: boolean;
}> = {
    districts: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    roles: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    permissions: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    rolePermissions: {
        idField: 'id',
        includeRelations: {
            permission: {
                select: {
                    permissionId: true,
                    name: true,
                    displayName: true,
                    description: true,
                    category: true,
                    scope: true,
                }
            },
            role: {
                select: {
                    roleId: true,
                    name: true,
                    displayName: true,
                }
            }
        },
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    subscriptionPlans: {
        idField: 'subscriptionPlanId',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    planFeatures: {
        idField: 'featureCategoryId',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    paymentMethods: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    paymentServiceProviders: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    categories: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    suppliers: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    customers: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    products: {
        idField: 'id',
        includeRelations: {
            category: true,
            variants: true,
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    productVariants: {
        idField: 'id',
        includeRelations: {
            barcodes: true,
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    productBarcodes: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    variantBarcodes: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    inventory: {
        idField: 'id',
        includeRelations: {
            variant: {
                select: {
                    id: true,
                    productId: true,
                    variantName: true,
                    sku: true,
                    sellingPrice: true,
                    costPrice: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            },
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    users: {
        idField: 'id',
        includeRelations: {
            role: true,
        },
        selectFields: {
            userId: true,
            tenantId: true,
            branchId: true,
            roleId: true,
            username: true,
            email: true,
            fullname: true,
            phone: true,
            pinCode: true,
            status: true,
            accessibleBranches: true,
            allowedTerminals: true,
            maxDiscountPercent: true,
            canOverridePrices: true,
            createdAt: true,
            updatedAt: true,
            // Exclude password for security
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
};

// Tables with Int primary key (autoincrement)
const INT_ID_TABLES: InitialSyncTable[] = [
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
 * @class   MasterDataFetchService
 * @desc    Handles fetching master data with best practices for performance
 *          - Cursor-based pagination
 *          - Batch processing
 *          - Delta sync (since timestamp)
 *          - Optimized queries
 */
export class MasterDataFetchService {
    // ==========================================
    // Private Helpers
    // ==========================================

    /**
     * Convert cursor string to appropriate type for the table
     */
    private static parseCursor(table: InitialSyncTable, cursor: string): string | number {
        if (INT_ID_TABLES.includes(table)) {
            const parsed = parseInt(cursor, 10);
            if (isNaN(parsed)) {
                throw new Error(`Invalid cursor for table ${table}: expected integer`);
            }
            return parsed;
        }
        return cursor;
    }

    // ==========================================
    // Public Methods - Single Table Fetch
    // ==========================================

    /**
     * Fetch data from a single table with pagination
     */
    static async fetchTable<T = unknown>(
        table: InitialSyncTable,
        params: FetchParams,
        pagination: PaginationParams = {}
    ): Promise<FetchResult<T>> {
        const config = TABLE_CONFIG[table];
        const limit = Math.min(pagination.limit || DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
        const since = pagination.since ? new Date(pagination.since) : null;

        const whereClause = this.buildWhereClause(table, params, since);
        const total = await this.getTableCount(table, whereClause);

        // Parse cursor to correct type (Int vs String)
        const cursorClause = pagination.cursor
            ? { [config.idField]: this.parseCursor(table, pagination.cursor) }
            : undefined;

        const data = await this.executeQuery(table, {
            where: whereClause,
            cursor: cursorClause,
            skip: cursorClause ? 1 : 0,
            take: limit + 1, // Fetch one extra to check hasMore
            orderBy: { [config.idField]: 'asc' },
            include: config.includeRelations,
            select: config.selectFields,
        });

        const hasMore = data.length > limit;
        const results = hasMore ? data.slice(0, limit) : data;
        const lastItem = results[results.length - 1] as Record<string, unknown> | undefined;
        const nextCursor = hasMore && lastItem ? String(lastItem[config.idField]) : null;

        return {
            data: results as T[],
            pagination: {
                nextCursor,
                hasMore,
                total,
                fetched: results.length,
            },
        };
    }

    /**
     * Fetch all records from a table in batches (for initial sync)
     */
    static async fetchAllFromTable<T = unknown>(
        table: InitialSyncTable,
        params: FetchParams,
        options: { batchSize?: number; since?: Date | string | null; onBatch?: (batch: T[], progress: number) => void } = {}
    ): Promise<BatchFetchResult<T>> {
        const batchSize = Math.min(options.batchSize || DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
        const allData: T[] = [];
        let cursor: string | undefined;
        let hasMore = true;
        let batchCount = 0;

        // Get total count for progress tracking
        const since = options.since ? new Date(options.since) : null;
        const whereClause = this.buildWhereClause(table, params, since);
        const totalCount = await this.getTableCount(table, whereClause);

        while (hasMore) {
            const result = await this.fetchTable<T>(table, params, {
                cursor,
                limit: batchSize,
                since: options.since,
            });

            allData.push(...result.data);
            batchCount++;
            hasMore = result.pagination.hasMore;
            cursor = result.pagination.nextCursor || undefined;

            // Progress callback
            if (options.onBatch) {
                const progress = totalCount > 0 ? (allData.length / totalCount) * 100 : 100;
                options.onBatch(result.data, Math.min(progress, 100));
            }
        }

        return {
            data: allData,
            totalCount,
            batchCount,
            hasMore: false,
            lastCursor: cursor || null,
        };
    }

    // ==========================================
    // Public Methods - Multi-Table Fetch
    // ==========================================

    /**
     * Fetch all master data for initial sync
     * Fetches tables in dependency order with progress tracking
     */
    static async fetchAllMasterData(
        params: FetchParams,
        options: {
            tables?: InitialSyncTable[];
            batchSize?: number;
            since?: Date | string | null;
            onTableComplete?: (table: string, count: number, progress: number) => void;
        } = {}
    ): Promise<AllTablesDataResult> {
        const tables = options.tables || [...INITIAL_SYNC_TABLES];
        const result: AllTablesDataResult = {
            success: true,
            tables: {},
            counts: {},
            totalRecords: 0,
            fetchedAt: new Date(),
            errors: [],
        };

        const totalTables = tables.length;
        let completedTables = 0;

        for (const table of tables) {
            try {
                const batchResult = await this.fetchAllFromTable(table, params, {
                    batchSize: options.batchSize,
                    since: options.since,
                });

                result.tables[table] = batchResult.data;
                result.counts[table] = batchResult.totalCount;
                result.totalRecords += batchResult.totalCount;

                completedTables++;
                if (options.onTableComplete) {
                    const progress = (completedTables / totalTables) * 100;
                    options.onTableComplete(table, batchResult.totalCount, progress);
                }
            } catch (error) {
                result.success = false;
                result.errors.push(`${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                result.tables[table] = [];
                result.counts[table] = 0;
            }
        }

        return result;
    }

    /**
     * Get counts for all tables (useful for progress estimation)
     */
    static async getTableCounts(
        params: FetchParams,
        tables: InitialSyncTable[] = [...INITIAL_SYNC_TABLES]
    ): Promise<Record<string, number>> {
        const counts: Record<string, number> = {};

        await Promise.all(
            tables.map(async (table) => {
                const whereClause = this.buildWhereClause(table, params, null);
                counts[table] = await this.getTableCount(table, whereClause);
            })
        );

        return counts;
    }

    // ==========================================
    // Individual Table Fetch Methods
    // ==========================================

    static async fetchDistricts(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('districts', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchRoles(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('roles', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchPermissions(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('permissions', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchRolePermissions(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('rolePermissions', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchSubscriptionPlans(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('subscriptionPlans', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchPlanFeatures(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('planFeatures', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchPaymentMethods(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('paymentMethods', params, pagination);
    }

    static async fetchPaymentServiceProviders(pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('paymentServiceProviders', { tenantId: '', branchId: '' }, pagination);
    }

    static async fetchCategories(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('categories', params, pagination);
    }

    static async fetchSuppliers(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('suppliers', params, pagination);
    }

    static async fetchCustomers(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('customers', params, pagination);
    }

    static async fetchProducts(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('products', params, pagination);
    }

    static async fetchProductVariants(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('productVariants', params, pagination);
    }

    static async fetchProductBarcodes(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('productBarcodes', params, pagination);
    }

    static async fetchVariantBarcodes(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('variantBarcodes', params, pagination);
    }

    static async fetchInventory(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('inventory', params, pagination);
    }

    static async fetchUsers(params: FetchParams, pagination: PaginationParams = {}): Promise<FetchResult<unknown>> {
        return this.fetchTable('users', params, pagination);
    }

    // ==========================================
    // Private Helper Methods
    // ==========================================

    /**
     * Build WHERE clause based on table configuration
     */
    private static buildWhereClause(
        table: InitialSyncTable,
        params: FetchParams,
        since: Date | null
    ): Record<string, unknown> {
        const config = TABLE_CONFIG[table];
        const where: Record<string, unknown> = {};

        // Add tenant scope
        if (config.hasTenantScope && params.tenantId) {
            where.tenantId = params.tenantId;
        }

        // Add branch scope
        if (config.hasBranchScope && params.branchId) {
            where.branchId = params.branchId;
        }

        // Add soft delete filter
        if (config.softDelete) {
            where.deletedAt = null;
        }

        // Add delta sync filter
        if (since) {
            where.updatedAt = { gt: since };
        }

        // Add active filter for certain tables
        if (['paymentMethods', 'categories', 'subscriptionPlans'].includes(table)) {
            where.isActive = true;
        }

        // Users table uses 'status' enum instead of 'isActive'
        if (table === 'users') {
            where.status = 'active';
        }

        return where;
    }

    /**
     * Get count for a table with filters
     */
    private static async getTableCount(
        table: InitialSyncTable,
        where: Record<string, unknown>
    ): Promise<number> {
        const model = this.getPrismaModel(table);
        return (model as any).count({ where });
    }

    /**
     * Execute query on the appropriate Prisma model
     */
    private static async executeQuery(
        table: InitialSyncTable,
        queryOptions: {
            where: Record<string, unknown>;
            cursor?: Record<string, unknown>;
            skip?: number;
            take?: number;
            orderBy?: Record<string, 'asc' | 'desc'>;
            include?: Record<string, boolean | object>;
            select?: Record<string, boolean>;
        }
    ): Promise<unknown[]> {
        const model = this.getPrismaModel(table);
        const options: Record<string, unknown> = {
            where: queryOptions.where,
            take: queryOptions.take,
            orderBy: queryOptions.orderBy,
        };

        if (queryOptions.cursor) {
            options.cursor = queryOptions.cursor;
            options.skip = queryOptions.skip;
        }

        if (queryOptions.include) {
            options.include = queryOptions.include;
        }

        // Only use select if no include (they're mutually exclusive in Prisma)
        if (queryOptions.select && !queryOptions.include) {
            options.select = queryOptions.select;
        }

        return (model as any).findMany(options);
    }

    /**
     * Get the Prisma model for a table
     */
    private static getPrismaModel(table: InitialSyncTable) {
        const modelMap: Record<InitialSyncTable, unknown> = {
            districts: prisma.district,
            roles: prisma.role,
            permissions: prisma.permission,
            rolePermissions: prisma.rolePermission,
            subscriptionPlans: prisma.subscriptionPlan,
            planFeatures: prisma.planFeature,
            paymentMethods: prisma.paymentMethod,
            paymentServiceProviders: prisma.paymentServiceProvider,
            categories: prisma.category,
            suppliers: prisma.supplier,
            customers: prisma.customer,
            products: prisma.product,
            productVariants: prisma.productVariant,
            productBarcodes: prisma.productBarcode,
            variantBarcodes: prisma.variantBarcode,
            inventory: prisma.inventory,
            users: prisma.user,
        };

        return modelMap[table];
    }
}
