import {
    FetchParams,
    PaginationParams,
    PaginatedResult,
    BatchFetchResult,
    AllTablesDataResult,
    BatchFetchOptions,
    FetchAllOptions,
} from './types';
import {
    INITIAL_SYNC_TABLES,
    InitialSyncTable,
    BATCH_SETTINGS
} from './constants';
import {
    TABLE_CONFIG,
    parseCursor,
    shouldFilterByActive,
    getTableConfig,
} from './table-fetch-configs';
import { getPrismaModel } from './base-sync.service';
import { getErrorMessage } from './errors';

export type { FetchParams, PaginationParams };
export type { BatchFetchResult as BatchFetchResultType };

export interface FetchResult<T> extends PaginatedResult<T> {
    data: T[];
}

/**
 * @class   MasterDataFetchService
 * @desc    Handles fetching master data with best practices for performance
 */
export class MasterDataFetchService {
    /**
     * Fetch data from a single table with pagination
     */
    static async fetchTable<T = unknown>(
        table: InitialSyncTable,
        params: FetchParams,
        pagination: PaginationParams = {}
    ): Promise<FetchResult<T>> {
        const config = getTableConfig(table);
        const limit = Math.min(
            pagination.limit || BATCH_SETTINGS.DEFAULT_SIZE,
            BATCH_SETTINGS.MAX_SIZE
        );
        const since = pagination.since ? new Date(pagination.since) : null;

        const whereClause = this.buildWhereClause(table, params, since);
        const total = await this.getTableCount(table, whereClause);

        const cursorClause = pagination.cursor
            ? { [config.idField]: parseCursor(table, pagination.cursor) }
            : undefined;

        const data = await this.executeQuery(table, {
            where: whereClause,
            cursor: cursorClause,
            skip: cursorClause ? 1 : 0,
            take: limit + 1,
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
        options: BatchFetchOptions<T> = {}
    ): Promise<BatchFetchResult<T>> {
        const batchSize = Math.min(
            options.batchSize || BATCH_SETTINGS.DEFAULT_SIZE,
            BATCH_SETTINGS.MAX_SIZE
        );
        const allData: T[] = [];
        let cursor: string | undefined;
        let hasMore = true;
        let batchCount = 0;

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

    /**
     * Fetch all master data for initial sync
     * Fetches tables in dependency order with progress tracking
     */
    static async fetchAllMasterData(
        params: FetchParams,
        options: FetchAllOptions = {}
    ): Promise<AllTablesDataResult> {
        const tables = (options.tables || [...INITIAL_SYNC_TABLES]) as InitialSyncTable[];
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
                result.errors.push(`${table}: ${getErrorMessage(error)}`);
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

        if (config.hasTenantScope && params.tenantId) {
            where.tenantId = params.tenantId;
        }

        if (config.hasBranchScope && params.branchId) {
            where.branchId = params.branchId;
        }

        if (config.softDelete) {
            where.deletedAt = null;
        }

        if (since) {
            where.updatedAt = { gt: since };
        }

        if (shouldFilterByActive(table)) {
            where.isActive = true;
        }

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
        const model = getPrismaModel(table);
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
        const model = getPrismaModel(table);
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
}
