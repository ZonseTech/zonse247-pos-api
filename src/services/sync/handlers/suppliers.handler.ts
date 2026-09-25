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

type SupplierRecord = Record<string, unknown> & {
    id: string;
    branchId?: string;
    tenantId?: string;
    updatedAt?: Date | string;
};

/**
 * Receive and upsert suppliers from terminal.
 * Supplier's `id` is already the UUID primary key (no separate autoincrement
 * id + business-key split like Customer/Category), so it's used as-is.
 *
 * tenantId is sourced from the authenticated request (not the incoming
 * record payload) to prevent cross-tenant data injection.
 */
export async function receiveSuppliers(
    suppliers: SupplierRecord[],
    tenantId?: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    if (!tenantId) {
        for (const supplier of suppliers) {
            addSyncError(result, supplier.id || 'unknown', 'Missing tenantId (auth required)');
        }
        return finalizeSyncResult(result);
    }

    for (const supplier of suppliers) {
        try {
            if (!supplier.id) {
                addSyncError(result, 'unknown', 'Missing id');
                continue;
            }

            if (!supplier.branchId) {
                addSyncError(result, supplier.id, 'Missing branchId');
                continue;
            }

            const existing = await prisma.supplier.findUnique({
                where: { id: supplier.id },
            });

            if (existing) {
                await handleExistingSupplier(result, supplier, existing);
            } else {
                await createNewSupplier(result, supplier, tenantId);
            }
        } catch (error) {
            addSyncError(result, supplier.id, getErrorMessage(error));
        }
    }

    return finalizeSyncResult(result);
}

/**
 * Handle existing supplier - update if local is newer
 */
async function handleExistingSupplier(
    result: SyncResult,
    supplier: SupplierRecord,
    existing: { updatedAt: Date }
): Promise<void> {
    if (isNewerRecord(supplier, existing)) {
        const { id, branchId: _branchId, tenantId: _tenantId, ...updateData } = supplier;
        await prisma.supplier.update({
            where: { id },
            data: updateData as any,
        });

        markAccepted(result);
    } else {
        markSkipped(result);
    }
}

/**
 * Create new supplier using scalar foreign keys.
 * tenantId is taken from the authenticated request, not the payload.
 */
async function createNewSupplier(
    result: SyncResult,
    supplier: SupplierRecord,
    tenantId: string
): Promise<void> {
    const { branchId, tenantId: _payloadTenantId, ...supplierData } = supplier;

    await prisma.supplier.create({
        data: {
            ...supplierData,
            tenantId,
            branchId: branchId as string,
        } as any,
    });

    markAccepted(result);
}
