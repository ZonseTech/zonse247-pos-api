import Joi from 'joi';

// ─── Expense Categories ────────────────────────────────────────────

export const createExpenseCategorySchema = Joi.object({
    name: Joi.string().max(100).required(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
});

export const updateExpenseCategorySchema = Joi.object({
    name: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
});

export const expenseCategoryIdParamSchema = Joi.object({
    categoryId: Joi.string().required(),
});

// ─── Expenses ──────────────────────────────────────────────────────

export const createExpenseSchema = Joi.object({
    categoryId: Joi.string().required(),
    amount: Joi.number().positive().precision(2).required(),
    paymentMethodId: Joi.string().optional().allow(null),
    supplierId: Joi.string().uuid().optional().allow(null),
    expenseDate: Joi.date().iso().optional(),
    reference: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(2000).optional().allow('', null),
});

export const updateExpenseSchema = Joi.object({
    categoryId: Joi.string().optional(),
    amount: Joi.number().positive().precision(2).optional(),
    paymentMethodId: Joi.string().optional().allow(null),
    supplierId: Joi.string().uuid().optional().allow(null),
    expenseDate: Joi.date().iso().optional(),
    reference: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(2000).optional().allow('', null),
});

export const rejectExpenseSchema = Joi.object({
    rejectedReason: Joi.string().max(1000).optional().allow('', null),
});

export const voidExpenseSchema = Joi.object({
    reason: Joi.string().max(2000).optional().allow('', null),
});

export const expenseIdParamSchema = Joi.object({
    expenseId: Joi.string().uuid().required(),
});

export const listExpensesQuerySchema = Joi.object({
    status: Joi.string().valid('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'VOIDED').optional(),
    categoryId: Joi.string().optional(),
    supplierId: Joi.string().uuid().optional(),
    search: Joi.string().max(255).optional().allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
});

export const expenseSummaryQuerySchema = Joi.object({
    status: Joi.string().valid('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'VOIDED').optional(),
    categoryId: Joi.string().optional(),
    search: Joi.string().max(255).optional().allow(''),
});
