export interface ReportSummary {
    totalSales: number;
    grossProfit: number;
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
    branchId?: string;
    startDate?: string;
    endDate?: string;
}

export interface SaleDataItem {
    value: number;
    saleDate: Date;
    createdAt: Date;
}

export interface PaymentModesReport {
    data: SalesDataPoint[];
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
