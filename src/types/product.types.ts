/**
 * Product Types
 * 
 * Centralized TypeScript interfaces for the product module.
 * Includes types for products, variants, barcodes, and inventory.
 * 
 * @module types/product.types
 */

import { BarcodeType, BarcodeSource } from '../databases/prisma/generated/prisma/client';

// ===========================================
// BASE ENTITIES
// ===========================================

/**
 * Product - the parent/master product (e.g., "Nivea Lotion")
 */
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

/**
 * ProductVariant - the sellable unit (e.g., "Nivea 50ml", "Nivea 200ml")
 */
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

/**
 * Variant barcode record
 */
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

/**
 * Inventory data for a variant
 */
export interface InventoryInfo {
    availableQuantity: number;
    reservedQuantity: number;
    damagedQuantity: number;
    averageCost: number;
    lastPurchaseCost: number;
    reorderPoint?: number | null;
    maxStock?: number | null;
    trackInventory: boolean;
    allowNegativeStock: boolean;
}

/**
 * Category details for display
 */
export interface CategoryDetails {
    categoryId: string;
    name: string;
    description?: string | null;
    isActive?: boolean | null;
    isDefault?: boolean | null;
}

// ===========================================
// INPUT TYPES
// ===========================================

/**
 * Barcode input for creating/updating
 */
export interface BarcodeInput {
    barcode: string;
    barcodeType?: BarcodeType;
    barcodeSource?: BarcodeSource;
    description?: string;
}

/**
 * Variant input for product creation
 */
export interface VariantInput {
    sku?: string;
    variantName?: string;
    primaryBarcode?: string;
    sellingPrice: number;
    costPrice?: number;
    unit?: string;
    barcodes?: BarcodeInput[];
}

/**
 * Input for creating a new product with its default variant
 */
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
    // Default variant info (new structure)
    variant?: VariantInput;
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
    barcodes?: BarcodeInput[];
}

/**
 * Input for creating a new variant of an existing product
 */
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
    barcodes?: BarcodeInput[];
}

/**
 * Input for updating a product (parent only)
 */
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

/**
 * Input for updating a variant
 */
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
    barcodes?: BarcodeInput[];
}

// ===========================================
// RESPONSE TYPES
// ===========================================

/**
 * Product status for display
 */
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

/**
 * Variant with inventory info
 */
export interface VariantWithInventory extends ProductVariant {
    inventory?: InventoryInfo;
    barcodes?: VariantBarcode[];
}

/**
 * Product with all its variants
 */
export interface ProductWithVariants extends Product {
    variants: VariantWithInventory[];
    categoryDetails?: CategoryDetails;
}

/**
 * Flattened view of a product+variant for POS terminal use
 * The `id` field is the VARIANT id for POS operations
 */
export interface ProductWithInventory {
    // Product info
    id: string;            // Variant id for POS operations
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
    status?: ProductStatus;
    isDefault: boolean;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // Inventory
    inventory?: InventoryInfo;

    // Category
    categoryDetails?: CategoryDetails;

    // Barcodes
    barcodes?: VariantBarcode[];
}

/**
 * Search result with match info
 */
export type SearchMatchType = 'sku' | 'primaryBarcode' | 'barcode' | 'name' | 'variantName';

export interface SearchProductResult {
    product: ProductWithInventory;
    matchedBy: SearchMatchType;
}

/**
 * Duplicate barcode check result
 */
export interface DuplicateBarcodeResult {
    exists: boolean;
    productName?: string;
    variantName?: string;
    matchType?: 'primary' | 'alternative';
}

/**
 * List products options
 */
export interface ListProductsOptions {
    page?: number;
    perPage?: number;
    search?: string;
    filter?: 'all' | 'active' | 'inactive' | 'new' | 'new-stock' | 'low-stock' | 'out-of-stock';
    status?: string;
    categoryId?: string;
    includeInactive?: boolean;
}

/**
 * Paginated products response
 */
export interface PaginatedProductsResponse {
    products: ProductWithInventory[];
    total: number;
    totalPages: number;
}
