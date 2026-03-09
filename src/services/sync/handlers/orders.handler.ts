import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import { processRecords } from './base.handler';

type SyncRecord = Record<string, unknown> & { id: string };

/**
 * Receive and upsert orders from terminal
 */
export async function receiveOrders(
    orders: SyncRecord[]
): Promise<SyncResult> {
    return processRecords(orders, async (order) => {
        const existing = await prisma.order.findUnique({
            where: { id: order.id },
        });

        if (existing) {
            return 'skipped';
        }

        await prisma.order.create({
            data: order as any,
        });

        return 'accepted';
    });
}
