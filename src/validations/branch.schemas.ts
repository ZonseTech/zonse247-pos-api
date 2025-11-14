import Joi from 'joi';

export const branchValidationSchemas = {

    id: Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'Shop ID is required',
        }),
    }),

    branchId: Joi.object({
        branchId: Joi.string().required().messages({
            'any.required': 'Branch ID is required',
        }),
    }),

    branchCode: Joi.object({
        branchCode: Joi.string().required().messages({
            'any.required': 'Branch Code is required',
        }),
    }),
};