import Joi from 'joi';

export const purchaseOrderSchemas = {
    createPurchaseOrder: Joi.object({
        supplierId: Joi.string().required(),
        requisitionId: Joi.string().optional().allow('', null),
        expectedDeliveryDate: Joi.date().optional(),
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    orderedQuantity: Joi.number().integer().min(1).required(),
                    unitPrice: Joi.number().min(0).required(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item is required',
            }),
    }),

    createFromRequisition: Joi.object({
        requisitionId: Joi.string().required(),
        supplierId: Joi.string().required(),
        expectedDeliveryDate: Joi.date().optional(),
        notes: Joi.string().max(1000).optional().allow('', null),
        itemPrices: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    unitPrice: Joi.number().min(0).required(),
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item price mapping is required',
            }),
    }),

    updatePurchaseOrder: Joi.object({
        supplierId: Joi.string().optional(),
        expectedDeliveryDate: Joi.date().optional().allow(null),
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    orderedQuantity: Joi.number().integer().min(1).required(),
                    unitPrice: Joi.number().min(0).required(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .optional(),
    }),

    receivePurchaseOrder: Joi.object({
        items: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    receivedQuantity: Joi.number().integer().min(0).required(),
                    damagedQuantity: Joi.number().integer().min(0).required(),
                })
            )
            .min(1)
            .required(),
    }),

    idParam: Joi.object({
        purchaseOrderId: Joi.string().required(),
    }),

    listQuery: Joi.object({
        status: Joi.string()
            .valid('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'PENDING')
            .optional(),
        supplierId: Joi.string().optional(),
        requisitionId: Joi.string().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};
