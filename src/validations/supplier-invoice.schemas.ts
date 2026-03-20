import Joi from 'joi';

export const supplierInvoiceSchemas = {
    createSupplierInvoice: Joi.object({
        supplierId: Joi.string().required(),
        purchaseOrderId: Joi.string().optional().allow('', null),
        invoiceNumber: Joi.string().max(100).required(),
        invoiceDate: Joi.date().required(),
        dueDate: Joi.date().optional().allow(null),
        subtotal: Joi.number().min(0).optional(),
        taxAmount: Joi.number().min(0).optional(),
        discountAmount: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    purchaseOrderItemId: Joi.string().optional().allow('', null),
                    variantId: Joi.string().required(),
                    quantity: Joi.number().integer().min(1).required(),
                    unitPrice: Joi.number().min(0).required(),
                    taxRate: Joi.number().min(0).max(100).optional(),
                    taxAmount: Joi.number().min(0).optional(),
                    discountAmount: Joi.number().min(0).optional(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item is required',
            }),
    }),

    updateSupplierInvoice: Joi.object({
        dueDate: Joi.date().optional().allow(null),
        taxAmount: Joi.number().min(0).optional(),
        discountAmount: Joi.number().min(0).optional(),
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    purchaseOrderItemId: Joi.string().optional().allow('', null),
                    variantId: Joi.string().required(),
                    quantity: Joi.number().integer().min(1).required(),
                    unitPrice: Joi.number().min(0).required(),
                    taxRate: Joi.number().min(0).max(100).optional(),
                    taxAmount: Joi.number().min(0).optional(),
                    discountAmount: Joi.number().min(0).optional(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .optional(),
    }),

    disputeInvoice: Joi.object({
        reason: Joi.string().max(1000).optional().allow('', null),
    }),

    idParam: Joi.object({
        invoiceId: Joi.string().required(),
    }),

    poIdParam: Joi.object({
        purchaseOrderId: Joi.string().required(),
    }),

    supplierIdParam: Joi.object({
        supplierId: Joi.string().required(),
    }),

    listQuery: Joi.object({
        status: Joi.string()
            .valid('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED')
            .optional(),
        supplierId: Joi.string().optional(),
        purchaseOrderId: Joi.string().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};
