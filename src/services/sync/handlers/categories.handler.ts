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

type CategoryRecord = Record<string, unknown> & {
    id: string;
    categoryId?: string;
    branchId?: string;
    tenantId?: string;
    updatedAt?: Date | string;
};

/**
 * Receive and upsert categories from terminal
 * Uses categoryId as the unique identifier (not the auto-increment id)
 *
 * tenantId is sourced from the authenticated request (not the incoming
 * record payload) to prevent cross-tenant data injection.
 */
export async function receiveCategories(
    categories: CategoryRecord[],
    tenantId?: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    if (!tenantId) {
        for (const category of categories) {
            addSyncError(result, getCategoryId(category) || 'unknown', 'Missing tenantId (auth required)');
        }
        return finalizeSyncResult(result);
    }

    for (const category of categories) {
        try {
            const categoryId = getCategoryId(category);

            if (!categoryId) {
                addSyncError(result, 'unknown', 'Missing categoryId');
                continue;
            }

            if (!category.branchId) {
                addSyncError(result, categoryId, 'Missing branchId');
                continue;
            }

            const existing = await prisma.category.findUnique({
                where: { categoryId },
            });

            if (existing) {
                await handleExistingCategory(result, category, categoryId, existing);
            } else {
                await createNewCategory(result, category, categoryId, tenantId);
            }
        } catch (error) {
            addSyncError(result, category.id, getErrorMessage(error));
        }
    }

    return finalizeSyncResult(result);
}

/**
 * Extract categoryId from record (handles both categoryId and id fields)
 */
function getCategoryId(category: CategoryRecord): string | undefined {
    return (category.categoryId || category.id) as string | undefined;
}

/**
 * Handle existing category - update if local is newer
 */
async function handleExistingCategory(
    result: SyncResult,
    category: CategoryRecord,
    categoryId: string,
    existing: { updatedAt: Date }
): Promise<void> {
    if (isNewerRecord(category, existing)) {
        const { id: _id, branchId: _branchId, tenantId: _tenantId, ...updateData } = category;
        await prisma.category.update({
            where: { categoryId },
            data: {
                ...updateData,
                categoryId,
            } as any,
        });

        markAccepted(result);
    } else {
        markSkipped(result);
    }
}

/**
 * Create new category using scalar foreign keys.
 * tenantId is taken from the authenticated request, not the payload.
 */
async function createNewCategory(
    result: SyncResult,
    category: CategoryRecord,
    categoryId: string,
    tenantId: string
): Promise<void> {
    const { id: _id, branchId, tenantId: _payloadTenantId, ...categoryData } = category;

    await prisma.category.create({
        data: {
            ...categoryData,
            categoryId,
            tenantId,
            branchId: branchId as string,
        } as any,
    });

    markAccepted(result);
}
