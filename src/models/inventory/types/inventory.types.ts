import { AuthenticatedUser } from 'auth';

/**
 * Inventory Filter Types
 */
export type InventoryFilter =
    | 'all'
    | 'active'
    | 'inactive'
    | 'new'
    | 'new-stock'
    | 'low-stock'
    | 'expiring-soon'
    | 'expired';

/**
 * Filter options for inventory queries
 */
export interface InventoryFilterOptions {
    search?: string;
    filter?: InventoryFilter;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    skip: number;
    limit: number;
}

/**
 * Combined query options
 */
export interface InventoryQueryOptions extends InventoryFilterOptions, Partial<PaginationOptions> { }

/**
 * Inventory counts result
 */
export interface InventoryDetailedCounts {
    totalItems: number;
    incompleteItems: number;
    itemsInStock: number;
    lowStockItems: number;
    expiredItems: number;
}

/**
 * Category breakdown for overview
 */
export interface CategoryBreakdown {
    categoryId: string | null;
    categoryName: string;
    productCount: number;
    totalQuantity: number;
    totalCostValue: number;
    totalRetailValue: number;
}

/**
 * Stock health summary
 */
export interface StockHealthSummary {
    healthy: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
}

/**
 * Inventory overview result
 */
export interface InventoryOverview {
    totalProducts: number;
    totalStockQuantity: number;
    totalStockValue: number;
    totalRetailValue: number;
    potentialProfit: number;
    profitMargin: number;
    averageCostPerUnit: number;
    averageSellingPricePerUnit: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoryBreakdown: CategoryBreakdown[];
    stockHealthSummary: StockHealthSummary;
    filters: {
        search: string;
        filter: string;
        categoryId: string | null;
        startDate: string | null;
        endDate: string | null;
    };
}

/**
 * Top value inventory item
 */
export interface TopValueInventoryItem {
    productId: string;
    name: string;
    sku: string;
    categoryName: string | null;
    availableQuantity: number;
    averageCost: number;
    sellingPrice: number;
    totalCostValue: number;
    totalRetailValue: number;
    potentialProfit: number;
}

/**
 * Variant data for create/update operations
 */
export interface VariantData {
    id?: string;
    sku?: string;
    variantName?: string;
    barcode?: string;
    primaryBarcode?: string;
    sellPrice?: number;
    sellingPrice?: number;
    costPrice?: number;
    quantity?: number;
    availableQuantity?: number;
    reservedQuantity?: number;
    minStock?: number;
    maxStock?: number;
    reorderLevel?: number;
    unit?: string;
    description?: string;
    brand?: string;
    imageUrl?: string;
    size?: string;
    weight?: string | number;
    weightUnit?: string;
    volume?: string | number;
    volumeUnit?: string;
    dimensions?: string;
    color?: string;
    customAttributes?: string;
    promoPrice?: number;
    promoStart?: string | Date;
    promoEnd?: string | Date;
    isTaxable?: boolean;
    expirationDate?: string | Date;
    manufactureDate?: string | Date;
    expiryDateAlert?: number;
    supplierName?: string;
    supplierCode?: string;
    isDefault?: boolean;
    isActive?: boolean;
    status?: 'active' | 'inactive';
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    additionalBarcodes?: Array<{ code?: string; barcode?: string; type?: string; source?: string }>;
}

/**
 * Product data for create operations
 */
export interface ProductCreateData {
    name: string;
    categoryId?: string;
    description?: string;
    brand?: string;
    isTaxable?: boolean;
    supplierName?: string;
    supplierCode?: string;
    unit?: string;
    defaultUnit?: string;
    variants?: VariantData[];
    // Single variant shorthand
    barcode?: string;
    sku?: string;
    sellPrice?: number;
    sellingPrice?: number;
    costPrice?: number;
    quantity?: number;
    minStock?: number;
    maxStock?: number;
}

/**
 * Product update data
 */
export interface ProductUpdateData extends Partial<ProductCreateData> {
    imageUrl?: string;
    isActive?: boolean;
}

/**
 * Mapped variant for API response
 */
export interface MappedVariant {
    id: string;
    sku: string | null;
    variantName: string;
    primaryBarcode: string | null;
    sellingPrice: number;
    costPrice: number;
    unit: string;
    description: string | null;
    brand: string | null;
    imageUrl: string | null;
    isTaxable: boolean;
    supplierName: string | null;
    supplierCode: string | null;
    size: string | null;
    weight: number | null;
    weightUnit: string | null;
    volume: number | null;
    volumeUnit: string | null;
    dimensions: string | null;
    customAttributes: string | null;
    promoPrice: number | null;
    promoStart: Date | null;
    promoEnd: Date | null;
    expirationDate: Date | null;
    manufactureDate: Date | null;
    expiryDateAlert: number | null;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    inventory: MappedInventory | null;
    barcodes: MappedBarcode[];
}

/**
 * Mapped inventory for API response
 */
export interface MappedInventory {
    inventoryId: string;
    availableQuantity: number;
    reservedQuantity: number;
    damagedQuantity: number;
    averageCost: number;
    lastPurchaseCost: number;
    reorderPoint: number | null;
    maxStock: number | null;
    trackInventory: boolean;
    allowNegativeStock: boolean;
    lastRestockedAt: Date | null;
    lastSoldAt: Date | null;
}

/**
 * Mapped barcode for API response
 */
export interface MappedBarcode {
    barcode: string;
    barcodeType: string;
    barcodeSource: string;
    isActive: boolean;
}

/**
 * Product with variants for grouped view
 */
export interface ProductWithVariants {
    id: string;
    tenantId: string;
    branchId: string;
    categoryId: string | null;
    name: string;
    description: string | null;
    brand: string | null;
    isTaxable: boolean;
    supplierName: string | null;
    supplierCode: string | null;
    defaultUnit: string;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    categoryDetails: {
        categoryId: string;
        name: string;
        description: string | null;
        isDefault: boolean;
    } | null;
    variantCount: number;
    totalAvailableQuantity: number;
    totalReservedQuantity: number;
    variants: MappedVariant[];
}

/**
 * Products with variants result
 */
export interface ProductsWithVariantsResult {
    products: ProductWithVariants[];
    total: number;
}

/**
 * Auth context type alias
 */
export type AuthContext = AuthenticatedUser;
