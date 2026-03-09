import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import { processRecords } from './base.handler';

type SyncRecord = Record<string, unknown> & { id: string; saleId?: string; terminalId?: string };

/**
 * Receive and upsert sales from terminal
 * Preserves original userId and terminalId from the record
 */
export async function receiveSales(
    sales: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    return processRecords(sales, async (sale) => {
        const existing = await prisma.sale.findUnique({
            where: { id: sale.id },
        });

        if (existing) {
            return 'skipped';
        }

        await prisma.sale.create({
            data: {
                ...sale,
                terminalId: sale.terminalId || terminalId,
            } as any,
        });

        return 'accepted';
    });
}

/**
 * Receive and upsert sale items from terminal
 * Validates parent sale exists before inserting
 */
export async function receiveSaleItems(
    items: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    return processRecords(items, async (item) => {
        const existing = await prisma.saleItem.findUnique({
            where: { id: item.id },
        });

        if (existing) {
            return 'skipped';
        }

        const parentSale = await prisma.sale.findUnique({
            where: { id: item.saleId as string },
        });

        if (!parentSale) {
            return { rejected: 'Parent sale not found' };
        }

        await prisma.saleItem.create({
            data: {
                ...item,
                terminalId: item.terminalId || terminalId,
            } as any,
        });

        return 'accepted';
    });
}

/**
 * Receive and upsert sale payments from terminal
 * Validates parent sale exists before inserting
 */
export async function receiveSalePayments(
    payments: SyncRecord[]
): Promise<SyncResult> {
    return processRecords(payments, async (payment) => {
        const existing = await prisma.salePayment.findUnique({
            where: { id: payment.id },
        });

        if (existing) {
            return 'skipped';
        }

        const parentSale = await prisma.sale.findUnique({
            where: { id: payment.saleId as string },
        });

        if (!parentSale) {
            return { rejected: 'Parent sale not found' };
        }

        await prisma.salePayment.create({
            data: payment as any,
        });

        return 'accepted';
    });
}
