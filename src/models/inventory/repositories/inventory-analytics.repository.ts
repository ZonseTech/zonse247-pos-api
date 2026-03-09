/* eslint-disable @typescript-eslint/no-non-null-assertion */
import prisma from '../../../databases/prisma/client';
import {
    AuthContext,
    InventoryDetailedCounts,
    InventoryOverview,
    InventoryQueryOptions,
    CategoryBreakdown,
    StockHealthSummary,
    TopValueInventoryItem,
} from '../types/inventory.types';
import { InventoryQueryBuilder } from '../builders/inventory-query.builder';
import { InventoryMapper } from '../mappers/inventory.mapper';

/**
 * Repository for inventory counts and analytics
 */
export class InventoryAnalyticsRepository {
    /**
     * Get detailed inventory counts
     */
    static async getDetailedCounts(auth: AuthContext): Promise<InventoryDetailedCounts> {
        const baseWhereClause = InventoryQueryBuilder.buildBaseCountWhereClause(auth);
        const now = new Date();

        const [totalItems, incompleteItems, itemsInStock, _lowStockItems, expiredItems] = await Promise.all([
            prisma.productVariant.count({ where: baseWhereClause }),

            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    OR: [
                        { primaryBarcode: null },
                        { primaryBarcode: '' },
                        { expirationDate: null },
                        { costPrice: { equals: 0 } },
                        { inventories: { none: {} } },
                        { inventories: { some: { availableQuantity: { equals: 0 } } } },
                        { inventories: { some: { reorderPoint: null } } },
                        { inventories: { some: { reorderPoint: { equals: 0 } } } },
                    ],
                },
            }),

            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    inventories: {
                        some: { availableQuantity: { gt: 0 } },
                    },
                },
            }),

            prisma.productVariant
                .count({
                    where: {
                        ...baseWhereClause,
                        inventories: {
                            some: {
                                AND: [{ availableQuantity: { gt: 0 } }, { reorderPoint: { gt: 0 } }],
                            },
                        },
                    },
                })
                .catch(() => 0),

            prisma.productVariant.count({
                where: {
                    ...baseWhereClause,
                    expirationDate: {
                        not: null,
                        lt: now,
                    },
                },
            }),
        ]);

        const lowStockVariants = await prisma.productVariant.findMany({
            where: {
                ...baseWhereClause,
                inventories: {
                    some: {
                        availableQuantity: { gt: 0 },
                        reorderPoint: { gt: 0 },
                    },
                },
            },
            select: {
                id: true,
                inventories: {
                    select: {
                        availableQuantity: true,
                        reorderPoint: true,
                    },
                },
            },
        });

        const accurateLowStockCount = lowStockVariants.filter(
            (v) => v.inventories?.[0] && v.inventories[0].availableQuantity <= (v.inventories[0].reorderPoint || 0)
        ).length;

        return {
            totalItems,
            incompleteItems,
            itemsInStock,
            lowStockItems: accurateLowStockCount,
            expiredItems,
        };
    }

    /**
     * Get comprehensive inventory overview with stock valuation
     */
    static async getInventoryOverview(
        auth: AuthContext,
        options: InventoryQueryOptions = {}
    ): Promise<InventoryOverview> {
        const { search = '', filter = 'all', categoryId, startDate, endDate } = options;

        const whereClause = InventoryQueryBuilder.buildVariantWhereClause(auth, options);

        let variants = await prisma.productVariant.findMany({
            where: whereClause,
            include: {
                product: {
                    include: { category: true },
                },
                inventories: true,
            },
        });

        if (filter === 'low-stock') {
            variants = InventoryQueryBuilder.filterLowStock(variants);
        }

        const metrics = this.calculateOverviewMetrics(variants);
        const categoryBreakdown = this.calculateCategoryBreakdown(variants);

        return {
            ...metrics,
            categoryBreakdown,
            filters: {
                search,
                filter,
                categoryId: categoryId || null,
                startDate: startDate || null,
                endDate: endDate || null,
            },
        };
    }

    /**
     * Calculate overview metrics from variants
     */
    private static calculateOverviewMetrics(variants: any[]): {
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
        stockHealthSummary: StockHealthSummary;
    } {
        let totalStockQuantity = 0;
        let totalStockValue = 0;
        let totalRetailValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let overstockedCount = 0;
        let healthyCount = 0;

        for (const variant of variants) {
            const inventory = variant.inventories?.[0];
            const availableQty = inventory?.availableQuantity || 0;
            const avgCost = Number(inventory?.averageCost || 0);
            const sellingPrice = Number(variant.sellingPrice || 0);
            const reorderPoint = inventory?.reorderPoint || 0;
            const maxStock = inventory?.maxStock || 0;

            totalStockQuantity += availableQty;
            totalStockValue += availableQty * avgCost;
            totalRetailValue += availableQty * sellingPrice;

            if (availableQty === 0) {
                outOfStockCount++;
            } else if (reorderPoint > 0 && availableQty <= reorderPoint) {
                lowStockCount++;
            } else if (maxStock > 0 && availableQty > maxStock) {
                overstockedCount++;
            } else {
                healthyCount++;
            }
        }

        const potentialProfit = totalRetailValue - totalStockValue;
        const profitMargin = totalRetailValue > 0 ? (potentialProfit / totalRetailValue) * 100 : 0;
        const averageCostPerUnit = totalStockQuantity > 0 ? totalStockValue / totalStockQuantity : 0;
        const averageSellingPricePerUnit = totalStockQuantity > 0 ? totalRetailValue / totalStockQuantity : 0;

        return {
            totalProducts: variants.length,
            totalStockQuantity,
            totalStockValue: Math.round(totalStockValue * 100) / 100,
            totalRetailValue: Math.round(totalRetailValue * 100) / 100,
            potentialProfit: Math.round(potentialProfit * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            averageCostPerUnit: Math.round(averageCostPerUnit * 100) / 100,
            averageSellingPricePerUnit: Math.round(averageSellingPricePerUnit * 100) / 100,
            lowStockCount,
            outOfStockCount,
            stockHealthSummary: {
                healthy: healthyCount,
                lowStock: lowStockCount,
                outOfStock: outOfStockCount,
                overstocked: overstockedCount,
            },
        };
    }

    /**
     * Calculate category breakdown from variants
     */
    private static calculateCategoryBreakdown(variants: any[]): CategoryBreakdown[] {
        const categoryMap = new Map<string, CategoryBreakdown>();

        for (const variant of variants) {
            const inventory = variant.inventories?.[0];
            const availableQty = inventory?.availableQuantity || 0;
            const avgCost = Number(inventory?.averageCost || 0);
            const sellingPrice = Number(variant.sellingPrice || 0);

            const categoryKey = variant.product.categoryId || 'uncategorized';
            const categoryName = variant.product.category?.name || 'Uncategorized';

            if (!categoryMap.has(categoryKey)) {
                categoryMap.set(categoryKey, {
                    categoryId: variant.product.categoryId,
                    categoryName,
                    productCount: 0,
                    totalQuantity: 0,
                    totalCostValue: 0,
                    totalRetailValue: 0,
                });
            }

            const categoryData = categoryMap.get(categoryKey)!;
            categoryData.productCount++;
            categoryData.totalQuantity += availableQty;
            categoryData.totalCostValue += availableQty * avgCost;
            categoryData.totalRetailValue += availableQty * sellingPrice;
        }

        return Array.from(categoryMap.values())
            .map((cat) => ({
                ...cat,
                totalCostValue: Math.round(cat.totalCostValue * 100) / 100,
                totalRetailValue: Math.round(cat.totalRetailValue * 100) / 100,
            }))
            .sort((a, b) => b.totalRetailValue - a.totalRetailValue);
    }

    /**
     * Get top valuable inventory items
     */
    static async getTopValueInventoryItems(
        auth: AuthContext,
        limit = 10
    ): Promise<TopValueInventoryItem[]> {
        const variants = await prisma.productVariant.findMany({
            where: {
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                isActive: true,
                product: { isActive: true },
            },
            include: {
                product: {
                    include: { category: true },
                },
                inventories: true,
            },
        });

        const itemValues = variants.map((variant) => InventoryMapper.mapToTopValueItem(variant));

        return itemValues.sort((a, b) => b.totalRetailValue - a.totalRetailValue).slice(0, limit);
    }
}
