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
 * NOTE: ReturnItem.id is an autoincrement Int; the sync key is the
 * unique String `returnItemId`. The schema has no `Return` parent
 * model — `returnTransactionId` references the original Sale, so no
 * parent-existence check is performed here.
 */
export async function receiveReturnItems(
    items: SyncRecord[]
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (items.length === 0) return result;

    try {
        // Normalise: prefer `returnItemId`, fall back to `id` (terminals
        // historically used `id` to carry the UUID).
        const normalised = items.map((item) => {
            const returnItemId =
                (item.returnItemId as string | undefined) ||
                (typeof item.id === 'string' ? (item.id as string) : undefined);
            // Strip the autoincrement `id` so the DB assigns it.
            const { id: _id, ...rest } = item;
            return { ...rest, returnItemId } as Record<string, unknown> & {
                returnItemId?: string;
            };
        });

        const itemIds = normalised
            .map((i) => i.returnItemId)
            .filter((x): x is string => typeof x === 'string' && x.length > 0);

        const existingItemIds = await findExistingIds(
            prisma.returnItem,
            itemIds,
            'returnItemId'
        );

        const toInsert: Record<string, unknown>[] = [];

        for (const item of normalised) {
            if (!item.returnItemId) {
                addSyncError(result, 'unknown', 'Missing returnItemId');
                continue;
            }

            if (existingItemIds.has(item.returnItemId)) {
                result.skipped++;
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
