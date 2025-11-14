import {
    TRANSACTIONS_DB,
    CATEGORIES_DB,
    INVENTORY_DB,
    ORDERS_DB,
    USERS_DB,
    CUSTOMERS_DB,
} from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import dayjs from 'dayjs';

export class AnalyticsModel {
    static async getMonthlySalesData(userUuid: string, year: number, month: number): Promise<Array<MonthlySales>> {
        const lastDayOfMonth = new Date(year, month, 0);
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const endDate = dayjs(lastDayOfMonth).format('YYYY-MM-DD');
        const startDate = dayjs(firstDayOfMonth).format('YYYY-MM-DD');

        const transactions: Array<Transaction> = await sealDBModel.find(
            TRANSACTIONS_DB,
            {
                userUuid,
                date: {
                    $gte: startDate,
                    $lte: endDate,
                },
            }
        );

        const salesData = [] as Array<MonthlySales>;
        const daysInMonth = lastDayOfMonth.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = dayjs(new Date(year, month - 1, day)).format('YYYY-MM-DD');

            const dayTransactions = transactions.filter((transaction) => {
                const t = dayjs(transaction.date).format('YYYY-MM-DD');
                return t === currentDate;
            });

            const totalAmount = dayTransactions.reduce((sum, transaction) => {
                return sum + (transaction.total || 0);
            }, 0);

            salesData.push({
                date: day,
                totalAmount: Math.round(totalAmount * 100) / 100,
            });
        }

        return salesData;
    }

    static async getUserTransactions(
        userUuid: string,
        limit: number,
        offset: number,
        includeItems = false
    ): Promise<{
        total: number;
        transactions: Array<Transaction>;
        hasMore: boolean;
    }> {
        const transactions: Array<Transaction> = await sealDBModel.find(
            TRANSACTIONS_DB,
            { userUuid }
        );

        const sortedTransactions = transactions
            .sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || '');
                const dateB = new Date(b.date || b.createdAt || '');
                return dateB.getTime() - dateA.getTime();
            })
            .slice(offset, offset + limit);

        let processedTransactions = sortedTransactions;

        if (includeItems) {
            processedTransactions = await Promise.all(
                sortedTransactions.map(async (transaction) => {
                    const orderItems = await sealDBModel.find(ORDERS_DB, {
                        transactionUuid: transaction.transactionId,
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
        }

        return {
            total: transactions.length,
            transactions: processedTransactions,
            hasMore: offset + limit < transactions.length,
        };
    }

    static async getTopProducts(): Promise<Array<TopProduct>> {
        const [orders, products, categories] = await Promise.all([
            sealDBModel.findAll(ORDERS_DB),
            sealDBModel.find(INVENTORY_DB, { status: { $ne: 'void' } }),
            sealDBModel.findAll(CATEGORIES_DB),
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
                quantity: parseInt(existing.quantity?.toString()) + parseInt(order.quantity),
                summedSellPrice:
                    existing.summedSellPrice + order.sellPrice * order.quantity,
            });
        });

        const topProducts = [] as Array<TopProduct>;

        productSummary.forEach((summary, productId: string) => {
            const product = productMap.get(productId);

            if (product) {
                if (product.productId) {
                    const categoryKey = product.categoryId.toString();
                    if (categoryMap.has(categoryKey)) {
                        product.categoryDetails = categoryMap.get(categoryKey);
                    }
                }

                topProducts.push({
                    productId: product.productId || productId,
                    name: product.name || 'Unknown Product',
                    quantity: summary.quantity,
                    summedSellPrice: Math.round(summary.summedSellPrice * 100) / 100,
                    categoryName: product.categoryDetails?.name || 'Uncategorized',
                });
            }
        });

        return topProducts
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    }

    static async getDashboardCounts(userUuid: string): Promise<DashboardCounts> {
        const [transactions, inventoryProducts, userCount, customerCount] =
            await Promise.all([
                sealDBModel.find(TRANSACTIONS_DB, { userUuid }),
                sealDBModel.find(INVENTORY_DB, { status: { $ne: 'void' } }),
                sealDBModel.count(USERS_DB),
                sealDBModel.count(CUSTOMERS_DB),
            ]);

        const myTotalTransactions = transactions.length;

        const totalSales =
            (Math.round(
                transactions.reduce(
                    (sum, transaction) => sum + (transaction.total || 0),
                    0
                ) * 100
            ) / 100)?.toString();

        const expiredProducts = inventoryProducts.filter((product) => {
            const expirationDate = new Date(product.expirationDate);
            return expirationDate < new Date() && product.status !== 'void';
        }).length;

        const totalProducts = inventoryProducts.reduce(
            (sum, product) => sum + (parseInt(product.quantity.toString()) || 0),
            0
        );

        return {
            totalSales,
            stock: totalProducts,
            totalUsers: userCount,
            allCustomers: customerCount,
            expiredProducts: expiredProducts,
            myTotalTransactions: myTotalTransactions,
        };
    }

    static async getTransactionItems(transactionUuid: string): Promise<{
        transaction: Transaction | null;
        orderItems: Array<any>;
    }> {
        const [transaction, orderItems] = await Promise.all([
            sealDBModel.findById(TRANSACTIONS_DB, transactionUuid),
            sealDBModel.find(ORDERS_DB, { transactionUuid }),
        ]);

        if (!transaction) {
            return { transaction: null, orderItems: [] };
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

        return {
            transaction,
            orderItems: itemsWithProductDetails,
        };
    }

    static async getTransactionDetails(transactionUuid: string): Promise<{
        transaction: Transaction | null;
        orderItems: Array<any>;
        summary: any;
    }> {
        const [transaction, orderItems, categories] = await Promise.all([
            sealDBModel.findById(TRANSACTIONS_DB, transactionUuid),
            sealDBModel.find(ORDERS_DB, { transactionUuid }),
            sealDBModel.findAll(CATEGORIES_DB),
        ]);

        if (!transaction) {
            return { transaction: null, orderItems: [], summary: {} };
        }

        const categoryMap = new Map<string, Category>();
        categories.forEach((category: Category) => {
            categoryMap.set(category.categoryId.toString(), category);
        });

        const detailedOrderItems = await Promise.all(
            orderItems.map(async (item) => {
                const product = await sealDBModel.findById(
                    INVENTORY_DB,
                    item.productId
                );

                let categoryDetails = null;
                if (product && product.categoryUuid) {
                    categoryDetails = categoryMap.get(product.categoryUuid.toString());
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

        return {
            transaction,
            orderItems: detailedOrderItems,
            summary: {
                ...summary,
                totalAmount: Math.round(summary.totalAmount * 100) / 100,
                totalProfit: Math.round(summary.totalProfit * 100) / 100,
                averageItemPrice: Math.round(summary.averageItemPrice * 100) / 100,
            },
        };
    }
}
