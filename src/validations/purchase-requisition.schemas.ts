import Joi from 'joi';

export const purchaseRequisitionSchemas = {
    createRequisition: Joi.object({
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    requestedQuantity: Joi.number().integer().min(1).required(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item is required',
            }),
    }),

    updateRequisition: Joi.object({
        notes: Joi.string().max(1000).optional().allow('', null),
        items: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    requestedQuantity: Joi.number().integer().min(1).required(),
                    notes: Joi.string().max(500).optional().allow('', null),
                })
            )
            .min(1)
            .optional(),
    }),

    approveRequisition: Joi.object({
        items: Joi.array()
            .items(
                Joi.object({
                    variantId: Joi.string().required(),
                    approvedQuantity: Joi.number().integer().min(0).required(),
                })
            )
            .min(1)
            .optional(),
    }),

    rejectRequisition: Joi.object({
        rejectedReason: Joi.string().max(1000).optional().allow('', null),
    }),

    idParam: Joi.object({
        requisitionId: Joi.string().required(),
    }),

    listQuery: Joi.object({
        status: Joi.string()
            .valid('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'PARTIALLY_APPROVED')
            .optional(),
        requestedBy: Joi.string().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};
