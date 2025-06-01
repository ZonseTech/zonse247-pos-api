import { v4 as uuidv4 } from 'uuid';
import { ORDERS_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { Router } from 'express';

const router = Router();

export const saveOrderItem = async (
	transactionId: string,
	items: CartItem[]
): Promise<OrderItem[]> => {
	try {
		const orderItems: Array<OrderItem> = [];

		for (const item of items) {
			const orderItem: OrderItem = {
				transactionId,
				productId: item.productId,
				quantity: item.quantity,
				purchasePrice: item.purchasePrice,
				sellPrice: item.sellPrice,
				uuid: uuidv4(),
			};

			const savedItem = await sealDBModel.insert(ORDERS_DB, orderItem);
			orderItems.push(savedItem);
		}

		return orderItems;
	} catch (error) {
		console.error('Error saving order items:', error);
		throw error;
	}
};

export const saveOrderItemsBatch = async (
	transactionId: string,
	refNumber: string,
	items: CartItem[]
): Promise<OrderItem[]> => {
	try {
		const orderItems: Array<OrderItem> = items.map((item) => ({
			refNumber: refNumber,
			transactionId: transactionId,
			productId: item.productId,
			quantity: item.quantity,
			purchasePrice: item.purchasePrice,
			sellPrice: item.sellPrice,
			uuid: uuidv4(),
		}));

		const insertPromises = orderItems.map((item) =>
			sealDBModel.insert(ORDERS_DB, item)
		);
		const savedItems = await Promise.all(insertPromises);

		return savedItems;
	} catch (error) {
		console.error('Error batch saving order items:', error);
		throw error;
	}
};

router.get('/', (req, res) => {
	res.send('Orders API');
});

router.get('/all', async (req, res) => {
	try {
		const orders = await sealDBModel.findAll(ORDERS_DB);
		res.status(200).json(orders);
	} catch (error) {
		console.error('Error fetching all orders:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching orders.',
		});
	}
});

router.get('/ref/:refNumber', async (req, res) => {
	try {
		const refNumber = req.params.refNumber;
		const orders = await sealDBModel.find(ORDERS_DB, { refNumber });

		if (orders.length === 0) {
			res
				.status(404)
				.json({ error: 'No orders found for this reference number' });
			return;
		}

		res.status(200).json(orders);
	} catch (error) {
		console.error('Error fetching orders by reference:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching orders.',
		});
	}
});

router.get('/:orderId', async (req, res) => {
	try {
		const orderId = req.params.orderId;
		const order = await sealDBModel.findById(ORDERS_DB, orderId);

		if (!order) {
			res.status(404).json({ error: 'Order not found' });
			return;
		}

		res.status(200).json(order);
	} catch (error) {
		console.error('Error fetching order:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching order.',
		});
	}
});

router.post('/items', async (req, res) => {
	try {
		const { refNumber, transactionId, items } = req.body;

		if (!refNumber || !items || !Array.isArray(items)) {
			res.status(400).json({
				error: 'Bad Request',
				message: 'Reference number and items array are required.',
			});
			return;
		}

		const savedItems = await saveOrderItem(transactionId, items);
		res.status(201).json({
			message: 'Order items created successfully',
			refNumber,
			items: savedItems,
			count: savedItems.length,
		});
	} catch (error) {
		console.error('Error creating order items:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while creating order items.',
		});
	}
});

router.post('/items/batch', async (req, res) => {
	try {
		const { refNumber, transactionId, items } = req.body;

		if (!refNumber || !items || !Array.isArray(items)) {
			res.status(400).json({
				error: 'Bad Request',
				message: 'Reference number and items array are required.',
			});
			return;
		}

		const savedItems = await saveOrderItemsBatch(
			transactionId,
			refNumber,
			items
		);
		res.status(201).json({
			message: 'Order items created successfully (batch)',
			refNumber,
			items: savedItems,
			count: savedItems.length,
		});
	} catch (error) {
		console.error('Error batch creating order items:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while batch creating order items.',
		});
	}
});

router.put('/:orderId', async (req, res) => {
	try {
		const orderId = req.params.orderId;
		const updateData = req.body;

		const numReplaced = await sealDBModel.update(
			ORDERS_DB,
			orderId,
			updateData
		);

		if (numReplaced === 0) {
			res.status(404).json({ error: 'Order not found' });
			return;
		}

		res.status(200).json({ message: 'Order updated successfully' });
	} catch (error) {
		console.error('Error updating order:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while updating order.',
		});
	}
});

router.delete('/:orderId', async (req, res) => {
	try {
		const orderId = req.params.orderId;
		const numRemoved = await sealDBModel.delete(ORDERS_DB, orderId);

		if (numRemoved === 0) {
			res.status(404).json({ error: 'Order not found' });
			return;
		}

		res.status(200).json({ message: 'Order deleted successfully' });
	} catch (error) {
		console.error('Error deleting order:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while deleting order.',
		});
	}
});

router.delete('/ref/:refNumber', async (req, res) => {
	try {
		const refNumber = req.params.refNumber;
		const orders = await sealDBModel.find(ORDERS_DB, { refNumber });

		if (orders.length === 0) {
			res
				.status(404)
				.json({ error: 'No orders found for this reference number' });
			return;
		}

		let deletedCount = 0;
		for (const order of orders) {
			await sealDBModel.delete(ORDERS_DB, order.uuid);
			deletedCount++;
		}

		res.status(200).json({
			message: 'Orders deleted successfully',
			refNumber,
			deletedCount,
		});
	} catch (error) {
		console.error('Error deleting orders by reference:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while deleting orders.',
		});
	}
});

router.get('/product/:productId', async (req, res) => {
	try {
		const productId = req.params.productId;
		const orders = await sealDBModel.find(ORDERS_DB, { productId });
		res.status(200).json(orders);
	} catch (error) {
		console.error('Error fetching orders by product:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching orders by product.',
		});
	}
});

router.get('/status/unsynced', async (req, res) => {
	try {
		const unsyncedOrders = await sealDBModel.getUnsyncedRecords(ORDERS_DB);
		res.status(200).json(unsyncedOrders);
	} catch (error) {
		console.error('Error fetching unsynced orders:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching unsynced orders.',
		});
	}
});

router.patch('/:orderId/sync', async (req, res) => {
	try {
		const orderId = req.params.orderId;
		const numReplaced = await sealDBModel.markAsSynced(ORDERS_DB, orderId);

		if (numReplaced === 0) {
			res.status(404).json({ error: 'Order not found' });
			return;
		}

		res.status(200).json({ message: 'Order marked as synced' });
	} catch (error) {
		console.error('Error marking order as synced:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while syncing order.',
		});
	}
});

router.get('/stats/count', async (req, res) => {
	try {
		const count = await sealDBModel.count(ORDERS_DB);
		res.status(200).json({ count });
	} catch (error) {
		console.error('Error counting orders:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while counting orders.',
		});
	}
});

router.get('/stats/summary/:refNumber', async (req, res) => {
	try {
		const refNumber = req.params.refNumber;
		const orders = await sealDBModel.find(ORDERS_DB, { refNumber });

		if (orders.length === 0) {
			res
				.status(404)
				.json({ error: 'No orders found for this reference number' });
			return;
		}

		const summary: any = {
			refNumber,
			itemCount: orders.length,
			totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
			totalPurchasePrice: orders.reduce(
				(sum, order) => sum + order.purchasePrice * order.quantity,
				0
			),
			totalSellPrice: orders.reduce(
				(sum, order) => sum + order.sellPrice * order.quantity,
				0
			),
			items: orders,
		};

		summary.totalProfit = summary.totalSellPrice - summary.totalPurchasePrice;

		res.status(200).json(summary);
	} catch (error) {
		console.error('Error getting order summary:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while getting order summary.',
		});
	}
});

router.post('/search', async (req, res) => {
	try {
		const conditions = req.body.conditions || {};
		const orders = await sealDBModel.find(ORDERS_DB, conditions);
		res.status(200).json(orders);
	} catch (error) {
		console.error('Error searching orders:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while searching orders.',
		});
	}
});

export default router;
