import {
	CATEGORY_DB,
	CUSTOMER_DB,
	INVENTORY_DB,
	ORDERS_DB,
	PAYMENT_METHODS_DB,
	TRANSACTIONS_DB,
	USERS_DB,
} from '../tables';
import bcrypt from 'bcryptjs';
import { sealDBModel } from '..';
import { v4 as uuidv4 } from 'uuid';
import type { Category, Customer, PaymentMethodData, User } from '@/types';

const tables = [
	{
		id: CUSTOMER_DB,
		name: 'Customers',
		description: 'User accounts and profiles',
	},
	{
		id: CATEGORY_DB,
		name: 'Categories',
		description: 'Product categories',
	},
	{
		id: PAYMENT_METHODS_DB,
		name: 'Payment Methods',
		description: 'Payment methods',
	},
	{
		id: USERS_DB,
		name: 'Users',
		description: 'Sales transactions',
	},
	{
		id: INVENTORY_DB,
		name: 'Products Inventory',
		description: 'User accounts and profiles',
	},
	{
		id: TRANSACTIONS_DB,
		name: 'Transactions',
		description: 'Product inventory',
	},
	{
		id: ORDERS_DB,
		name: 'Transaction Items',
		description: 'User accounts and profiles',
	},
];

const checkOrCreateDefaultUser = async () => {
	try {
		const saltRounds = 10;
		const user = await sealDBModel.findAll(USERS_DB);

		if (user[0]) return;

		const hash = await bcrypt.hash('admin', saltRounds);

		const adminUser: User = {
			uuid: uuidv4(),
			username: 'admin',
			fullname: 'Administrator',
			password: hash,
			permProducts: 1,
			permCategories: 1,
			permTransactions: 1,
			permUsers: 1,
			permSettings: 1,
			status: 'active',
		};

		await sealDBModel.insert(USERS_DB, adminUser);
	} catch (error) {
		console.error(error);
	}
};

const checkOrCreateDefaultCustomer = async () => {
	try {
		const customer = await sealDBModel.findAll(CUSTOMER_DB);

		if (customer[0]) return;

		const defaultCustomer: Customer = {
			uuid: '-1',
			name: 'Walk in customer',
		};

		await sealDBModel.insert(CUSTOMER_DB, defaultCustomer);
	} catch (err) {
		console.error(err);
	}
};

async function checkAndCreateDefaultCategory(): Promise<void> {
	try {
		const category = await sealDBModel.findAll(CATEGORY_DB);

		if (category[0]) return;

		const defaultCategory: Category = {
			uuid: uuidv4(),
			name: 'Consumables',
		};

		await sealDBModel.insert(CATEGORY_DB, defaultCategory);
	} catch (err) {
		console.error(err);
	}
}

async function checkOrCreateDefaultPaymentMethods(): Promise<void> {
	const DEFAULT_PAYMENT_METHODS: Array<PaymentMethodData> = [
		{
			name: 'Cash',
			uuid: '1',
		},
		{
			name: 'Mobile Transfer',
			uuid: '2',
		},
	];

	try {
		const paymentMethod = await sealDBModel.findAll(PAYMENT_METHODS_DB);

		if (paymentMethod[0]) return;

		const insertOperations = DEFAULT_PAYMENT_METHODS.map((method) =>
			sealDBModel.insert(PAYMENT_METHODS_DB, method)
		);
		await Promise.all(insertOperations);
	} catch (err) {
		console.error('Failed to setup payment methods:', err);
	}
}

const seedDatabase = async () => {
	try {
		checkOrCreateDefaultUser();
		checkOrCreateDefaultCustomer();
		checkAndCreateDefaultCategory();
		checkOrCreateDefaultPaymentMethods();
		console.log('Seed migrated successfully');
		return true;
	} catch (error) {
		console.error('Error seeding database:', error);
		return false;
	}
};

export { tables, seedDatabase };
