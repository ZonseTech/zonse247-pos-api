import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { recordChangeAsync } from './sync/change-log.service';

interface ExpenseCategoryInput {
    name: string;
    isActive?: boolean;
    sortOrder?: number;
}

interface AuthContext {
    tenantId: string;
    branchId: string;
    userId?: string;
}

export class ExpenseCategoryService {
    static async listExpenseCategories(tenantId: string, branchId: string) {
        return prisma.expenseCategory.findMany({
            where: { tenantId, branchId, deletedAt: null },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
    }

    static async createExpenseCategory(data: ExpenseCategoryInput, auth: AuthContext) {
        const existing = await prisma.expenseCategory.findFirst({
            where: { branchId: auth.branchId, name: data.name.trim(), deletedAt: null },
        });
        if (existing) {
            throw new Error('Expense category with this name already exists in the branch');
        }

        const created = await prisma.expenseCategory.create({
            data: {
                categoryId: uuidv4(),
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                name: data.name.trim(),
                isActive: data.isActive ?? true,
                sortOrder: data.sortOrder ?? 0,
            },
        });

        recordChangeAsync({
            tableName: 'expenseCategories',
            recordId: created.categoryId,
            operation: 'INSERT',
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
        });

        return created;
    }

    static async updateExpenseCategory(categoryId: string, data: Partial<ExpenseCategoryInput>, auth: AuthContext) {
        const existing = await prisma.expenseCategory.findFirst({
            where: { categoryId, tenantId: auth.tenantId, branchId: auth.branchId, deletedAt: null },
        });
        if (!existing) {
            throw new Error('Expense category not found');
        }

        if (data.name && data.name.trim() !== existing.name) {
            const duplicate = await prisma.expenseCategory.findFirst({
                where: {
                    branchId: auth.branchId,
                    name: data.name.trim(),
                    deletedAt: null,
                    categoryId: { not: categoryId },
                },
            });
            if (duplicate) {
                throw new Error('Expense category with this name already exists in the branch');
            }
        }

        const updated = await prisma.expenseCategory.update({
            where: { categoryId },
            data: {
                name: data.name?.trim(),
                isActive: data.isActive,
                sortOrder: data.sortOrder,
                version: { increment: 1 },
            },
        });

        recordChangeAsync({
            tableName: 'expenseCategories',
            recordId: categoryId,
            operation: 'UPDATE',
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
        });

        return updated;
    }

    static async deleteExpenseCategory(categoryId: string, auth: AuthContext): Promise<void> {
        const existing = await prisma.expenseCategory.findFirst({
            where: { categoryId, tenantId: auth.tenantId, branchId: auth.branchId, deletedAt: null },
        });
        if (!existing) {
            throw new Error('Expense category not found');
        }

        const inUse = await prisma.expense.findFirst({
            where: { categoryId, deletedAt: null },
        });
        if (inUse) {
            throw new Error('Cannot delete a category that has expenses recorded against it');
        }

        await prisma.expenseCategory.update({
            where: { categoryId },
            data: { deletedAt: new Date(), version: { increment: 1 } },
        });

        recordChangeAsync({
            tableName: 'expenseCategories',
            recordId: categoryId,
            operation: 'DELETE',
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
        });
    }
}
