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

export interface ParkedSale {
    id: string;
    tenantId: string;
    branchId: string;
    userId: string;
    terminalId?: string;
    customerId?: string;
    reference: string;
    subtotal: DecimalValue;
    taxAmount: DecimalValue;
    discountAmount: DecimalValue;
    totalAmount: DecimalValue;
    totalItems: number;
    status: ParkedSaleStatus;
    notes?: string;
    parkedAt: Date | string;
    expiresAt?: Date | string;
    resumedAt?: Date | string;
    synced: number;
    createdAt?: Date;
    updatedAt?: Date;
    items: ParkedSaleItem[];
}

export interface ParkedSaleItem {
    id: string;
    parkedSaleId: string;
    productId: string;
    categoryId?: string;
    name: string;
    barcode?: string;
    sku?: string;
    unit?: string;
    quantity: number;
    unitPrice: DecimalValue;
    sellPrice: DecimalValue;
    purchasePrice: DecimalValue;
    discount: DecimalValue;
    taxAmount: DecimalValue;
    subtotal: DecimalValue;
    createdAt?: Date;
}

export type ParkedSaleStatus = 'PARKED' | 'RESUMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

// Legacy type alias for backward compatibility
export type HoldOrder = ParkedSale;

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