import { InventoryItem } from 'inventory-item';
import {
    MappedVariant,
    MappedInventory,
    MappedBarcode,
    ProductWithVariants,
} from '../types/inventory.types';

/**
 * Raw Prisma result types (simplified for mapping)
 */
interface PrismaCategory {
    id?: string;
    categoryId?: string;
    name: string;
    description?: string | null;
    isDefault?: boolean;
    tenantId?: string;
    branchId?: string;
    userId?: string;
}

interface PrismaProduct {
    id: string;
    tenantId: string;
    branchId: string;
    categoryId?: string | null;
    name: string;
    description?: string | null;
    brand?: string | null;
    isTaxable?: boolean;
    supplierName?: string | null;
    supplierCode?: string | null;
    defaultUnit?: string;
    imageUrl?: string | null;
    isActive?: boolean;
    category?: PrismaCategory | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PrismaInventory {
    id: string;
    availableQuantity: number;
    reservedQuantity: number;
    damagedQuantity: number;
    averageCost: any; // Prisma Decimal
    lastPurchaseCost: any; // Prisma Decimal
    reorderPoint?: number | null;
    maxStock?: number | null;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    lastRestockedAt?: Date | null;
    lastSoldAt?: Date | null;
}

interface PrismaBarcode {
    barcode: string;
    barcodeType?: string;
    barcodeSource?: string;
    isActive?: boolean;
}

interface PrismaVariant {
    id: string;
    tenantId: string;
    branchId: string;
    productId?: string;
    sku?: string | null;
    variantName?: string;
    primaryBarcode?: string | null;
    sellingPrice: any; // Prisma Decimal
    costPrice?: any; // Prisma Decimal
    unit?: string;
    description?: string | null;
    brand?: string | null;
    imageUrl?: string | null;
    size?: string | null;
    weight?: any | null;
    weightUnit?: string | null;
    volume?: any | null;
    volumeUnit?: string | null;
    dimensions?: string | null;
    customAttributes?: string | null;
    promoPrice?: any | null;
    promoStart?: Date | null;
    promoEnd?: Date | null;
    isTaxable?: boolean;
    expirationDate?: Date | null;
    manufactureDate?: Date | null;
    expiryDateAlert?: number | null;
    supplierName?: string | null;
    supplierCode?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    product?: PrismaProduct;
    inventories?: PrismaInventory[];
    inventory?: PrismaInventory;
    barcodes?: PrismaBarcode[];
}

interface PrismaProductWithVariants extends PrismaProduct {
    variants?: PrismaVariant[];
}

/**
 * Inventory Mapper
 * Transforms Prisma results to API response formats
 */
export class InventoryMapper {
    /**
     * Map ProductVariant + Inventory to InventoryItem interface
     * Provides backward compatibility with the existing POS terminal interface
     */
    static mapToInventoryItem(data: PrismaVariant | null): InventoryItem | null {
        if (!data) return null;

        const inventory = data.inventories?.[0] || data.inventory;
        const product = data.product;
        const displayName = this.buildDisplayName(data.variantName, product?.name);

        const categoryDetails = this.buildCategoryDetails(product?.category);

        const barcodes = this.mapBarcodes(data.barcodes);

        const baseItem = this.buildBaseInventoryItem(data, product, displayName, categoryDetails, barcodes);

        if (!inventory) {
            return {
                ...baseItem,
                inventoryId: '',
                availableQuantity: 0,
                reservedQuantity: 0,
                damagedQuantity: 0,
                averageCost: 0,
                lastPurchaseCost: 0,
                trackInventory: true,
                allowNegativeStock: false,
                quantity: '0',
                costPrice: 0,
            };
        }

        return {
            ...baseItem,
            inventoryId: inventory.id,
            availableQuantity: inventory.availableQuantity,
            reservedQuantity: inventory.reservedQuantity,
            damagedQuantity: inventory.damagedQuantity,
            averageCost: Number(inventory.averageCost),
            lastPurchaseCost: Number(inventory.lastPurchaseCost),
            reorderPoint: inventory.reorderPoint,
            reorderLevel: inventory.reorderPoint,
            maxStock: inventory.maxStock,
            trackInventory: inventory.trackInventory ?? true,
            allowNegativeStock: inventory.allowNegativeStock ?? false,
            lastRestockedAt: inventory.lastRestockedAt,
            lastSoldAt: inventory.lastSoldAt,
            quantity: inventory.availableQuantity.toString(),
            originalQuantity: inventory.availableQuantity.toString(),
            costPrice: Number(inventory.averageCost),
            minStock: inventory.reorderPoint,
            totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
        };
    }

    /**
     * Map Prisma product result to ProductWithVariants structure
     */
    static mapToProductWithVariants(data: PrismaProductWithVariants | null): ProductWithVariants | null {
        if (!data) return null;

        const variants = (data.variants || []).map((variant) => this.mapVariant(variant));

        const totalAvailableQuantity = variants.reduce(
            (sum, v) => sum + (v.inventory?.availableQuantity || 0),
            0
        );
        const totalReservedQuantity = variants.reduce(
            (sum, v) => sum + (v.inventory?.reservedQuantity || 0),
            0
        );

        return {
            id: data.id,
            tenantId: data.tenantId,
            branchId: data.branchId,
            categoryId: data.categoryId || null,
            name: data.name,
            description: data.description || null,
            brand: data.brand || null,
            isTaxable: data.isTaxable ?? true,
            supplierName: data.supplierName || null,
            supplierCode: data.supplierCode || null,
            defaultUnit: data.defaultUnit || 'piece',
            imageUrl: data.imageUrl || null,
            isActive: data.isActive ?? true,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
            categoryDetails: data.category
                ? {
                    categoryId: data.category.categoryId || data.category.id || '',
                    name: data.category.name,
                    description: data.category.description || null,
                    isDefault: data.category.isDefault ?? false,
                }
                : null,
            variantCount: variants.length,
            totalAvailableQuantity,
            totalReservedQuantity,
            variants,
        };
    }

    /**
     * Map a single variant
     */
    static mapVariant(variant: PrismaVariant): MappedVariant {
        const inventory = variant.inventories?.[0] || variant.inventory;

        return {
            id: variant.id,
            sku: variant.sku || null,
            variantName: variant.variantName || 'Default',
            primaryBarcode: variant.primaryBarcode || null,
            sellingPrice: Number(variant.sellingPrice),
            costPrice: Number(variant.costPrice || 0),
            unit: variant.unit || 'piece',
            description: variant.description || null,
            brand: variant.brand || null,
            imageUrl: variant.imageUrl || null,
            isTaxable: variant.isTaxable ?? true,
            supplierName: variant.supplierName || null,
            supplierCode: variant.supplierCode || null,
            size: variant.size || null,
            weight: variant.weight ? Number(variant.weight) : null,
            weightUnit: variant.weightUnit || null,
            volume: variant.volume ? Number(variant.volume) : null,
            volumeUnit: variant.volumeUnit || null,
            dimensions: variant.dimensions || null,
            customAttributes: variant.customAttributes || null,
            promoPrice: variant.promoPrice ? Number(variant.promoPrice) : null,
            promoStart: variant.promoStart || null,
            promoEnd: variant.promoEnd || null,
            expirationDate: variant.expirationDate || null,
            manufactureDate: variant.manufactureDate || null,
            expiryDateAlert: variant.expiryDateAlert || null,
            isDefault: variant.isDefault ?? false,
            isActive: variant.isActive ?? true,
            createdAt: variant.createdAt || new Date(),
            updatedAt: variant.updatedAt || new Date(),
            inventory: inventory ? this.mapInventory(inventory) : null,
            barcodes: this.mapBarcodes(variant.barcodes),
        };
    }

    /**
     * Map inventory record
     */
    static mapInventory(inventory: PrismaInventory): MappedInventory {
        return {
            inventoryId: inventory.id,
            availableQuantity: inventory.availableQuantity,
            reservedQuantity: inventory.reservedQuantity,
            damagedQuantity: inventory.damagedQuantity,
            averageCost: Number(inventory.averageCost),
            lastPurchaseCost: Number(inventory.lastPurchaseCost),
            reorderPoint: inventory.reorderPoint || null,
            maxStock: inventory.maxStock || null,
            trackInventory: inventory.trackInventory ?? true,
            allowNegativeStock: inventory.allowNegativeStock ?? false,
            lastRestockedAt: inventory.lastRestockedAt || null,
            lastSoldAt: inventory.lastSoldAt || null,
        };
    }

    /**
     * Map barcodes array
     */
    static mapBarcodes(barcodes?: PrismaBarcode[]): MappedBarcode[] {
        if (!barcodes) return [];
        return barcodes.map((b) => ({
            barcode: b.barcode,
            barcodeType: b.barcodeType || 'EAN13',
            barcodeSource: b.barcodeSource || 'STORE',
            isActive: b.isActive ?? true,
        }));
    }

    /**
     * Build display name from variant and product names
     */
    private static buildDisplayName(variantName?: string, productName?: string): string {
        if (variantName && variantName !== 'Default' && productName) {
            return `${productName} - ${variantName}`;
        }
        return productName || variantName || '';
    }

    /**
     * Build category details object
     */
    private static buildCategoryDetails(category?: PrismaCategory | null): InventoryItem['categoryDetails'] {
        if (!category) return undefined;
        return {
            categoryId: category.categoryId || category.id || '',
            name: category.name,
            description: category.description || undefined,
            isDefault: category.isDefault,
            tenantId: category.tenantId,
            branchId: category.branchId,
            userId: category.userId,
        };
    }

    /**
     * Build base inventory item (without inventory-specific fields)
     */
    private static buildBaseInventoryItem(
        data: PrismaVariant,
        product: PrismaProduct | undefined,
        displayName: string,
        categoryDetails: InventoryItem['categoryDetails'],
        barcodes: MappedBarcode[]
    ): Omit<
        InventoryItem,
        | 'inventoryId'
        | 'availableQuantity'
        | 'reservedQuantity'
        | 'damagedQuantity'
        | 'averageCost'
        | 'lastPurchaseCost'
        | 'trackInventory'
        | 'allowNegativeStock'
        | 'quantity'
        | 'costPrice'
    > {
        const isActive = data.isActive && (product?.isActive ?? true);

        return {
            productId: data.id,
            sku: data.sku,
            name: displayName,
            description: data.description || product?.description,
            unit: data.unit || 'piece',
            sellingPrice: Number(data.sellingPrice),
            primaryBarcode: data.primaryBarcode,
            isActive: isActive,
            brand: data.brand || product?.brand,
            size: data.size,
            dimensions: data.dimensions,
            weight: data.weight ? Number(data.weight) : undefined,
            promoPrice: data.promoPrice ? Number(data.promoPrice) : undefined,
            promoStart: data.promoStart,
            promoEnd: data.promoEnd,
            isTaxable: data.isTaxable ?? product?.isTaxable,
            expirationDate: data.expirationDate,
            manufactureDate: data.manufactureDate,
            expiryDateAlert: data.expiryDateAlert,
            supplierName: data.supplierName || product?.supplierName,
            supplierCode: data.supplierCode || product?.supplierCode,
            tenantId: data.tenantId,
            branchId: data.branchId,
            categoryId: product?.categoryId,
            categoryDetails,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            barcode: data.primaryBarcode || '',
            sellPrice: Number(data.sellingPrice),
            status: isActive ? 'active' : 'inactive',
            barcodes,
        };
    }

    /**
     * Map top value inventory items
     */
    static mapToTopValueItem(
        variant: PrismaVariant
    ): {
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
    } {
        const inventory = variant.inventories?.[0] || variant.inventory;
        const availableQty = inventory?.availableQuantity || 0;
        const avgCost = Number(inventory?.averageCost || 0);
        const sellingPrice = Number(variant.sellingPrice || 0);
        const totalCostValue = availableQty * avgCost;
        const totalRetailValue = availableQty * sellingPrice;

        const displayName = this.buildDisplayName(variant.variantName, variant.product?.name);

        return {
            productId: variant.id,
            name: displayName,
            sku: variant.sku || '',
            categoryName: variant.product?.category?.name || null,
            availableQuantity: availableQty,
            averageCost: Math.round(avgCost * 100) / 100,
            sellingPrice: Math.round(sellingPrice * 100) / 100,
            totalCostValue: Math.round(totalCostValue * 100) / 100,
            totalRetailValue: Math.round(totalRetailValue * 100) / 100,
            potentialProfit: Math.round((totalRetailValue - totalCostValue) * 100) / 100,
        };
    }
}
