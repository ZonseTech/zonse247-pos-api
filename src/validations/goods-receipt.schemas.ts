import Joi from 'joi';

export const goodsReceiptSchemas = {
    createGoodsReceipt: Joi.object({
        purchaseOrderId: Joi.string().required(),
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    purchaseOrderItemId: Joi.string().required(),
                    variantId: Joi.string().required(),
                    receivedQuantity: Joi.number().integer().min(0).required(),
                    rejectedQuantity: Joi.number().integer().min(0).optional().default(0),
                    rejectionReason: Joi.string().max(500).optional().allow('', null),
                    unitCost: Joi.number().min(0).required(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item is required',
            }),
    }),

    updateGoodsReceipt: Joi.object({
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    purchaseOrderItemId: Joi.string().required(),
                    variantId: Joi.string().required(),
                    receivedQuantity: Joi.number().integer().min(0).required(),
                    rejectedQuantity: Joi.number().integer().min(0).optional().default(0),
                    rejectionReason: Joi.string().max(500).optional().allow('', null),
                    unitCost: Joi.number().min(0).required(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .optional(),
    }),

    verifyGoodsReceipt: Joi.object({
        notes: Joi.string().max(1000).optional().allow('', null),
    }),

    postGoodsReceipt: Joi.object({
        notes: Joi.string().max(1000).optional().allow('', null),
    }),

    idParam: Joi.object({
        goodsReceiptId: Joi.string().required(),
    }),

    listQuery: Joi.object({
        status: Joi.string()
            .valid('DRAFT', 'VERIFIED', 'POSTED', 'CANCELLED')
            .optional(),
        purchaseOrderId: Joi.string().optional(),
        search: Joi.string().optional(),
        dateFrom: Joi.date().iso().optional(),
        dateTo: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};
