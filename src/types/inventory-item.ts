import { Category } from "categoty";

/**
 * Represents an inventory item in the system
 * Combines Product and Inventory data from the new schema
 */
export interface InventoryItem {
    // Product fields
    productId: string;
    sku: string;
    name: string;
    description?: string;
    unit: string;
    sellingPrice: number;
    primaryBarcode?: string;
    isActive: boolean;

    // Inventory fields
    inventoryId: string;
    availableQuantity: number;
    reservedQuantity: number;
    damagedQuantity: number;
    averageCost: number;
    lastPurchaseCost: number;

    // Stock management
    reorderPoint?: number;
    maxStock?: number;
    trackInventory: boolean;
    allowNegativeStock: boolean;

    // Dates
    lastRestockedAt?: Date | string;
    lastSoldAt?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;

    // Foreign keys
    tenantId: string;
    branchId: string;

    // Legacy compatibility fields (computed)
    barcode?: string; // Mapped from primaryBarcode
    quantity?: string; // Mapped from availableQuantity
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
