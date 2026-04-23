import Joi from 'joi';

const createCustomer = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().email().max(255).optional().allow('', null),
  phone: Joi.string().trim().max(50).optional().allow('', null),
  address: Joi.string().trim().max(500).optional().allow('', null),
  isDefault: Joi.boolean().optional(),
});

const updateCustomer = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  email: Joi.string().email().max(255).optional().allow('', null),
  phone: Joi.string().trim().max(50).optional().allow('', null),
  address: Joi.string().trim().max(500).optional().allow('', null),
  isDefault: Joi.boolean().optional(),
}).min(1);

const customerIdParam = Joi.object({
  customerId: Joi.string().required(),
});

const searchCustomer = Joi.object({
  conditions: Joi.object({
    name: Joi.string().trim().max(255).optional(),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().trim().max(50).optional(),
  }).optional().default({}),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

export const customerSchemas = {
  createCustomer,
  updateCustomer,
  customerIdParam,
  searchCustomer,
  listQuery,
};
