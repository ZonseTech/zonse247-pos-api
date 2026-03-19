import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CostingMethod,
    COGSResult,
    CreateCostLayerInput,
    InventoryValuationItem,
    InventoryValuationSummary,
    ChangeCostingMethodInput,
    ChangeCostingMethodResult,
    PeriodCOGSResult,
    PeriodCOGSFromSalesResult,
    GrossProfitByProductResult,
    InventoryAgingResult,
    InventoryAgingBucket,
    InventoryAgingItem,
} from '../../models/inventory-valuation.model';

/**
 * InventoryValuationService
 *
 * Manages cost layers and computes COGS / inventory valuation
 * under multiple costing methods: Weighted Average, FIFO, LIFO.
 *
 * COST LAYERS (FIFO / LIFO):
 * - Each purchase / opening-stock / return creates a cost layer.
 * - Each sale / transfer-out / damage / expiry consumes cost layers.
 * - FIFO consumes oldest layers first; LIFO consumes newest first.
 * - Layers with remainingQuantity=0 are marked with depletedAt timestamp.
 *
 * WEIGHTED AVERAGE:
 * - No cost layers are consumed; averageCost on the Inventory row
 *   is updated in-line on every increase (already done in StockMovementService).
 * - Cost layers are still created so that switching to FIFO/LIFO is possible.
 */
export class InventoryValuationService {

    // ──────────────────────────────────────────────────────────────
    // Cost-Layer Management
    // ──────────────────────────────────────────────────────────────

    /**
     * Create a new cost layer (called on every inventory-increase movement).
     */
    static async addCostLayer(
        input: CreateCostLayerInput,
        tx?: any
    ): Promise<string> {
        const db = tx || prisma;
        const id = uuidv4();

        await db.inventoryCostLayer.create({
            data: {
                id,
                tenantId: input.tenantId,
                branchId: input.branchId,
                inventoryId: input.inventoryId,
                remainingQuantity: input.quantity,
                originalQuantity: input.quantity,
                unitCost: input.unitCost,
                referenceType: input.referenceType ?? null,
                referenceId: input.referenceId ?? null,
                movementId: input.movementId ?? null,
                layerDate: input.layerDate ?? new Date(),
            },
        });

        return id;
    }

    /**
     * Consume cost layers for an inventory-decrease movement.
     *
     * @param inventoryId - Inventory to consume from
     * @param quantity    - Quantity to consume
     * @param method      - FIFO (oldest first) or LIFO (newest first)
     * @param tx          - Optional transaction client
     * @returns COGS details
     */
    static async consumeCostLayers(
        inventoryId: string,
        quantity: number,
        method: 'FIFO' | 'LIFO',
        tx?: any
    ): Promise<COGSResult> {
        const db = tx || prisma;

        // Fetch non-depleted layers in appropriate order
        const orderDirection = method === 'FIFO' ? 'asc' : 'desc';
        const layers = await db.inventoryCostLayer.findMany({
            where: {
                inventoryId,
                remainingQuantity: { gt: 0 },
                deletedAt: null,
            },
            orderBy: { layerDate: orderDirection },
        });

        let remaining = quantity;
        let totalCost = 0;
        const layersConsumed: COGSResult['layersConsumed'] = [];

        for (const layer of layers) {
            if (remaining <= 0) break;

            const consume = Math.min(remaining, layer.remainingQuantity);
            const costForLayer = consume * Number(layer.unitCost);
            totalCost += costForLayer;
            remaining -= consume;

            const newRemaining = layer.remainingQuantity - consume;

            await db.inventoryCostLayer.update({
                where: { id: layer.id },
                data: {
                    remainingQuantity: newRemaining,
                    depletedAt: newRemaining === 0 ? new Date() : null,
                    version: { increment: 1 },
                },
            });

            layersConsumed.push({
                layerId: layer.id,
                quantityUsed: consume,
                unitCost: Number(layer.unitCost),
                costForLayer,
            });
        }

        // If layers ran out before fulfilling the requested quantity,
        // use last-known cost (best-effort) for the shortfall.
        if (remaining > 0) {
            const fallbackCost = layersConsumed.length > 0
                ? layersConsumed[layersConsumed.length - 1].unitCost
                : 0;
            totalCost += remaining * fallbackCost;
            layersConsumed.push({
                layerId: 'SHORTFALL',
                quantityUsed: remaining,
                unitCost: fallbackCost,
                costForLayer: remaining * fallbackCost,
            });
        }

        const quantityConsumed = quantity;
        const weightedUnitCost = quantityConsumed > 0 ? totalCost / quantityConsumed : 0;

        return { totalCost, quantityConsumed, layersConsumed, weightedUnitCost };
    }

    /**
     * Get remaining (non-depleted) cost layers for an inventory item.
     */
    static async getCostLayers(
        inventoryId: string,
        tx?: any
    ): Promise<Array<{ id: string; remainingQuantity: number; unitCost: number; layerDate: Date }>> {
        const db = tx || prisma;

        const layers = await db.inventoryCostLayer.findMany({
            where: {
                inventoryId,
                remainingQuantity: { gt: 0 },
                deletedAt: null,
            },
            orderBy: { layerDate: 'asc' },
            select: {
                id: true,
                remainingQuantity: true,
                unitCost: true,
                layerDate: true,
            },
        });

        return layers.map((l: any) => ({
            id: l.id,
            remainingQuantity: l.remainingQuantity,
            unitCost: Number(l.unitCost),
            layerDate: l.layerDate,
        }));
    }

    // ──────────────────────────────────────────────────────────────
    // COGS Calculation
    // ──────────────────────────────────────────────────────────────

    /**
     * Calculate COGS for a given quantity using the inventory item's costing method.
     *
     * - WEIGHTED_AVERAGE: uses the cached averageCost on the inventory row.
     * - FIFO / LIFO: peeks at layers (non-destructive) to compute cost.
     *
     * NOTE: This is a **read-only preview**. It does NOT consume layers.
     * Use `consumeCostLayers` inside the actual sale transaction.
     */
    static async calculateCOGS(
        inventoryId: string,
        quantity: number,
        overrideMethod?: CostingMethod,
        tx?: any
    ): Promise<COGSResult> {
        const db = tx || prisma;

        const inventory = await db.inventory.findUnique({
            where: { id: inventoryId },
        });
        if (!inventory) throw new Error('Inventory not found');

        const method: CostingMethod = overrideMethod || inventory.costingMethod || 'WEIGHTED_AVERAGE';

        if (method === 'WEIGHTED_AVERAGE') {
            const avgCost = Number(inventory.averageCost) || 0;
            const totalCost = avgCost * quantity;
            return {
                totalCost,
                quantityConsumed: quantity,
                layersConsumed: [{
                    layerId: 'WEIGHTED_AVERAGE',
                    quantityUsed: quantity,
                    unitCost: avgCost,
                    costForLayer: totalCost,
                }],
                weightedUnitCost: avgCost,
            };
        }

        // FIFO or LIFO — peek at layers without consuming
        const orderDirection = method === 'FIFO' ? 'asc' as const : 'desc' as const;
        const layers = await db.inventoryCostLayer.findMany({
            where: {
                inventoryId,
                remainingQuantity: { gt: 0 },
                deletedAt: null,
            },
            orderBy: { layerDate: orderDirection },
        });

        let remaining = quantity;
        let totalCost = 0;
        const layersConsumed: COGSResult['layersConsumed'] = [];

        for (const layer of layers) {
            if (remaining <= 0) break;
            const consume = Math.min(remaining, layer.remainingQuantity);
            const costForLayer = consume * Number(layer.unitCost);
            totalCost += costForLayer;
            remaining -= consume;
            layersConsumed.push({
                layerId: layer.id,
                quantityUsed: consume,
                unitCost: Number(layer.unitCost),
                costForLayer,
            });
        }

        if (remaining > 0) {
            const fallbackCost = layersConsumed.length > 0
                ? layersConsumed[layersConsumed.length - 1].unitCost
                : 0;
            totalCost += remaining * fallbackCost;
            layersConsumed.push({
                layerId: 'SHORTFALL',
                quantityUsed: remaining,
                unitCost: fallbackCost,
                costForLayer: remaining * fallbackCost,
            });
        }

        return {
            totalCost,
            quantityConsumed: quantity,
            layersConsumed,
            weightedUnitCost: quantity > 0 ? totalCost / quantity : 0,
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Inventory Valuation
    // ──────────────────────────────────────────────────────────────

    /**
     * Compute the full inventory valuation for a branch.
     */
    static async getValuationSummary(
        tenantId: string,
        branchId: string
    ): Promise<InventoryValuationSummary> {
        const inventories = await prisma.inventory.findMany({
            where: { tenantId, branchId, deletedAt: null },
            include: {
                variant: {
                    include: {
                        product: {
                            select: { id: true, name: true },
                        },
                    },
                },
                costLayers: {
                    where: { remainingQuantity: { gt: 0 }, deletedAt: null },
                    orderBy: { layerDate: 'asc' },
                },
            },
        });

        let totalQuantity = 0;
        let totalValue = 0;
        let totalWeightedAverageValue = 0;
        let totalFIFOValue = 0;
        let totalLIFOValue = 0;

        const items: InventoryValuationItem[] = inventories.map((inv: any) => {
            const qty = inv.availableQuantity;
            const avgCost = Number(inv.averageCost) || 0;
            const costingMethod: CostingMethod = inv.costingMethod || 'WEIGHTED_AVERAGE';

            // Weighted Average valuation
            const wacValue = qty * avgCost;

            // FIFO valuation: consume layers oldest-first
            const fifoValue = this.valuateFromLayers(inv.costLayers, qty, 'FIFO');

            // LIFO valuation: consume layers newest-first
            const lifoValue = this.valuateFromLayers(inv.costLayers, qty, 'LIFO');

            // Active value per the item's costing method
            let activeValue: number;
            switch (costingMethod) {
                case 'FIFO':
                    activeValue = fifoValue;
                    break;
                case 'LIFO':
                    activeValue = lifoValue;
                    break;
                default:
                    activeValue = wacValue;
                    break;
            }

            totalQuantity += qty;
            totalValue += activeValue;
            totalWeightedAverageValue += wacValue;
            totalFIFOValue += fifoValue;
            totalLIFOValue += lifoValue;

            return {
                inventoryId: inv.id,
                productId: inv.productId,
                variantId: inv.variantId,
                productName: inv.variant?.product?.name ?? 'Unknown',
                sku: inv.variant?.sku ?? null,
                costingMethod,
                availableQuantity: qty,
                totalValue: activeValue,
                averageCost: avgCost,
                fifoValue,
                lifoValue,
            };
        });

        return {
            tenantId,
            branchId,
            totalItems: items.length,
            totalQuantity,
            totalValue,
            totalWeightedAverageValue,
            totalFIFOValue,
            totalLIFOValue,
            items,
            valuationDate: new Date(),
        };
    }

    /**
     * Get valuation for a single inventory item.
     */
    static async getItemValuation(
        inventoryId: string,
        tx?: any
    ): Promise<{
        costingMethod: CostingMethod;
        availableQuantity: number;
        weightedAverageValue: number;
        fifoValue: number;
        lifoValue: number;
        activeValue: number;
        costLayers: Array<{ id: string; remainingQuantity: number; unitCost: number; layerDate: Date }>;
    }> {
        const db = tx || prisma;

        const inv = await db.inventory.findUnique({
            where: { id: inventoryId },
            include: {
                costLayers: {
                    where: { remainingQuantity: { gt: 0 }, deletedAt: null },
                    orderBy: { layerDate: 'asc' },
                },
            },
        });

        if (!inv) throw new Error('Inventory not found');

        const qty = inv.availableQuantity;
        const avgCost = Number(inv.averageCost) || 0;
        const costingMethod: CostingMethod = inv.costingMethod || 'WEIGHTED_AVERAGE';

        const wacValue = qty * avgCost;
        const fifoValue = this.valuateFromLayers(inv.costLayers, qty, 'FIFO');
        const lifoValue = this.valuateFromLayers(inv.costLayers, qty, 'LIFO');

        let activeValue: number;
        switch (costingMethod) {
            case 'FIFO': activeValue = fifoValue; break;
            case 'LIFO': activeValue = lifoValue; break;
            default: activeValue = wacValue; break;
        }

        return {
            costingMethod,
            availableQuantity: qty,
            weightedAverageValue: wacValue,
            fifoValue,
            lifoValue,
            activeValue,
            costLayers: inv.costLayers.map((l: any) => ({
                id: l.id,
                remainingQuantity: l.remainingQuantity,
                unitCost: Number(l.unitCost),
                layerDate: l.layerDate,
            })),
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Period COGS (from stock movement ledger)
    // ──────────────────────────────────────────────────────────────

    /**
     * Calculate COGS for a date range by aggregating SALE-type stock movements.
     *
     * The stock movement ledger is the authoritative source:
     *   COGS = SUM(stock_movements.totalCost) WHERE movementType = 'SALE'
     *
     * Returns aggregate + per-product breakdown.
     */
    static async getPeriodCOGS(
        tenantId: string,
        branchId: string,
        startDate: Date,
        endDate: Date
    ): Promise<PeriodCOGSResult> {
        // Fetch all SALE movements in the period
        const movements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                branchId,
                movementType: 'SALE',
                movementDate: { gte: startDate, lte: endDate },
                deletedAt: null,
            },
            select: {
                id: true,
                quantity: true,
                unitCost: true,
                totalCost: true,
                inventoryId: true,
            },
        });

        // Build per-inventory aggregates
        const inventoryMap = new Map<string, { unitsSold: number; cogs: number }>();
        let totalCOGS = 0;
        let totalUnitsSold = 0;

        for (const mov of movements) {
            totalCOGS += Number(mov.totalCost) || 0;
            totalUnitsSold += mov.quantity;

            const existing = inventoryMap.get(mov.inventoryId);
            if (existing) {
                existing.unitsSold += mov.quantity;
                existing.cogs += Number(mov.totalCost) || 0;
            } else {
                inventoryMap.set(mov.inventoryId, {
                    unitsSold: mov.quantity,
                    cogs: Number(mov.totalCost) || 0,
                });
            }
        }

        // Resolve product info for each inventory
        const inventoryIds = Array.from(inventoryMap.keys());
        const inventories = inventoryIds.length > 0
            ? await prisma.inventory.findMany({
                where: { id: { in: inventoryIds } },
                select: {
                    id: true,
                    productId: true,
                    variantId: true,
                    variant: {
                        select: {
                            sku: true,
                            product: { select: { name: true } },
                        },
                    },
                },
            })
            : [];

        const invLookup = new Map(inventories.map((inv: any) => [inv.id, inv]));

        // Merge into per-product breakdown (aggregate by productId)
        const productMap = new Map<string, {
            productId: string;
            productName: string;
            variantId: string | null;
            sku: string | null;
            unitsSold: number;
            cogs: number;
        }>();

        for (const [invId, agg] of inventoryMap) {
            const inv = invLookup.get(invId) as any;
            const productId = inv?.productId ?? invId;
            const key = `${productId}_${inv?.variantId ?? ''}`;

            const existing = productMap.get(key);
            if (existing) {
                existing.unitsSold += agg.unitsSold;
                existing.cogs += agg.cogs;
            } else {
                productMap.set(key, {
                    productId,
                    productName: inv?.variant?.product?.name ?? 'Unknown',
                    variantId: inv?.variantId ?? null,
                    sku: inv?.variant?.sku ?? null,
                    unitsSold: agg.unitsSold,
                    cogs: agg.cogs,
                });
            }
        }

        const byProduct = Array.from(productMap.values()).sort((a, b) => b.cogs - a.cogs);

        return {
            tenantId,
            branchId,
            startDate,
            endDate,
            totalCOGS,
            saleMovementCount: movements.length,
            totalUnitsSold,
            byProduct,
        };
    }

    /**
     * Calculate COGS for a date range from sale_items.
     *
     * Alternative to getPeriodCOGS (ledger-based). Queries:
     *   COGS = SUM(sale_items.unitCost * sale_items.quantity)
     *         WHERE sale.saleDate BETWEEN start AND end
     *
     * Both methods should yield identical totals. If they diverge,
     * it indicates a data integrity issue worth investigating.
     */
    static async getPeriodCOGSFromSales(
        tenantId: string,
        branchId: string,
        startDate: Date,
        endDate: Date
    ): Promise<PeriodCOGSFromSalesResult> {
        const saleItems = await prisma.saleItem.findMany({
            where: {
                tenantId,
                branchId,
                deletedAt: null,
                sale: {
                    saleDate: { gte: startDate, lte: endDate },
                    deletedAt: null,
                },
            },
            select: {
                quantity: true,
                unitCost: true,
                productId: true,
                variantId: true,
                saleId: true,
                variant: {
                    select: {
                        sku: true,
                        product: { select: { name: true } },
                    },
                },
            },
        });

        let totalCOGS = 0;
        let totalUnitsSold = 0;
        const saleIds = new Set<string>();

        const productMap = new Map<string, {
            productId: string;
            productName: string;
            variantId: string;
            sku: string | null;
            unitsSold: number;
            cogs: number;
        }>();

        for (const item of saleItems) {
            const itemCOGS = Number(item.unitCost) * item.quantity;
            totalCOGS += itemCOGS;
            totalUnitsSold += item.quantity;
            saleIds.add(item.saleId);

            const key = `${item.productId}_${item.variantId}`;
            const existing = productMap.get(key);
            if (existing) {
                existing.unitsSold += item.quantity;
                existing.cogs += itemCOGS;
            } else {
                productMap.set(key, {
                    productId: item.productId,
                    productName: item.variant?.product?.name ?? 'Unknown',
                    variantId: item.variantId,
                    sku: item.variant?.sku ?? null,
                    unitsSold: item.quantity,
                    cogs: itemCOGS,
                });
            }
        }

        const byProduct = Array.from(productMap.values()).sort((a, b) => b.cogs - a.cogs);

        return {
            tenantId,
            branchId,
            startDate,
            endDate,
            totalCOGS,
            saleCount: saleIds.size,
            totalUnitsSold,
            byProduct,
        };
    }

    /**
     * Gross Profit by Product for a date range.
     *
     * For each product/variant sold in the period:
     *   revenue   = SUM(sale_items.totalAmount)
     *   cogs      = SUM(sale_items.unitCost × sale_items.quantity)
     *   profit    = revenue - cogs
     *   margin %  = (profit / revenue) × 100
     */
    static async getGrossProfitByProduct(
        tenantId: string,
        branchId: string,
        startDate: Date,
        endDate: Date
    ): Promise<GrossProfitByProductResult> {
        const saleItems = await prisma.saleItem.findMany({
            where: {
                tenantId,
                branchId,
                deletedAt: null,
                sale: {
                    saleDate: { gte: startDate, lte: endDate },
                    deletedAt: null,
                },
            },
            select: {
                quantity: true,
                unitCost: true,
                totalAmount: true,
                productId: true,
                variantId: true,
                variant: {
                    select: {
                        sku: true,
                        product: { select: { name: true } },
                    },
                },
            },
        });

        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalUnitsSold = 0;

        const productMap = new Map<string, {
            productId: string;
            productName: string;
            variantId: string;
            sku: string | null;
            unitsSold: number;
            revenue: number;
            cogs: number;
        }>();

        for (const item of saleItems) {
            const itemCOGS = Number(item.unitCost) * item.quantity;
            const itemRevenue = Number(item.totalAmount) || 0;
            totalCOGS += itemCOGS;
            totalRevenue += itemRevenue;
            totalUnitsSold += item.quantity;

            const key = `${item.productId}_${item.variantId}`;
            const existing = productMap.get(key);
            if (existing) {
                existing.unitsSold += item.quantity;
                existing.revenue += itemRevenue;
                existing.cogs += itemCOGS;
            } else {
                productMap.set(key, {
                    productId: item.productId,
                    productName: item.variant?.product?.name ?? 'Unknown',
                    variantId: item.variantId,
                    sku: item.variant?.sku ?? null,
                    unitsSold: item.quantity,
                    revenue: itemRevenue,
                    cogs: itemCOGS,
                });
            }
        }

        const byProduct = Array.from(productMap.values())
            .map(p => ({
                ...p,
                grossProfit: p.revenue - p.cogs,
                marginPercent: p.revenue > 0
                    ? Math.round(((p.revenue - p.cogs) / p.revenue) * 10000) / 100
                    : 0,
            }))
            .sort((a, b) => b.grossProfit - a.grossProfit);

        const totalGrossProfit = totalRevenue - totalCOGS;

        return {
            tenantId,
            branchId,
            startDate,
            endDate,
            totalRevenue,
            totalCOGS,
            totalGrossProfit,
            overallMarginPercent: totalRevenue > 0
                ? Math.round((totalGrossProfit / totalRevenue) * 10000) / 100
                : 0,
            totalUnitsSold,
            byProduct,
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Inventory Aging / Slow Movers
    // ──────────────────────────────────────────────────────────────

    /**
     * Analyse inventory aging by days since last sale.
     *
     * - Groups items into aging buckets (0-30, 31-60, … 365+, never).
     * - Flags items as 'slow' (> thresholdDays) or 'dead' (never sold).
     * - Calculates stock value at risk per bucket.
     *
     * @param thresholdDays Items not sold for more than this many days are slow movers (default 90).
     */
    static async getInventoryAging(
        tenantId: string,
        branchId: string,
        thresholdDays = 90
    ): Promise<InventoryAgingResult> {
        const inventories = await prisma.inventory.findMany({
            where: {
                tenantId,
                branchId,
                deletedAt: null,
                availableQuantity: { gt: 0 },
            },
            select: {
                id: true,
                productId: true,
                variantId: true,
                availableQuantity: true,
                averageCost: true,
                lastSoldAt: true,
                lastRestockedAt: true,
                variant: {
                    select: {
                        sku: true,
                        product: { select: { name: true } },
                    },
                },
            },
        });

        const now = new Date();
        const msPerDay = 86_400_000;

        const emptyBucket = (): InventoryAgingBucket => ({ itemCount: 0, totalQuantity: 0, totalValue: 0 });
        const buckets = {
            '0-30': emptyBucket(),
            '31-60': emptyBucket(),
            '61-90': emptyBucket(),
            '91-180': emptyBucket(),
            '181-365': emptyBucket(),
            '365+': emptyBucket(),
            never: emptyBucket(),
        };

        const items: InventoryAgingItem[] = [];
        let totalSlowMovers = 0;
        let totalNeverSold = 0;
        let slowMoverValue = 0;
        let neverSoldValue = 0;

        for (const inv of inventories) {
            const avgCost = Number(inv.averageCost) || 0;
            const stockValue = inv.availableQuantity * avgCost;
            const lastSold = inv.lastSoldAt ? new Date(inv.lastSoldAt) : null;
            const daysSinceLastSale = lastSold
                ? Math.floor((now.getTime() - lastSold.getTime()) / msPerDay)
                : null;

            // Determine bucket
            let bucketKey: keyof typeof buckets;
            if (daysSinceLastSale === null) {
                bucketKey = 'never';
            } else if (daysSinceLastSale <= 30) {
                bucketKey = '0-30';
            } else if (daysSinceLastSale <= 60) {
                bucketKey = '31-60';
            } else if (daysSinceLastSale <= 90) {
                bucketKey = '61-90';
            } else if (daysSinceLastSale <= 180) {
                bucketKey = '91-180';
            } else if (daysSinceLastSale <= 365) {
                bucketKey = '181-365';
            } else {
                bucketKey = '365+';
            }

            const bucket = buckets[bucketKey];
            bucket.itemCount++;
            bucket.totalQuantity += inv.availableQuantity;
            bucket.totalValue += stockValue;

            // Determine status
            let status: 'active' | 'slow' | 'dead';
            if (daysSinceLastSale === null) {
                status = 'dead';
                totalNeverSold++;
                neverSoldValue += stockValue;
            } else if (daysSinceLastSale > thresholdDays) {
                status = 'slow';
                totalSlowMovers++;
                slowMoverValue += stockValue;
            } else {
                status = 'active';
            }

            items.push({
                inventoryId: inv.id,
                productId: inv.productId,
                productName: (inv as any).variant?.product?.name ?? 'Unknown',
                variantId: inv.variantId,
                sku: (inv as any).variant?.sku ?? null,
                availableQuantity: inv.availableQuantity,
                averageCost: avgCost,
                stockValue,
                lastSoldAt: lastSold,
                lastRestockedAt: inv.lastRestockedAt,
                daysSinceLastSale,
                status,
            });
        }

        // Sort: dead first, then slow by most days, then active
        items.sort((a, b) => {
            const order = { dead: 0, slow: 1, active: 2 };
            if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
            // Within same status, sort by days desc (most stale first)
            return (b.daysSinceLastSale ?? Infinity) - (a.daysSinceLastSale ?? Infinity);
        });

        return {
            tenantId,
            branchId,
            thresholdDays,
            totalItems: inventories.length,
            totalSlowMovers,
            totalNeverSold,
            slowMoverValue,
            neverSoldValue,
            buckets,
            items,
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Costing Method Change
    // ──────────────────────────────────────────────────────────────

    /**
     * Change the costing method for an inventory item.
     *
     * When switching FROM Weighted Average TO FIFO/LIFO and no cost layers exist,
     * a single "catch-up" layer is created from the current averageCost × availableQuantity.
     */
    static async changeCostingMethod(
        input: ChangeCostingMethodInput,
        tx?: any
    ): Promise<ChangeCostingMethodResult> {
        const db = tx || prisma;

        const inv = await db.inventory.findFirst({
            where: {
                id: input.inventoryId,
                tenantId: input.tenantId,
                branchId: input.branchId,
                deletedAt: null,
            },
        });

        if (!inv) throw new Error('Inventory not found');

        const previousMethod: CostingMethod = inv.costingMethod || 'WEIGHTED_AVERAGE';

        if (previousMethod === input.newMethod) {
            return { inventoryId: inv.id, previousMethod, newMethod: input.newMethod, layersRebuilt: false };
        }

        // If switching TO FIFO/LIFO, ensure cost layers exist
        let layersRebuilt = false;
        if (input.newMethod !== 'WEIGHTED_AVERAGE') {
            const existingLayers = await db.inventoryCostLayer.count({
                where: { inventoryId: inv.id, remainingQuantity: { gt: 0 }, deletedAt: null },
            });

            if (existingLayers === 0 && inv.availableQuantity > 0) {
                // Create a catch-up layer from current WAC
                await this.addCostLayer({
                    tenantId: input.tenantId,
                    branchId: input.branchId,
                    inventoryId: inv.id,
                    quantity: inv.availableQuantity,
                    unitCost: Number(inv.averageCost) || 0,
                    referenceType: 'ADJUSTMENT',
                    referenceId: null,
                    layerDate: new Date(),
                }, db);
                layersRebuilt = true;
            }
        }

        // Update the costing method
        await db.inventory.update({
            where: { id: inv.id },
            data: {
                costingMethod: input.newMethod,
                version: { increment: 1 },
            },
        });

        return {
            inventoryId: inv.id,
            previousMethod,
            newMethod: input.newMethod,
            layersRebuilt,
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Rebuild Cost Layers (from movement history)
    // ──────────────────────────────────────────────────────────────

    /**
     * Rebuild cost layers from stock-movement history.
     * Useful for data repair or after switching costing methods.
     *
     * This soft-deletes all existing layers and replays every
     * increase/decrease movement chronologically.
     */
    static async rebuildCostLayers(
        inventoryId: string,
        tx?: any
    ): Promise<{ layersCreated: number; layersConsumed: number }> {
        const db = tx || prisma;

        const INCREASE_TYPES = ['PURCHASE_RECEIPT', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'OPENING_BALANCE'];
        const DECREASE_TYPES = ['SALE', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY', 'RETURN_TO_SUPPLIER'];

        const inv = await db.inventory.findUnique({ where: { id: inventoryId } });
        if (!inv) throw new Error('Inventory not found');

        // Soft-delete all existing layers
        await db.inventoryCostLayer.updateMany({
            where: { inventoryId, deletedAt: null },
            data: { deletedAt: new Date() },
        });

        // Get all movements chronologically
        const movements = await db.stockMovement.findMany({
            where: { inventoryId, deletedAt: null },
            orderBy: { movementDate: 'asc' },
        });

        let layersCreated = 0;
        let layersConsumed = 0;

        // Maintain an in-memory list of active layers for consumption
        const activeLayers: Array<{ id: string; remaining: number; unitCost: number; date: Date }> = [];

        for (const mov of movements) {
            if (INCREASE_TYPES.includes(mov.movementType)) {
                // Create layer
                const layerId = await this.addCostLayer({
                    tenantId: inv.tenantId,
                    branchId: inv.branchId,
                    inventoryId,
                    quantity: mov.quantity,
                    unitCost: Number(mov.unitCost),
                    referenceType: mov.referenceType,
                    referenceId: mov.referenceId,
                    movementId: mov.id,
                    layerDate: mov.movementDate,
                }, db);

                activeLayers.push({
                    id: layerId,
                    remaining: mov.quantity,
                    unitCost: Number(mov.unitCost),
                    date: mov.movementDate,
                });

                layersCreated++;
            } else if (DECREASE_TYPES.includes(mov.movementType)) {
                // Consume FIFO order (oldest first) during rebuild
                let qty = mov.quantity;
                for (const layer of activeLayers) {
                    if (qty <= 0) break;
                    if (layer.remaining <= 0) continue;

                    const consume = Math.min(qty, layer.remaining);
                    layer.remaining -= consume;
                    qty -= consume;

                    await db.inventoryCostLayer.update({
                        where: { id: layer.id },
                        data: {
                            remainingQuantity: layer.remaining,
                            depletedAt: layer.remaining === 0 ? mov.movementDate : null,
                            version: { increment: 1 },
                        },
                    });

                    layersConsumed++;
                }
            }
        }

        return { layersCreated, layersConsumed };
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────

    /**
     * Compute inventory value from cost layers using FIFO or LIFO ordering.
     *
     * @param layers - Cost layers sorted by layerDate ASC
     * @param quantity - Available quantity to valuate
     * @param method - 'FIFO' or 'LIFO'
     */
    private static valuateFromLayers(
        layers: Array<{ remainingQuantity: number; unitCost: any }>,
        quantity: number,
        method: 'FIFO' | 'LIFO'
    ): number {
        const ordered = method === 'LIFO' ? [...layers].reverse() : layers;
        let remaining = quantity;
        let value = 0;

        for (const layer of ordered) {
            if (remaining <= 0) break;
            const consume = Math.min(remaining, layer.remainingQuantity);
            value += consume * Number(layer.unitCost);
            remaining -= consume;
        }

        // If cost layers don't cover the full quantity, remaining is valued at 0
        return value;
    }
}
