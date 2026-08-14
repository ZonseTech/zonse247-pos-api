import { ReportSummary, TotalSalesReport, ReportFilters, SaleDataItem, TopStocksReport, TopCategoriesReport, PaymentModeDataPoint, ExpensesByCategoryReport } from '../types/report';
import { prisma } from '../databases/prisma/client';
import { HIGH_STOCK_THRESHOLD } from '../constants/report.constants';
import {
    buildBaseWhereClause,
    buildSalesWhereClause,
    buildExpenseWhereClause,
    buildTimeBasedReport,
} from '../utils/report.utils';

export class ReportService {
    /**
     * Get report summary with sales, profit, top stocks, categories, receipts, and payment modes
     */
    static async getSummary(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<ReportSummary> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const baseWhereClause = buildBaseWhereClause(filters);
            const salesWhereClause = buildSalesWhereClause(filters);
            const expenseWhereClause = buildExpenseWhereClause(filters);

            // Run queries in parallel for better performance
            const [salesData, salesWithItems, topCategoryData, topStocksCount, paymentModes, expenseAgg] = await Promise.all([
                // Get total sales and receipt count
                prisma.sale.aggregate({
                    where: salesWhereClause,
                    _sum: { totalAmount: true },
                    _count: { id: true },
                }),
                // Get sales with items for cost calculation
                prisma.sale.findMany({
                    where: salesWhereClause,
                    select: {
                        totalAmount: true,
                        discountAmount: true,
                        items: {
                            select: { quantity: true, unitCost: true },
                        },
                    },
                }),
                // Get top category by sales count (group by variantId)
                prisma.saleItem.groupBy({
                    by: ['variantId'],
                    where: { sale: salesWhereClause },
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: 'desc' } },
                    take: 1,
                }),
                // Get top stocks count
                prisma.inventory.count({
                    where: { ...baseWhereClause, availableQuantity: { gte: HIGH_STOCK_THRESHOLD } },
                }),
                // Get distinct payment methods
                prisma.salePayment.findMany({
                    where: { sale: salesWhereClause },
                    distinct: ['paymentMethodId'],
                    select: { paymentMethodId: true },
                }),
                // Get total approved expenses
                prisma.expense.aggregate({
                    where: expenseWhereClause,
                    _sum: { amount: true },
                }),
            ]);

            const totalSales = salesData._sum.totalAmount || 0;
            const receiptCount = salesData._count.id || 0;
            const expenses = Number(expenseAgg._sum.amount) || 0;

            // Calculate total cost and discount
            let totalCost = 0;
            let totalDiscount = 0;
            for (const sale of salesWithItems) {
                totalDiscount += Number(sale.discountAmount) || 0;
                for (const item of sale.items) {
                    totalCost += Number(item.unitCost) * item.quantity;
                }
            }
            // Net Profit = (Revenue - Discount) - Cost - approved Expenses
            const grossProfit = Number(totalSales) - totalDiscount - totalCost;
            const netProfit = grossProfit - expenses;

            // Get top category name from the top selling variant
            let topCategory = '';
            if (topCategoryData.length > 0) {
                const topVariant = await prisma.productVariant.findUnique({
                    where: { id: topCategoryData[0].variantId },
                    include: {
                        product: {
                            include: { category: { select: { name: true } } }
                        }
                    },
                });
                topCategory = topVariant?.product?.category?.name || '';
            }

            return {
                totalSales: Number(totalSales),
                expenses,
                netProfit: Number(netProfit),
                topStocks: topStocksCount,
                topCategory,
                receiptCount,
                paymentModes: paymentModes.length,
            };
        } catch (error) {
            console.error('Error getting report summary:', error);
            throw error;
        }
    }

    /**
     * Get total sales report with hourly, weekly, and monthly breakdowns
     */
    static async getTotalSales(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<TotalSalesReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const whereClause = buildSalesWhereClause(filters);

            const sales = await prisma.sale.findMany({
                where: whereClause,
                select: {
                    totalAmount: true,
                    saleDate: true,
                    createdAt: true,
                },
            });

            const items: SaleDataItem[] = sales.map(sale => ({
                value: Number(sale.totalAmount) || 0,
                saleDate: sale.saleDate,
                createdAt: sale.createdAt,
            }));

            return buildTimeBasedReport(items);
        } catch (error) {
            console.error('Error getting total sales report:', error);
            throw error;
        }
    }

    /**
     * Get net profit report with hourly, weekly, and monthly breakdowns.
     * Nets approved expenses into the same buckets as the sales-based profit
     * by giving each expense a negative value item alongside the per-sale
     * profit items — buildTimeBasedReport just sums `value` per bucket, so
     * this requires no changes to that shared utility.
     */
    static async getNetProfit(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<TotalSalesReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const whereClause = buildSalesWhereClause(filters);
            const expenseWhereClause = buildExpenseWhereClause(filters);

            const [sales, expenses] = await Promise.all([
                prisma.sale.findMany({
                    where: whereClause,
                    select: {
                        totalAmount: true,
                        discountAmount: true,
                        saleDate: true,
                        createdAt: true,
                        items: {
                            select: { quantity: true, unitCost: true },
                        },
                    },
                }),
                prisma.expense.findMany({
                    where: expenseWhereClause,
                    select: { amount: true, expenseDate: true },
                }),
            ]);

            const saleItems: SaleDataItem[] = sales.map(sale => {
                const totalCost = sale.items.reduce(
                    (sum, item) => sum + (Number(item.unitCost) * item.quantity),
                    0
                );
                const discount = Number(sale.discountAmount) || 0;

                return {
                    value: Number(sale.totalAmount) - discount - totalCost,
                    saleDate: sale.saleDate,
                    createdAt: sale.createdAt,
                };
            });

            const expenseItems: SaleDataItem[] = expenses.map(expense => ({
                value: -Number(expense.amount),
                saleDate: expense.expenseDate,
                createdAt: expense.expenseDate,
            }));

            return buildTimeBasedReport([...saleItems, ...expenseItems]);
        } catch (error) {
            console.error('Error getting net profit report:', error);
            throw error;
        }
    }

    /**
     * Get receipt count report with hourly, weekly, and monthly breakdowns
     */
    static async getReceiptCount(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<TotalSalesReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const whereClause = buildSalesWhereClause(filters);

            const sales = await prisma.sale.findMany({
                where: whereClause,
                select: {
                    saleDate: true,
                    createdAt: true,
                },
            });

            const items: SaleDataItem[] = sales.map(sale => ({
                value: 1,
                saleDate: sale.saleDate,
                createdAt: sale.createdAt,
            }));

            return buildTimeBasedReport(items);
        } catch (error) {
            console.error('Error getting receipt count report:', error);
            throw error;
        }
    }

    /**
     * Get payment modes report with amounts grouped by payment method
     */
    static async getPaymentModes(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<{ data: PaymentModeDataPoint[] }> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const salesWhereClause = buildSalesWhereClause(filters);

            // Get all payments with their payment method and provider names
            const payments = await prisma.salePayment.findMany({
                where: {
                    sale: salesWhereClause,
                },
                select: {
                    amount: true,
                    paymentMethod: {
                        select: {
                            name: true,
                        },
                    },
                    provider: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            // Group by the specific provider (e.g. "TNM Mpamba", "NBS Bank") when one
            // was used, since that's the actionable breakdown for reconciliation.
            // Falls back to the leaf method name (Cash, POS, ...) when there's no
            // provider - e.g. cash sales don't have one. Mirrors
            // DashboardService.getPaymentMethodsBreakdown's grouping.
            const paymentMap: Record<string, { total: number; count: number }> = {};
            for (const payment of payments) {
                const label = payment.provider?.name || payment.paymentMethod.name;
                const entry = paymentMap[label] || { total: 0, count: 0 };
                entry.total += Number(payment.amount);
                entry.count += 1;
                paymentMap[label] = entry;
            }

            // Convert to data points
            const data = Object.entries(paymentMap)
                .map(([label, { total, count }]) => ({
                    label,
                    value: Math.round(total * 100) / 100,
                    transactions: count,
                }))
                .filter(item => item.value > 0)
                .sort((a, b) => b.value - a.value); // Sort by value descending

            return { data };
        } catch (error) {
            console.error('Error getting payment modes report:', error);
            throw error;
        }
    }

    /**
     * Get top stocks report with name, quantity, and pricing
     * Returns top 10 most performing (best selling) inventory items
     */
    static async getTopStocks(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<TopStocksReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const salesWhereClause = buildSalesWhereClause(filters);

            // Group by variantId (the sellable unit in the new schema)
            const topSellingVariants = await prisma.saleItem.groupBy({
                by: ['variantId'],
                where: {
                    sale: salesWhereClause,
                },
                _sum: {
                    quantity: true,
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc',
                    },
                },
                take: 10,
            });

            const variantIds = topSellingVariants.map(item => item.variantId);

            // Get variants with their parent product info
            const variants = await prisma.productVariant.findMany({
                where: {
                    id: { in: variantIds },
                },
                select: {
                    id: true,
                    variantName: true,
                    sellingPrice: true,
                    product: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            type VariantInfo = { id: string; variantName: string; sellingPrice: any; product: { name: string } };
            const variantMap = new Map<string, VariantInfo>(variants.map(v => [v.id, v]));

            const data = topSellingVariants.map(item => {
                const variant = variantMap.get(item.variantId);
                // Display name: "Product Name - Variant" or just "Product Name" if variant is "Default"
                const displayName = variant
                    ? (variant.variantName && variant.variantName !== 'Default'
                        ? `${variant.product.name} - ${variant.variantName}`
                        : variant.product.name)
                    : 'Unknown Product';
                return {
                    name: displayName,
                    quantity: item._sum.quantity || 0,
                    pricing: Number(variant?.sellingPrice || 0),
                };
            });

            return { data };
        } catch (error) {
            console.error('Error getting top stocks report:', error);
            throw error;
        }
    }

    /**
     * Get top categories report with order count and total price
     * Returns top 10 most performing categories
     */
    static async getTopCategories(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<TopCategoriesReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const salesWhereClause = buildSalesWhereClause(filters);

            // Get all sale items with variant -> product -> category info
            const saleItems = await prisma.saleItem.findMany({
                where: {
                    sale: salesWhereClause,
                },
                select: {
                    quantity: true,
                    totalAmount: true,
                    variant: {
                        select: {
                            product: {
                                select: {
                                    categoryId: true,
                                    category: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // Group by category
            const categoryMap: Record<string, { name: string; orderCount: number; totalPrice: number }> = {};
            for (const item of saleItems) {
                const categoryId = item.variant?.product?.categoryId || 'uncategorized';
                const categoryName = item.variant?.product?.category?.name || 'Uncategorized';

                if (!categoryMap[categoryId]) {
                    categoryMap[categoryId] = {
                        name: categoryName,
                        orderCount: 0,
                        totalPrice: 0,
                    };
                }

                categoryMap[categoryId].orderCount += item.quantity;
                categoryMap[categoryId].totalPrice += Number(item.totalAmount) || 0;
            }

            // Convert to array, sort by order count, and take top 10
            const data = Object.values(categoryMap)
                .map(item => ({
                    name: item.name,
                    orderCount: item.orderCount,
                    totalPrice: Math.round(item.totalPrice * 100) / 100,
                }))
                .sort((a, b) => b.orderCount - a.orderCount)
                .slice(0, 10);

            return { data };
        } catch (error) {
            console.error('Error getting top categories report:', error);
            throw error;
        }
    }

    /**
     * Get approved expenses report with hourly, weekly, and monthly breakdowns
     */
    static async getExpensesTrend(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<TotalSalesReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const whereClause = buildExpenseWhereClause(filters);

            const expenses = await prisma.expense.findMany({
                where: whereClause,
                select: { amount: true, expenseDate: true },
            });

            const items: SaleDataItem[] = expenses.map(expense => ({
                value: Number(expense.amount),
                saleDate: expense.expenseDate,
                createdAt: expense.expenseDate,
            }));

            return buildTimeBasedReport(items);
        } catch (error) {
            console.error('Error getting expenses trend report:', error);
            throw error;
        }
    }

    /**
     * Get approved expenses grouped by category
     * Returns top 10 categories by total amount spent
     */
    static async getExpensesByCategory(
        tenantId: string,
        branchId?: string | string[],
        startDate?: string,
        endDate?: string
    ): Promise<ExpensesByCategoryReport> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const whereClause = buildExpenseWhereClause(filters);

            const expenses = await prisma.expense.findMany({
                where: whereClause,
                select: {
                    amount: true,
                    category: { select: { name: true } },
                },
            });

            const categoryMap: Record<string, { count: number; totalAmount: number }> = {};
            for (const expense of expenses) {
                const name = expense.category?.name || 'Uncategorized';
                const entry = categoryMap[name] || { count: 0, totalAmount: 0 };
                entry.count += 1;
                entry.totalAmount += Number(expense.amount);
                categoryMap[name] = entry;
            }

            const data = Object.entries(categoryMap)
                .map(([name, { count, totalAmount }]) => ({
                    name,
                    count,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                }))
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 10);

            return { data };
        } catch (error) {
            console.error('Error getting expenses by category report:', error);
            throw error;
        }
    }
}
