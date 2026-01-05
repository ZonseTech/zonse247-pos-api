import { BarcodeType, BarcodeSource } from '../databases/prisma/generated/prisma/client';

export interface Product {
    id: string;
    tenantId: string;
    branchId: string;
    categoryId?: string;
    sku: string;
    name: string;
    primaryBarcode?: string;
    description?: string;
    unit: string;
    sellingPrice: number;
    isActive: boolean;
    status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductBarcode {
    id: string;
    productId: string;
    barcode: string;
    barcodeType: BarcodeType;
    barcodeSource: BarcodeSource;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProductInput {
    tenantId: string;
    branchId: string;
    categoryId?: string;
    sku: string;
    name: string;
    primaryBarcode?: string;
    description?: string;
    unit?: string;
    sellingPrice: number;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    minStock?: number;
    maxStock?: number;
    reorderLevel?: number;
    barcodes?: {
        barcode: string;
        barcodeType?: BarcodeType;
        barcodeSource?: BarcodeSource;
        description?: string;
    }[];
}

export interface UpdateProductInput {
    name?: string;
    categoryId?: string;
    primaryBarcode?: string;
    description?: string;
    unit?: string;
    sellingPrice?: number;
    isActive?: boolean;
}

export interface ProductWithInventory extends Product {
    inventory?: {
        availableQuantity: number;
        reservedQuantity: number;
        damagedQuantity: number;
        averageCost: number;
        lastPurchaseCost: number;
        reorderPoint?: number | null;
        maxStock?: number | null;
        trackInventory: boolean;
        allowNegativeStock: boolean;
    };
    categoryDetails?: {
        categoryId: string;
        name: string;
        description?: string;
        isActive: boolean;
    };
    barcodes?: ProductBarcode[];
}

export interface SearchProductResult {
    product: ProductWithInventory;
    matchedBy: 'sku' | 'primaryBarcode' | 'barcode' | 'name';
}
