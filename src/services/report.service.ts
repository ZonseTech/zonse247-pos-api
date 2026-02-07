import { ReportSummary, TotalSalesReport, ReportFilters, SaleDataItem } from '../types/report';
import { prisma } from '../databases/prisma/client';
import { HIGH_STOCK_THRESHOLD } from '../constants/report.constants';
import {
    buildBaseWhereClause,
    buildSalesWhereClause,
    buildTimeBasedReport,
} from '../utils/report.utils';

export class ReportService {
    /**
     * Get report summary with sales, profit, top stocks, categories, receipts, and payment modes
     */
    static async getSummary(
        tenantId: string,
        branchId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<ReportSummary> {
        try {
            const filters: ReportFilters = { tenantId, branchId, startDate, endDate };
            const baseWhereClause = buildBaseWhereClause(filters);
            const salesWhereClause = buildSalesWhereClause(filters);

            // Run queries in parallel for better performance
            const [salesData, salesWithItems, topCategoryData, topStocksCount, paymentModes] = await Promise.all([
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
                // Get top category by sales count
                prisma.saleItem.groupBy({
                    by: ['productId'],
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
            ]);

            const totalSales = salesData._sum.totalAmount || 0;
            const receiptCount = salesData._count.id || 0;

            // Calculate total cost and discount
            let totalCost = 0;
            let totalDiscount = 0;
            for (const sale of salesWithItems) {
                totalDiscount += Number(sale.discountAmount) || 0;
                for (const item of sale.items) {
                    totalCost += Number(item.unitCost) * item.quantity;
                }
            }
            // Gross Profit = (Revenue - Discount) - Cost
            const grossProfit = Number(totalSales) - totalDiscount - totalCost;

            // Get top category name
            let topCategory = '';
            if (topCategoryData.length > 0) {
                const topProduct = await prisma.product.findUnique({
                    where: { id: topCategoryData[0].productId },
                    include: { category: { select: { name: true } } },
                });
                topCategory = topProduct?.category?.name || '';
            }

            return {
                totalSales: Number(totalSales),
                grossProfit: Number(grossProfit),
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
        branchId?: string,
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

            // Map to SaleDataItem format
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
     * Get gross profit report with hourly, weekly, and monthly breakdowns
     */
    static async getGrossProfit(
        tenantId: string,
        branchId?: string,
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
                    discountAmount: true,
                    saleDate: true,
                    createdAt: true,
                    items: {
                        select: { quantity: true, unitCost: true },
                    },
                },
            });

            // Calculate gross profit for each sale and map to SaleDataItem format
            // Gross Profit = (Revenue - Discount) - Cost
            const items: SaleDataItem[] = sales.map(sale => {
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

            return buildTimeBasedReport(items);
        } catch (error) {
            console.error('Error getting gross profit report:', error);
            throw error;
        }
    }
}
