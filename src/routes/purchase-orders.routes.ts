import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';

const router = Router();

router.post('/', PurchaseOrderController.createPurchaseOrder);
router.get('/', PurchaseOrderController.listPurchaseOrders);
router.get('/:purchaseOrderId', PurchaseOrderController.getPurchaseOrder);
router.post('/:purchaseOrderId/receive', PurchaseOrderController.receivePurchaseOrder);
router.post('/:purchaseOrderId/cancel', PurchaseOrderController.cancelPurchaseOrder);

export default router;
