/**
 * Inventory Valuation Types
 *
 * Types for the perpetual inventory system supporting
 * multiple costing methods (Weighted Average, FIFO, LIFO),
 * opening stock, cost layers, and COGS calculation.
 */

// ─── Costing Method ──────────────────────────────────────────────
export type CostingMethod = 'WEIGHTED_AVERAGE' | 'FIFO' | 'LIFO';

// ─── Cost Layer ──────────────────────────────────────────────────
export interface InventoryCostLayer {
    id: string;
    tenantId: string;
    branchId: string;
    inventoryId: string;
    remainingQuantity: number;
    originalQuantity: number;
    unitCost: number;
    referenceType: string | null;
    referenceId: string | null;
    movementId: string | null;
    layerDate: Date;
    depletedAt: Date | null;
    version: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCostLayerInput {
    tenantId: string;
    branchId: string;
    inventoryId: string;
    quantity: number;
    unitCost: number;
    referenceType?: string | null;
    referenceId?: string | null;
    movementId?: string | null;
    layerDate?: Date;
}

// ─── COGS Result ─────────────────────────────────────────────────
export interface COGSResult {
    totalCost: number;
    quantityConsumed: number;
    layersConsumed: Array<{
        layerId: string;
        quantityUsed: number;
        unitCost: number;
        costForLayer: number;
    }>;
    /** Weighted average unit cost for the consumed quantity */
    weightedUnitCost: number;
}

// ─── Inventory Valuation ────────────────────────────────────────
export interface InventoryValuationItem {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    productName: string;
    sku: string | null;
    costingMethod: CostingMethod;
    availableQuantity: number;
    /** Value per the item's costing method */
    totalValue: number;
    /** Weighted average unit cost */
    averageCost: number;
    /** FIFO valuation (sum of remaining cost layers oldest-first) */
    fifoValue: number | null;
    /** LIFO valuation (sum of remaining cost layers newest-first) */
    lifoValue: number | null;
}

export interface InventoryValuationSummary {
    tenantId: string;
    branchId: string;
    totalItems: number;
    totalQuantity: number;
    /** Aggregate value by the active costing method per item */
    totalValue: number;
    /** Aggregate weighted-average value */
    totalWeightedAverageValue: number;
    /** Aggregate FIFO value */
    totalFIFOValue: number;
    /** Aggregate LIFO value */
    totalLIFOValue: number;
    items: InventoryValuationItem[];
    valuationDate: Date;
}

// ─── Opening Balance Input ────────────────────────────────────────
export interface RecordOpeningBalanceInput {
    tenantId: string;
    branchId: string;
    terminalId?: string;
    inventoryId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
    movedBy: string;
    /** Optional date for the opening balance (defaults to now) */
    openingDate?: Date;
}

// ─── Period COGS (from stock movement ledger) ──────────────────
export interface PeriodCOGSResult {
    tenantId: string;
    branchId: string;
    startDate: Date;
    endDate: Date;
    /** Total COGS = SUM(totalCost) of all SALE movements in the period */
    totalCOGS: number;
    /** Number of SALE movements in the period */
    saleMovementCount: number;
    /** Total units sold in the period */
    totalUnitsSold: number;
    /** Per-product breakdown */
    byProduct: Array<{
        productId: string;
        productName: string;
        variantId: string | null;
        sku: string | null;
        unitsSold: number;
        cogs: number;
    }>;
}

/**
 * Period COGS derived from sale_items (alternative to ledger-based query).
 * Useful as a cross-check: both sources should yield the same totals.
 */
export interface PeriodCOGSFromSalesResult {
    tenantId: string;
    branchId: string;
    startDate: Date;
    endDate: Date;
    /** Total COGS = SUM(unitCost * quantity) across all sale items in the period */
    totalCOGS: number;
    /** Number of sales in the period */
    saleCount: number;
    /** Total units sold */
    totalUnitsSold: number;
    /** Per-product breakdown */
    byProduct: Array<{
        productId: string;
        productName: string;
        variantId: string;
        sku: string | null;
        unitsSold: number;
        cogs: number;
    }>;
}

/**
 * Gross Profit by Product for a date range.
 * Revenue and COGS sourced from sale_items; profit = revenue - COGS.
 */
export interface GrossProfitByProductResult {
    tenantId: string;
    branchId: string;
    startDate: Date;
    endDate: Date;
    /** Aggregate revenue (SUM sale_items.totalAmount) */
    totalRevenue: number;
    /** Aggregate COGS (SUM sale_items.unitCost × quantity) */
    totalCOGS: number;
    /** Aggregate gross profit (revenue - COGS) */
    totalGrossProfit: number;
    /** Overall margin % */
    overallMarginPercent: number;
    /** Total units sold */
    totalUnitsSold: number;
    /** Per-product breakdown sorted by gross profit descending */
    byProduct: Array<{
        productId: string;
        productName: string;
        variantId: string;
        sku: string | null;
        unitsSold: number;
        revenue: number;
        cogs: number;
        grossProfit: number;
        marginPercent: number;
    }>;
}

/**
 * Inventory aging / slow-mover analysis.
 * Groups inventory by days since last sale, with stock-value-at-risk.
 */
export interface InventoryAgingResult {
    tenantId: string;
    branchId: string;
    /** Threshold in days used for the query */
    thresholdDays: number;
    /** Summary counts */
    totalItems: number;
    totalSlowMovers: number;
    totalNeverSold: number;
    /** Total value tied up in slow / dead stock */
    slowMoverValue: number;
    neverSoldValue: number;
    /** Aging buckets */
    buckets: {
        '0-30': InventoryAgingBucket;
        '31-60': InventoryAgingBucket;
        '61-90': InventoryAgingBucket;
        '91-180': InventoryAgingBucket;
        '181-365': InventoryAgingBucket;
        '365+': InventoryAgingBucket;
        never: InventoryAgingBucket;
    };
    /** Detailed items flagged as slow movers (> thresholdDays since last sale or never sold) */
    items: InventoryAgingItem[];
}

export interface InventoryAgingBucket {
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
}

export interface InventoryAgingItem {
    inventoryId: string;
    productId: string;
    productName: string;
    variantId: string | null;
    sku: string | null;
    availableQuantity: number;
    averageCost: number;
    stockValue: number;
    lastSoldAt: Date | null;
    lastRestockedAt: Date | null;
    daysSinceLastSale: number | null;
    /** 'slow' if > thresholdDays, 'dead' if never sold, 'active' otherwise */
    status: 'active' | 'slow' | 'dead';
}

// ─── Costing Method Change ──────────────────────────────────────
export interface ChangeCostingMethodInput {
    tenantId: string;
    branchId: string;
    inventoryId: string;
    newMethod: CostingMethod;
    changedBy: string;
}

export interface ChangeCostingMethodResult {
    inventoryId: string;
    previousMethod: CostingMethod;
    newMethod: CostingMethod;
    /** Whether cost layers were rebuilt */
    layersRebuilt: boolean;
}
