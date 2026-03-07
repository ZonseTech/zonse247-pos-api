import Joi from 'joi';

export const categoryValidationSchemas = {
    createCategory: Joi.object({
        name: Joi.string().trim().min(1).max(100).required()
            .messages({
                'string.empty': 'Category name is required',
                'string.max': 'Category name must be less than 100 characters',
                'any.required': 'Category name is required',
            }),
        description: Joi.string().max(500).allow('', null).optional()
            .messages({
                'string.max': 'Category description must be less than 500 characters',
            }),
        color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow('', null).optional()
            .messages({
                'string.pattern.base': 'Category color must be a valid hex color code (e.g., #FF0000 or #F00)',
            }),
        isDefault: Joi.boolean().optional(),
    }),

    updateCategory: Joi.object({
        name: Joi.string().trim().min(1).max(100).optional()
            .messages({
                'string.empty': 'Category name cannot be empty',
                'string.max': 'Category name must be less than 100 characters',
            }),
        description: Joi.string().max(500).allow('', null).optional()
            .messages({
                'string.max': 'Category description must be less than 500 characters',
            }),
        color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow('', null).optional()
            .messages({
                'string.pattern.base': 'Category color must be a valid hex color code (e.g., #FF0000 or #F00)',
            }),
        isDefault: Joi.boolean().optional(),
    }),

    categoryIdParam: Joi.object({
        categoryId: Joi.string().uuid().required()
            .messages({
                'string.guid': 'Category ID must be a valid UUID',
                'any.required': 'Category ID is required',
            }),
    }),
};

export default categoryValidationSchemas;
