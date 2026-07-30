import { prisma } from '../../../databases/prisma/client';
import type { SyncResult } from '../types/sync.types';
import {
    createEmptySyncResult,
    finalizeSyncResult,
    addSyncError,
    markSkipped,
    markAccepted,
    getErrorMessage,
} from './base.handler';
import { recordChangeAsync } from '../change-log.service';
import { ExpenseService } from '../../expense.service';

type ExpenseRecord = Record<string, unknown> & {
    id: string;
    categoryId?: string;
    amount?: number;
    recordedBy?: string;
    branchId?: string;
    terminalId?: string;
};

/**
 * Receive expenses pushed from a terminal.
 *
 * Expenses are create-only from the terminal's perspective — approve/reject/void
 * only ever happen through the live API (ExpenseController), never through this
 * push path, so there is no "existing record" update branch here like the other
 * handlers have.
 *
 * The terminal's own `expenseNumber` and `status` are never trusted:
 *  - `status` is always forced to PENDING_APPROVAL — a compromised or buggy
 *    terminal must not be able to self-approve an expense it pushes up.
 *  - `expenseNumber` is re-derived server-side because two terminals recording
 *    expenses offline, in the same branch, in the same month, could otherwise
 *    independently generate the same sequential number.
 *
 * Accepted records are written to ChangeLog so other terminals (e.g. the one a
 * branch manager uses to approve/reject) discover them on their next pull.
 */
export async function receiveExpenses(
    expenses: ExpenseRecord[],
    terminalId?: string,
    tenantId?: string
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    if (!tenantId) {
        for (const expense of expenses) {
            addSyncError(result, expense.id || 'unknown', 'Missing tenantId (auth required)');
        }
        return finalizeSyncResult(result);
    }

    for (const expense of expenses) {
        try {
            if (!expense.id) {
                addSyncError(result, 'unknown', 'Missing id');
                continue;
            }
            if (!expense.branchId) {
                addSyncError(result, expense.id, 'Missing branchId');
                continue;
            }
            if (!expense.categoryId || !expense.amount || !expense.recordedBy) {
                addSyncError(result, expense.id, 'Missing categoryId, amount, or recordedBy');
                continue;
            }

            const existing = await prisma.expense.findUnique({ where: { id: expense.id } });
            if (existing) {
                // Already synced — idempotent replay, not an error.
                markSkipped(result);
                continue;
            }

            const branchId = expense.branchId as string;
            const originTerminalId = (expense.terminalId as string) || terminalId;
            const expenseNumber = await ExpenseService.generateExpenseNumber(tenantId, branchId);

            const created = await prisma.expense.create({
                data: {
                    id: expense.id,
                    tenantId,
                    branchId,
                    terminalId: originTerminalId,
                    expenseNumber,
                    categoryId: expense.categoryId as string,
                    amount: expense.amount as number,
                    paymentMethodId: (expense.paymentMethodId as string) || undefined,
                    supplierId: (expense.supplierId as string) || undefined,
                    expenseDate: expense.expenseDate ? new Date(expense.expenseDate as string) : new Date(),
                    reference: (expense.reference as string) || undefined,
                    notes: (expense.notes as string) || undefined,
                    status: 'PENDING_APPROVAL',
                    recordedBy: expense.recordedBy as string,
                },
            });

            markAccepted(result);

            recordChangeAsync({
                tableName: 'expenses',
                recordId: created.id,
                operation: 'INSERT',
                tenantId,
                branchId,
                terminalId: originTerminalId,
                userId: expense.recordedBy as string,
            });
        } catch (error) {
            addSyncError(result, expense.id, getErrorMessage(error));
        }
    }

    return finalizeSyncResult(result);
}
