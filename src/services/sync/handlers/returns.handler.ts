import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import {
    createEmptySyncResult,
    finalizeSyncResult,
    findExistingIds,
    partitionRecords,
    batchInsert,
    addSyncError,
    getErrorMessage,
} from './base.handler';

type SyncRecord = Record<string, unknown> & { id: string; returnId?: string; terminalId?: string };

/**
 * Receive and upsert returns from terminal.
 *
 * OPTIMISED: bulk existence check + createMany (eliminates N+1).
 */
export async function receiveReturns(
    returns: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (returns.length === 0) return result;

    try {
        const ids = returns.map((r) => r.id);
        const existingIds = await findExistingIds(prisma.return, ids);
        const { newRecords } = partitionRecords(returns, existingIds);

        result.skipped = existingIds.size;

        const toInsert = newRecords.map((ret) => ({
            ...ret,
            terminalId: ret.terminalId || terminalId,
        }));

        result.accepted = await batchInsert(prisma.return, toInsert);
    } catch (error) {
        addSyncError(result, 'batch', getErrorMessage(error));
    }

    return finalizeSyncResult(result);
}

/**
 * Receive and upsert return items from terminal.
 *
 * OPTIMISED: 2 bulk queries (item existence + parent existence) instead of 2N.
 */
export async function receiveReturnItems(
    items: SyncRecord[]
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (items.length === 0) return result;

    try {
        const itemIds = items.map((i) => i.id);
        const parentReturnIds = [...new Set(items.map((i) => i.returnId as string).filter(Boolean))];

        const [existingItemIds, existingParentIds] = await Promise.all([
            findExistingIds(prisma.returnItem, itemIds),
            findExistingIds(prisma.return, parentReturnIds),
        ]);

        const toInsert: Record<string, unknown>[] = [];

        for (const item of items) {
            if (existingItemIds.has(item.id)) {
                result.skipped++;
                continue;
            }

            if (!existingParentIds.has(item.returnId as string)) {
                addSyncError(result, item.id, 'Parent return not found');
                continue;
            }

            toInsert.push(item);
        }

        result.accepted = await batchInsert(prisma.returnItem, toInsert);
    } catch (error) {
        addSyncError(result, 'batch', getErrorMessage(error));
    }

    return finalizeSyncResult(result);
}
