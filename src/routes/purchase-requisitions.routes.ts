import { Router } from 'express';
import { PurchaseRequisitionController } from '../controllers/purchase-requisition.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { purchaseRequisitionSchemas } from '../validations/purchase-requisition.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requirePermission('suppliers.orders'), validateBody(purchaseRequisitionSchemas.createRequisition), PurchaseRequisitionController.createRequisition);
router.get('/', permissionMiddleware.requirePermission('suppliers.orders'), validateQuery(purchaseRequisitionSchemas.listQuery), PurchaseRequisitionController.listRequisitions);
router.get('/:requisitionId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseRequisitionSchemas.idParam), PurchaseRequisitionController.getRequisition);
router.put('/:requisitionId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseRequisitionSchemas.idParam), validateBody(purchaseRequisitionSchemas.updateRequisition), PurchaseRequisitionController.updateRequisition);
router.post('/:requisitionId/approve', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseRequisitionSchemas.idParam), validateBody(purchaseRequisitionSchemas.approveRequisition), PurchaseRequisitionController.approveRequisition);
router.post('/:requisitionId/reject', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseRequisitionSchemas.idParam), validateBody(purchaseRequisitionSchemas.rejectRequisition), PurchaseRequisitionController.rejectRequisition);
router.post('/:requisitionId/cancel', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseRequisitionSchemas.idParam), PurchaseRequisitionController.cancelRequisition);
router.delete('/:requisitionId', permissionMiddleware.requirePermission('suppliers.orders'), validateParams(purchaseRequisitionSchemas.idParam), PurchaseRequisitionController.deleteRequisition);

export default router;
