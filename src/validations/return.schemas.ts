import Joi from 'joi';

export const returnValidationSchemas = {
    // Validation for initiating a return
    initiateReturn: Joi.object({
        originalTransactionId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.empty': 'Original transaction ID is required',
                'string.uuid': 'Invalid transaction ID format',
                'any.required': 'Original transaction ID is required'
            }),

        items: Joi.array()
            .items(
                Joi.object({
                    orderItemId: Joi.string()
                        .required()
                        .messages({
                            'string.empty': 'Order item ID is required',
                            'any.required': 'Order item ID is required'
                        }),

                    productId: Joi.string()
                        .uuid()
                        .required()
                        .messages({
                            'string.empty': 'Product ID is required',
                            'string.uuid': 'Invalid product ID format',
                            'any.required': 'Product ID is required'
                        }),

                    returnQuantity: Joi.number()
                        .positive()
                        .required()
                        .messages({
                            'number.base': 'Return quantity must be a number',
                            'number.positive': 'Return quantity must be positive',
                            'any.required': 'Return quantity is required'
                        }),

                    returnReason: Joi.string()
                        .max(500)
                        .optional()
                        .allow('', null)
                        .messages({
                            'string.max': 'Return reason cannot exceed 500 characters'
                        }),

                    condition: Joi.string()
                        .valid('excellent', 'good', 'fair', 'poor', 'damaged')
                        .optional()
                        .default('good')
                        .messages({
                            'any.only': 'Condition must be one of: excellent, good, fair, poor, damaged'
                        }),

                    notes: Joi.string()
                        .max(1000)
                        .optional()
                        .allow('', null)
                        .messages({
                            'string.max': 'Notes cannot exceed 1000 characters'
                        })
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item must be returned',
                'any.required': 'Return items are required'
            }),

        refundReason: Joi.string()
            .optional()
            .allow('', null, 'null')
            .max(500)
            .messages({
                'string.max': 'Refund reason cannot exceed 500 characters'
            }),

        refundMethod: Joi.string()
            .valid('original', 'cash', 'store_credit')
            .optional()
            .default('original')
            .messages({
                'any.only': 'Refund method must be one of: original, cash, store_credit'
            }),

        partialRefund: Joi.boolean()
            .optional()
            .default(false)
    }),

    // Validation for restocking items
    restockItems: Joi.object({
        restockItems: Joi.array()
            .items(
                Joi.object({
                    returnItemId: Joi.string()
                        .uuid()
                        .required()
                        .messages({
                            'string.empty': 'Return item ID is required',
                            'string.uuid': 'Invalid return item ID format',
                            'any.required': 'Return item ID is required'
                        }),

                    restockQuantity: Joi.number()
                        .positive()
                        .required()
                        .messages({
                            'number.base': 'Restock quantity must be a number',
                            'number.positive': 'Restock quantity must be positive',
                            'any.required': 'Restock quantity is required'
                        })
                })
            )
            .min(1)
            .required()
            .messages({
                'array.min': 'At least one item must be restocked',
                'any.required': 'Restock items are required'
            })
    }),

    // Validation for return statistics query
    returnStatistics: Joi.object({
        startDate: Joi.date()
            .iso()
            .required()
            .messages({
                'date.base': 'Start date must be a valid date',
                'date.format': 'Start date must be in ISO format',
                'any.required': 'Start date is required'
            }),

        endDate: Joi.date()
            .iso()
            .min(Joi.ref('startDate'))
            .required()
            .messages({
                'date.base': 'End date must be a valid date',
                'date.format': 'End date must be in ISO format',
                'date.min': 'End date must be after start date',
                'any.required': 'End date is required'
            })
    })
};

export default returnValidationSchemas;
