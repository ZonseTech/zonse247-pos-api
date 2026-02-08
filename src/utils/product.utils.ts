/**
 * Product Utilities
 * 
 * Helper functions for product data mapping, transformation, and validation.
 * Separated from the main service for better testability and reusability.
 * 
 * @module utils/product.utils
 */

import { v4 as uuidv4 } from 'uuid';
import {
    ProductWithInventory,
    ProductWithVariants,
    VariantWithInventory,
    VariantBarcode,
    InventoryInfo,
    CategoryDetails,
    BarcodeInput,
} from '../types/product.types';
import {
    DEFAULTS,
    determineProductStatus,
    buildDisplayName,
    toNumber,
} from '../constants/product.constants';

// ===========================================
// VARIANT TO PRODUCT MAPPING
// ===========================================

/**
 * Map raw variant data to flattened ProductWithInventory
 * This is for backward compatibility with POS operations
 */
export function mapVariantToProductWithInventory(variant: any): ProductWithInventory {
    const inventory = variant.inventory;
    const product = variant.product;

    const status = determineProductStatus(
        variant.isActive,
        product?.isActive ?? true,
        inventory?.availableQuantity
    );

    const displayName = buildDisplayName(
        product?.name || '',
        variant.variantName
    );

    return {
        // IDs
        id: variant.id,           // Variant ID for POS operations
        productId: variant.productId,
        tenantId: variant.tenantId,
        branchId: variant.branchId,
        categoryId: product?.categoryId,

        // Identification
        sku: variant.sku,
        name: product?.name || '',
        variantName: variant.variantName,
        displayName,
        primaryBarcode: variant.primaryBarcode,

        // Pricing
        sellingPrice: toNumber(variant.sellingPrice),
        costPrice: toNumber(variant.costPrice),

        // Unit
        unit: variant.unit,

        // Other fields (inherit from product if not set on variant)
        description: variant.description || product?.description,
        brand: variant.brand || product?.brand,
        imageUrl: variant.imageUrl || product?.imageUrl,
        isTaxable: variant.isTaxable ?? product?.isTaxable,

        // Status
        isActive: variant.isActive && (product?.isActive ?? true),
        status,
        isDefault: variant.isDefault,

        // Timestamps
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,

        // Inventory
        inventory: mapInventory(inventory),

        // Category
        categoryDetails: mapCategoryDetails(product?.category),

        // Barcodes
        barcodes: mapBarcodes(variant.barcodes),
    };
}

/**
 * Map product with all its variants
 */
export function mapProductWithVariants(product: any): ProductWithVariants {
    return {
        id: product.id,
        tenantId: product.tenantId,
        branchId: product.branchId,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        brand: product.brand,
        isTaxable: product.isTaxable,
        supplierName: product.supplierName,
        supplierCode: product.supplierCode,
        defaultUnit: product.defaultUnit,
        customAttributeSchema: product.customAttributeSchema,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        categoryDetails: mapCategoryDetails(product.category),
        variants: product.variants?.map(mapVariantWithInventory) || [],
    };
}

/**
 * Map variant with inventory
 */
export function mapVariantWithInventory(variant: any): VariantWithInventory {
    return {
        id: variant.id,
        productId: variant.productId,
        tenantId: variant.tenantId,
        branchId: variant.branchId,
        sku: variant.sku,
        variantName: variant.variantName,
        primaryBarcode: variant.primaryBarcode,
        sellingPrice: toNumber(variant.sellingPrice),
        costPrice: toNumber(variant.costPrice),
        unit: variant.unit,
        description: variant.description,
        brand: variant.brand,
        imageUrl: variant.imageUrl,
        isTaxable: variant.isTaxable,
        supplierName: variant.supplierName,
        supplierCode: variant.supplierCode,
        size: variant.size,
        weight: variant.weight ? toNumber(variant.weight) : null,
        weightUnit: variant.weightUnit,
        volume: variant.volume ? toNumber(variant.volume) : null,
        volumeUnit: variant.volumeUnit,
        dimensions: variant.dimensions,
        customAttributes: variant.customAttributes,
        promoPrice: variant.promoPrice ? toNumber(variant.promoPrice) : null,
        promoStart: variant.promoStart,
        promoEnd: variant.promoEnd,
        expirationDate: variant.expirationDate,
        manufactureDate: variant.manufactureDate,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        inventory: mapInventory(variant.inventory),
        barcodes: mapBarcodes(variant.barcodes),
    };
}

// ===========================================
// SUB-ENTITY MAPPING
// ===========================================

/**
 * Map inventory data
 */
export function mapInventory(inventory: any): InventoryInfo | undefined {
    if (!inventory) return undefined;

    return {
        availableQuantity: inventory.availableQuantity,
        reservedQuantity: inventory.reservedQuantity,
        damagedQuantity: inventory.damagedQuantity,
        averageCost: toNumber(inventory.averageCost),
        lastPurchaseCost: toNumber(inventory.lastPurchaseCost),
        reorderPoint: inventory.reorderPoint,
        maxStock: inventory.maxStock,
        trackInventory: inventory.trackInventory,
        allowNegativeStock: inventory.allowNegativeStock,
    };
}

/**
 * Map category details
 */
export function mapCategoryDetails(category: any): CategoryDetails | undefined {
    if (!category) return undefined;

    return {
        categoryId: category.categoryId,
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        isDefault: category.isDefault,
    };
}

/**
 * Map barcodes array
 */
export function mapBarcodes(barcodes: any[] | undefined): VariantBarcode[] | undefined {
    if (!barcodes) return undefined;

    return barcodes.map((bc: any) => ({
        id: bc.id,
        variantId: bc.variantId,
        barcode: bc.barcode,
        barcodeType: bc.barcodeType,
        barcodeSource: bc.barcodeSource,
        description: bc.description,
        isActive: bc.isActive,
        createdAt: bc.createdAt,
        updatedAt: bc.updatedAt,
    }));
}

// ===========================================
// DATA CREATION HELPERS
// ===========================================

/**
 * Create barcode records for database insertion
 */
export function createBarcodeRecords(barcodes: BarcodeInput[]): any[] {
    return barcodes.map((bc) => ({
        id: uuidv4(),
        barcode: bc.barcode,
        barcodeType: bc.barcodeType ?? DEFAULTS.BARCODE_TYPE,
        barcodeSource: bc.barcodeSource ?? DEFAULTS.BARCODE_SOURCE,
        description: bc.description,
    }));
}

/**
 * Create inventory record data for a new variant
 */
export function createInventoryData(
    tenantId: string,
    branchId: string,
    options?: {
        trackInventory?: boolean;
        allowNegativeStock?: boolean;
        reorderLevel?: number;
        minStock?: number;
        maxStock?: number;
    }
): any {
    return {
        id: uuidv4(),
        tenantId,
        branchId,
        availableQuantity: 0,
        reservedQuantity: 0,
        damagedQuantity: 0,
        averageCost: 0,
        lastPurchaseCost: 0,
        reorderPoint: options?.reorderLevel ?? options?.minStock,
        maxStock: options?.maxStock,
        trackInventory: options?.trackInventory !== undefined ? options.trackInventory : true,
        allowNegativeStock: options?.allowNegativeStock !== undefined ? options.allowNegativeStock : false,
    };
}

// ===========================================
// QUERY BUILDERS
// ===========================================

/**
 * Build product include for queries
 */
export function buildProductInclude(): any {
    return {
        category: true,
        variants: {
            where: { isActive: true },
            include: {
                inventory: true,
                barcodes: {
                    where: { isActive: true },
                },
            },
            orderBy: [
                { isDefault: 'desc' },
                { variantName: 'asc' },
            ],
        },
    };
}

/**
 * Build variant include for queries
 */
export function buildVariantInclude(): any {
    return {
        product: {
            include: {
                category: true,
            },
        },
        inventory: true,
        barcodes: {
            where: { isActive: true },
        },
    };
}

/**
 * Build variant include with inventory for void operations
 */
export function buildVariantWithInventoryInclude(): any {
    return {
        inventory: true,
        product: {
            select: {
                id: true,
                name: true,
            },
        },
    };
}

// ===========================================
// FILTER HELPERS
// ===========================================

/**
 * Filter products by stock status
 */
export function filterByStockStatus(
    products: ProductWithInventory[],
    status: string | undefined
): ProductWithInventory[] {
    if (status === 'ACTIVE') {
        return products.filter(p =>
            p.inventory && p.inventory.availableQuantity > 0
        );
    }
    if (status === 'OUT_OF_STOCK') {
        return products.filter(p =>
            p.inventory && p.inventory.availableQuantity === 0
        );
    }
    return products;
}

/**
 * Filter products by stock filter type
 */
export function filterByStockFilter(
    products: ProductWithInventory[],
    filter: string
): ProductWithInventory[] {
    if (filter === 'low-stock') {
        return products.filter(p => {
            if (!p.inventory) return false;
            const reorderPoint = p.inventory.reorderPoint || 0;
            return p.inventory.availableQuantity > 0 &&
                   p.inventory.availableQuantity <= reorderPoint;
        });
    }
    if (filter === 'out-of-stock') {
        return products.filter(p =>
            p.inventory && p.inventory.availableQuantity === 0
        );
    }
    return products;
}

// ===========================================
// VALIDATION HELPERS
// ===========================================

/**
 * Validate pagination parameters
 */
export function validatePagination(page: number, perPage: number): { valid: boolean; error?: string } {
    if (page < 1) {
        return { valid: false, error: 'Page number must be at least 1' };
    }
    if (perPage < 1 || perPage > 100) {
        return { valid: false, error: 'Items per page must be between 1 and 100' };
    }
    return { valid: true };
}

/**
 * Extract variant data from create product input (handles legacy and new formats)
 */
export function extractVariantData(data: any): {
    sku?: string;
    barcode?: string;
    barcodes?: BarcodeInput[];
    sellingPrice: number;
    unit: string;
    variantName: string;
    costPrice: number;
} {
    return {
        sku: data.variant?.sku ?? data.sku,
        barcode: data.variant?.primaryBarcode ?? data.primaryBarcode,
        barcodes: data.variant?.barcodes ?? data.barcodes,
        sellingPrice: data.variant?.sellingPrice ?? data.sellingPrice ?? DEFAULTS.SELLING_PRICE,
        unit: data.variant?.unit ?? data.unit ?? data.defaultUnit ?? DEFAULTS.UNIT,
        variantName: data.variant?.variantName ?? DEFAULTS.VARIANT_NAME,
        costPrice: data.variant?.costPrice ?? DEFAULTS.COST_PRICE,
    };
}
