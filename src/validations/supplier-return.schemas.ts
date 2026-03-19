import Joi from 'joi';

export const supplierReturnSchemas = {
    createSupplierReturn: Joi.object({
        supplierId: Joi.string().required(),
        purchaseOrderId: Joi.string().optional().allow(null),
        goodsReceiptId: Joi.string().optional().allow(null),
        reason: Joi.string().max(2000).optional().allow('', null),
        notes: Joi.string().max(2000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    goodsReceiptItemId: Joi.string().optional().allow(null),
                    variantId: Joi.string().required(),
                    returnQuantity: Joi.number().integer().min(1).required(),
                    unitCost: Joi.number().min(0).required()
                        .messages({ 'number.min': 'Unit cost must be the original purchase cost from the GRN (>= 0)' }),
                    reason: Joi.string().max(1000).optional().allow('', null),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one return item is required',
            }),
    }),

    updateSupplierReturn: Joi.object({
        reason: Joi.string().max(2000).optional().allow('', null),
        notes: Joi.string().max(2000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    goodsReceiptItemId: Joi.string().optional().allow(null),
                    variantId: Joi.string().required(),
                    returnQuantity: Joi.number().integer().min(1).required(),
                    unitCost: Joi.number().min(0).required(),
                    reason: Joi.string().max(1000).optional().allow('', null),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .optional(),
    }),

    statusAction: Joi.object({
        notes: Joi.string().max(2000).optional().allow('', null),
    }),

    applyCreditNote: Joi.object({
        invoiceId: Joi.string().required(),
        notes: Joi.string().max(2000).optional().allow('', null),
    }),

    idParam: Joi.object({
        supplierReturnId: Joi.string().required(),
    }),

    creditNoteIdParam: Joi.object({
        creditNoteId: Joi.string().required(),
    }),

    listQuery: Joi.object({
        status: Joi.string()
            .valid('DRAFT', 'APPROVED', 'SHIPPED', 'COMPLETED', 'CANCELLED')
            .optional(),
        supplierId: Joi.string().optional(),
        purchaseOrderId: Joi.string().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),

    creditNoteListQuery: Joi.object({
        status: Joi.string()
            .valid('PENDING', 'APPLIED', 'CANCELLED')
            .optional(),
        supplierId: Joi.string().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};
