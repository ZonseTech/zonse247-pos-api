interface OrderItem {
    uuid: string;
    refNumber?: string;
    transactionUuid: string;
    productUuid: string;
    quantity: number;
    purchasePrice: number;
    sellPrice: number;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
}

interface OrderSummary {
    refNumber: string;
    itemCount: number;
    totalQuantity: number;
    totalPurchasePrice: number;
    totalSellPrice: number;
    totalProfit: number;
    items: OrderItem[];
}

interface HoldOrder {
    uuid: string;
    reference: string;
    items: Array<CartItem>;
    total: number;
    totalItems: number;
    date: Date | string;
    status: string;
    userId?: string;
    till?: string;
}

interface CartItem {
    barcode: number | string;
    productUuid: string;
    name: string;
    categoryUuid: string;
    sellPrice: number;
    purchasePrice: number;
    variancePrice?: number;
    quantity: number;
    categoryDetails?: Category;
}