import { ReportSummary, TotalSalesReport, SalesDataPoint } from '../types/report';
import { prisma } from '../databases/prisma/client';

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
            const whereClause: any = { tenantId };
            if (branchId) {
                whereClause.branchId = branchId;
            }

            // Add date range filter for sales
            const salesWhereClause: any = { ...whereClause };
            if (startDate || endDate) {
                salesWhereClause.createdAt = {};
                if (startDate) {
                    salesWhereClause.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    // Set end date to end of day
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    salesWhereClause.createdAt.lte = endDateTime;
                }
            }

            // Get total sales and receipt count from completed sales
            const salesData = await prisma.sale.aggregate({
                where: {
                    ...salesWhereClause,
                    status: 'COMPLETED',
                },
                _sum: {
                    totalAmount: true,
                },
                _count: {
                    id: true,
                },
            });

            const totalSales = salesData._sum.totalAmount || 0;
            const receiptCount = salesData._count.id || 0;

            // Calculate gross profit (total sales - cost of goods)
            // SaleItem has unitCost which stores the cost at time of sale
            const salesWithItems = await prisma.sale.findMany({
                where: {
                    ...salesWhereClause,
                    status: 'COMPLETED',
                },
                include: {
                    items: {
                        select: {
                            quantity: true,
                            unitCost: true,
                        },
                    },
                },
            });

            let totalCost = 0;
            for (const sale of salesWithItems) {
                for (const item of sale.items) {
                    totalCost += Number(item.unitCost) * item.quantity;
                }
            }

            const grossProfit = Number(totalSales) - totalCost;

            // Get top category by sales count
            const topCategoryData = await prisma.saleItem.groupBy({
                by: ['productId'],
                where: {
                    sale: {
                        ...salesWhereClause,
                        status: 'COMPLETED',
                    },
                },
                _sum: {
                    quantity: true,
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc',
                    },
                },
                take: 1,
            });

            let topCategory = '';
            if (topCategoryData.length > 0) {
                const topProduct = await prisma.product.findUnique({
                    where: { id: topCategoryData[0].productId },
                    include: {
                        category: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                topCategory = topProduct?.category?.name || '';
            }

            // Get top stocks (number of products with high stock levels)
            const topStocksCount = await prisma.inventory.count({
                where: {
                    ...whereClause,
                    availableQuantity: {
                        gte: 100,
                    },
                },
            });

            // Get count of distinct payment methods used
            const paymentModes = await prisma.salePayment.findMany({
                where: {
                    sale: {
                        ...salesWhereClause,
                        status: 'COMPLETED',
                    },
                },
                distinct: ['paymentMethodId'],
                select: {
                    paymentMethodId: true,
                },
            });

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
            const whereClause: any = { tenantId, status: 'COMPLETED' };
            if (branchId) {
                whereClause.branchId = branchId;
            }

            // Add date range filter
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) {
                    whereClause.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    whereClause.createdAt.lte = endDateTime;
                }
            }

            // Get completed sales within date range
            const sales = await prisma.sale.findMany({
                where: whereClause,
                select: {
                    totalAmount: true,
                    saleDate: true,
                    createdAt: true,
                },
            });

            // Calculate hourly data (distribution by hour across date range)
            const hourlyData = this.calculateHourlySales(sales);

            // Calculate weekly data (distribution by day of week)
            const weeklyData = this.calculateWeeklySales(sales);

            // Calculate monthly data (distribution by month)
            const monthlyData = this.calculateMonthlySales(sales);

            return {
                hourly: { data: hourlyData.filter(item => item.value > 0) },
                weekly: { data: weeklyData.filter(item => item.value > 0) },
                monthly: { data: monthlyData.filter(item => item.value > 0) },
            };
        } catch (error) {
            console.error('Error getting total sales report:', error);
            throw error;
        }
    }

    /**
     * Calculate hourly sales distribution across the date range (24 hours)
     */
    private static calculateHourlySales(sales: any[]): SalesDataPoint[] {
        const hourlyMap: Record<number, number> = {};

        // Initialize all 24 hours
        for (let hour = 0; hour < 24; hour++) {
            hourlyMap[hour] = 0;
        }

        // Aggregate sales by hour across all dates
        for (const sale of sales) {
            const saleDate = new Date(sale.saleDate || sale.createdAt);
            const hour = saleDate.getHours();
            hourlyMap[hour] += Number(sale.totalAmount) || 0;
        }

        // Convert to data points (24 hours)
        const hourlyData: SalesDataPoint[] = [];
        for (let hour = 0; hour < 24; hour++) {
            let label: string;
            if (hour === 0) {
                label = '12AM';
            } else if (hour === 12) {
                label = '12PM';
            } else if (hour > 12) {
                label = `${hour - 12}PM`;
            } else {
                label = `${hour}AM`;
            }
            hourlyData.push({
                label,
                value: Math.round(hourlyMap[hour] * 100) / 100,
            });
        }

        return hourlyData;
    }

    /**
     * Calculate weekly sales distribution by day of week across the date range
     */
    private static calculateWeeklySales(sales: any[]): SalesDataPoint[] {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const weeklyMap: Record<string, number> = {};

        // Initialize all days
        for (const day of days) {
            weeklyMap[day] = 0;
        }

        // Aggregate sales by day of week across all dates
        for (const sale of sales) {
            const saleDate = new Date(sale.saleDate || sale.createdAt);
            const saleDayOfWeek = saleDate.getDay();
            const dayIndex = saleDayOfWeek === 0 ? 6 : saleDayOfWeek - 1; // Convert to Monday=0
            const dayName = days[dayIndex];
            weeklyMap[dayName] += Number(sale.totalAmount) || 0;
        }

        // Convert to data points
        return days.map(day => ({
            label: day,
            value: Math.round(weeklyMap[day] * 100) / 100,
        }));
    }

    /**
     * Calculate monthly sales distribution by month across the date range
     */
    private static calculateMonthlySales(sales: any[]): SalesDataPoint[] {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthlyMap: Record<string, number> = {};

        // Initialize all months
        for (const month of months) {
            monthlyMap[month] = 0;
        }

        // Aggregate sales by month across all dates
        for (const sale of sales) {
            const saleDate = new Date(sale.saleDate || sale.createdAt);
            const monthIndex = saleDate.getMonth();
            const monthName = months[monthIndex];
            monthlyMap[monthName] += Number(sale.totalAmount) || 0;
        }

        // Convert to data points
        return months.map(month => ({
            label: month,
            value: Math.round(monthlyMap[month] * 100) / 100,
        }));
    }
}
