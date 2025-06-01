import { Request, Response, Router } from 'express';
import { HOLD_ORDERS_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { HoldOrder } from '@/types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
	res.send('Hold Orders API');
});

router.get('/all', async (_req: Request, res: Response): Promise<void> => {
	try {
		const holdOrders = await sealDBModel.findAll(HOLD_ORDERS_DB);

		const sortedOrders = holdOrders.sort((a, b) => {
			const dateA = new Date(a.date || 0).getTime();
			const dateB = new Date(b.date || 0).getTime();
			return dateB - dateA;
		});

		res.status(200).json(sortedOrders);
	} catch (error) {
		console.error('Error fetching all hold orders:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching hold orders.',
		});
	}
});

router.post('/new', async (req: Request, res: Response): Promise<void> => {
	try {
		const newHoldOrder: HoldOrder = req.body;

		if (!newHoldOrder.date) {
			newHoldOrder.date = new Date().toISOString();
		}

		const createdHoldOrder = await sealDBModel.insert(
			HOLD_ORDERS_DB,
			newHoldOrder
		);
		res.status(201).json(createdHoldOrder);
	} catch (error) {
		console.error('Error creating hold order:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while creating hold order.',
		});
	}
});

router.get(
	'/:holdOrderId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const holdOrderId = req.params.holdOrderId;
			const holdOrder = await sealDBModel.findById(HOLD_ORDERS_DB, holdOrderId);

			if (!holdOrder) {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}

			res.status(200).json(holdOrder);
		} catch (error) {
			console.error('Error fetching hold order:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while fetching hold order.',
			});
		}
	}
);

router.delete(
	'/:holdOrderId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const holdOrderId = req.params.holdOrderId;
			const numRemoved = await sealDBModel.delete(HOLD_ORDERS_DB, holdOrderId);

			if (numRemoved === 0) {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}

			res.status(200).json({ message: 'Hold order deleted successfully' });
		} catch (error) {
			console.error('Error deleting hold order:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while deleting hold order.',
			});
		}
	}
);

router.put(
	'/:holdOrderId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const holdOrderId = req.params.holdOrderId;
			const updateData = req.body;

			const numReplaced = await sealDBModel.update(
				HOLD_ORDERS_DB,
				holdOrderId,
				updateData
			);

			if (numReplaced === 0) {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}

			res.status(200).json({ message: 'Hold order updated successfully' });
		} catch (error) {
			console.error('Error updating hold order:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while updating hold order.',
			});
		}
	}
);

router.get(
	'/user/:userId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const userId = req.params.userId;

			if (userId) {
				res.status(400).json({ error: 'Invalid user ID' });
				return;
			}

			const holdOrders = await sealDBModel.find(HOLD_ORDERS_DB, {
				userId,
			});
			res.status(200).json(holdOrders);
		} catch (error) {
			console.error('Error fetching hold orders by user:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message:
					'An unexpected error occurred while fetching hold orders by user.',
			});
		}
	}
);

router.get(
	'/till/:tillId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const tillId = req.params.tillId;

			if (tillId) {
				res.status(400).json({ error: 'Invalid till ID' });
				return;
			}

			const holdOrders = await sealDBModel.find(HOLD_ORDERS_DB, {
				till: tillId,
			});
			res.status(200).json(holdOrders);
		} catch (error) {
			console.error('Error fetching hold orders by till:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message:
					'An unexpected error occurred while fetching hold orders by till.',
			});
		}
	}
);

router.get(
	'/status/unsynced',
	async (_req: Request, res: Response): Promise<void> => {
		try {
			const unsyncedOrders = await sealDBModel.getUnsyncedRecords(
				HOLD_ORDERS_DB
			);
			res.status(200).json(unsyncedOrders);
		} catch (error) {
			console.error('Error fetching unsynced hold orders:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message:
					'An unexpected error occurred while fetching unsynced hold orders.',
			});
		}
	}
);

router.patch(
	'/:holdOrderId/sync',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const holdOrderId = req.params.holdOrderId;
			const numReplaced = await sealDBModel.markAsSynced(
				HOLD_ORDERS_DB,
				holdOrderId
			);

			if (numReplaced === 0) {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}

			res.status(200).json({ message: 'Hold order marked as synced' });
		} catch (error) {
			console.error('Error marking hold order as synced:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while syncing hold order.',
			});
		}
	}
);

router.get(
	'/stats/count',
	async (_req: Request, res: Response): Promise<void> => {
		try {
			const count = await sealDBModel.count(HOLD_ORDERS_DB);
			res.status(200).json({ count });
		} catch (error) {
			console.error('Error counting hold orders:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while counting hold orders.',
			});
		}
	}
);

router.get(
	'/stats/count/user/:userId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const userId = req.params.userId;

			if (userId) {
				res.status(400).json({ error: 'Invalid user ID' });
				return;
			}

			const count = await sealDBModel.count(HOLD_ORDERS_DB, {
				userId: userId,
			});
			res.status(200).json({ count, userId });
		} catch (error) {
			console.error('Error counting hold orders by user:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message:
					'An unexpected error occurred while counting hold orders by user.',
			});
		}
	}
);

router.get(
	'/stats/count/till/:tillId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const tillId = req.params.tillId;

			if (tillId) {
				res.status(400).json({ error: 'Invalid till ID' });
				return;
			}

			const count = await sealDBModel.count(HOLD_ORDERS_DB, { till: tillId });
			res.status(200).json({ count, tillId });
		} catch (error) {
			console.error('Error counting hold orders by till:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message:
					'An unexpected error occurred while counting hold orders by till.',
			});
		}
	}
);

router.post('/search', async (req: Request, res: Response): Promise<void> => {
	try {
		const conditions = req.body.conditions || {};
		const holdOrders = await sealDBModel.find(HOLD_ORDERS_DB, conditions);
		res.status(200).json(holdOrders);
	} catch (error) {
		console.error('Error searching hold orders:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while searching hold orders.',
		});
	}
});

export default router;
