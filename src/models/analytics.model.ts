import dayjs from 'dayjs';
import { Transaction } from 'transactions';
import { DashboardCounts, MonthlySales, TopProduct } from 'analytics';
import prisma from '../databases/prisma/client';


export class AnalyticsModel {
    static async getMonthlySalesData(
        tenantId: string,
        branchId: string,
        year: number,
        month: number
    ): Promise<Array<MonthlySales>> {
        const lastDayOfMonth = new Date(year, month, 0);
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const endDate = dayjs(lastDayOfMonth).format('YYYY-MM-DD');
        const startDate = dayjs(firstDayOfMonth).format('YYYY-MM-DD');

        const transactions = await prisma.transaction.findMany({
            where: {
                tenantId,
                branchId,
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
        tenantId: string,
        branchId: string,
        limit: number,
        offset: number,
        includeItems = false
    ): Promise<{
        total: number;
        transactions: Array<Transaction>;
        hasMore: boolean;
    }> {
        const [total, transactions] = await Promise.all([
            prisma.transaction.count({
                where: {
                    tenantId,
                    branchId,
                },
            }),
            prisma.transaction.findMany({
                where: {
                    tenantId,
                    branchId,
                },
                orderBy: [
                    { date: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip: offset,
                take: limit,
                ...(includeItems && {
                    include: {
                        user: {
                            select: {
                                userId: true,
                                fullname: true,
                                username: true,
                            },
                        },
                        customer: {
                            select: {
                                customerId: true,
                                name: true,
                            },
                        },
                        paymentMethod: {
                            select: {
                                methodId: true,
                                name: true,
                            },
                        },
                    },
                }),
            }),
        ]);

        return {
            total,
            transactions: transactions as any,
            hasMore: offset + limit < total,
        };
    }

    static async getTopProducts(tenantId: string, branchId: string): Promise<Array<TopProduct>> {
        // Get all transactions for this tenant and branch to get their IDs
        const transactionIds = await prisma.transaction.findMany({
            where: {
                tenantId,
                branchId,
            },
            select: {
                transactionId: true,
            },
        });

        const ids = transactionIds.map(t => t.transactionId);

        // Get orders with product details using relations
        const orders = await prisma.order.findMany({
            where: {
                transactionId: {
                    in: ids,
                },
            },
        });

        // Get products with inventory details
        const products = await prisma.product.findMany({
            where: {
                tenantId,
                branchId,
                isActive: true,
            },
            include: {
                inventories: {
                    where: {
                        branchId,
                    },
                },
            },
        });

        // Create product map for quick lookup
        const productMap = new Map(
            products.map(p => [p.id, p])
        );

        // Aggregate order quantities and sales
        const productSummary = new Map<
            string,
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
                quantity: existing.quantity + Number(order.quantity),
                summedSellPrice: existing.summedSellPrice + (Number(order.sellPrice) * Number(order.quantity)),
            });
        });

        // Build top products array
        const topProducts: Array<TopProduct> = [];

        productSummary.forEach((summary, productId) => {
            const product = productMap.get(productId);

            if (product) {
                topProducts.push({
                    productId: product.id,
                    name: product.name,
                    quantity: summary.quantity,
                    summedSellPrice: Math.round(summary.summedSellPrice * 100) / 100,
                    categoryName: 'Uncategorized', // Category removed in new schema
                });
            }
        });

        return topProducts
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    }

    static async getDashboardCounts(tenantId: string, branchId: string): Promise<DashboardCounts> {
        const [
            transactionAggregate,
            inventoryProducts,
            expiredProductsCount,
            userCount,
            customerCount,
        ] = await Promise.all([
            // Aggregate transaction totals and count
            prisma.transaction.aggregate({
                where: {
                    tenantId,
                    branchId,
                },
                _count: true,
                _sum: {
                    total: true,
                },
            }),
            // Get inventory to sum quantities
            prisma.inventory.findMany({
                where: {
                    tenantId,
                    branchId,
                },
                select: {
                    availableQuantity: true,
                    reservedQuantity: true,
                },
            }),
            // Count products (no expiration tracking in new schema)
            prisma.product.count({
                where: {
                    tenantId,
                    branchId,
                    isActive: false,
                },
            }),
            // Count users in this branch
            prisma.user.count({
                where: {
                    tenantId,
                    branchId,
                },
            }),
            // Count customers for this tenant
            prisma.customer.count({
                where: {
                    tenantId,
                },
            }),
        ]);

        const totalSales = Number(transactionAggregate._sum.total || 0);

        // Sum quantities from new inventory structure
        const totalProducts = inventoryProducts.reduce((sum, inv) => {
            return sum + inv.availableQuantity + inv.reservedQuantity;
        }, 0);

        return {
            totalSales: (Math.round(totalSales * 100) / 100).toString(),
            stock: totalProducts,
            totalUsers: userCount,
            allCustomers: customerCount,
            expiredProducts: expiredProductsCount,
            myTotalTransactions: transactionAggregate._count,
        };
    }

    static async getTransactionItems(
        transactionId: string,
        tenantId: string,
        branchId: string
    ): Promise<{
        transaction: any;
        orderItems: Array<any>;
    }> {
        const transaction = await prisma.transaction.findFirst({
            where: {
                transactionId,
                tenantId,
                branchId,
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        fullname: true,
                        username: true,
                    },
                },
                customer: {
                    select: {
                        customerId: true,
                        name: true,
                    },
                },
                paymentMethod: {
                    select: {
                        methodId: true,
                        name: true,
                    },
                },
            },
        });

        if (!transaction) {
            return { transaction: null, orderItems: [] };
        }

        // Get orders and fetch their product details
        const orderItems = await prisma.order.findMany({
            where: {
                transactionId,
            },
        });

        // Fetch all products for these orders in a single query
        const productIds = orderItems.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: productIds,
                },
            },
        });

        // Create product map for quick lookup
        const productMap = new Map(
            products.map(p => [p.id, p])
        );

        // Attach product details to order items
        const itemsWithProductDetails = orderItems.map(item => ({
            ...item,
            productDetails: productMap.get(item.productId) || null,
        }));

        return {
            transaction,
            orderItems: itemsWithProductDetails,
        };
    }

    static async getTransactionDetails(
        transactionId: string,
        tenantId: string,
        branchId: string
    ): Promise<{
        transaction: any;
        orderItems: Array<any>;
        summary: any;
    }> {
        const transaction = await prisma.transaction.findFirst({
            where: {
                transactionId,
                tenantId,
                branchId,
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        fullname: true,
                        username: true,
                    },
                },
                customer: {
                    select: {
                        customerId: true,
                        name: true,
                    },
                },
                paymentMethod: {
                    select: {
                        methodId: true,
                        name: true,
                    },
                },
                paymentServiceProvider: {
                    select: {
                        providerId: true,
                        name: true,
                    },
                },
            },
        });

        if (!transaction) {
            return { transaction: null, orderItems: [], summary: {} };
        }

        // Get order items
        const orderItems = await prisma.order.findMany({
            where: {
                transactionId,
            },
        });

        // Fetch all products in a single query
        const productIds = orderItems.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: productIds,
                },
            },
        });

        // Create product map for quick lookup
        const productMap = new Map(
            products.map(p => [p.id, p])
        );

        // Build detailed order items with calculations
        const detailedOrderItems = orderItems.map((item) => {
            const product = productMap.get(item.productId);
            const quantity = Number(item.quantity);
            const sellPrice = Number(item.sellPrice);
            const purchasePrice = Number(item.purchasePrice || 0);

            return {
                ...item,
                productDetails: product || null,
                categoryDetails: null, // Category removed in new schema
                lineTotal: sellPrice * quantity,
                profit: (sellPrice - purchasePrice) * quantity,
            };
        });

        // Calculate summary
        const summary = {
            totalItems: detailedOrderItems.reduce((sum, item) => sum + Number(item.quantity), 0),
            totalAmount: detailedOrderItems.reduce((sum, item) => sum + item.lineTotal, 0),
            totalProfit: detailedOrderItems.reduce((sum, item) => sum + item.profit, 0),
            averageItemPrice:
                detailedOrderItems.length > 0
                    ? detailedOrderItems.reduce((sum, item) => sum + Number(item.sellPrice), 0) / detailedOrderItems.length
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