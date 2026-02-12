/**
 * Product Constants
 * 
 * Centralized constants, error messages, and helper functions
 * for the product module.
 * 
 * @module constants/product.constants
 */

// ===========================================
// PAGINATION
// ===========================================

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PER_PAGE: 10,
    MAX_PER_PAGE: 100,
} as const;

// ===========================================
// DEFAULT VALUES
// ===========================================

export const DEFAULTS = {
    VARIANT_NAME: 'Default',
    UNIT: 'piece',
    BARCODE_TYPE: 'EAN13',
    BARCODE_SOURCE: 'SUPPLIER',
    SELLING_PRICE: 0,
    COST_PRICE: 0,
} as const;

// ===========================================
// PRODUCT STATUS
// ===========================================

export const PRODUCT_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    DISCONTINUED: 'DISCONTINUED',
} as const;

export type ProductStatusType = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

// ===========================================
// FILTER OPTIONS
// ===========================================

export const FILTER_OPTIONS = {
    ALL: 'all',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    NEW: 'new',
    NEW_STOCK: 'new-stock',
    LOW_STOCK: 'low-stock',
    OUT_OF_STOCK: 'out-of-stock',
} as const;

export const NEW_PRODUCT_DAYS = 7;

// ===========================================
// ERROR MESSAGES
// ===========================================

export const ERROR_MESSAGES = {
    // Validation errors
    NAME_REQUIRED: 'Product name is required.',
    INVALID_PRICE: 'Selling price cannot be negative.',
    MIN_EXCEEDS_MAX: (min: number, max: number) =>
        `Minimum stock (${min}) cannot exceed maximum stock (${max}).`,
    REORDER_EXCEEDS_MAX: (reorder: number, max: number) =>
        `Reorder level (${reorder}) cannot exceed maximum stock (${max}).`,

    // Duplicate errors
    SKU_EXISTS: (sku: string) =>
        `SKU "${sku}" is already in use by another product.`,
    BARCODE_EXISTS: (barcode: string, productName?: string) =>
        productName
            ? `Barcode "${barcode}" is already assigned to "${productName}".`
            : `Barcode "${barcode}" is already in use.`,
    DUPLICATE_BARCODES_IN_REQUEST: (barcode: string) =>
        `Duplicate barcode "${barcode}" in the same request.`,
    VARIANT_NAME_EXISTS: (variantName: string) =>
        `Variant "${variantName}" already exists for this product.`,

    // Not found errors
    PRODUCT_NOT_FOUND: 'Product not found.',
    VARIANT_NOT_FOUND: 'Variant not found.',
    CATEGORY_NOT_FOUND: 'Category not found.',

    // General errors
    CREATE_FAILED: 'Failed to create product.',
    UPDATE_FAILED: 'Failed to update product.',
    DELETE_FAILED: 'Failed to delete product.',
    SEARCH_FAILED: 'Failed to search product.',
    LIST_FAILED: 'Failed to list products.',
} as const;

// ===========================================
// SUCCESS MESSAGES
// ===========================================

export const SUCCESS_MESSAGES = {
    PRODUCT_CREATED: 'Product created successfully.',
    PRODUCT_UPDATED: 'Product updated successfully.',
    PRODUCT_DELETED: 'Product deleted successfully.',
    PRODUCT_RETRIEVED: 'Product retrieved successfully.',
    PRODUCTS_LISTED: 'Products retrieved successfully.',
    PRODUCT_FOUND: 'Product found.',
    BARCODE_ADDED: 'Barcode added successfully.',
    VARIANT_CREATED: 'Variant created successfully.',
    VARIANT_UPDATED: 'Variant updated successfully.',
    VARIANT_DELETED: 'Variant deleted successfully.',
} as const;

// ===========================================
// SEARCH MATCH TYPES
// ===========================================

export const SEARCH_MATCH_TYPE = {
    SKU: 'sku',
    PRIMARY_BARCODE: 'primaryBarcode',
    BARCODE: 'barcode',
    NAME: 'name',
    VARIANT_NAME: 'variantName',
} as const;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Determine product status based on variant and inventory state
 */
export function determineProductStatus(
    variantIsActive: boolean,
    productIsActive: boolean,
    availableQuantity?: number
): ProductStatusType {
    if (!variantIsActive || !productIsActive) {
        return PRODUCT_STATUS.DISCONTINUED;
    }
    if (availableQuantity !== undefined && availableQuantity === 0) {
        return PRODUCT_STATUS.OUT_OF_STOCK;
    }
    return PRODUCT_STATUS.ACTIVE;
}

/**
 * Build display name from product and variant names
 */
export function buildDisplayName(productName: string, variantName: string): string {
    if (variantName && variantName !== DEFAULTS.VARIANT_NAME) {
        return `${productName} - ${variantName}`;
    }
    return productName;
}

/**
 * Check if filter requires stock-based post-processing
 */
export function isStockBasedFilter(filter: string): boolean {
    return filter === FILTER_OPTIONS.LOW_STOCK || filter === FILTER_OPTIONS.OUT_OF_STOCK;
}

/**
 * Check if status requires stock-based post-processing
 */
export function isStockBasedStatus(status: string | undefined): boolean {
    return status === PRODUCT_STATUS.ACTIVE || status === PRODUCT_STATUS.OUT_OF_STOCK;
}

/**
 * Get the date for "new" product filter (7 days ago)
 */
export function getNewProductDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - NEW_PRODUCT_DAYS);
    return date;
}

/**
 * Normalize barcode for comparison (lowercase)
 */
export function normalizeBarcode(barcode: string): string {
    return barcode.toLowerCase().trim();
}

/**
 * Convert to number with fallback
 */
export function toNumber(value: any, fallback = 0): number {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
}

/**
 * Safe JSON stringify for custom attributes
 */
export function stringifyCustomAttributes(attrs: Record<string, any> | undefined): string | null {
    if (!attrs) return null;
    try {
        return JSON.stringify(attrs);
    } catch {
        return null;
    }
}
