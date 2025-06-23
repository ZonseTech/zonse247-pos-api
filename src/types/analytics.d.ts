interface MonthlySales {
    date: number;
    totalAmount: number;
}

interface Category {
    uuid: string;
    name: string;
}

interface TopProduct {
    uuid: string;
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