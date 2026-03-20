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

type SyncRecord = Record<string, unknown> & { id: string };

/**
 * Receive and upsert orders from terminal.
 *
 * OPTIMISED: single bulk existence check + createMany (eliminates N+1).
 */
export async function receiveOrders(
    orders: SyncRecord[]
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (orders.length === 0) return result;

    try {
        const ids = orders.map((o) => o.id);
        const existingIds = await findExistingIds(prisma.order, ids);
        const { newRecords } = partitionRecords(orders, existingIds);

        result.skipped = existingIds.size;
        result.accepted = await batchInsert(prisma.order, newRecords);
    } catch (error) {
        addSyncError(result, 'batch', getErrorMessage(error));
    }

    return finalizeSyncResult(result);
}
