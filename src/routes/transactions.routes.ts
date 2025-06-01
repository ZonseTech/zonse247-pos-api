import { v4 as uuidv4 } from 'uuid';
import { saveOrderItem } from './orders.routes';
import { decrementInventory } from './inventory.routes';
import { Request, Response, Router } from 'express';
import {
	TRANSACTIONS_DB,
	USERS_DB,
	CUSTOMER_DB,
	PAYMENT_METHODS_DB,
	ORDERS_DB,
	INVENTORY_DB,
} from '../databases/local/tables';
import { sealDBModel } from '../databases/local';

const router = Router();

const enrichTransactionWithRelatedData = async (
	transaction: any,
	includeItems = true
) => {
	const promises = [];

	if (transaction.customerId && transaction.customerId !== '1') {
		promises.push(
			sealDBModel
				.findById(CUSTOMER_DB, transaction.customerId)
				.then((customer) => ({ customer }))
				.catch(() => ({ customer: null }))
		);
	} else {
		promises.push(Promise.resolve({ customer: null }));
	}

	if (transaction.paymentId && transaction.paymentId !== '1') {
		promises.push(
			sealDBModel
				.findById(PAYMENT_METHODS_DB, transaction.paymentId)
				.then((paymentMethod) => ({ paymentMethod }))
				.catch(() => ({ paymentMethod: null }))
		);
	} else {
		promises.push(Promise.resolve({ paymentMethod: null }));
	}

	if (transaction.userId) {
		promises.push(
			sealDBModel
				.findById(USERS_DB, transaction.userId)
				.then((user) => ({ user }))
				.catch(() => ({ user: null }))
		);
	} else {
		promises.push(Promise.resolve({ user: null }));
	}

	if (includeItems && transaction.uuid) {
		promises.push(
			sealDBModel
				.find(ORDERS_DB, { transactionId: transaction.uuid })
				.then(async (orderItems) => {
					const itemsWithProducts = await Promise.all(
						orderItems.map(async (item) => {
							try {
								const product = await sealDBModel.findById(
									INVENTORY_DB,
									item.productId
								);
								return {
									...item,
									productDetails: product,
								};
							} catch (error) {
								return {
									...item,
									productDetails: null,
								};
							}
						})
					);
					return { items: itemsWithProducts };
				})
				.catch(() => ({ items: [] }))
		);
	} else {
		promises.push(Promise.resolve({ items: [] }));
	}

	const [customerResult, paymentMethodResult, userResult, itemsResult]: any =
		await Promise.all(promises);

	return {
		...transaction,
		customer: customerResult.customer,
		paymentMethod: paymentMethodResult.paymentMethod,
		user: userResult.user,
		items: includeItems ? itemsResult.items : undefined,
		cashier: userResult.user?.fullname || transaction.cashier,
	};
};

router.get('/', (_req: Request, res: Response) => {
	res.send('Transactions API');
});

router.get('/all', async (req: Request, res: Response) => {
	try {
		const includeItems = req.query.includeItems === 'true';
		const transactions = await sealDBModel.findAll(TRANSACTIONS_DB);

		const enrichedTransactions = await Promise.all(
			transactions.map((transaction) =>
				enrichTransactionWithRelatedData(transaction, includeItems)
			)
		);

		res.send(enrichedTransactions);
	} catch (error) {
		console.error('Error fetching transactions:', error);
		res.status(500).send({
			error: 'Database error',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
});

router.get('/by-date', async (req: any, res: Response) => {
	try {
		const startDate = new Date(req.query.start.toString());
		const endDate = new Date(req.query.end.toString());
		const status = parseInt(req.query.status.toString());
		const user = parseInt(req.query.user.toString());
		const till = parseInt(req.query.till.toString());
		const includeItems = req.query.includeItems === 'true';

		const baseQuery: Array<
			Record<string, string | boolean | number | Record<string, string>>
		> = [
			{ date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() } },
			{ status },
		];

		if (user !== 0) baseQuery.push({ userId: user });
		if (till !== 0) baseQuery.push({ till });

		const transactions = await sealDBModel.find(TRANSACTIONS_DB, {
			$and: baseQuery,
		});

		const enrichedTransactions = await Promise.all(
			transactions.map((transaction) =>
				enrichTransactionWithRelatedData(transaction, includeItems)
			)
		);

		res.send(enrichedTransactions);
	} catch (error) {
		console.error('Error fetching transactions by date:', error);
		res.status(500).send({
			error: 'Database error',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
});

router.post('/new', async (req: Request, res: Response) => {
	try {
		const params = req.body;
		const transactionUuid = uuidv4();
		const newTransaction: Transaction = {
			refNumber: params.refNumber || 'TRX-' + Date.now(),
			discount: params.discount || 0,
			customerId: params.customer?.uuid || null,
			subtotal: params.subtotal || 0,
			tax: params.tax || 0,
			date: params.date || new Date().toISOString(),
			paymentId: params.paymentId || null,
			transactionId: params.transactionId || null,
			phoneNumber: params.phoneNumber || '',
			serviceProviderId: params.serviceProviderId || null,
			total: params.total || 0,
			paid: params.paid || 0,
			changeAmount: params.changeAmount || 0,
			till: params.till || null,
			userId: params.userId || null,
			status: params.status || 'completed',
			uuid: transactionUuid,
		};

		const transaction: Transaction = await sealDBModel.insert(
			TRANSACTIONS_DB,
			newTransaction
		);

		if (newTransaction.paid >= newTransaction.total) {
			await saveOrderItem(transactionUuid, params.items);
			await decrementInventory(params.items);
		}

		const enrichedTransaction = await enrichTransactionWithRelatedData(
			transaction,
			true
		);

		res.status(200).json(enrichedTransaction);
	} catch (error) {
		console.error('Error creating transaction:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred.',
		});
	}
});

router.put('/:transactionId', async (req: Request, res: Response) => {
	try {
		const transactionId = req.params.transactionId;

		const numReplaced = await sealDBModel.update(
			TRANSACTIONS_DB,
			transactionId,
			req.body
		);

		if (numReplaced > 0) {
			const updatedTransaction = await sealDBModel.findById(
				TRANSACTIONS_DB,
				transactionId
			);
			if (updatedTransaction) {
				const enrichedTransaction = await enrichTransactionWithRelatedData(
					updatedTransaction,
					true
				);
				res.status(200).json(enrichedTransaction);
			} else {
				res.sendStatus(200);
			}
		} else {
			res.status(404).json({
				error: 'Transaction not found',
				message: 'No transaction was updated.',
			});
		}
	} catch (error) {
		console.error('Error updating transaction:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred.',
		});
	}
});

router.post('/delete', async (req: Request, res: Response) => {
	try {
		const { orderId } = req.body;

		const numRemoved = await sealDBModel.delete(TRANSACTIONS_DB, orderId);

		if (numRemoved > 0) {
			res.sendStatus(200);
		} else {
			res.status(404).json({
				error: 'Transaction not found',
				message: 'No transaction was deleted.',
			});
		}
	} catch (error) {
		console.error('Error deleting transaction:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred.',
		});
	}
});

router.get('/:transactionId', async (req: Request, res: Response) => {
	try {
		const includeItems = req.query.includeItems !== 'false';
		const transaction = await sealDBModel.findById(
			TRANSACTIONS_DB,
			req.params.transactionId
		);

		if (transaction) {
			const enrichedTransaction = await enrichTransactionWithRelatedData(
				transaction,
				includeItems
			);
			res.send(enrichedTransaction);
		} else {
			res.status(404).send({ error: 'Transaction not found' });
		}
	} catch (error) {
		console.error('Error fetching transaction:', error);
		res.status(500).send({
			error: 'Database error',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
});

router.get('/:transactionId/summary', (async (req: Request, res: Response) => {
	try {
		const transaction = await sealDBModel.findById(
			TRANSACTIONS_DB,
			req.params.transactionId
		);

		if (!transaction) {
			return res.status(404).send({ error: 'Transaction not found' });
		}

		const enrichedTransaction = await enrichTransactionWithRelatedData(
			transaction,
			true
		);

		// Calculate additional analytics
		const analytics = {
			totalItems:
				enrichedTransaction.items?.reduce(
					(sum: number, item: any) => sum + item.quantity,
					0
				) || 0,
			totalProfit:
				enrichedTransaction.items?.reduce(
					(sum: number, item: any) =>
						sum + (item.sellPrice - item.purchasePrice) * item.quantity,
					0
				) || 0,
			averageItemPrice:
				enrichedTransaction.items?.length > 0
					? enrichedTransaction.items.reduce(
							(sum: number, item: any) => sum + item.sellPrice,
							0
					  ) / enrichedTransaction.items.length
					: 0,
		};

		res.send({
			...enrichedTransaction,
			analytics: {
				...analytics,
				totalProfit: Math.round(analytics.totalProfit * 100) / 100,
				averageItemPrice: Math.round(analytics.averageItemPrice * 100) / 100,
			},
		});
	} catch (error) {
		console.error('Error fetching transaction summary:', error);
		res.status(500).send({
			error: 'Database error',
			details: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}) as any);

export default router;
