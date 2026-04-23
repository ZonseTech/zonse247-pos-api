import Joi from 'joi';

const PRICING_TYPES = ['FIXED', 'VARIABLE', 'HOURLY', 'PER_UNIT', 'PACKAGE', 'FLAT_RATE', 'TIERED', 'SUBSCRIPTION', 'CUSTOM'];

const createService = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  sku: Joi.string().max(100).optional().allow('', null),
  pricingType: Joi.string().valid(...PRICING_TYPES).optional().default('FIXED'),
  basePrice: Joi.number().min(0).precision(2).optional().allow(null),
  durationMin: Joi.number().integer().min(1).optional().allow(null),
  categoryId: Joi.string().optional().allow('', null),
  isTaxable: Joi.boolean().optional().default(true),
  taxRate: Joi.number().min(0).max(100).precision(2).optional().allow(null),
  imageUrl: Joi.string().uri().max(500).optional().allow('', null),
  isActive: Joi.boolean().optional().default(true),
});

const updateService = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  sku: Joi.string().max(100).optional().allow('', null),
  pricingType: Joi.string().valid(...PRICING_TYPES).optional(),
  basePrice: Joi.number().min(0).precision(2).optional().allow(null),
  durationMin: Joi.number().integer().min(1).optional().allow(null),
  categoryId: Joi.string().optional().allow('', null),
  isTaxable: Joi.boolean().optional(),
  taxRate: Joi.number().min(0).max(100).precision(2).optional().allow(null),
  imageUrl: Joi.string().uri().max(500).optional().allow('', null),
  isActive: Joi.boolean().optional(),
}).min(1);

const idParam = Joi.object({
  id: Joi.string().required(),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  search: Joi.string().max(255).optional().allow(''),
  categoryId: Joi.string().optional().allow(''),
  isActive: Joi.string().valid('true', 'false').optional(),
  pricingType: Joi.string().valid(...PRICING_TYPES).optional(),
});

const summaryQuery = Joi.object({
  search: Joi.string().max(255).optional().allow(''),
  categoryId: Joi.string().optional().allow(''),
  isActive: Joi.string().valid('true', 'false').optional(),
  pricingType: Joi.string().valid(...PRICING_TYPES).optional(),
});

export const serviceCatalogSchemas = {
  createService,
  updateService,
  idParam,
  listQuery,
  summaryQuery,
};
