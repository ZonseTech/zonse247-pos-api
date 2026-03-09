import prisma from '../../../databases/prisma/client';
import type { PushTableName } from '../types/sync.types';
import { BATCH_MULTIPLIERS, } from '../constants/sync.constants';

interface FetchContext {
    tenantId: string;
    branchId: string;
    terminalId: string;
    batchSize: number;
}

/**
 * Fetch records pending sync from local database
 */
export async function fetchPendingRecords(
    tableName: PushTableName,
    ctx: FetchContext,
    since: Date | null
): Promise<unknown[]> {
    const { tenantId, branchId, terminalId, batchSize } = ctx;
    const whereBase = { tenantId, branchId };
    const whereWithTerminal = { ...whereBase, terminalId };
    const multiplier = BATCH_MULTIPLIERS[tableName];
    const limit = batchSize * multiplier;

    const sinceFilter = (field: 'updatedAt' | 'createdAt') =>
        since ? { [field]: { gt: since } } : {};

    switch (tableName) {
        case 'sales':
            return prisma.sale.findMany({
                where: { ...whereWithTerminal, ...sinceFilter('updatedAt') },
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'saleItems':
            return prisma.saleItem.findMany({
                where: { ...whereBase, terminalId, ...sinceFilter('updatedAt') },
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'salePayments':
            return prisma.salePayment.findMany({
                where: { ...whereBase, ...sinceFilter('updatedAt') },
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'returns':
            return prisma.return.findMany({
                where: { ...whereWithTerminal, ...sinceFilter('updatedAt') },
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'returnItems':
            return prisma.returnItem.findMany({
                where: sinceFilter('updatedAt'),
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'stockMovements':
            return fetchStockMovementsWithInventory(whereBase, terminalId, since, limit);

        case 'customers':
            return prisma.customer.findMany({
                where: { ...whereBase, ...sinceFilter('updatedAt') },
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'orders':
            return prisma.order.findMany({
                where: sinceFilter('updatedAt'),
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        default:
            return [];
    }
}

/**
 * Fetch stock movements with inventory relation data
 */
async function fetchStockMovementsWithInventory(
    whereBase: { tenantId: string; branchId: string },
    terminalId: string,
    since: Date | null,
    limit: number
): Promise<unknown[]> {
    const movements = await prisma.stockMovement.findMany({
        where: {
            ...whereBase,
            terminalId,
            ...(since && { createdAt: { gt: since } }),
        },
        include: {
            inventory: {
                select: { variantId: true, productId: true },
            },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });

    return movements.map((m) => ({
        ...m,
        variantId: m.inventory?.variantId,
        productId: m.inventory?.productId,
        inventory: undefined,
    }));
}

/**
 * Mark records as synced by updating their timestamp
 */
export async function markRecordsSynced(
    tableName: PushTableName,
    records: Array<{ id?: string; customerId?: string }>
): Promise<void> {
    const ids = records.map((r) => r.id).filter(Boolean) as string[];
    const now = new Date();

    switch (tableName) {
        case 'sales':
            await prisma.sale.updateMany({
                where: { id: { in: ids } },
                data: { updatedAt: now },
            });
            break;

        case 'saleItems':
            await prisma.saleItem.updateMany({
                where: { id: { in: ids } },
                data: { updatedAt: now },
            });
            break;

        case 'salePayments':
            await prisma.salePayment.updateMany({
                where: { id: { in: ids } },
                data: { updatedAt: now },
            });
            break;

        case 'returns':
            await prisma.return.updateMany({
                where: { id: { in: ids } },
                data: { updatedAt: now },
            });
            break;

        case 'returnItems':
            await prisma.returnItem.updateMany({
                where: { id: { in: ids } },
                data: { updatedAt: now },
            });
            break;

        case 'customers': {
            const customerIds = records
                .map((r) => r.customerId || r.id)
                .filter(Boolean) as string[];
            await prisma.customer.updateMany({
                where: { customerId: { in: customerIds } },
                data: { updatedAt: now },
            });
            break;
        }

        case 'orders':
            await prisma.order.updateMany({
                where: { id: { in: ids } },
                data: { updatedAt: now },
            });
            break;
    }
}
