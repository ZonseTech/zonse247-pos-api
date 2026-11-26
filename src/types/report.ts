export interface ReportSummary {
    totalSales: number;
    expenses: number;
    netProfit: number;
    topStocks: number;
    topCategory: string;
    receiptCount: number;
    paymentModes: number;
}

export interface SalesDataPoint {
    label: string;
    value: number;
}

export interface TotalSalesReport {
    hourly: {
        data: SalesDataPoint[];
    };
    weekly: {
        data: SalesDataPoint[];
    };
    monthly: {
        data: SalesDataPoint[];
    };
}

export interface ReportFilters {
    tenantId: string;
    /** A single branch to scope to, or a list of branches to aggregate across (e.g. "all accessible branches") */
    branchId?: string | string[];
    startDate?: string;
    endDate?: string;
}

export interface SaleDataItem {
    value: number;
    saleDate: Date;
    createdAt: Date;
}

export interface PaymentModeDataPoint {
    label: string;
    value: number;
    transactions: number;
}

export interface PaymentModesReport {
    data: PaymentModeDataPoint[];
}

export interface TopStockItem {
    name: string;
    quantity: number;
    pricing: number;
}

export interface TopCategoryItem {
    name: string;
    orderCount: number;
    totalPrice: number;
}

export interface TopCategoriesReport {
    data: TopCategoryItem[];
}

export interface TopStocksReport {
    data: TopStockItem[];
}

export interface ExpensesByCategoryItem {
    name: string;
    count: number;
    totalAmount: number;
}

export interface ExpensesByCategoryReport {
    data: ExpensesByCategoryItem[];
}
