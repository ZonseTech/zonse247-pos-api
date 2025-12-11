import { HoldOrder } from 'order';
import { Request, Response, Router } from 'express';
import prisma from '../databases/prisma/client';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
	res.send('Hold Orders API');
});

router.get('/all', async (_req: Request, res: Response): Promise<void> => {
	try {
		const holdOrders = await prisma.holdOrder.findMany();

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
		const newHoldOrder: Partial<HoldOrder> = req.body;

		if (!newHoldOrder.date) {
			newHoldOrder.date = new Date().toISOString();
		}

		const createdHoldOrder = await prisma.holdOrder.create({
			data: newHoldOrder as any,
		});
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
			const holdOrder = await prisma.holdOrder.findUnique({
				where: { id: holdOrderId },
			});

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
			await prisma.holdOrder.delete({
				where: { id: holdOrderId },
			});

			res.status(200).json({ message: 'Hold order deleted successfully' });
		} catch (error: any) {
			if (error.code === 'P2025') {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}
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

			const updatedOrder = await prisma.holdOrder.update({
				where: { id: holdOrderId },
				data: updateData,
			});

			res.status(200).json({ message: 'Hold order updated successfully', data: updatedOrder });
		} catch (error: any) {
			if (error.code === 'P2025') {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}
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

			if (!userId) {
				res.status(400).json({ error: 'Invalid user ID' });
				return;
			}

			const holdOrders = await prisma.holdOrder.findMany({
				where: { userId },
			});
			res.status(200).json(holdOrders);
		} catch (error) {
			console.error('Error fetching hold orders by user:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while fetching hold orders by user.',
			});
		}
	}
);

router.get(
	'/till/:tillId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const tillId = req.params.tillId;

			if (!tillId) {
				res.status(400).json({ error: 'Invalid till ID' });
				return;
			}

			const holdOrders = await prisma.holdOrder.findMany({
				where: { till: tillId },
			});
			res.status(200).json(holdOrders);
		} catch (error) {
			console.error('Error fetching hold orders by till:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while fetching hold orders by till.',
			});
		}
	}
);

router.get(
	'/status/unsynced',
	async (_req: Request, res: Response): Promise<void> => {
		try {
			const unsyncedOrders = await prisma.holdOrder.findMany({
			});
			res.status(200).json(unsyncedOrders);
		} catch (error) {
			console.error('Error fetching unsynced hold orders:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while fetching unsynced hold orders.',
			});
		}
	}
);

router.patch(
	'/:holdOrderId/sync',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const holdOrderId = req.params.holdOrderId;
			await prisma.holdOrder.update({
				where: { id: holdOrderId },
				data: {},
			});

			res.status(200).json({ message: 'Hold order marked as synced' });
		} catch (error: any) {
			if (error.code === 'P2025') {
				res.status(404).json({ error: 'Hold order not found' });
				return;
			}
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
			const count = await prisma.holdOrder.count();
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

			if (!userId) {
				res.status(400).json({ error: 'Invalid user ID' });
				return;
			}

			const count = await prisma.holdOrder.count({
				where: { userId },
			});
			res.status(200).json({ count, userId });
		} catch (error) {
			console.error('Error counting hold orders by user:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while counting hold orders by user.',
			});
		}
	}
);

router.get(
	'/stats/count/till/:tillId',
	async (req: Request, res: Response): Promise<void> => {
		try {
			const tillId = req.params.tillId;

			if (!tillId) {
				res.status(400).json({ error: 'Invalid till ID' });
				return;
			}

			const count = await prisma.holdOrder.count({
				where: { till: tillId },
			});
			res.status(200).json({ count, tillId });
		} catch (error) {
			console.error('Error counting hold orders by till:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while counting hold orders by till.',
			});
		}
	}
);

router.post('/search', async (req: Request, res: Response): Promise<void> => {
	try {
		const conditions = req.body.conditions || {};
		const holdOrders = await prisma.holdOrder.findMany({
			where: conditions,
		});
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