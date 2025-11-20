export interface MonthlySales {
    date: number;
    totalAmount: number;
}

export interface TopProduct {
    productId: string;
    name: string;
    quantity: number;
    summedSellPrice: number;
    categoryName: string;
}

export interface DashboardCounts {
    totalSales: string;
    stock: number;
    totalUsers: number;
    allCustomers: number;
    expiredProducts: number;
    myTotalTransactions: number;
}
