import { Category } from "categoty";
import { Product } from "product";

export interface OrderItem {
    itemId: string;
    refNumber?: string;
    transactionId: string;
    productId: string;
    quantity: number;
    purchasePrice: number;
    sellPrice: number;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
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
    productDetails?: Product;
}