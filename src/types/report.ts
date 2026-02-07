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
