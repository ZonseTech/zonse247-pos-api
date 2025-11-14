interface MonthlySales {
    date: number;
    totalAmount: number;
}

interface TopProduct {
    productId: string;
    name: string;
    quantity: number;
    summedSellPrice: number;
    categoryName: string;
}

interface DashboardCounts {
    totalSales: string;
    stock: number;
    totalUsers: number;
    allCustomers: number;
    expiredProducts: number;
    myTotalTransactions: number;
}

type MonthlySales = {
    date: number;
    totalAmount: number;
};

type TopProduct = {
    uuid: string;
    name: string;
    quantity: number;
    summedSellPrice: number;
    categoryName: string;
};