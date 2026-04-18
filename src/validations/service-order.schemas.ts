import Joi from 'joi';

const consumptionItem = Joi.object({
  productVariantId: Joi.string().required(),
  quantity: Joi.number().min(0.01).required(),
});

const staffAssignmentItem = Joi.object({
  staffId: Joi.string().required(),
  role: Joi.string().max(100).optional().allow('', null),
  commissionType: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT').optional(),
  commissionValue: Joi.number().min(0).optional(),
});

const orderItem = Joi.object({
  serviceId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).optional().default(1),
  unitPrice: Joi.number().min(0).required(),
  discountAmount: Joi.number().min(0).optional().default(0),
  taxAmount: Joi.number().min(0).optional().default(0),
  notes: Joi.string().max(500).optional().allow('', null),
  consumptions: Joi.array().items(consumptionItem).optional(),
  staffAssignments: Joi.array().items(staffAssignmentItem).optional(),
});

const paymentItem = Joi.object({
  paymentMethodId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  reference: Joi.string().max(255).optional().allow('', null),
  providerId: Joi.string().optional().allow('', null),
  providerRef: Joi.string().max(255).optional().allow('', null),
  notes: Joi.string().max(500).optional().allow('', null),
});

const productItem = Joi.object({
  variantId: Joi.string().required(),
  productId: Joi.string().optional().allow('', null),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required(),
  taxAmount: Joi.number().min(0).optional().default(0),
  discountAmount: Joi.number().min(0).optional().default(0),
});

export const serviceOrderSchemas = {
  createServiceOrder: Joi.object({
    customerId: Joi.string().optional().allow('', null),
    terminalId: Joi.string().optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null),
    items: Joi.array().items(orderItem).min(1).optional(),
    productItems: Joi.array().items(productItem).min(1).optional(),
  }).custom((value, helpers) => {
    const hasItems = value.items && value.items.length > 0;
    const hasProductItems = value.productItems && value.productItems.length > 0;
    if (!hasItems && !hasProductItems) {
      return helpers.error('any.custom', { message: 'At least one service item or product item is required' });
    }
    return value;
  }).messages({ 'any.custom': '{{#message}}' }),

  updateServiceOrder: Joi.object({
    customerId: Joi.string().optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null),
    discountAmount: Joi.number().min(0).optional(),
    items: Joi.array().items(orderItem).min(1).optional(),
    productItems: Joi.array().items(productItem).min(1).optional(),
  }),

  completeItem: Joi.object({
    consumptions: Joi.array().items(consumptionItem).optional(),
  }),

  addConsumptions: Joi.object({
    consumptions: Joi.array().items(consumptionItem).min(1).required()
      .messages({ 'array.min': 'At least one consumption is required' }),
  }),

  idParam: Joi.object({
    serviceOrderId: Joi.string().required(),
  }),

  itemIdParam: Joi.object({
    serviceOrderId: Joi.string().required(),
    itemId: Joi.string().required(),
  }),

  listQuery: Joi.object({
    status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PARTIALLY_PAID', 'PAID').optional(),
    customerId: Joi.string().optional(),
    search: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(200).optional(),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
  }),

  recordPayment: Joi.object({
    payments: Joi.array().items(paymentItem).min(1).optional(),
    // Also accept flat single-payment body (paymentMethodId + amount)
    paymentMethodId: Joi.string().optional(),
    amount: Joi.number().positive().optional(),
    reference: Joi.string().max(255).optional().allow('', null),
    providerId: Joi.string().optional().allow('', null),
    providerRef: Joi.string().max(255).optional().allow('', null),
    notes: Joi.string().max(500).optional().allow('', null),
  }).or('payments', 'paymentMethodId'),
};
