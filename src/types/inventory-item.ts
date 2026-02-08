import { Category } from "categoty";

/**
 * Represents an inventory item in the system
 * Combines Product and Inventory data from the new schema
 */
export interface InventoryItem {
    // Product fields
    productId: string;
    sku?: string | null;
    name: string;
    description?: string;
    unit: string;
    sellingPrice: number;
    primaryBarcode?: string;
    isActive: boolean;

    // Product attributes
    brand?: string;
    color?: string;
    size?: string;
    dimensions?: string;
    weight?: number;
    properties?: Record<string, any>;

    // Inventory fields
    inventoryId: string;
    availableQuantity: number;
    reservedQuantity: number;
    damagedQuantity: number;
    averageCost: number;
    lastPurchaseCost: number;

    // Stock management
    reorderPoint?: number;
    reorderLevel?: number;
    maxStock?: number;
    trackInventory: boolean;
    allowNegativeStock: boolean;

    // Pricing
    promoPrice?: number;
    promoStart?: Date | string;
    promoEnd?: Date | string;

    // Tax
    isTaxable?: boolean;

    // Dates
    lastRestockedAt?: Date | string;
    lastSoldAt?: Date | string;
    expirationDate?: Date | string;
    manufactureDate?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;

    // Foreign keys
    tenantId: string;
    branchId: string;
    userId?: string;

    // Audit fields
    createdBy?: string;
    lastUpdatedBy?: string;

    // Media
    imageUrls?: string[];

    // Supplier info
    supplierName?: string;
    supplierCode?: string;

    // Legacy compatibility fields (computed)
    barcode?: string; // Mapped from primaryBarcode
    quantity?: string; // Mapped from availableQuantity
    originalQuantity?: string;
    costPrice?: number; // Mapped from averageCost
    sellPrice?: number; // Mapped from sellingPrice
    status?: string; // Computed from isActive
    minStock?: number; // Mapped from reorderPoint

    // Category support (from old system)
    categoryId?: string;
    categoryDetails?: Category;

    // Additional barcodes
    barcodes?: Array<{
        barcode: string;
        barcodeType: string;
        barcodeSource: string;
        isActive: boolean;
    }>;

    // Computed fields
    isExpired?: boolean;
    totalQuantity?: number; // availableQuantity + reservedQuantity
}
