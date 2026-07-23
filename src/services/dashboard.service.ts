import { prisma } from '../databases/prisma/client';
import { addDateFilter, buildBaseWhereClause, buildSalesWhereClause } from '../utils/report.utils';
import {
    DashboardFilters,
    DashboardSummary,
    DashboardDataPoint,
    RevenueTrendReport,
    PaymentMethodsBreakdown,
    TopSellingProduct,
    TopSellingProductsReport,
    RecentSaleItem,
    RecentSalesReport,
    LowStockAlertItem,
    LowStockReport,
} from '../types/dashboard';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RECENT_SALES_LIMIT = 10;
const TOP_PRODUCTS_LIMIT = 10;
const LOW_STOCK_LIMIT = 6;

function toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
    const hours24 = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${minutes} ${period}`;
}

function buildVariantDisplayName(variant: { variantName: string; product: { name: string } } | null | undefined): string {
    if (!variant) return 'Unknown Product';
    return variant.variantName && variant.variantName !== 'Default'
        ? `${variant.product.name} - ${variant.variantName}`
        : variant.product.name;
}

interface VariantSalesAggregate {
    variantId: string;
    _sum: { quantity: number | null };
}

interface VariantWithProductName {
    id: string;
    variantName: string;
    product: { name: string };
}

interface RecentSaleRecord {
    saleNumber: string;
    totalAmount: unknown;
    status: string;
    createdAt: Date;
    customer: { name: string } | null;
}

interface InventoryLowStockRecord {
    availableQuantity: number;
    reorderPoint: number | null;
    variant: { variantName: string; product: { name: string } } | null;
}

export class DashboardService {
    /**
     * Get today's revenue, sales count, and gross profit with day-over-day deltas
     * GET /dashboard/summary
     */
    static async getSummary(filters: DashboardFilters): Promise<DashboardSummary> {
        const now = new Date();
        const todayStr = toDateString(now);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toDateString(yesterday);

        const todayWhere = buildSalesWhereClause({ ...filters, startDate: todayStr, endDate: todayStr });
        const yesterdayWhere = buildSalesWhereClause({ ...filters, startDate: yesterdayStr, endDate: yesterdayStr });

        const [today, yesterdaySnapshot] = await Promise.all([
            this.getDaySnapshot(todayWhere),
            this.getDaySnapshot(yesterdayWhere),
        ]);

        return {
            todaysRevenue: Math.round(today.revenue * 100) / 100,
            revenueDelta: this.calculateDelta(today.revenue, yesterdaySnapshot.revenue),
            todaysSalesCount: today.salesCount,
            salesDelta: this.calculateDelta(today.salesCount, yesterdaySnapshot.salesCount),
            todaysGrossProfit: Math.round(today.grossProfit * 100) / 100,
            grossProfitDelta: this.calculateDelta(today.grossProfit, yesterdaySnapshot.grossProfit),
        };
    }

    /**
     * Sum revenue, sale count, and gross profit for a single day's where clause
     */
    private static async getDaySnapshot(whereClause: any): Promise<{ revenue: number; salesCount: number; grossProfit: number }> {
        const sales = await prisma.sale.findMany({
            where: whereClause,
            select: {
                totalAmount: true,
                discountAmount: true,
                items: { select: { quantity: true, unitCost: true } },
            },
        });

        let revenue = 0;
        let totalCost = 0;
        let totalDiscount = 0;

        for (const sale of sales) {
            revenue += Number(sale.totalAmount) || 0;
            totalDiscount += Number(sale.discountAmount) || 0;
            for (const item of sale.items) {
                totalCost += Number(item.unitCost) * item.quantity;
            }
        }

        return {
            revenue,
            salesCount: sales.length,
            grossProfit: revenue - totalDiscount - totalCost,
        };
    }

    /**
     * Percentage change from previous to current, rounded to one decimal place
     */
    private static calculateDelta(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    /**
     * Get revenue for each of the last 7 days
     * GET /dashboard/revenue-trend
     */
    static async getRevenueTrend(filters: DashboardFilters): Promise<RevenueTrendReport> {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 6);

        const whereClause = buildSalesWhereClause({
            ...filters,
            startDate: toDateString(start),
            endDate: toDateString(now),
        });

        const sales = await prisma.sale.findMany({
            where: whereClause,
            select: { totalAmount: true, saleDate: true, createdAt: true },
        });

        const dailyTotals = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            dailyTotals.set(toDateString(day), 0);
        }

        for (const sale of sales) {
            const dateKey = toDateString(new Date(sale.saleDate || sale.createdAt));
            if (dailyTotals.has(dateKey)) {
                dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + Number(sale.totalAmount));
            }
        }

        const data: DashboardDataPoint[] = Array.from(dailyTotals.entries()).map(([dateKey, value]) => ({
            label: WEEKDAY_SHORT[new Date(dateKey).getDay()],
            value: Math.round(value * 100) / 100,
        }));

        return { data };
    }

    /**
     * Get today's revenue grouped by payment method
     * GET /dashboard/payment-methods
     */
    static async getPaymentMethodsBreakdown(filters: DashboardFilters): Promise<PaymentMethodsBreakdown> {
        const todayStr = toDateString(new Date());
        const salesWhereClause = buildSalesWhereClause({ ...filters, startDate: todayStr, endDate: todayStr });

        const payments = await prisma.salePayment.findMany({
            where: { sale: salesWhereClause },
            select: {
                amount: true,
                paymentMethod: { select: { name: true } },
                provider: { select: { name: true } },
            },
        });

        // Group by the specific provider (e.g. "TNM Mpamba", "NBS Bank") when one
        // was used, since that's the actionable breakdown for reconciliation.
        // Falls back to the leaf method name (Cash, Credit Card, ...) when there's
        // no provider - e.g. cash sales don't have one.
        const totals: Record<string, number> = {};
        for (const payment of payments) {
            const name = payment.provider?.name || payment.paymentMethod.name;
            totals[name] = (totals[name] || 0) + Number(payment.amount);
        }

        const data = Object.entries(totals)
            .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);

        return { data };
    }

    /**
     * Get the top 10 best-selling products
     * GET /dashboard/top-products
     */
    static async getTopSellingProducts(filters: DashboardFilters): Promise<TopSellingProductsReport> {
        const todayStr = toDateString(new Date());
        const salesWhereClause = buildSalesWhereClause({ ...filters, startDate: todayStr, endDate: todayStr });

        const topSellingVariants: VariantSalesAggregate[] = await prisma.saleItem.groupBy({
            by: ['variantId'],
            where: { sale: salesWhereClause },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: TOP_PRODUCTS_LIMIT,
        });

        const variantIds = topSellingVariants.map((item) => item.variantId);

        const variants: VariantWithProductName[] = await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
                id: true,
                variantName: true,
                product: { select: { name: true } },
            },
        });

        const variantMap = new Map<string, VariantWithProductName>(variants.map((v) => [v.id, v]));

        const data: TopSellingProduct[] = topSellingVariants.map((item) => ({
            name: buildVariantDisplayName(variantMap.get(item.variantId)),
            unitsSold: item._sum.quantity || 0,
        }));

        return { data };
    }

    /**
     * Get the most recent sales
     * GET /dashboard/recent-sales
     */
    static async getRecentSales(filters: DashboardFilters): Promise<RecentSalesReport> {
        const todayStr = toDateString(new Date());
        const whereClause = addDateFilter(buildBaseWhereClause(filters), todayStr, todayStr);

        const sales: RecentSaleRecord[] = await prisma.sale.findMany({
            where: {
                ...whereClause,
                status: { in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
            },
            orderBy: { createdAt: 'desc' },
            take: RECENT_SALES_LIMIT,
            select: {
                saleNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                customer: { select: { name: true } },
            },
        });

        const data: RecentSaleItem[] = sales.map((sale) => ({
            id: sale.saleNumber,
            customer: sale.customer?.name || 'Walk-in Customer',
            amount: Number(sale.totalAmount) || 0,
            time: formatTime(sale.createdAt),
            status: sale.status === 'COMPLETED' ? 'completed' : 'refunded',
        }));

        return { data };
    }

    /**
     * Get inventory items at or below their reorder point
     * GET /dashboard/low-stock
     */
    static async getLowStockAlerts(filters: DashboardFilters): Promise<LowStockReport> {
        const whereClause = buildBaseWhereClause(filters);

        const inventoryRecords: InventoryLowStockRecord[] = await prisma.inventory.findMany({
            where: {
                ...whereClause,
                variant: { isActive: true, product: { isActive: true } },
            },
            select: {
                availableQuantity: true,
                reorderPoint: true,
                variant: {
                    select: {
                        variantName: true,
                        product: { select: { name: true } },
                    },
                },
            },
        });

        // Mirrors the inventory overview's stock health classification so this count
        // stays consistent with the "Low/Out Stock" figure shown on the inventory page.
        const alerts = inventoryRecords.filter(
            (inv) =>
                inv.availableQuantity === 0 ||
                (inv.reorderPoint !== null && inv.reorderPoint > 0 && inv.availableQuantity <= inv.reorderPoint)
        );

        const data: LowStockAlertItem[] = alerts
            .map((inv) => ({
                name: buildVariantDisplayName(inv.variant),
                remaining: inv.availableQuantity,
                reorderPoint: inv.reorderPoint ?? 0,
            }))
            .sort((a, b) => {
                const ratioA = a.reorderPoint > 0 ? a.remaining / a.reorderPoint : 0;
                const ratioB = b.reorderPoint > 0 ? b.remaining / b.reorderPoint : 0;
                return ratioA - ratioB;
            })
            .slice(0, LOW_STOCK_LIMIT);

        return { data, totalCount: alerts.length };
    }
}
