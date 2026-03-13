import prisma from '../../../databases/prisma/client';
import { InventoryItem } from 'inventory-item';
import { AuthContext, InventoryQueryOptions } from '../types/inventory.types';
import { InventoryQueryBuilder } from '../builders/inventory-query.builder';
import { InventoryMapper } from '../mappers/inventory.mapper';

/**
 * Standard include clause for variant queries
 */
const VARIANT_INCLUDE = {
    product: {
        include: {
            category: true,
        },
    },
    inventories: true,
    barcodes: {
        where: { isActive: true },
    },
};

/**
 * Standard include clause for product queries
 */
const PRODUCT_INCLUDE = {
    category: true,
    variants: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' as const }, { variantName: 'asc' as const }],
        include: {
            inventories: true,
            barcodes: { where: { isActive: true } },
        },
    },
};

/**
 * Repository for variant-based inventory queries
 */
export class InventoryReadRepository {
    /**
     * Find inventory item by variant ID or product ID
     */
    static async findById(id: string, auth: AuthContext): Promise<InventoryItem | any | null> {
        const variantResult = await prisma.productVariant.findFirst({
            where: {
                id,
                tenantId: auth.tenantId,
                branchId: auth.branchId,
            },
            include: VARIANT_INCLUDE,
        });

        if (variantResult) {
            return InventoryMapper.mapToInventoryItem(variantResult);
        }

        const productResult = await prisma.product.findFirst({
            where: {
                id,
                tenantId: auth.tenantId,
                branchId: auth.branchId,
            },
            include: PRODUCT_INCLUDE,
        });

        if (productResult) {
            return InventoryMapper.mapToProductWithVariants(productResult);
        }

        return null;
    }

    /**
     * Find all active inventory items
     */
    static async findActive(auth: AuthContext): Promise<InventoryItem[]> {
        const results = await prisma.productVariant.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true,
                product: { isActive: true },
            },
            include: VARIANT_INCLUDE,
        });

        return results
            .map((r) => InventoryMapper.mapToInventoryItem(r))
            .filter((item): item is InventoryItem => item !== null);
    }

    /**
     * Find all inventory items, optionally including voided/inactive ones
     * @param auth - Authentication context
     * @param includeVoided - If true, includes inactive/voided items
     */
    static async findAll(auth: AuthContext, includeVoided = false): Promise<InventoryItem[]> {
        const whereClause: any = {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
        };

        if (!includeVoided) {
            whereClause.isActive = true;
            whereClause.product = { isActive: true };
        }

        const results = await prisma.productVariant.findMany({
            where: whereClause,
            include: VARIANT_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });

        return results
            .map((r) => InventoryMapper.mapToInventoryItem(r))
            .filter((item): item is InventoryItem => item !== null);
    }

    /**
     * Find active inventory items with pagination and filters
     */
    static async findActiveWithPagination(
        auth: AuthContext,
        skip: number,
        limit: number,
        options: InventoryQueryOptions = {}
    ): Promise<InventoryItem[]> {
        const { filter = 'all' } = options;
        const whereClause = InventoryQueryBuilder.buildVariantWhereClause(auth, options);

        if (InventoryQueryBuilder.requiresPostProcessing(filter as any)) {
            let results = await prisma.productVariant.findMany({
                where: whereClause,
                include: VARIANT_INCLUDE,
                orderBy: { createdAt: 'desc' },
            });

            results = InventoryQueryBuilder.applyStockFilter(results, filter as any);

            results = results.slice(skip, skip + limit);

            return results
                .map((r) => InventoryMapper.mapToInventoryItem(r))
                .filter((item): item is InventoryItem => item !== null);
        }

        const results = await prisma.productVariant.findMany({
            where: whereClause,
            include: VARIANT_INCLUDE,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        return results
            .map((r) => InventoryMapper.mapToInventoryItem(r))
            .filter((item): item is InventoryItem => item !== null);
    }

    /**
     * Get filtered count
     */
    static async getFilteredCount(
        auth: AuthContext,
        options: InventoryQueryOptions = {}
    ): Promise<number> {
        const { filter = 'all' } = options;
        const whereClause = InventoryQueryBuilder.buildVariantWhereClause(auth, options);

        if (InventoryQueryBuilder.requiresPostProcessing(filter as any)) {
            const results = await prisma.productVariant.findMany({
                where: whereClause,
                include: { inventories: true },
            });
            return InventoryQueryBuilder.applyStockFilter(results, filter as any).length;
        }

        return prisma.productVariant.count({ where: whereClause });
    }

    /**
     * Find by SKU or barcode
     */
    static async findBySku(skuOrBarcode: string, auth: AuthContext): Promise<InventoryItem | null> {
        let result = await prisma.productVariant.findFirst({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                sku: skuOrBarcode,
                isActive: true,
            },
            include: VARIANT_INCLUDE,
        });

        if (result) {
            return InventoryMapper.mapToInventoryItem(result);
        }

        result = await prisma.productVariant.findFirst({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                primaryBarcode: skuOrBarcode,
                isActive: true,
            },
            include: VARIANT_INCLUDE,
        });

        if (result) {
            return InventoryMapper.mapToInventoryItem(result);
        }

        const barcode = await prisma.variantBarcode.findFirst({
            where: {
                barcode: skuOrBarcode,
                isActive: true,
                variant: {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    isActive: true,
                },
            },
            include: {
                variant: {
                    include: VARIANT_INCLUDE,
                },
            },
        });

        if (barcode?.variant) {
            return InventoryMapper.mapToInventoryItem(barcode.variant);
        }

        return null;
    }

    /**
     * Check if variant exists
     */
    static async exists(variantId: string, auth: AuthContext): Promise<boolean> {
        const count = await prisma.productVariant.count({
            where: {
                id: variantId,
                tenantId: auth.tenantId,
                branchId: auth.branchId,
            },
        });
        return count > 0;
    }

    /**
     * Find products with their variants grouped
     */
    static async findProductsWithVariants(
        auth: AuthContext,
        skip: number,
        limit: number,
        options: InventoryQueryOptions = {}
    ): Promise<{ products: any[]; total: number }> {
        const { filter = 'all' } = options;
        const productWhere = InventoryQueryBuilder.buildProductWhereClause(auth, options);
        const variantWhere = InventoryQueryBuilder.buildVariantSubWhereClause(filter as any);

        if (InventoryQueryBuilder.requiresPostProcessing(filter as any)) {
            const results = await prisma.product.findMany({
                where: productWhere,
                include: {
                    category: true,
                    variants: {
                        where: variantWhere,
                        orderBy: [{ isDefault: 'desc' }, { variantName: 'asc' }],
                        include: {
                            inventories: true,
                            barcodes: { where: { isActive: true } },
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });

            let filteredResults = results.filter((p) => p.variants.length > 0);
            filteredResults = InventoryQueryBuilder.applyProductStockFilter(filteredResults, filter as any);

            const total = filteredResults.length;

            const paginatedResults = filteredResults.slice(skip, skip + limit);

            const products = paginatedResults
                .map((product) => InventoryMapper.mapToProductWithVariants(product))
                .filter(Boolean);

            return { products, total };
        }

        const [results, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: productWhere,
                include: {
                    category: true,
                    variants: {
                        where: variantWhere,
                        orderBy: [{ isDefault: 'desc' }, { variantName: 'asc' }],
                        include: {
                            inventories: true,
                            barcodes: { where: { isActive: true } },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            prisma.product.count({ where: productWhere }),
        ]);

        const filteredResults = results.filter((p) => p.variants.length > 0);

        const products = filteredResults
            .map((product) => InventoryMapper.mapToProductWithVariants(product))
            .filter(Boolean);

        return { products, total: totalCount };
    }

    /**
     * Get product count
     */
    static async getProductCount(
        auth: AuthContext,
        options: InventoryQueryOptions = {}
    ): Promise<number> {
        const productWhere = InventoryQueryBuilder.buildProductWhereClause(auth, options);
        return prisma.product.count({ where: productWhere });
    }

    /**
     * Get variants for inventory overview
     */
    static async getVariantsForOverview(
        auth: AuthContext,
        options: InventoryQueryOptions = {}
    ): Promise<any[]> {
        const whereClause = InventoryQueryBuilder.buildVariantWhereClause(auth, options);

        let variants = await prisma.productVariant.findMany({
            where: whereClause,
            include: {
                product: {
                    include: {
                        category: true,
                    },
                },
                inventories: true,
            },
        });

        if (InventoryQueryBuilder.requiresPostProcessing(options.filter as any)) {
            variants = InventoryQueryBuilder.applyStockFilter(variants, options.filter as any);
        }

        return variants;
    }

    /**
     * Get variants for top value calculation
     */
    static async getVariantsForTopValue(auth: AuthContext): Promise<any[]> {
        return prisma.productVariant.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true,
                product: { isActive: true },
            },
            include: {
                product: {
                    include: {
                        category: true,
                    },
                },
                inventories: true,
            },
        });
    }

    /**
     * Find inventory by variant ID (for inventory operations)
     */
    static async findInventoryByVariantId(variantId: string, auth: AuthContext) {
        return prisma.inventory.findFirst({
            where: {
                OR: [{ variantId }, { productId: variantId }],
                branchId: auth.branchId,
                tenantId: auth.tenantId,
            },
        });
    }
}
