import Joi from 'joi';

const RESOURCE_TYPES = ['STAFF', 'VEHICLE', 'TOOL', 'TEST_EQUIPMENT', 'OTHER'];

export const resourceValidationSchemas = {
  createResource: Joi.object({
    name: Joi.string().trim().min(1).max(255).required()
      .messages({
        'string.empty': 'Resource name is required',
        'string.max': 'Resource name must be less than 255 characters',
        'any.required': 'Resource name is required',
      }),
    type: Joi.string().valid(...RESOURCE_TYPES).required()
      .messages({
        'any.only': `Resource type must be one of: ${RESOURCE_TYPES.join(', ')}`,
        'any.required': 'Resource type is required',
      }),
    isAvailable: Joi.boolean().optional(),
  }),

  updateResource: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional()
      .messages({
        'string.empty': 'Resource name cannot be empty',
        'string.max': 'Resource name must be less than 255 characters',
      }),
    type: Joi.string().valid(...RESOURCE_TYPES).optional()
      .messages({
        'any.only': `Resource type must be one of: ${RESOURCE_TYPES.join(', ')}`,
      }),
    isAvailable: Joi.boolean().optional(),
  }),

  resourceIdParam: Joi.object({
    resourceId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Resource ID must be a valid UUID',
        'any.required': 'Resource ID is required',
      }),
  }),
};

export default resourceValidationSchemas;
