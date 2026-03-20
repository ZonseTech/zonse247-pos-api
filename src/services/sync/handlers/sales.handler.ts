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

type SyncRecord = Record<string, unknown> & { id: string; saleId?: string; terminalId?: string };

/**
 * Receive and upsert sales from terminal.
 *
 * OPTIMISED: single bulk existence check + createMany with skipDuplicates
 * instead of per-record findUnique + create (eliminates N+1).
 */
export async function receiveSales(
    sales: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (sales.length === 0) return result;

    try {
        const ids = sales.map((s) => s.id);
        const existingIds = await findExistingIds(prisma.sale, ids);
        const { newRecords } = partitionRecords(sales, existingIds);

        result.skipped = existingIds.size;

        // Normalise terminalId on all new records before bulk insert
        const toInsert = newRecords.map((sale) => ({
            ...sale,
            terminalId: sale.terminalId || terminalId,
        }));

        result.accepted = await batchInsert(prisma.sale, toInsert);
    } catch (error) {
        addSyncError(result, 'batch', getErrorMessage(error));
    }

    return finalizeSyncResult(result);
}

/**
 * Receive and upsert sale items from terminal.
 *
 * OPTIMISED: bulk existence check for items AND parent sales,
 * then createMany for all valid new items.
 */
export async function receiveSaleItems(
    items: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (items.length === 0) return result;

    try {
        // Bulk existence checks — 2 queries instead of 2N
        const itemIds = items.map((i) => i.id);
        const parentSaleIds = [...new Set(items.map((i) => i.saleId as string).filter(Boolean))];

        const [existingItemIds, existingParentIds] = await Promise.all([
            findExistingIds(prisma.saleItem, itemIds),
            findExistingIds(prisma.sale, parentSaleIds),
        ]);

        const toInsert: Record<string, unknown>[] = [];

        for (const item of items) {
            if (existingItemIds.has(item.id)) {
                result.skipped++;
                continue;
            }

            if (!existingParentIds.has(item.saleId as string)) {
                addSyncError(result, item.id, 'Parent sale not found');
                continue;
            }

            toInsert.push({
                ...item,
                terminalId: item.terminalId || terminalId,
            });
        }

        result.accepted = await batchInsert(prisma.saleItem, toInsert);
    } catch (error) {
        addSyncError(result, 'batch', getErrorMessage(error));
    }

    return finalizeSyncResult(result);
}

/**
 * Receive and upsert sale payments from terminal.
 *
 * OPTIMISED: same bulk pattern — 2 queries total instead of 2N.
 */
export async function receiveSalePayments(
    payments: SyncRecord[]
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (payments.length === 0) return result;

    try {
        const paymentIds = payments.map((p) => p.id);
        const parentSaleIds = [...new Set(payments.map((p) => p.saleId as string).filter(Boolean))];

        const [existingPaymentIds, existingParentIds] = await Promise.all([
            findExistingIds(prisma.salePayment, paymentIds),
            findExistingIds(prisma.sale, parentSaleIds),
        ]);

        const toInsert: Record<string, unknown>[] = [];

        for (const payment of payments) {
            if (existingPaymentIds.has(payment.id)) {
                result.skipped++;
                continue;
            }

            if (!existingParentIds.has(payment.saleId as string)) {
                addSyncError(result, payment.id, 'Parent sale not found');
                continue;
            }

            toInsert.push(payment);
        }

        result.accepted = await batchInsert(prisma.salePayment, toInsert);
    } catch (error) {
        addSyncError(result, 'batch', getErrorMessage(error));
    }

    return finalizeSyncResult(result);
}
