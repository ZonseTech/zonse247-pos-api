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
            products,
            productVariants,
            categories,
            inventory,
            paymentMethods,
            stockMovements,
            customers,
        ] = await Promise.all([
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
            fetchIfIncluded(tables, 'stockMovements', () =>
                fetchStockMovements(whereBase, sinceFilter, terminalId, limit)
            ),
            fetchIfIncluded(tables, 'customers', () =>
                fetchCustomers(whereBase, sinceFilter, limit)
            ),
        ]);

        result.data = {
            products,
            productVariants,
            categories,
            inventory,
            paymentMethods,
            stockMovements,
            customers,
        };

        result.counts = {
            products: products.length,
            productVariants: productVariants.length,
            categories: categories.length,
            inventory: inventory.length,
            paymentMethods: paymentMethods.length,
            stockMovements: stockMovements.length,
            customers: customers.length,
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
        case 'stockMovements':
            records = await fetchStockMovements(whereBase, sinceFilter, terminalId, fetchLimit);
            break;
        case 'customers':
            records = await fetchCustomers(whereBase, sinceFilter, fetchLimit);
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
            products: [],
            productVariants: [],
            categories: [],
            inventory: [],
            paymentMethods: [],
            stockMovements: [],
            customers: [],
        },
        counts: {
            products: 0,
            productVariants: 0,
            categories: 0,
            inventory: 0,
            paymentMethods: 0,
            stockMovements: 0,
            customers: 0,
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
