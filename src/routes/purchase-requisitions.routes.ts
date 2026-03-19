import { Router } from 'express';
import { PurchaseRequisitionController } from '../controllers/purchase-requisition.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { purchaseRequisitionSchemas } from '../validations/purchase-requisition.schemas';

const router = Router();

router.post('/', validateBody(purchaseRequisitionSchemas.createRequisition), PurchaseRequisitionController.createRequisition);
router.get('/', validateQuery(purchaseRequisitionSchemas.listQuery), PurchaseRequisitionController.listRequisitions);
router.get('/:requisitionId', validateParams(purchaseRequisitionSchemas.idParam), PurchaseRequisitionController.getRequisition);
router.put('/:requisitionId', validateParams(purchaseRequisitionSchemas.idParam), validateBody(purchaseRequisitionSchemas.updateRequisition), PurchaseRequisitionController.updateRequisition);
router.post('/:requisitionId/approve', validateParams(purchaseRequisitionSchemas.idParam), validateBody(purchaseRequisitionSchemas.approveRequisition), PurchaseRequisitionController.approveRequisition);
router.post('/:requisitionId/reject', validateParams(purchaseRequisitionSchemas.idParam), validateBody(purchaseRequisitionSchemas.rejectRequisition), PurchaseRequisitionController.rejectRequisition);
router.post('/:requisitionId/cancel', validateParams(purchaseRequisitionSchemas.idParam), PurchaseRequisitionController.cancelRequisition);
router.delete('/:requisitionId', validateParams(purchaseRequisitionSchemas.idParam), PurchaseRequisitionController.deleteRequisition);

export default router;
