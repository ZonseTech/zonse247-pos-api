import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { purchaseOrderSchemas } from '../validations/purchase-order.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('suppliers.orders'), validateBody(purchaseOrderSchemas.createPurchaseOrder), PurchaseOrderController.createPurchaseOrder);
router.post('/from-requisition', permissionMiddleware.requirePermission('suppliers.orders'), validateBody(purchaseOrderSchemas.createFromRequisition), PurchaseOrderController.createFromRequisition);
router.get('/', permissionMiddleware.requirePermission('suppliers.orders'), validateQuery(purchaseOrderSchemas.listQuery), PurchaseOrderController.listPurchaseOrders);
router.get('/:purchaseOrderId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.getPurchaseOrder);
router.put('/:purchaseOrderId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseOrderSchemas.idParam), validateBody(purchaseOrderSchemas.updatePurchaseOrder), PurchaseOrderController.updatePurchaseOrder);
router.post('/:purchaseOrderId/send', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.sendPurchaseOrder);
router.post('/:purchaseOrderId/receive', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(purchaseOrderSchemas.idParam), validateBody(purchaseOrderSchemas.receivePurchaseOrder), PurchaseOrderController.receivePurchaseOrder);
router.post('/:purchaseOrderId/cancel', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.cancelPurchaseOrder);
router.delete('/:purchaseOrderId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseOrderSchemas.idParam), PurchaseOrderController.deletePurchaseOrder);

export default router;
