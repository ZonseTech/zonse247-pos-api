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

        case 'categories':
            return prisma.category.findMany({
                where: { ...whereBase, ...sinceFilter('updatedAt') },
                orderBy: { updatedAt: 'asc' },
                take: limit,
            });

        case 'suppliers':
            return prisma.supplier.findMany({
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

        case 'users':
            return fetchUsersForPush(whereBase, since, limit);

        case 'expenses':
            return prisma.expense.findMany({
                where: { ...whereWithTerminal, ...sinceFilter('updatedAt') },
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
 * Mark records as synced.
 *
 * IMPORTANT: We intentionally do NOT touch `updatedAt` here.
 * The old implementation set `updatedAt = now()` which caused every synced
 * record to appear "changed" in the next cycle — an infinite resync loop.
 *
 * For users we set `lastSyncedAt`; for all other tables the sync timestamp
 * is tracked on the Terminal model (`lastSyncAt`) so no per-row update is
 * needed — the SyncJobService already calls `updateLastSyncTimestamp()`.
 */
export async function markRecordsSynced(
    tableName: PushTableName,
    records: Array<{ id?: string; customerId?: string }>
): Promise<void> {
    // Only users have a dedicated lastSyncedAt column
    if (tableName === 'users') {
        const userIds = records
            .map((r: any) => r.userId || r.id)
            .filter(Boolean) as string[];

        if (userIds.length > 0) {
            await prisma.user.updateMany({
                where: { userId: { in: userIds } },
                data: { lastSyncedAt: new Date() },
            });
        }
    }

    // For all other tables: no per-row update needed.
    // The terminal's `lastSyncAt` timestamp already gates what gets fetched
    // in the next push cycle (see `fetchPendingRecords`).
}

/**
 * Fetch users with credential/profile changes for push to server
 * Only fetches users whose updatedAt or passwordChangedAt is newer than last sync
 */
async function fetchUsersForPush(
    whereBase: { tenantId: string; branchId: string },
    since: Date | null,
    limit: number
): Promise<unknown[]> {
    return prisma.user.findMany({
        where: {
            ...whereBase,
            deletedAt: null,
            ...(since && {
                OR: [
                    { updatedAt: { gt: since } },
                    { passwordChangedAt: { gt: since } },
                ],
            }),
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
            pinCode: true,
            currentBranchId: true,
            passwordChangedAt: true,
            forcePasswordChange: true,
            version: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: limit,
    });
}
