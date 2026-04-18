import Joi from 'joi';

const createProgram = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  pointsPerCurrency: Joi.number().min(0).precision(2).optional().default(1),
  currencyPerPoint: Joi.number().min(0).precision(4).optional().default(0.01),
  minRedeemPoints: Joi.number().integer().min(1).optional().default(100),
  pointsExpiryDays: Joi.number().integer().min(1).optional().allow(null),
  autoEnroll: Joi.boolean().optional().default(false),
});

const updateProgram = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  pointsPerCurrency: Joi.number().min(0).precision(2).optional(),
  currencyPerPoint: Joi.number().min(0).precision(4).optional(),
  minRedeemPoints: Joi.number().integer().min(1).optional(),
  pointsExpiryDays: Joi.number().integer().min(1).optional().allow(null),
  autoEnroll: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const createTier = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  minPoints: Joi.number().integer().min(0).required(),
  pointsMultiplier: Joi.number().min(0.1).max(10).precision(2).optional().default(1.0),
  discountPercentage: Joi.number().min(0).max(100).precision(2).optional().default(0),
  benefits: Joi.string().max(2000).optional().allow('', null),
  sortOrder: Joi.number().integer().min(0).optional().default(0),
});

const updateTier = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  minPoints: Joi.number().integer().min(0).optional(),
  pointsMultiplier: Joi.number().min(0.1).max(10).precision(2).optional(),
  discountPercentage: Joi.number().min(0).max(100).precision(2).optional(),
  benefits: Joi.string().max(2000).optional().allow('', null),
  sortOrder: Joi.number().integer().min(0).optional(),
}).min(1);

const enrollMember = Joi.object({
  customerId: Joi.string().required(),
  loyaltyProgramId: Joi.string().optional(),
});

const redeemPoints = Joi.object({
  points: Joi.number().integer().min(1).required(),
  saleId: Joi.string().optional().allow('', null),
  description: Joi.string().max(500).optional().allow('', null),
});

const adjustPoints = Joi.object({
  points: Joi.number().integer().not(0).required(),
  description: Joi.string().trim().min(1).max(500).required(),
});

const programIdParam = Joi.object({
  programId: Joi.string().required(),
});

const memberIdParam = Joi.object({
  memberId: Joi.string().required(),
});

const tierIdParam = Joi.object({
  tierId: Joi.string().required(),
});

const customerIdParam = Joi.object({
  customerId: Joi.string().required(),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

export const loyaltySchemas = {
  createProgram,
  updateProgram,
  createTier,
  updateTier,
  enrollMember,
  redeemPoints,
  adjustPoints,
  programIdParam,
  memberIdParam,
  tierIdParam,
  customerIdParam,
  listQuery,
};
