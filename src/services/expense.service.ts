import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';

type ExpenseStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED';

interface CreateExpenseInput {
    categoryId: string;
    amount: number;
    paymentMethodId?: string | null;
    supplierId?: string | null;
    expenseDate?: string | Date;
    reference?: string | null;
    notes?: string | null;
}

const EXPENSE_INCLUDE = {
    category: { select: { categoryId: true, name: true } },
    paymentMethod: { select: { methodId: true, name: true } },
    supplier: { select: { id: true, name: true } },
    recordedByUser: { select: { userId: true, fullname: true } },
    approvedByUser: { select: { userId: true, fullname: true } },
    rejectedByUser: { select: { userId: true, fullname: true } },
};

export class ExpenseService {
    /**
     * Record a new expense. Always starts as PENDING_APPROVAL —
     * callers (including the sync push handler) cannot set the status directly.
     */
    static async createExpense(
        data: CreateExpenseInput,
        tenantId: string,
        branchId: string,
        recordedBy: string,
        terminalId?: string | null
    ) {
        const category = await prisma.expenseCategory.findFirst({
            where: { categoryId: data.categoryId, tenantId, branchId, deletedAt: null },
        });
        if (!category) {
            throw new Error('Expense category not found');
        }

        if (data.supplierId) {
            const supplier = await prisma.supplier.findFirst({
                where: { id: data.supplierId, tenantId, deletedAt: null },
            });
            if (!supplier) {
                throw new Error('Supplier not found');
            }
        }

        if (data.paymentMethodId) {
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: { methodId: data.paymentMethodId, tenantId, deletedAt: null },
            });
            if (!paymentMethod) {
                throw new Error('Payment method not found');
            }
        }

        const expenseNumber = await this.generateExpenseNumber(tenantId, branchId);

        const created = await prisma.expense.create({
            data: {
                id: uuidv4(),
                tenantId,
                branchId,
                terminalId: terminalId ?? undefined,
                expenseNumber,
                categoryId: data.categoryId,
                amount: data.amount,
                paymentMethodId: data.paymentMethodId ?? undefined,
                supplierId: data.supplierId ?? undefined,
                expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
                reference: data.reference ?? undefined,
                notes: data.notes ?? undefined,
                status: 'PENDING_APPROVAL',
                recordedBy,
            },
            include: EXPENSE_INCLUDE,
        });

        return this.mapExpense(created);
    }

    /**
     * Edit a recorded expense. Only allowed while PENDING_APPROVAL — once an
     * expense has been approved, rejected, or voided, its figures are final
     * and must go through void/reversal flows instead of a silent edit.
     */
    static async updateExpense(
        expenseId: string,
        data: Partial<CreateExpenseInput>,
        tenantId: string,
        branchId: string
    ) {
        const existing = await prisma.expense.findFirst({
            where: { id: expenseId, tenantId, branchId, deletedAt: null },
        });
        if (!existing) {
            throw new Error('Expense not found');
        }
        if (existing.status !== 'PENDING_APPROVAL') {
            throw new Error('Only expenses pending approval can be edited');
        }

        if (data.categoryId) {
            const category = await prisma.expenseCategory.findFirst({
                where: { categoryId: data.categoryId, tenantId, branchId, deletedAt: null },
            });
            if (!category) {
                throw new Error('Expense category not found');
            }
        }

        if (data.supplierId) {
            const supplier = await prisma.supplier.findFirst({
                where: { id: data.supplierId, tenantId, deletedAt: null },
            });
            if (!supplier) {
                throw new Error('Supplier not found');
            }
        }

        if (data.paymentMethodId) {
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: { methodId: data.paymentMethodId, tenantId, deletedAt: null },
            });
            if (!paymentMethod) {
                throw new Error('Payment method not found');
            }
        }

        const updated = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                categoryId: data.categoryId ?? undefined,
                amount: data.amount ?? undefined,
                paymentMethodId: data.paymentMethodId !== undefined ? (data.paymentMethodId || null) : undefined,
                supplierId: data.supplierId !== undefined ? (data.supplierId || null) : undefined,
                expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
                reference: data.reference !== undefined ? (data.reference || null) : undefined,
                notes: data.notes !== undefined ? (data.notes || null) : undefined,
                version: { increment: 1 },
            },
            include: EXPENSE_INCLUDE,
        });

        return this.mapExpense(updated);
    }

    static async approveExpense(expenseId: string, tenantId: string, branchId: string, approvedBy: string) {
        const existing = await prisma.expense.findFirst({
            where: { id: expenseId, tenantId, branchId, deletedAt: null },
        });
        if (!existing) {
            throw new Error('Expense not found');
        }
        if (existing.status !== 'PENDING_APPROVAL') {
            throw new Error('Only expenses pending approval can be approved');
        }

        const updated = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
                version: { increment: 1 },
            },
            include: EXPENSE_INCLUDE,
        });

        return this.mapExpense(updated);
    }

    static async rejectExpense(
        expenseId: string,
        tenantId: string,
        branchId: string,
        rejectedBy: string,
        rejectedReason?: string
    ) {
        const existing = await prisma.expense.findFirst({
            where: { id: expenseId, tenantId, branchId, deletedAt: null },
        });
        if (!existing) {
            throw new Error('Expense not found');
        }
        if (existing.status !== 'PENDING_APPROVAL') {
            throw new Error('Only expenses pending approval can be rejected');
        }

        const updated = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                status: 'REJECTED',
                rejectedBy,
                rejectedAt: new Date(),
                rejectedReason: rejectedReason ?? undefined,
                version: { increment: 1 },
            },
            include: EXPENSE_INCLUDE,
        });

        return this.mapExpense(updated);
    }

    /**
     * Void a previously APPROVED expense (e.g. recorded in error after approval).
     * PENDING_APPROVAL expenses should be rejected instead.
     */
    static async voidExpense(expenseId: string, tenantId: string, branchId: string, reason?: string) {
        const existing = await prisma.expense.findFirst({
            where: { id: expenseId, tenantId, branchId, deletedAt: null },
        });
        if (!existing) {
            throw new Error('Expense not found');
        }
        if (existing.status !== 'APPROVED') {
            throw new Error('Only approved expenses can be voided');
        }

        const updated = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                status: 'VOIDED',
                notes: reason
                    ? `[VOIDED] ${reason}${existing.notes ? '\n' + existing.notes : ''}`
                    : existing.notes,
                version: { increment: 1 },
            },
            include: EXPENSE_INCLUDE,
        });

        return this.mapExpense(updated);
    }

    static async getExpenseById(expenseId: string, tenantId: string, branchId: string) {
        const expense = await prisma.expense.findFirst({
            where: { id: expenseId, tenantId, branchId, deletedAt: null },
            include: EXPENSE_INCLUDE,
        });
        return expense ? this.mapExpense(expense) : null;
    }

    static async listExpenses(
        tenantId: string,
        branchId: string,
        options?: {
            status?: ExpenseStatus;
            categoryId?: string;
            supplierId?: string;
            search?: string;
            page?: number;
            limit?: number;
        }
    ) {
        const page = Number(options?.page) || 1;
        const limit = Number(options?.limit) || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.categoryId && { categoryId: options.categoryId }),
            ...(options?.supplierId && { supplierId: options.supplierId }),
            ...(options?.search && {
                OR: [
                    { expenseNumber: { contains: options.search } },
                    { reference: { contains: options.search } },
                    { notes: { contains: options.search } },
                    { category: { name: { contains: options.search } } },
                    { supplier: { name: { contains: options.search } } },
                    { recordedByUser: { fullname: { contains: options.search } } },
                ],
            }),
        };

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: EXPENSE_INCLUDE,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.expense.count({ where }),
        ]);

        return {
            expenses: expenses.map((e) => this.mapExpense(e)),
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Aggregate counts/totals for the summary cards. Computed over the full
     * filtered set (search/category/status), not just the current page —
     * mirrors SaleService.getSalesSummary.
     */
    static async getExpenseSummary(
        tenantId: string,
        branchId: string,
        options?: { search?: string; categoryId?: string; status?: ExpenseStatus }
    ) {
        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.categoryId && { categoryId: options.categoryId }),
            ...(options?.search && {
                OR: [
                    { expenseNumber: { contains: options.search } },
                    { reference: { contains: options.search } },
                    { notes: { contains: options.search } },
                    { category: { name: { contains: options.search } } },
                    { supplier: { name: { contains: options.search } } },
                    { recordedByUser: { fullname: { contains: options.search } } },
                ],
            }),
        };

        const expenses = await prisma.expense.findMany({
            where,
            select: { status: true, amount: true },
        });

        const summary = {
            // TODO: once other expense-like record types exist (e.g. salaries),
            // fold their counts/amounts into totalCount/totalAmount too so this
            // stays the single "all expense records" figure.
            totalCount: expenses.length,
            totalAmount: 0,
            pendingApprovalCount: 0,
            pendingApprovalAmount: 0,
            approvedCount: 0,
            approvedAmount: 0,
            rejectedCount: 0,
            rejectedAmount: 0,
            voidedCount: 0,
            voidedAmount: 0,
            // Alias of approvedAmount.
            totalApprovedAmount: 0,
        };

        for (const expense of expenses) {
            const amount = Number(expense.amount);
            summary.totalAmount += amount;
            switch (expense.status) {
                case 'PENDING_APPROVAL':
                    summary.pendingApprovalCount++;
                    summary.pendingApprovalAmount += amount;
                    break;
                case 'APPROVED':
                    summary.approvedCount++;
                    summary.approvedAmount += amount;
                    summary.totalApprovedAmount += amount;
                    break;
                case 'REJECTED':
                    summary.rejectedCount++;
                    summary.rejectedAmount += amount;
                    break;
                case 'VOIDED':
                    summary.voidedCount++;
                    summary.voidedAmount += amount;
                    break;
            }
        }

        return summary;
    }

    /**
     * Generate sequential expense number: EXP-YYYYMM-0001, scoped to tenant+branch.
     * Used both for online creation and to re-derive an authoritative number
     * when accepting a pushed expense from an offline terminal (see sync
     * handlers/expenses.handler.ts) — the terminal's own locally-generated
     * number is never trusted, since two offline terminals in the same
     * branch could otherwise generate colliding numbers independently.
     */
    static async generateExpenseNumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `EXP-${year}${month}`;

        const last = await db.expense.findFirst({
            where: { tenantId, branchId, expenseNumber: { startsWith: prefix } },
            orderBy: { expenseNumber: 'desc' },
        });

        let sequence = 1;
        if (last) {
            const lastSeq = parseInt(last.expenseNumber.split('-').pop() || '0');
            sequence = lastSeq + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    private static mapExpense(expense: any) {
        return {
            id: expense.id,
            tenantId: expense.tenantId,
            branchId: expense.branchId,
            terminalId: expense.terminalId,
            expenseNumber: expense.expenseNumber,
            categoryId: expense.categoryId,
            amount: Number(expense.amount),
            paymentMethodId: expense.paymentMethodId,
            supplierId: expense.supplierId,
            expenseDate: expense.expenseDate,
            reference: expense.reference,
            notes: expense.notes,
            status: expense.status,
            recordedBy: expense.recordedBy,
            approvedBy: expense.approvedBy,
            approvedAt: expense.approvedAt,
            rejectedBy: expense.rejectedBy,
            rejectedAt: expense.rejectedAt,
            rejectedReason: expense.rejectedReason,
            version: expense.version,
            deletedAt: expense.deletedAt,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
            category: expense.category,
            paymentMethod: expense.paymentMethod,
            supplier: expense.supplier,
            recordedByUser: expense.recordedByUser,
            approvedByUser: expense.approvedByUser,
            rejectedByUser: expense.rejectedByUser,
        };
    }
}
