import Joi from 'joi';

// ─── Create Payment ────────────────────────────────────────────────

export const createSupplierPaymentSchema = Joi.object({
    supplierId: Joi.string().uuid().required(),
    paymentDate: Joi.date().iso().optional(),
    amount: Joi.number().positive().precision(2).required(),
    paymentMethod: Joi.string().max(50).optional(),
    reference: Joi.string().max(255).optional(),
    notes: Joi.string().max(2000).optional(),
    allocations: Joi.array()
        .items(
            Joi.object({
                invoiceId: Joi.string().uuid().required(),
                allocatedAmount: Joi.number().positive().precision(2).required(),
                notes: Joi.string().max(2000).optional(),
            })
        )
        .min(1)
        .required(),
});

// ─── Void Payment ──────────────────────────────────────────────────

export const voidSupplierPaymentSchema = Joi.object({
    reason: Joi.string().max(2000).optional(),
});

// ─── Params ────────────────────────────────────────────────────────

export const paymentIdParamSchema = Joi.object({
    paymentId: Joi.string().uuid().required(),
});

export const invoiceIdParamSchema = Joi.object({
    invoiceId: Joi.string().uuid().required(),
});

// ─── Query ─────────────────────────────────────────────────────────

export const listSupplierPaymentsQuerySchema = Joi.object({
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED').optional(),
    supplierId: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
});
