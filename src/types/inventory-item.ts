import { Category } from "categoty";

/**
 * Represents an inventory item in the system
 * Corresponds to the 'inventory' table in the database
 */
export interface InventoryItem {
    // Primary Key
    productId: string;

    // Foreign Keys
    branchId: string;
    tenantId: string;
    userId: string;
    categoryId?: string;

    // Product Identification
    barcode: string;
    sku?: string;
    name: string;
    description?: string;

    // Product Details
    brand?: string;
    unit?: string;
    color?: string;
    size?: string;
    dimensions?: string;
    weight?: number;
    properties?: Record<string, any>;

    // Pricing
    costPrice: number;
    sellPrice: number;
    promoPrice?: number;
    promoStart?: Date | string;
    promoEnd?: Date | string;

    // Stock Management
    quantity: string;
    originalQuantity: string;
    reservedQuantity?: number;
    minStock?: number;
    maxStock?: number;
    stock?: number;
    reorderLevel?: number;

    // Inventory Settings
    status?: string;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    isTaxable?: boolean;

    // Dates
    expirationDate?: Date | string;
    manufactureDate?: Date | string;

    // Media
    imageUrls?: string[] | any;

    // Supplier Information
    supplierName?: string;
    supplierCode?: string;

    // Audit Fields
    createdBy?: string;
    lastUpdatedBy?: string;
    synced?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;

    // Additional computed/join fields
    categoryDetails?: Category;
    isExpired?: boolean;
}
