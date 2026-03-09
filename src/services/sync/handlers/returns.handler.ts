import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import { processRecords } from './base.handler';

type SyncRecord = Record<string, unknown> & { id: string; returnId?: string; terminalId?: string };

/**
 * Receive and upsert returns from terminal
 * Preserves original userId and terminalId from the record
 */
export async function receiveReturns(
    returns: SyncRecord[],
    terminalId: string
): Promise<SyncResult> {
    return processRecords(returns, async (ret) => {
        const existing = await prisma.return.findUnique({
            where: { id: ret.id },
        });

        if (existing) {
            return 'skipped';
        }

        await prisma.return.create({
            data: {
                ...ret,
                terminalId: ret.terminalId || terminalId,
            } as any,
        });

        return 'accepted';
    });
}

/**
 * Receive and upsert return items from terminal
 * Validates parent return exists before inserting
 */
export async function receiveReturnItems(
    items: SyncRecord[]
): Promise<SyncResult> {
    return processRecords(items, async (item) => {
        const existing = await prisma.returnItem.findUnique({
            where: { id: item.id },
        });

        if (existing) {
            return 'skipped';
        }

        const parentReturn = await prisma.return.findUnique({
            where: { id: item.returnId as string },
        });

        if (!parentReturn) {
            return { rejected: 'Parent return not found' };
        }

        await prisma.returnItem.create({
            data: item as any,
        });

        return 'accepted';
    });
}
