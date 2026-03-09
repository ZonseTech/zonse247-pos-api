import {
    InventoryFilterOptions,
    InventoryFilter,
    AuthContext
} from '../types/inventory.types';
import { DATE_RANGES } from '../constants/inventory.constants';

/**
 * Prisma where clause type for product variants
 */
export interface VariantWhereClause {
    tenantId: string;
    branchId: string;
    isActive?: boolean;
    createdAt?: {
        gte?: Date;
        lte?: Date;
    };
    expirationDate?: {
        lt?: Date;
        gte?: Date;
        lte?: Date;
    };
    product?: {
        isActive?: boolean;
        categoryId?: string;
    };
    OR?: Array<Record<string, any>>;
}

/**
 * Prisma where clause type for products
 */
export interface ProductWhereClause {
    tenantId: string;
    branchId: string;
    isActive?: boolean;
    createdAt?: {
        gte?: Date;
        lte?: Date;
    };
    categoryId?: string;
    variants?: {
        some: {
            isActive?: boolean;
        };
    };
    OR?: Array<Record<string, any>>;
}

/**
 * Query Builder for Inventory operations
 * Handles construction of Prisma where clauses from filter options
 */
export class InventoryQueryBuilder {
    /**
     * Build where clause for variant queries
     */
    static buildVariantWhereClause(
        auth: AuthContext,
        options: InventoryFilterOptions = {}
    ): VariantWhereClause {
        const { search = '', filter = 'all', categoryId, startDate, endDate } = options;

        const whereClause: VariantWhereClause = {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
        };

        this.applyFilterConditions(whereClause, filter as InventoryFilter);

        if (categoryId) {
            whereClause.product = {
                ...(whereClause.product || {}),
                categoryId,
            };
        }

        this.applyDateRange(whereClause, startDate, endDate);

        if (search) {
            whereClause.OR = this.buildSearchConditions(search);
        }

        return whereClause;
    }

    /**
     * Build where clause for product queries
     */
    static buildProductWhereClause(
        auth: AuthContext,
        options: InventoryFilterOptions = {}
    ): ProductWhereClause {
        const { search = '', filter = 'all', categoryId, startDate, endDate } = options;

        const whereClause: ProductWhereClause = {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
        };

        this.applyProductFilterConditions(whereClause, filter as InventoryFilter);

        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        this.applyDateRange(whereClause, startDate, endDate);

        if (search) {
            whereClause.OR = this.buildProductSearchConditions(search);
        }

        whereClause.variants = { some: { isActive: true } };

        return whereClause;
    }

    /**
     * Build where clause for variant sub-query (used in product queries)
     */
    static buildVariantSubWhereClause(filter: InventoryFilter = 'all'): Record<string, any> {
        const variantWhere: Record<string, any> = { isActive: true };

        if (filter === 'expiring-soon') {
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + DATE_RANGES.EXPIRING_SOON_DAYS);
            variantWhere.expirationDate = { gte: now, lte: thirtyDaysFromNow };
        } else if (filter === 'expired') {
            const now = new Date();
            variantWhere.expirationDate = { lt: now };
        }

        return variantWhere;
    }

    /**
     * Apply filter-based conditions to variant where clause
     */
    private static applyFilterConditions(
        whereClause: VariantWhereClause,
        filter: InventoryFilter
    ): void {
        const now = new Date();

        switch (filter) {
            case 'all':
            case 'active':
                whereClause.isActive = true;
                whereClause.product = { ...(whereClause.product || {}), isActive: true };
                break;

            case 'inactive':
                whereClause.isActive = false;
                break;

            case 'new':
            case 'new-stock': {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - DATE_RANGES.NEW_ITEMS_DAYS);
                whereClause.createdAt = { gte: oneWeekAgo };
                whereClause.isActive = true;
                whereClause.product = { ...(whereClause.product || {}), isActive: true };
                break;
            }

            case 'in-stock':
            case 'low-stock':
            case 'out-of-stock':
                whereClause.isActive = true;
                whereClause.product = { ...(whereClause.product || {}), isActive: true };
                break;

            case 'expiring-soon': {
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + DATE_RANGES.EXPIRING_SOON_DAYS);
                whereClause.isActive = true;
                whereClause.product = { ...(whereClause.product || {}), isActive: true };
                whereClause.expirationDate = {
                    gte: now,
                    lte: thirtyDaysFromNow,
                };
                break;
            }

            case 'expired':
                whereClause.isActive = true;
                whereClause.product = { ...(whereClause.product || {}), isActive: true };
                whereClause.expirationDate = { lt: now };
                break;

            default:
                whereClause.isActive = true;
                whereClause.product = { ...(whereClause.product || {}), isActive: true };
        }
    }

    /**
     * Apply filter-based conditions to product where clause
     */
    private static applyProductFilterConditions(
        whereClause: ProductWhereClause,
        filter: InventoryFilter
    ): void {
        switch (filter) {
            case 'all':
            case 'active':
                whereClause.isActive = true;
                break;

            case 'inactive':
                whereClause.isActive = false;
                break;

            case 'new':
            case 'new-stock': {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - DATE_RANGES.NEW_ITEMS_DAYS);
                whereClause.createdAt = { gte: oneWeekAgo };
                whereClause.isActive = true;
                break;
            }

            default:
                whereClause.isActive = true;
        }
    }

    /**
     * Apply date range to where clause
     */
    private static applyDateRange(
        whereClause: VariantWhereClause | ProductWhereClause,
        startDate?: string,
        endDate?: string
    ): void {
        if (!startDate && !endDate) return;

        whereClause.createdAt = whereClause.createdAt || {};

        if (startDate) {
            whereClause.createdAt.gte = new Date(startDate);
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            whereClause.createdAt.lte = endDateTime;
        }
    }

    /**
     * Build search conditions for variant queries
     */
    private static buildSearchConditions(search: string): Array<Record<string, any>> {
        return [
            { product: { name: { contains: search } } },
            { variantName: { contains: search } },
            { sku: { contains: search } },
            { primaryBarcode: { contains: search } },
            { barcodes: { some: { barcode: { contains: search } } } },
        ];
    }

    /**
     * Build search conditions for product queries
     */
    private static buildProductSearchConditions(search: string): Array<Record<string, any>> {
        return [
            { name: { contains: search } },
            { brand: { contains: search } },
            { description: { contains: search } },
            { variants: { some: { sku: { contains: search } } } },
            { variants: { some: { primaryBarcode: { contains: search } } } },
            { variants: { some: { variantName: { contains: search } } } },
            { variants: { some: { barcodes: { some: { barcode: { contains: search } } } } } },
        ];
    }

    /**
     * Build base where clause for counting
     */
    static buildBaseCountWhereClause(auth: AuthContext): {
        tenantId: string;
        branchId: string;
        isActive: boolean;
        product: { isActive: boolean };
    } {
        return {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            isActive: true,
            product: { isActive: true },
        };
    }

    /**
     * Check if filter requires post-processing
     */
    static requiresPostProcessing(filter: InventoryFilter): boolean {
        return filter === 'low-stock' || filter === 'in-stock' || filter === 'out-of-stock';
    }

    /**
     * Post-process results for low-stock filter
     */
    static filterLowStock<T extends { inventories?: Array<{ availableQuantity: number; reorderPoint: number | null }> }>(
        items: T[]
    ): T[] {
        return items.filter((item) => {
            const inventory = item.inventories?.[0];
            if (!inventory?.reorderPoint) return false;
            return inventory.availableQuantity <= inventory.reorderPoint;
        });
    }

    /**
     * Post-process results for in-stock filter
     */
    static filterInStock<T extends { inventories?: Array<{ availableQuantity: number }> }>(
        items: T[]
    ): T[] {
        return items.filter((item) => {
            const inventory = item.inventories?.[0];
            return inventory && inventory.availableQuantity > 0;
        });
    }

    /**
     * Post-process results for out-of-stock filter
     */
    static filterOutOfStock<T extends { inventories?: Array<{ availableQuantity: number }> }>(
        items: T[]
    ): T[] {
        return items.filter((item) => {
            const inventory = item.inventories?.[0];
            return inventory && inventory.availableQuantity <= 0;
        });
    }

    /**
     * Apply stock-based filter to items
     */
    static applyStockFilter<T extends { inventories?: Array<{ availableQuantity: number; reorderPoint: number | null }> }>(
        items: T[],
        filter: InventoryFilter
    ): T[] {
        switch (filter) {
            case 'low-stock':
                return this.filterLowStock(items);
            case 'in-stock':
                return this.filterInStock(items);
            case 'out-of-stock':
                return this.filterOutOfStock(items);
            default:
                return items;
        }
    }

    /**
     * Post-process products for low-stock filter
     */
    static filterProductsWithLowStockVariants<
        T extends { variants: Array<{ inventories?: Array<{ availableQuantity: number; reorderPoint: number | null }> }> }
    >(products: T[]): T[] {
        return products
            .map((product) => ({
                ...product,
                variants: product.variants.filter((v) => {
                    const inv = v.inventories?.[0];
                    if (!inv || !inv.reorderPoint) return false;
                    return inv.availableQuantity <= inv.reorderPoint;
                }),
            }))
            .filter((p) => p.variants.length > 0);
    }

    /**
     * Post-process products for in-stock filter
     */
    static filterProductsWithInStockVariants<
        T extends { variants: Array<{ inventories?: Array<{ availableQuantity: number }> }> }
    >(products: T[]): T[] {
        return products
            .map((product) => ({
                ...product,
                variants: product.variants.filter((v) => {
                    const inv = v.inventories?.[0];
                    return inv && inv.availableQuantity > 0;
                }),
            }))
            .filter((p) => p.variants.length > 0);
    }

    /**
     * Post-process products for out-of-stock filter
     */
    static filterProductsWithOutOfStockVariants<
        T extends { variants: Array<{ inventories?: Array<{ availableQuantity: number }> }> }
    >(products: T[]): T[] {
        return products
            .map((product) => ({
                ...product,
                variants: product.variants.filter((v) => {
                    const inv = v.inventories?.[0];
                    return inv && inv.availableQuantity <= 0;
                }),
            }))
            .filter((p) => p.variants.length > 0);
    }

    /**
     * Apply stock-based filter to products
     */
    static applyProductStockFilter<
        T extends { variants: Array<{ inventories?: Array<{ availableQuantity: number; reorderPoint: number | null }> }> }
    >(products: T[], filter: InventoryFilter): T[] {
        switch (filter) {
            case 'low-stock':
                return this.filterProductsWithLowStockVariants(products);
            case 'in-stock':
                return this.filterProductsWithInStockVariants(products);
            case 'out-of-stock':
                return this.filterProductsWithOutOfStockVariants(products);
            default:
                return products;
        }
    }
}
