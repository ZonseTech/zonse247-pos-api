import { Category } from "categoty";

// Database-agnostic decimal type (MySQL uses Decimal, SQLite uses number)
type DecimalValue = number | { toNumber(): number };

export interface OrderItem {
    orderId: string;
    refNumber?: string;
    transactionId: string;
    productId: string;
    quantity: DecimalValue;
    purchasePrice: DecimalValue;
    sellPrice: DecimalValue;
    createdAt?: Date;
    updatedAt?: Date;
    synced: number;
}

export interface OrderSummary {
    refNumber: string;
    itemCount: number;
    totalQuantity: number;
    totalPurchasePrice: number;
    totalSellPrice: number;
    totalProfit: number;
    items: OrderItem[];
}

export interface HoldOrder {
    itemId: string;
    reference: string;
    items: Array<CartItem>;
    total: number;
    totalItems: number;
    date: Date | string;
    status: string;
    userId?: string;
    till?: string;
}

export interface CartItem {
    barcode: number | string;
    productId: string;
    name: string;
    categoryId: string;
    sellPrice: number;
    discount: number;
    purchasePrice: number;
    variancePrice?: number;
    quantity: number;
    categoryDetails?: Category;
}