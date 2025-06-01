import { Router, Request, Response } from 'express';
import {
	TRANSACTIONS_DB,
	CATEGORY_DB,
	INVENTORY_DB,
	ORDERS_DB,
	USERS_DB,
	CUSTOMER_DB,
} from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { formatCurrency } from '../utils';

const router = Router();

router.get(
	'/monthly-sales/:userId/:monthYear',
	async (req: Request, res: Response) => {
		try {
			const userId = req.params.userId;
			const monthYear = req.params.monthYear;
			const [year, month] = monthYear.split('-').map(Number);

			const lastDayOfMonth = new Date(year, month, 0);
			const firstDayOfMonth = new Date(year, month - 1, 1);

			const endDate = lastDayOfMonth.toISOString().split('T')[0];
			const startDate = firstDayOfMonth.toISOString().split('T')[0];

			const transactions: Array<Transaction> = await sealDBModel.find(
				TRANSACTIONS_DB,
				{
					userId,
					date: {
						$gte: startDate,
						$lte: endDate,
					},
				}
			);

			const salesData = [] as Array<MonthlySales>;
			const daysInMonth = lastDayOfMonth.getDate();

			for (let day = 1; day <= daysInMonth; day++) {
				const currentDate = new Date(year, month - 1, day);
				const dateString = currentDate.toISOString().split('T')[0];

				const dayTransactions = transactions.filter(
					(transaction) =>
						transaction.date.toString().split('T')[0] === dateString
				);

				const totalAmount = dayTransactions.reduce((sum, transaction) => {
					return sum + (transaction.total || 0);
				}, 0);

				salesData.push({
					date: day,
					totalAmount: Math.round(totalAmount * 100) / 100,
				});
			}

			res.json(salesData);
		} catch (error) {
			console.error('Error fetching monthly sales data:', error);
			res.status(500).json({
				error: 'Failed to fetch monthly sales data',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
);

router.get(
	'/transactions/:userId/:limit/:offset',
	async (req: Request, res: Response) => {
		try {
			const userId = req.params.userId;
			const limit = parseInt(req.params.limit);
			const offset = parseInt(req.params.offset) || 0;
			const includeItems = req.query.includeItems === 'true';

			const transactions: Array<Transaction> = await sealDBModel.find(
				TRANSACTIONS_DB,
				{
					userId,
				}
			);

			const sortedTransactions = transactions
				.sort((a, b) => {
					const dateA = new Date(a.date || a.createdAt || '');
					const dateB = new Date(b.date || b.createdAt || '');
					return dateB.getTime() - dateA.getTime();
				})
				.slice(offset, offset + limit);

			if (includeItems) {
				const transactionsWithItems = await Promise.all(
					sortedTransactions.map(async (transaction) => {
						const orderItems = await sealDBModel.find(ORDERS_DB, {
							transactionId: transaction.uuid,
						});

						const itemsWithProductDetails = await Promise.all(
							orderItems.map(async (item) => {
								const product = await sealDBModel.findById(
									INVENTORY_DB,
									item.productId
								);
								return {
									...item,
									productDetails: product,
								};
							})
						);

						return {
							...transaction,
							items: itemsWithProductDetails,
						};
					})
				);

				res.json({
					total: transactions.length,
					transactions: transactionsWithItems,
					hasMore: offset + limit < transactions.length,
				});
			} else {
				res.json({
					total: transactions.length,
					transactions: sortedTransactions,
					hasMore: offset + limit < transactions.length,
				});
			}
		} catch (error) {
			console.error('Error fetching user transactions:', error);
			res.status(500).json({
				error: 'Failed to fetch user transactions',
				message: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
);

router.get('/top-products', async (req: Request, res: Response) => {
	try {
		const [orders, products, categories] = await Promise.all([
			sealDBModel.findAll(ORDERS_DB),
			sealDBModel.find(INVENTORY_DB, { status: { $ne: 'void' } }),
			sealDBModel.findAll(CATEGORY_DB),
		]);

		const productMap = new Map<string | number, Product>();
		products.forEach((product) => {
			const key = product.uuid;
			if (key !== null && key !== undefined) {
				productMap.set(key, product);
			}
		});

		const categoryMap = new Map<string, Category>();
		categories.forEach((category) => {
			categoryMap.set(category.uuid.toString(), category);
		});

		const productSummary = new Map<
			string | number,
			{
				quantity: number;
				summedSellPrice: number;
			}
		>();

		orders.forEach((order) => {
			const productId = order.productId;
			const existing = productSummary.get(productId) || {
				quantity: 0,
				summedSellPrice: 0,
			};

			productSummary.set(productId, {
				quantity: existing.quantity + order.quantity,
				summedSellPrice:
					existing.summedSellPrice + order.sellPrice * order.quantity,
			});
		});

		const topProducts = [] as Array<TopProduct>;

		productSummary.forEach((summary, productId) => {
			const product = productMap.get(productId);
			if (product) {
				if (product.categoryId) {
					const categoryKey = product.categoryId.toString();
					if (categoryMap.has(categoryKey)) {
						product.categoryDetails = categoryMap.get(categoryKey);
					}
				}

				topProducts.push({
					uuid: product.uuid || productId.toString(),
					name: product.name || 'Unknown Product',
					quantity: summary.quantity,
					summedSellPrice: Math.round(summary.summedSellPrice * 100) / 100,
					categoryName: product.categoryDetails?.name || 'Uncategorized',
				});
			}
		});

		const sortedTopProducts = topProducts
			.sort((a, b) => b.quantity - a.quantity)
			.slice(0, 10);

		res.json(sortedTopProducts);
	} catch (error) {
		console.error('Error fetching top products:', error);
		res.status(500).json({
			error: 'Failed to fetch top products',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
});

router.get('/counts/:userId', async (req: Request, res: Response) => {
	try {
		const userId = req.params.userId;

		const [transactions, inventoryProducts, userCount, customerCount] =
			await Promise.all([
				sealDBModel.find(TRANSACTIONS_DB, { userId: userId }),
				sealDBModel.find(INVENTORY_DB, { status: { $ne: 'void' } }),
				sealDBModel.count(USERS_DB),
				sealDBModel.count(CUSTOMER_DB),
			]);

		const myTotalTransactions = transactions.length;

		const total_sales =
			Math.round(
				transactions.reduce(
					(sum, transaction) => sum + (transaction.total || 0),
					0
				) * 100
			) / 100;

		const expiredProducts = inventoryProducts.filter((product) => {
			const expirationDate = new Date(product.expirationDate);
			return expirationDate < new Date() && product.status !== 'void';
		}).length;

		const totalProducts = inventoryProducts.reduce(
			(sum, product) => sum + (parseInt(product.quantity.toString()) || 0),
			0
		);

		const dashboardCounts: DashboardCounts = {
			totalSales: formatCurrency(total_sales),
			stock: totalProducts,
			totalUsers: userCount,
			allCustomers: customerCount,
			expiredProducts: expiredProducts,
			myTotalTransactions: myTotalTransactions,
		};

		res.json(dashboardCounts);
	} catch (error) {
		console.error('Error fetching dashboard counts:', error);
		res.status(500).json({
			error: 'Failed to fetch dashboard counts',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
});

router.get('/transaction/:transactionId/items', (async (
	req: Request,
	res: Response
) => {
	try {
		const transactionId = req.params.transactionId;

		const [transaction, orderItems] = await Promise.all([
			sealDBModel.findById(TRANSACTIONS_DB, transactionId),
			sealDBModel.find(ORDERS_DB, { transactionId }),
		]);

		if (!transaction) {
			return res.status(404).json({
				error: 'Transaction not found',
			});
		}

		const itemsWithProductDetails = await Promise.all(
			orderItems.map(async (item) => {
				const product = await sealDBModel.findById(
					INVENTORY_DB,
					item.productId
				);
				return {
					...item,
					productDetails: product,
				};
			})
		);

		res.json({
			transaction,
			orderItems: itemsWithProductDetails,
		});
	} catch (error) {
		console.error('Error fetching transaction items:', error);
		res.status(500).json({
			error: 'Failed to fetch transaction items',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}) as any);

router.get('/transaction/:transactionId/details', (async (
	req: Request,
	res: Response
) => {
	try {
		const transactionId = req.params.transactionId;

		const [transaction, orderItems, categories] = await Promise.all([
			sealDBModel.findById(TRANSACTIONS_DB, transactionId),
			sealDBModel.find(ORDERS_DB, { transactionId }),
			sealDBModel.findAll(CATEGORY_DB),
		]);

		if (!transaction) {
			return res.status(404).json({
				error: 'Transaction not found',
			});
		}

		const categoryMap = new Map<string, Category>();
		categories.forEach((category: Category) => {
			categoryMap.set(category.uuid.toString(), category);
		});

		const detailedOrderItems = await Promise.all(
			orderItems.map(async (item) => {
				const product = await sealDBModel.findById(
					INVENTORY_DB,
					item.productId
				);

				let categoryDetails = null;
				if (product && product.categoryId) {
					categoryDetails = categoryMap.get(product.categoryId.toString());
				}

				return {
					...item,
					productDetails: product,
					categoryDetails,
					lineTotal: item.sellPrice * item.quantity,
					profit: (item.sellPrice - item.purchasePrice) * item.quantity,
				};
			})
		);

		const summary = {
			totalItems: orderItems.reduce((sum, item) => sum + item.quantity, 0),
			totalAmount: detailedOrderItems.reduce(
				(sum, item) => sum + item.lineTotal,
				0
			),
			totalProfit: detailedOrderItems.reduce(
				(sum, item) => sum + item.profit,
				0
			),
			averageItemPrice:
				detailedOrderItems.length > 0
					? detailedOrderItems.reduce((sum, item) => sum + item.sellPrice, 0) /
					  detailedOrderItems.length
					: 0,
		};

		res.json({
			transaction,
			orderItems: detailedOrderItems,
			summary: {
				...summary,
				totalAmount: Math.round(summary.totalAmount * 100) / 100,
				totalProfit: Math.round(summary.totalProfit * 100) / 100,
				averageItemPrice: Math.round(summary.averageItemPrice * 100) / 100,
			},
		});
	} catch (error) {
		console.error('Error fetching transaction details:', error);
		res.status(500).json({
			error: 'Failed to fetch transaction details',
			message: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}) as any);

export default router;
