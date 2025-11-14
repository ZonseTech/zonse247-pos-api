import Joi from 'joi';

export const tenantValidationSchemas = {
    verifyTenant: Joi.object({
        verificationToken: Joi.string()
            .required()
            .messages({
                'string.empty': 'Auth token is required',
                'any.required': 'Auth token is required'
            }),
    }),

    createTenant: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .required()
            .messages({
                'string.empty': 'Tenant name is required',
                'string.min': 'Tenant name must be at least {#limit} characters',
                'string.max': 'Tenant name must not exceed {#limit} characters',
                'any.required': 'Tenant name is required'
            }),
        description: Joi.string()
            .max(500)
            .optional(),
        contactEmail: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'string.empty': 'Contact email is required',
                'any.required': 'Contact email is required'
            }),
        status: Joi.string()
            .valid('active', 'inactive', 'pending')
            .default('active')
            .messages({
                'any.only': 'Status must be one of active, inactive, or pending'
            })
    }),

    updateTenant: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Tenant name must be at least {#limit} characters',
                'string.max': 'Tenant name must not exceed {#limit} characters'
            }),
        description: Joi.string()
            .max(500)
            .optional(),
        contactEmail: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Please enter a valid email address'
            }),
        status: Joi.string()
            .valid('active', 'inactive', 'pending')
            .optional()
            .messages({
                'any.only': 'Status must be one of active, inactive, or pending'
            })
    }).min(1),

    tenantId: Joi.object({
        tenantId: Joi.string()
            .required()
            .messages({
                'string.guid': 'Tenant ID must be a valid UUID',
                'string.empty': 'Tenant ID is required',
                'any.required': 'Tenant ID is required'
            })
    }),

    listTenants: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(10)
            .messages({
                'number.base': 'Limit must be a number',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit must not exceed 100'
            }),
        status: Joi.string()
            .valid('active', 'inactive', 'pending')
            .optional()
            .messages({
                'any.only': 'Status must be one of active, inactive, or pending'
            }),
        search: Joi.string()
            .trim()
            .max(100)
            .optional()
            .messages({
                'string.max': 'Search term must not exceed {#limit} characters'
            })
    }),

    id: Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'Tenant ID is required',
        }),
    }),
};