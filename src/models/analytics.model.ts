import dayjs from 'dayjs';
import { Transaction } from 'transactions';
import { DashboardCounts, MonthlySales, TopProduct } from 'analytics';
import prisma from '../databases/prisma/client';
import { InventoryStatus } from '../databases/prisma/generated/prisma/enums';


export class AnalyticsModel {
    static async getMonthlySalesData(userId: string, year: number, month: number): Promise<Array<MonthlySales>> {
        const lastDayOfMonth = new Date(year, month, 0);
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const endDate = dayjs(lastDayOfMonth).format('YYYY-MM-DD');
        const startDate = dayjs(firstDayOfMonth).format('YYYY-MM-DD');

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });

        const salesData = [] as Array<MonthlySales>;
        const daysInMonth = lastDayOfMonth.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = dayjs(new Date(year, month - 1, day)).format('YYYY-MM-DD');

            const dayTransactions = transactions.filter((transaction) => {
                const t = dayjs(transaction.date).format('YYYY-MM-DD');
                return t === currentDate;
            });

            const totalAmount = dayTransactions.reduce((sum, transaction) => {
                return sum + (parseFloat(transaction.total.toString()) || 0);
            }, 0);

            salesData.push({
                date: day,
                totalAmount: Math.round(totalAmount * 100) / 100,
            });
        }

        return salesData;
    }

    static async getUserTransactions(
        userId: string,
        limit: number,
        offset: number,
        includeItems = false
    ): Promise<{
        total: number;
        transactions: Array<Transaction>;
        hasMore: boolean;
    }> {
        const transactions = await prisma.transaction.findMany({
            where: { userId },
        });

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
                    const orderItems = await prisma.order.findMany({
                        where: {
                            transactionId: transaction.transactionId,
                        },
                    });

                    const itemsWithProductDetails = await Promise.all(
                        orderItems.map(async (item) => {
                            const product = await prisma.inventory.findUnique({
                                where: { productId: item.productId },
                            });
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
            transactions: processedTransactions as any,
            hasMore: offset + limit < transactions.length,
        };
    }

    static async getTopProducts(): Promise<Array<TopProduct>> {
        const [orders, products, categories] = await Promise.all([
            prisma.order.findMany(),
            prisma.inventory.findMany({
                where: { status: { not: InventoryStatus.inactive } },
            }),
            prisma.category.findMany(),
        ]);

        const productMap = new Map();
        products.forEach((product) => {
            const key = product.productId;
            if (key !== null && key !== undefined) {
                productMap.set(key, product);
            }
        });

        const categoryMap = new Map();
        categories.forEach((category) => {
            categoryMap.set(category.categoryId.toString(), category);
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
                quantity: parseInt(existing.quantity?.toString()) + parseInt(order.quantity.toString()),
                summedSellPrice:
                    existing.summedSellPrice + parseFloat(order.sellPrice.toString()) * parseInt(order.quantity.toString()),
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

    static async getDashboardCounts(userId: string): Promise<DashboardCounts> {
        const transactions = await prisma.transaction.findMany({
            where: { userId },
        });

        const inventoryProducts = await prisma.inventory.findMany({
            where: { status: { not: InventoryStatus.inactive } },
        });

        const [userCount, customerCount] = await Promise.all([
            prisma.user.count(),
            prisma.customer.count(),
        ]);

        const myTotalTransactions = transactions.length;

        const totalSales =
            (Math.round(
                transactions.reduce(
                    (sum, transaction) => sum + (parseInt(transaction.total.toString()) || 0),
                    0
                ) * 100
            ) / 100)?.toString();

        const expiredProducts = inventoryProducts.filter((product) => {
            const expirationDate = new Date(product.expirationDate);
            return expirationDate < new Date() && product.status !== InventoryStatus.inactive;
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

    static async getTransactionItems(transactionId: string): Promise<{
        transaction: any;
        orderItems: Array<any>;
    }> {
        const [transaction, orderItems] = await Promise.all([
            prisma.transaction.findUnique({
                where: { transactionId },
            }),
            prisma.order.findMany({
                where: { transactionId },
            }),
        ]);

        if (!transaction) {
            return { transaction: null, orderItems: [] };
        }

        const itemsWithProductDetails = await Promise.all(
            orderItems.map(async (item) => {
                const product = await prisma.inventory.findUnique({
                    where: { productId: item.productId },
                });
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

    static async getTransactionDetails(transactionId: string): Promise<{
        transaction: any;
        orderItems: Array<any>;
        summary: any;
    }> {
        const [transaction, orderItems, categories] = await Promise.all([
            prisma.transaction.findUnique({
                where: { transactionId },
            }),
            prisma.order.findMany({
                where: { transactionId },
            }),
            prisma.category.findMany(),
        ]);

        if (!transaction) {
            return { transaction: null, orderItems: [], summary: {} };
        }

        const categoryMap = new Map<string, any>();
        categories.forEach((category) => {
            categoryMap.set(category.categoryId.toString(), category);
        });

        const detailedOrderItems = await Promise.all(
            orderItems.map(async (item) => {
                const product = await prisma.inventory.findUnique({
                    where: { productId: item.productId },
                });

                let categoryDetails = null;
                if (product && product.categoryId) {
                    categoryDetails = categoryMap.get(product.categoryId.toString());
                }

                return {
                    ...item,
                    productDetails: product,
                    categoryDetails,
                    lineTotal: parseFloat(item.sellPrice.toString()) * parseInt(item.quantity?.toString()),
                    profit: (parseFloat(item.sellPrice.toString()) - parseFloat(item.purchasePrice?.toString())) * parseInt(item.quantity?.toString()),
                };
            })
        );

        const summary = {
            totalItems: orderItems.reduce((sum, item) => sum + parseInt(item.quantity?.toString()), 0),
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
                    ? detailedOrderItems.reduce((sum, item) => sum + parseFloat(item.sellPrice.toString()), 0) /
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