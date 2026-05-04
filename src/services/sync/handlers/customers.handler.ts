import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import {
    createEmptySyncResult,
    finalizeSyncResult,
    addSyncError,
    markSkipped,
    markAccepted,
    isNewerRecord,
    getErrorMessage,
} from './base.handler';

type CustomerRecord = Record<string, unknown> & {
    id: string;
    customerId?: string;
    branchId?: string;
    tenantId?: string;
    updatedAt?: Date | string;
};

/**
 * Receive and upsert customers from terminal
 * Uses customerId as the unique identifier (not the auto-increment id)
 */
export async function receiveCustomers(
    customers: CustomerRecord[]
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    for (const customer of customers) {
        try {
            const customerId = getCustomerId(customer);

            if (!customerId) {
                addSyncError(result, 'unknown', 'Missing customerId');
                continue;
            }

            if (!customer.branchId) {
                addSyncError(result, customerId, 'Missing branchId');
                continue;
            }

            const existing = await prisma.customer.findUnique({
                where: { customerId },
            });

            if (existing) {
                await handleExistingCustomer(result, customer, customerId, existing);
            } else {
                await createNewCustomer(result, customer, customerId);
            }
        } catch (error) {
            addSyncError(result, customer.id, getErrorMessage(error));
        }
    }

    return finalizeSyncResult(result);
}

/**
 * Extract customerId from record (handles both customerId and id fields)
 */
function getCustomerId(customer: CustomerRecord): string | undefined {
    return (customer.customerId || customer.id) as string | undefined;
}

/**
 * Handle existing customer - update if local is newer
 */
async function handleExistingCustomer(
    result: SyncResult,
    customer: CustomerRecord,
    customerId: string,
    existing: { updatedAt: Date }
): Promise<void> {
    if (isNewerRecord(customer, existing)) {
        const { id: _id, branchId: _branchId, ...updateData } = customer;

        await prisma.customer.update({
            where: { customerId },
            data: {
                ...updateData,
                customerId,
            } as any,
        });

        markAccepted(result);
    } else {
        markSkipped(result);
    }
}

/**
 * Create new customer with proper relation syntax
 */
async function createNewCustomer(
    result: SyncResult,
    customer: CustomerRecord,
    customerId: string
): Promise<void> {
    const { id: _id, branchId, tenantId, ...customerData } = customer;

    if (!tenantId) {
        addSyncError(result, customerId, 'Missing tenantId');
        return;
    }

    await prisma.customer.create({
        data: {
            ...customerData,
            customerId,
            tenant: { connect: { tenantId: tenantId as string } },
            branch: { connect: { branchId: branchId as string } },
        } as any,
    });

    markAccepted(result);
}
