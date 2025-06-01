import { Request, Response, Router } from 'express';
import validator from 'validator';
import { v4 as uuidv4 } from 'uuid';
import { CUSTOMER_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { Customer } from '@/types';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
	res.send('Customer API');
});

router.get(
	'/customer/:customerId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			if (!req.params.customerId) {
				res.status(400).send('ID field is required.');
				return;
			}

			const customer = await sealDBModel.findById(
				CUSTOMER_DB,
				req.params.customerId
			);

			if (!customer) {
				res.status(404).json({ error: 'Customer not found' });
				return;
			}

			res.json(customer);
		} catch (error) {
			console.error('Error fetching customer:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while fetching customer.',
			});
		}
	}
);

router.get('/all', async function (req: Request, res: Response): Promise<void> {
	try {
		const customers = await sealDBModel.findAll(CUSTOMER_DB);
		res.json(customers);
	} catch (error) {
		console.error('Error fetching all customers:', error);
		res.status(500).json({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred while fetching customers.',
		});
	}
});

router.post(
	'/customer',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const newCustomer: Customer = req.body;
			newCustomer.uuid = uuidv4();

			const createdCustomer = await sealDBModel.insert(
				CUSTOMER_DB,
				newCustomer
			);

			res
				.status(201)
				.location(`/customer/${createdCustomer.uuid}`)
				.json(createdCustomer);
		} catch (error) {
			console.error('Error creating customer:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while creating customer.',
			});
		}
	}
);

router.delete(
	'/customer/:customerId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			if (!req.params.customerId) {
				res.status(400).send('ID field is required.');
				return;
			}

			const numRemoved = await sealDBModel.delete(
				CUSTOMER_DB,
				req.params.customerId
			);

			if (numRemoved === 0) {
				res.status(404).json({ error: 'Customer not found' });
				return;
			}

			res.sendStatus(200);
		} catch (error) {
			console.error('Error deleting customer:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while deleting customer.',
			});
		}
	}
);

router.put(
	'/customer',
	async function (req: Request, res: Response): Promise<void> {
		try {
			if (!req.body.uuid) {
				res.status(400).json({ error: 'Customer ID is required for update.' });
				return;
			}

			const customerId = validator.escape(req.body.uuid.toString());

			const { ...updateData } = req.body;

			const numReplaced = await sealDBModel.update(
				CUSTOMER_DB,
				customerId,
				updateData
			);

			if (numReplaced === 0) {
				res.status(404).json({ error: 'Customer not found' });
				return;
			}

			res.sendStatus(200);
		} catch (error) {
			console.error('Error updating customer:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while updating customer.',
			});
		}
	}
);

router.get(
	'/customers/count',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const count = await sealDBModel.count(CUSTOMER_DB);
			res.json({ count });
		} catch (error) {
			console.error('Error counting customers:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while counting customers.',
			});
		}
	}
);

router.post(
	'/customers/search',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const conditions = req.body.conditions || {};
			const customers = await sealDBModel.find(CUSTOMER_DB, conditions);
			res.json(customers);
		} catch (error) {
			console.error('Error searching customers:', error);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred while searching customers.',
			});
		}
	}
);

export default router;
