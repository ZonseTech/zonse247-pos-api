import dayjs from 'dayjs';
import { Transaction } from 'transactions';
import { DashboardCounts, MonthlySales, TopProduct } from 'analytics';
import prisma from '../databases/prisma/client';

export type AnalyticsSource = 'all' | 'transactions' | 'sales';

export interface UnifiedSaleRecord {
    id: string;
    source: 'transaction' | 'sale';
    referenceNo: string;
    total: number;
    date: Date;
    status: string;
    paymentMethod?: string;
    customer?: { id: string; name: string } | null;
    user?: { id: string; name: string } | null;
}

export class AnalyticsModel {
    static async getMonthlySalesData(
        tenantId: string,
        branchId: string,
        year: number,
        month: number,
        source: AnalyticsSource = 'all'
    ): Promise<Array<MonthlySales>> {
        const lastDayOfMonth = new Date(year, month, 0);
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const endDate = dayjs(lastDayOfMonth).format('YYYY-MM-DD');
        const startDate = dayjs(firstDayOfMonth).format('YYYY-MM-DD');

        // Fetch transactions if needed
        let transactions: any[] = [];
        if (source === 'all' || source === 'transactions') {
            transactions = await prisma.transaction.findMany({
                where: {
                    tenantId,
                    branchId,
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                },
            });
        }

        // Fetch sales if needed
        let sales: any[] = [];
        if (source === 'all' || source === 'sales') {
            sales = await prisma.sale.findMany({
                where: {
                    tenantId,
                    branchId,
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                    status: { in: ['COMPLETED', 'REFUNDED'] },
                },
            });
        }

        const salesData = [] as Array<MonthlySales>;
        const daysInMonth = lastDayOfMonth.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = dayjs(new Date(year, month - 1, day)).format('YYYY-MM-DD');

            // Sum transactions for this day
            const dayTransactions = transactions.filter((transaction) => {
                const t = dayjs(transaction.date).format('YYYY-MM-DD');
                return t === currentDate;
            });
            const transactionTotal = dayTransactions.reduce((sum, transaction) => {
                return sum + (parseFloat(transaction.total.toString()) || 0);
            }, 0);

            // Sum sales for this day
            const daySales = sales.filter((sale) => {
                const s = dayjs(sale.createdAt).format('YYYY-MM-DD');
                return s === currentDate;
            });
            const saleTotal = daySales.reduce((sum, sale) => {
                return sum + (parseFloat(sale.totalAmount.toString()) || 0);
            }, 0);

            const totalAmount = transactionTotal + saleTotal;

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
        includeItems = false,
        source: AnalyticsSource = 'all'
    ): Promise<{
        total: number;
        transactions: Array<UnifiedSaleRecord>;
        hasMore: boolean;
        source: AnalyticsSource;
    }> {
        const results: UnifiedSaleRecord[] = [];
        let totalCount = 0;

        // Get transactions if needed
        if (source === 'all' || source === 'transactions') {
            const [txCount, txRecords] = await Promise.all([
                prisma.transaction.count({
                    where: { tenantId, branchId },
                }),
                prisma.transaction.findMany({
                    where: { tenantId, branchId },
                    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                    ...(source === 'transactions' ? { skip: offset, take: limit } : {}),
                    include: {
                        user: { select: { userId: true, fullname: true } },
                        customer: { select: { customerId: true, name: true } },
                        paymentMethod: { select: { methodId: true, name: true } },
                    },
                }),
            ]);

            totalCount += txCount;
            results.push(
                ...txRecords.map((tx) => ({
                    id: tx.transactionId,
                    source: 'transaction' as const,
                    referenceNo: tx.referenceNo || tx.transactionId,
                    total: Number(tx.total),
                    date: tx.date || tx.createdAt,
                    status: tx.status || 'completed',
                    paymentMethod: tx.paymentMethod?.name,
                    customer: tx.customer ? { id: tx.customer.customerId, name: tx.customer.name } : null,
                    user: tx.user ? { id: tx.user.userId, name: tx.user.fullname } : null,
                }))
            );
        }

        // Get sales if needed
        if (source === 'all' || source === 'sales') {
            const [saleCount, saleRecords] = await Promise.all([
                prisma.sale.count({
                    where: { tenantId, branchId, status: { not: 'VOIDED' } },
                }),
                prisma.sale.findMany({
                    where: { tenantId, branchId, status: { not: 'VOIDED' } },
                    orderBy: { createdAt: 'desc' },
                    ...(source === 'sales' ? { skip: offset, take: limit } : {}),
                    include: {
                        user: { select: { userId: true, fullname: true } },
                        customer: { select: { customerId: true, name: true } },
                        paymentMethod: { select: { methodId: true, name: true } },
                        payments: {
                            include: {
                                paymentMethod: { select: { name: true } },
                            },
                        },
                    },
                }),
            ]);

            totalCount += saleCount;
            results.push(
                ...saleRecords.map((sale) => ({
                    id: sale.id,
                    source: 'sale' as const,
                    referenceNo: sale.saleNumber,
                    total: Number(sale.totalAmount),
                    date: sale.createdAt,
                    status: sale.status.toLowerCase(),
                    paymentMethod:
                        sale.payments?.length > 0
                            ? sale.payments.map((p) => p.paymentMethod?.name).join(', ')
                            : sale.paymentMethod?.name,
                    customer: sale.customer ? { id: sale.customer.customerId, name: sale.customer.name } : null,
                    user: sale.user ? { id: sale.user.userId, name: sale.user.fullname } : null,
                }))
            );
        }

        // Sort combined results by date
        if (source === 'all') {
            results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        // Apply pagination for combined results
        const paginatedResults = source === 'all' ? results.slice(offset, offset + limit) : results;

        return {
            total: totalCount,
            transactions: paginatedResults,
            hasMore: offset + limit < totalCount,
            source,
        };
    }

    static async getTopProducts(
        tenantId: string,
        branchId: string,
        source: AnalyticsSource = 'all'
    ): Promise<Array<TopProduct>> {
        const productSummary = new Map<
            string,
            {
                quantity: number;
                summedSellPrice: number;
            }
        >();

        // Get transaction orders if needed
        if (source === 'all' || source === 'transactions') {
            const transactionIds = await prisma.transaction.findMany({
                where: { tenantId, branchId },
                select: { transactionId: true },
            });

            const ids = transactionIds.map((t) => t.transactionId);

            const orders = await prisma.order.findMany({
                where: { transactionId: { in: ids } },
            });

            orders.forEach((order) => {
                const existing = productSummary.get(order.productId) || { quantity: 0, summedSellPrice: 0 };
                productSummary.set(order.productId, {
                    quantity: existing.quantity + Number(order.quantity),
                    summedSellPrice: existing.summedSellPrice + Number(order.sellPrice) * Number(order.quantity),
                });
            });
        }

        // Get sale items if needed
        if (source === 'all' || source === 'sales') {
            const saleItems = await prisma.saleItem.findMany({
                where: {
                    sale: {
                        tenantId,
                        branchId,
                        status: { in: ['COMPLETED', 'REFUNDED'] },
                    },
                },
            });

            saleItems.forEach((item) => {
                const existing = productSummary.get(item.productId) || { quantity: 0, summedSellPrice: 0 };
                productSummary.set(item.productId, {
                    quantity: existing.quantity + Number(item.quantity),
                    summedSellPrice: existing.summedSellPrice + Number(item.totalAmount),
                });
            });
        }

        // Get products with inventory details
        const productIds = Array.from(productSummary.keys());
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId,
            },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Build top products array
        const topProducts: Array<TopProduct> = [];

        productSummary.forEach((summary, productId) => {
            const product = productMap.get(productId) as { id: string; name: string } | undefined;

            if (product) {
                topProducts.push({
                    productId: product.id,
                    name: product.name,
                    quantity: summary.quantity,
                    summedSellPrice: Math.round(summary.summedSellPrice * 100) / 100,
                    categoryName: 'Uncategorized',
                });
            }
        });

        return topProducts.sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    }

    static async getDashboardCounts(
        tenantId: string,
        branchId: string,
        source: AnalyticsSource = 'all'
    ): Promise<DashboardCounts> {
        let transactionTotal = 0;
        let transactionCount = 0;
        let saleTotal = 0;
        let saleCount = 0;

        // Get transaction aggregates if needed
        if (source === 'all' || source === 'transactions') {
            const transactionAggregate = await prisma.transaction.aggregate({
                where: { tenantId, branchId },
                _count: true,
                _sum: { total: true },
            });
            transactionTotal = Number(transactionAggregate._sum.total || 0);
            transactionCount = transactionAggregate._count;
        }

        // Get sale aggregates if needed
        if (source === 'all' || source === 'sales') {
            const saleAggregate = await prisma.sale.aggregate({
                where: { tenantId, branchId, status: { not: 'VOIDED' } },
                _count: true,
                _sum: { totalAmount: true },
            });
            saleTotal = Number(saleAggregate._sum.totalAmount || 0);
            saleCount = saleAggregate._count;
        }

        const [inventoryProducts, expiredProductsCount, userCount, customerCount] = await Promise.all([
            prisma.inventory.findMany({
                where: { tenantId, branchId },
                select: { availableQuantity: true, reservedQuantity: true },
            }),
            prisma.product.count({
                where: { tenantId, branchId, isActive: false },
            }),
            prisma.user.count({
                where: { tenantId, branchId },
            }),
            prisma.customer.count({
                where: { tenantId },
            }),
        ]);

        const totalSales = transactionTotal + saleTotal;
        const totalTransactionCount = transactionCount + saleCount;

        const totalProducts = inventoryProducts.reduce((sum, inv) => {
            return sum + inv.availableQuantity + inv.reservedQuantity;
        }, 0);

        return {
            totalSales: (Math.round(totalSales * 100) / 100).toString(),
            stock: totalProducts,
            totalUsers: userCount,
            allCustomers: customerCount,
            expiredProducts: expiredProductsCount,
            myTotalTransactions: totalTransactionCount,
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