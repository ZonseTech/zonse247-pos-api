export interface DashboardFilters {
    tenantId: string;
    branchId?: string;
}

export interface DashboardSummary {
    todaysRevenue: number;
    revenueDelta: number;
    todaysSalesCount: number;
    salesDelta: number;
    todaysGrossProfit: number;
    grossProfitDelta: number;
}

export interface DashboardDataPoint {
    label: string;
    value: number;
}

export interface RevenueTrendReport {
    data: DashboardDataPoint[];
}

export interface PaymentMethodsBreakdown {
    data: DashboardDataPoint[];
}

export interface TopSellingProduct {
    name: string;
    unitsSold: number;
}

export interface TopSellingProductsReport {
    data: TopSellingProduct[];
}

export interface RecentSaleItem {
    id: string;
    customer: string;
    amount: number;
    time: string;
    status: 'completed' | 'refunded';
}

export interface RecentSalesReport {
    data: RecentSaleItem[];
}

export interface LowStockAlertItem {
    name: string;
    remaining: number;
    reorderPoint: number;
}

export interface LowStockReport {
    data: LowStockAlertItem[];
    totalCount: number;
}
