import Joi from 'joi';

export const clientValidationSchemas = {
    verifyClient: Joi.object({
        authKey: Joi.string()
            .required()
            .messages({
                'string.empty': 'Auth token is required',
                'any.required': 'Auth token is required'
            }),
        clientUuid: Joi.string()
            .required()
            .messages({
                'string.empty': 'Please enter your clientUuid',
                'any.required': 'Please enter your clientUuid'
            })
    }),

    createClient: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .required()
            .messages({
                'string.empty': 'Client name is required',
                'string.min': 'Client name must be at least {#limit} characters',
                'string.max': 'Client name must not exceed {#limit} characters',
                'any.required': 'Client name is required'
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

    updateClient: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Client name must be at least {#limit} characters',
                'string.max': 'Client name must not exceed {#limit} characters'
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

    clientUuidParam: Joi.object({
        clientUuid: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'Client ID must be a valid UUID',
                'string.empty': 'Client ID is required',
                'any.required': 'Client ID is required'
            })
    }),

    listClients: Joi.object({
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
            'any.required': 'Client ID is required',
        }),
    }),

    clientUuid: Joi.object({
        clientUuid: Joi.string().required().messages({
            'any.required': 'Client ID is required',
        }),
    }),
};