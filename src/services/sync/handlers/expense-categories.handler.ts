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

type ExpenseCategoryRecord = Record<string, unknown> & {
    id: string;
    categoryId?: string;
    branchId?: string;
    tenantId?: string;
    updatedAt?: Date | string;
};

/**
 * Receive and upsert expense categories from terminal
 * Uses categoryId as the unique identifier (not the auto-increment id)
 *
 * tenantId is sourced from the authenticated request (not the incoming
 * record payload) to prevent cross-tenant data injection.
 */
export async function receiveExpenseCategories(
    expenseCategories: ExpenseCategoryRecord[],
    tenantId?: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    if (!tenantId) {
        for (const category of expenseCategories) {
            addSyncError(result, getCategoryId(category) || 'unknown', 'Missing tenantId (auth required)');
        }
        return finalizeSyncResult(result);
    }

    for (const category of expenseCategories) {
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

            const existing = await prisma.expenseCategory.findUnique({
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
function getCategoryId(category: ExpenseCategoryRecord): string | undefined {
    return (category.categoryId || category.id) as string | undefined;
}

/**
 * Handle existing expense category - update if local is newer
 */
async function handleExistingCategory(
    result: SyncResult,
    category: ExpenseCategoryRecord,
    categoryId: string,
    existing: { updatedAt: Date | null }
): Promise<void> {
    if (isNewerRecord(category, existing)) {
        const { id: _id, branchId: _branchId, tenantId: _tenantId, ...updateData } = category;
        await prisma.expenseCategory.update({
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
 * Create new expense category using scalar foreign keys.
 * tenantId is taken from the authenticated request, not the payload.
 */
async function createNewCategory(
    result: SyncResult,
    category: ExpenseCategoryRecord,
    categoryId: string,
    tenantId: string
): Promise<void> {
    const { id: _id, branchId, tenantId: _payloadTenantId, ...categoryData } = category;

    await prisma.expenseCategory.create({
        data: {
            ...categoryData,
            categoryId,
            tenantId,
            branchId: branchId as string,
        } as any,
    });

    markAccepted(result);
}
