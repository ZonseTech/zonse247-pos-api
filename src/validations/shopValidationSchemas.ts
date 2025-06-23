import Joi from 'joi';

export const shopValidationSchemas = {

    id: Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'Shop ID is required',
        }),
    }),

    shopUuid: Joi.object({
        shopUuid: Joi.string().required().messages({
            'any.required': 'Shop ID is required',
        }),
    }),

    shopCode: Joi.object({
        shopCode: Joi.string().required().messages({
            'any.required': 'Shop Code is required',
        }),
    }),
};