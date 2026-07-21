import { Router } from 'express';
import { PaymentMethodController } from '../controllers/payment-method.controller';

const router = Router();

router.get('/all', PaymentMethodController.list);
router.post('/', PaymentMethodController.create);
router.get('/count', PaymentMethodController.getCount);
router.get('/unsynced', PaymentMethodController.getUnsynced);
router.get('/tree', PaymentMethodController.getTree);
router.get('/:paymentMethodId', PaymentMethodController.getById);
router.put('/:paymentMethodId', PaymentMethodController.update);
router.delete('/:paymentMethodId', PaymentMethodController.delete);
router.patch('/:paymentMethodId/sync', PaymentMethodController.markAsSynced);

export default router;