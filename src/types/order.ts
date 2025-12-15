import { Category } from "categoty";
import { Product } from "product";
import { Decimal } from "../databases/prisma/generated/prisma/internal/prismaNamespace";

export interface OrderItem {
    orderId: string;
    refNumber?: string;
    transactionId: string;
    productId: string;
    quantity: Decimal;
    purchasePrice: Decimal;
    sellPrice: Decimal;
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
    productDetails?: Product;
}