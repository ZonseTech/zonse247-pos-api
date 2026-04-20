import { Router } from 'express';
import { ServiceOrderController } from '../controllers/service-order.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { serviceOrderSchemas } from '../validations/service-order.schemas';

const router = Router();

router.post(
  '/',
  validateBody(serviceOrderSchemas.createServiceOrder),
  ServiceOrderController.createServiceOrder
);

router.get(
  '/',
  validateQuery(serviceOrderSchemas.listQuery),
  ServiceOrderController.listServiceOrders
);

router.get(
  '/:serviceOrderId',
  validateParams(serviceOrderSchemas.idParam),
  ServiceOrderController.getServiceOrder
);

router.put(
  '/:serviceOrderId',
  validateParams(serviceOrderSchemas.idParam),
  validateBody(serviceOrderSchemas.updateServiceOrder),
  ServiceOrderController.updateServiceOrder
);

router.post(
  '/:serviceOrderId/start',
  validateParams(serviceOrderSchemas.idParam),
  ServiceOrderController.startOrder
);

router.post(
  '/:serviceOrderId/cancel',
  validateParams(serviceOrderSchemas.idParam),
  ServiceOrderController.cancelOrder
);

router.post(
  '/:serviceOrderId/items/:itemId/start',
  validateParams(serviceOrderSchemas.itemIdParam),
  ServiceOrderController.startItem
);

router.post(
  '/:serviceOrderId/items/:itemId/complete',
  validateParams(serviceOrderSchemas.itemIdParam),
  validateBody(serviceOrderSchemas.completeItem),
  ServiceOrderController.completeItem
);

router.post(
  '/:serviceOrderId/items/:itemId/cancel',
  validateParams(serviceOrderSchemas.itemIdParam),
  ServiceOrderController.cancelItem
);

router.post(
  '/:serviceOrderId/items/:itemId/consumptions',
  validateParams(serviceOrderSchemas.itemIdParam),
  validateBody(serviceOrderSchemas.addConsumptions),
  ServiceOrderController.addConsumptions
);

router.post(
  '/:serviceOrderId/payments',
  validateParams(serviceOrderSchemas.idParam),
  validateBody(serviceOrderSchemas.recordPayment),
  ServiceOrderController.recordPayment
);

router.get(
  '/:serviceOrderId/payments',
  validateParams(serviceOrderSchemas.idParam),
  ServiceOrderController.listPayments
);

export default router;
