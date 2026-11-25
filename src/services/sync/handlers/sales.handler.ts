import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import {
    createEmptySyncResult,
    finalizeSyncResult,
    findExistingIds,
    batchInsert,
    addSyncError,
    getErrorMessage,
    isNewerRecord,
    normalizeRecordForCreateMany,
} from './base.handler';

type SyncRecord = Record<string, unknown> & { id: string; saleId?: string; terminalId?: string };

/** Fields a terminal may change on a sale after it was first synced (refund, void, delete). */
const SALE_STATUS_FIELDS = ['status', 'notes', 'isVoided', 'voidedAt', 'voidedBy', 'voidReason', 'deletedAt'] as const;

const saleNumberKey = (tenantId: unknown, branchId: unknown, saleNumber: unknown) =>
    `${tenantId}|${branchId}|${saleNumber}`;

/**
 * Suffix that makes a terminal's sale number unique in its branch when
 * another terminal (or the web portal) already used the number. Terminals
 * number sales from their own database only, so this happens whenever two
 * of them sell in the same branch on the same day.
 */
async function terminalSuffix(terminalId: string): Promise<string> {
    try {
        const terminal = await prisma.terminal.findUnique({
            where: { terminalId },
            select: { terminalCode: true },
        });
        if (terminal?.terminalCode) return terminal.terminalCode;
    } catch {
        // Fall back to the terminal id below
    }
    return terminalId.replace(/-/g, '').slice(0, 8).toUpperCase() || 'T';
}

/**
 * Store sale numbers another sale of the branch already uses under
 * `<number>-<terminal code>`, so the sale is kept instead of being dropped
 * by the unique (tenant, branch, sale_number) key.
 */
async function resolveSaleNumberClashes(records: SyncRecord[], terminalId: string): Promise<SyncRecord[]> {
    const numbers = [...new Set(records.map((r) => r.saleNumber).filter((n): n is string => typeof n === 'string'))];
    if (numbers.length === 0) return records;

    const used = await prisma.sale.findMany({
        where: { saleNumber: { in: numbers } },
        select: { id: true, tenantId: true, branchId: true, saleNumber: true },
    });
    const taken = new Set<string>(used.map((s: any) => saleNumberKey(s.tenantId, s.branchId, s.saleNumber)));

    const isTaken = async (record: SyncRecord, saleNumber: string): Promise<boolean> => {
        const key = saleNumberKey(record.tenantId, record.branchId, saleNumber);
        if (taken.has(key)) return true;
        const found = await prisma.sale.findMany({
            where: { saleNumber: { in: [saleNumber] } },
            select: { tenantId: true, branchId: true },
        });
        if (found.some((s: any) => s.tenantId === record.tenantId && s.branchId === record.branchId)) {
            taken.add(key);
            return true;
        }
        return false;
    };

    let suffix: string | null = null;
    const resolved: SyncRecord[] = [];
    for (const record of records) {
        const original = record.saleNumber;
        if (typeof original !== 'string' || !taken.has(saleNumberKey(record.tenantId, record.branchId, original))) {
            if (typeof original === 'string') taken.add(saleNumberKey(record.tenantId, record.branchId, original));
            resolved.push(record);
            continue;
        }

        suffix ??= await terminalSuffix((record.terminalId as string) || terminalId);
        let candidate = `${original}-${suffix}`;
        for (let n = 2; await isTaken(record, candidate); n++) {
            candidate = `${original}-${suffix}-${n}`;
        }
        taken.add(saleNumberKey(record.tenantId, record.branchId, candidate));

        const note = `[Sale number ${original} was already used in this branch; stored as ${candidate}]`;
        resolved.push({
            ...record,
            saleNumber: candidate,
            notes: typeof record.notes === 'string' && record.notes ? `${record.notes} ${note}` : note,
        });
    }
    return resolved;
}

/**
 * Apply refunds, voids and deletions the terminal made after the sale was
 * first synced. Returns true when the stored sale was updated.
 */
async function applySaleStatusChange(incoming: SyncRecord, stored: { id: string; updatedAt?: Date | null }): Promise<boolean> {
    if (!isNewerRecord(incoming as { updatedAt?: string }, stored)) return false;

    const changes: Record<string, unknown> = {};
    for (const field of SALE_STATUS_FIELDS) {
        if (field in incoming) changes[field] = incoming[field];
    }
    if (Object.keys(changes).length === 0) return false;

    await prisma.sale.update({
        where: { id: stored.id },
        data: normalizeRecordForCreateMany({ ...changes, updatedAt: incoming.updatedAt }),
    });
    return true;
}

/**
 * Receive sales from a terminal.
 *
 * Every sale sent is accounted for: stored (accepted), already present and
 * unchanged (skipped), or rejected with a reason. New sales are inserted in
 * bulk; sale-number clashes are renumbered first, and anything the database
 * still drops is reported as rejected instead of disappearing.
 */
export async function receiveSales(
    sales: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();
    if (sales.length === 0) return result;

    try {
        const ids = sales.map((s) => s.id);
        const stored = await prisma.sale.findMany({
            where: { id: { in: ids } },
            select: { id: true, updatedAt: true },
        });
        const storedById = new Map<string, { id: string; updatedAt?: Date | null }>(
            stored.map((s: any) => [s.id, s])
        );

        const newRecords: SyncRecord[] = [];
        for (const sale of sales) {
            const existing = storedById.get(sale.id);
            if (!existing) {
                newRecords.push(sale);
                continue;
            }
            try {
                if (await applySaleStatusChange(sale, existing)) result.accepted++;
                else result.skipped++;
            } catch (error) {
                addSyncError(result, sale.id, `Status update failed: ${getErrorMessage(error)}`);
            }
        }

        const toInsert: SyncRecord[] = (await resolveSaleNumberClashes(newRecords, terminalId)).map((sale) => ({
            ...sale,
            terminalId: sale.terminalId || terminalId,
        }));

        const inserted = await batchInsert(prisma.sale, toInsert);
        result.accepted += inserted;

        if (inserted < toInsert.length) {
            const present = await findExistingIds(prisma.sale, toInsert.map((s) => s.id));
            let missing = 0;
            for (const sale of toInsert) {
                if (!present.has(sale.id)) {
                    missing++;
                    addSyncError(result, sale.id, `Sale ${sale.saleNumber} was not stored (constraint violation)`);
                }
            }
            result.skipped += toInsert.length - inserted - missing;
        }
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
