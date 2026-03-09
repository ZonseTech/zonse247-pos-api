import { InventoryFilter } from '../types/inventory.types';

/**
 * Filter configuration for inventory queries
 */
export const FILTER_CONFIG: Record<InventoryFilter, {
    requiresPostProcessing: boolean;
    description: string;
}> = {
    all: {
        requiresPostProcessing: false,
        description: 'All active inventory items',
    },
    active: {
        requiresPostProcessing: false,
        description: 'Active inventory items',
    },
    inactive: {
        requiresPostProcessing: false,
        description: 'Inactive inventory items',
    },
    new: {
        requiresPostProcessing: false,
        description: 'Items added within the last 7 days',
    },
    'new-stock': {
        requiresPostProcessing: false,
        description: 'Items added within the last 7 days',
    },
    'low-stock': {
        requiresPostProcessing: true,
        description: 'Items with quantity at or below reorder point',
    },
    'expiring-soon': {
        requiresPostProcessing: false,
        description: 'Items expiring within 30 days',
    },
    expired: {
        requiresPostProcessing: false,
        description: 'Items past their expiration date',
    },
};

/**
 * Default pagination settings
 */
export const PAGINATION_DEFAULTS = {
    skip: 0,
    limit: 50,
    maxLimit: 1000,
};

/**
 * Date range constants
 */
export const DATE_RANGES = {
    NEW_ITEMS_DAYS: 7,
    EXPIRING_SOON_DAYS: 30,
};

/**
 * Stock status thresholds
 */
export const STOCK_STATUS = {
    OUT_OF_STOCK: 0,
    LOW_STOCK_PERCENTAGE: 0.2,
};

/**
 * Default values for new inventory items
 */
export const INVENTORY_DEFAULTS = {
    unit: 'piece',
    quantity: 0,
    reservedQuantity: 0,
    damagedQuantity: 0,
    trackInventory: true,
    allowNegativeStock: false,
    isTaxable: true,
    isActive: true,
};

/**
 * Barcode defaults
 */
export const BARCODE_DEFAULTS = {
    type: 'EAN13',
    source: 'STORE',
    isActive: true,
};

/**
 * Database field mappings for backward compatibility
 */
export const FIELD_MAPPINGS = {
    // Old field -> New field
    productId: 'variantId',
    sellPrice: 'sellingPrice',
    costPrice: 'averageCost',
    quantity: 'availableQuantity',
    minStock: 'reorderPoint',
    barcode: 'primaryBarcode',
};

/**
 * Validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
    NAME_MAX_LENGTH: 255,
    SKU_MAX_LENGTH: 100,
    BARCODE_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 1000,
    MIN_PRICE: 0,
    MIN_QUANTITY: 0,
};

/**
 * Search fields configuration
 */
export const SEARCH_FIELDS = {
    product: ['name', 'brand', 'description'],
    variant: ['sku', 'variantName', 'primaryBarcode'],
    barcode: ['barcode'],
};
