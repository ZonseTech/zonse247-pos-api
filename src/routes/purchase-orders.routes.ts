import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { purchaseOrderSchemas } from '../validations/purchase-order.schemas';

const router = Router();

router.post('/', validateBody(purchaseOrderSchemas.createPurchaseOrder), PurchaseOrderController.createPurchaseOrder);
router.post('/from-requisition', validateBody(purchaseOrderSchemas.createFromRequisition), PurchaseOrderController.createFromRequisition);
router.get('/', validateQuery(purchaseOrderSchemas.listQuery), PurchaseOrderController.listPurchaseOrders);
router.get('/:purchaseOrderId', validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.getPurchaseOrder);
router.put('/:purchaseOrderId', validateParams(purchaseOrderSchemas.idParam), validateBody(purchaseOrderSchemas.updatePurchaseOrder), PurchaseOrderController.updatePurchaseOrder);
router.post('/:purchaseOrderId/send', validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.sendPurchaseOrder);
router.post('/:purchaseOrderId/receive', validateParams(purchaseOrderSchemas.idParam), validateBody(purchaseOrderSchemas.receivePurchaseOrder), PurchaseOrderController.receivePurchaseOrder);
router.post('/:purchaseOrderId/cancel', validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.cancelPurchaseOrder);
router.delete('/:purchaseOrderId', validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.deletePurchaseOrder);

export default router;
