import { Router } from 'express';
import { PaymentMethodController } from '../controllers/payment-method.controller';

const router = Router();

router.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'Payment Methods API',
		endpoints: {
			'GET /all': 'Get all payment methods',
			'GET /count': 'Get payment methods count',
			'GET /unsynced': 'Get unsynced payment methods',
			'GET /:paymentMethodId': 'Get payment method by ID',
			'POST /': 'Create new payment method',
			'PUT /:paymentMethodId': 'Update payment method',
			'DELETE /:paymentMethodId': 'Delete payment method',
			'PATCH /:paymentMethodId/sync': 'Mark payment method as synced'
		}
	});
});

router.get('/all', PaymentMethodController.list);
router.post('/', PaymentMethodController.create);
router.get('/count', PaymentMethodController.getCount);
router.get('/unsynced', PaymentMethodController.getUnsynced);
router.get('/:paymentMethodId', PaymentMethodController.getById);
router.put('/:paymentMethodId', PaymentMethodController.update);
router.delete('/:paymentMethodId', PaymentMethodController.delete);
router.patch('/:paymentMethodId/sync', PaymentMethodController.markAsSynced);

export default router;