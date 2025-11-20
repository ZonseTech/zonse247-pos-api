import { Category } from "categoty";

export interface Product {
    productId: string;
    barcode: number | string;
    expirationDate?: string;
    createdAt?: string;
    tenantId?: string;
    branchId?: string;
    userId?: string;
    updatedAt?: string;
    costPrice?: string;
    description?: string;
    sellPrice?: string;
    promoPrice?: string;
    customPrice?: string;
    discount?: number;
    categoryId?: string;
    quantity?: string | number;
    orderItems?: number;
    originalQuantity?: number;
    name?: string;
    stock?: number;
    minStock?: string;
    status?: string;
    isExpired?: boolean;
    categoryDetails?: Category;
    synced?: 1 | 0;
}