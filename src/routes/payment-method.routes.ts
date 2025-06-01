import { Request, Response, Router } from 'express';
import { sealDBModel } from '../databases/local';
import { PAYMENT_METHODS_DB } from '../databases/local/tables';
import { v4 as uuidv4 } from 'uuid';
import { PaymentMethod } from '@/types';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
	res.send('Payment Methods API');
});

router.get('/all', async function (req: Request, res: Response): Promise<void> {
	try {
		const docs = await sealDBModel.findAll(PAYMENT_METHODS_DB);
		res.send(docs);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred.',
		});
	}
});

router.post(
	'/payment-method',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const newPaymentMethod: PaymentMethod = req.body;
			newPaymentMethod.uuid = uuidv4();

			await sealDBModel.insert(PAYMENT_METHODS_DB, newPaymentMethod);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.delete(
	'/payment-method/:paymentMethodId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const paymentMethodId = req.params.paymentMethodId;
			await sealDBModel.delete(PAYMENT_METHODS_DB, paymentMethodId);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.put(
	'/payment-method/:paymentMethodId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const paymentMethodId = req.params.paymentMethodId;
			await sealDBModel.update(PAYMENT_METHODS_DB, paymentMethodId, req.body);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

export default router;
