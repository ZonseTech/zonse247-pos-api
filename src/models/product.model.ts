import { BarcodeType, BarcodeSource } from '../databases/prisma/generated/prisma/client';

// Product is the parent/master product (e.g., "Nivea Lotion")
export interface Product {
    id: string;
    tenantId: string;
    branchId: string;
    categoryId?: string | null;
    name: string;
    description?: string | null;
    brand?: string | null;
    isTaxable?: boolean | null;
    supplierName?: string | null;
    supplierCode?: string | null;
    defaultUnit?: string | null;
    customAttributeSchema?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ProductVariant is the sellable unit (e.g., "Nivea 50ml", "Nivea 200ml")
export interface ProductVariant {
    id: string;
    productId: string;
    tenantId: string;
    branchId: string;
    sku?: string | null;
    variantName: string;
    primaryBarcode?: string | null;
    sellingPrice: number;
    costPrice: number;
    unit: string;
    description?: string | null;
    brand?: string | null;
    imageUrl?: string | null;
    isTaxable?: boolean | null;
    supplierName?: string | null;
    supplierCode?: string | null;
    size?: string | null;
    weight?: number | null;
    weightUnit?: string | null;
    volume?: number | null;
    volumeUnit?: string | null;
    dimensions?: string | null;
    customAttributes?: string | null;
    promoPrice?: number | null;
    promoStart?: Date | null;
    promoEnd?: Date | null;
    expirationDate?: Date | null;
    manufactureDate?: Date | null;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface VariantBarcode {
    id: string;
    variantId: string;
    barcode: string;
    barcodeType: BarcodeType;
    barcodeSource: BarcodeSource;
    description?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Legacy interface - kept for backward compatibility during migration
export interface ProductBarcode {
    id: string;
    productId: string;
    barcode: string;
    barcodeType: BarcodeType;
    barcodeSource: BarcodeSource;
    description?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Input for creating a new product with its default variant
export interface CreateProductInput {
    tenantId: string;
    branchId: string;
    categoryId?: string;
    name: string;
    description?: string;
    brand?: string;
    isTaxable?: boolean;
    supplierName?: string;
    supplierCode?: string;
    defaultUnit?: string;
    imageUrl?: string;
    // Default variant info
    variant?: {
        sku?: string;
        variantName?: string;
        primaryBarcode?: string;
        sellingPrice: number;
        costPrice?: number;
        unit?: string;
        barcodes?: {
            barcode: string;
            barcodeType?: BarcodeType;
            barcodeSource?: BarcodeSource;
            description?: string;
        }[];
    };
    // Legacy fields - mapped to default variant
    sku?: string | null;
    primaryBarcode?: string;
    sellingPrice?: number;
    unit?: string;
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

// Input for creating a new variant of an existing product
export interface CreateVariantInput {
    productId: string;
    sku?: string;
    variantName: string;
    primaryBarcode?: string;
    sellingPrice: number;
    costPrice?: number;
    unit?: string;
    description?: string;
    brand?: string;
    imageUrl?: string;
    isTaxable?: boolean;
    supplierName?: string;
    supplierCode?: string;
    size?: string;
    weight?: number;
    weightUnit?: string;
    volume?: number;
    volumeUnit?: string;
    dimensions?: string;
    customAttributes?: Record<string, any>;
    promoPrice?: number;
    promoStart?: Date;
    promoEnd?: Date;
    expirationDate?: Date;
    manufactureDate?: Date;
    isDefault?: boolean;
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
    description?: string;
    brand?: string;
    isTaxable?: boolean;
    supplierName?: string;
    supplierCode?: string;
    defaultUnit?: string;
    imageUrl?: string;
    isActive?: boolean;
}

export interface UpdateVariantInput {
    sku?: string;
    variantName?: string;
    primaryBarcode?: string;
    sellingPrice?: number;
    costPrice?: number;
    unit?: string;
    description?: string;
    brand?: string;
    imageUrl?: string;
    isTaxable?: boolean;
    supplierName?: string;
    supplierCode?: string;
    size?: string;
    weight?: number;
    weightUnit?: string;
    volume?: number;
    volumeUnit?: string;
    dimensions?: string;
    customAttributes?: Record<string, any>;
    promoPrice?: number;
    promoStart?: Date;
    promoEnd?: Date;
    expirationDate?: Date;
    manufactureDate?: Date;
    isDefault?: boolean;
    isActive?: boolean;
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

// Variant with inventory info
export interface VariantWithInventory extends ProductVariant {
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
    barcodes?: VariantBarcode[];
}

// Product with all its variants
export interface ProductWithVariants extends Product {
    variants: VariantWithInventory[];
    categoryDetails?: {
        categoryId: string;
        name: string;
        description?: string | null;
        isActive?: boolean | null;
        isDefault?: boolean | null;
    };
}

// Legacy interface - for backward compatibility
// Flattened view of a product+variant for POS terminal use
export interface ProductWithInventory {
    // Product info
    id: string;            // This is now the VARIANT id for POS operations
    productId: string;     // Parent product id
    tenantId: string;
    branchId: string;
    categoryId?: string | null;
    
    // Variant identification
    sku?: string | null;
    name: string;          // Product name
    variantName: string;   // Variant name (e.g., "50ml")
    displayName: string;   // Combined: "Nivea Lotion - 50ml"
    primaryBarcode?: string | null;
    
    // Pricing
    sellingPrice: number;
    costPrice: number;
    
    // Unit
    unit: string;
    
    // Other fields
    description?: string | null;
    brand?: string | null;
    imageUrl?: string | null;
    isTaxable?: boolean | null;
    
    // Status
    isActive: boolean;
    status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
    isDefault: boolean;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    
    // Inventory
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
    
    // Category
    categoryDetails?: {
        categoryId: string;
        name: string;
        description?: string | null;
        isActive?: boolean | null;
        isDefault?: boolean | null;
    };
    
    // Barcodes
    barcodes?: VariantBarcode[];
}

export interface SearchProductResult {
    product: ProductWithInventory;
    matchedBy: 'sku' | 'primaryBarcode' | 'barcode' | 'name' | 'variantName';
}
