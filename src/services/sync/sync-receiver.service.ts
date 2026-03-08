/**
 * Sync Receiver Service
 * 
 * Handles incoming sync requests from offline terminals.
 * Runs on the SERVER to receive and process pushed data.
 * 
 * RESPONSIBILITIES:
 * -----------------
 * 1. Receive batches of records from terminals (PUSH)
 * 2. Provide data for terminals to pull (PULL)
 * 3. Upsert records (insert if not exists, skip if exists)
 * 4. Recalculate inventories from stock movements
 * 5. Return acceptance/rejection status
 * 
 * BIDIRECTIONAL SYNC:
 * -------------------
 * Terminal (SQLite) ──push──> Server (MySQL)
 *                   <──pull──
 * 
 * PUSH: Sales, SaleItems, Returns, StockMovements (Terminal → Server)
 * PULL: Products, Categories, Inventory, PaymentMethods (Server → Terminal)
 * 
 * IDEMPOTENCY:
 * ------------
 * All operations are idempotent - pushing the same record twice
 * will not create duplicates. This is crucial for offline sync
 * where terminals may retry failed pushes.
 */

import { prisma } from '../../databases/prisma/client';
import { StockMovementService } from '../inventory/stock-movement.service';
import type { SyncMovementInput } from '../../models/stock-movement.model';

/**
 * Tables that flow from Server → Terminal (PULL)
 * These contain master data and recalculated values
 */
const PULL_TABLES = [
    'products',
    'productVariants',
    'categories',
    'inventory',
    'paymentMethods',
    'stockMovements', // From other terminals
    'customers',      // Updates from server
] as const;

type PullTableName = typeof PULL_TABLES[number];

interface PullDataResult {
    success: boolean;
    data: Record<PullTableName, any[]>;
    counts: Record<PullTableName, number>;
    serverTime: Date;
    errors: string[];
}

interface SyncRecordBase {
    id: string;
    tenantId: string;
    branchId: string;
    terminalId?: string;
}

interface SyncResult {
    success: boolean;
    accepted: number;
    rejected: number;
    skipped: number;
    errors: { id: string; error: string }[];
}

/**
 * Sync Receiver Service
 * Server-side handler for incoming sync data
 */
export class SyncReceiverService {

    // ==================== SALES ====================

    /**
     * Receive and upsert sales from terminal
     * Note: Preserves original userId (record creator) and terminalId (original terminal)
     */
    static async receiveSales(
        sales: (SyncRecordBase & Record<string, unknown>)[],
        terminalId: string
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const sale of sales) {
            try {
                // Check if exists
                const existing = await prisma.sale.findUnique({
                    where: { id: sale.id },
                });

                if (existing) {
                    // Skip if already exists (idempotent)
                    result.skipped++;
                    continue;
                }

                // Insert new sale - preserve original terminalId if present, otherwise use sync source
                await prisma.sale.create({
                    data: {
                        ...(sale as any),
                        terminalId: sale.terminalId || terminalId,
                    },
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: sale.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== SALE ITEMS ====================

    /**
     * Receive and upsert sale items from terminal
     * Note: Preserves original terminalId if present
     */
    static async receiveSaleItems(
        items: (SyncRecordBase & Record<string, unknown>)[],
        terminalId: string
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const item of items) {
            try {
                // Check if exists
                const existing = await prisma.saleItem.findUnique({
                    where: { id: item.id },
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                // Verify parent sale exists
                const sale = await prisma.sale.findUnique({
                    where: { id: item.saleId as string },
                });

                if (!sale) {
                    result.rejected++;
                    result.errors.push({ id: item.id, error: 'Parent sale not found' });
                    continue;
                }

                // Insert new sale item - preserve original terminalId if present
                await prisma.saleItem.create({
                    data: {
                        ...(item as any),
                        terminalId: item.terminalId || terminalId,
                    },
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: item.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== SALE PAYMENTS ====================

    /**
     * Receive and upsert sale payments from terminal
     */
    static async receiveSalePayments(
        payments: (SyncRecordBase & Record<string, unknown>)[]
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const payment of payments) {
            try {
                // Check if exists
                const existing = await prisma.salePayment.findUnique({
                    where: { id: payment.id },
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                // Verify parent sale exists
                const sale = await prisma.sale.findUnique({
                    where: { id: payment.saleId as string },
                });

                if (!sale) {
                    result.rejected++;
                    result.errors.push({ id: payment.id, error: 'Parent sale not found' });
                    continue;
                }

                // Insert new payment
                await prisma.salePayment.create({
                    data: payment as any,
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: payment.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== RETURNS ====================

    /**
     * Receive and upsert returns from terminal
     * Note: Preserves original userId (record creator) and terminalId
     */
    static async receiveReturns(
        returns: (SyncRecordBase & Record<string, unknown>)[],
        terminalId: string
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const ret of returns) {
            try {
                // Check if exists
                const existing = await prisma.return.findUnique({
                    where: { id: ret.id },
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                // Insert new return - preserve original terminalId if present
                await prisma.return.create({
                    data: {
                        ...(ret as any),
                        terminalId: ret.terminalId || terminalId,
                    },
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: ret.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== RETURN ITEMS ====================

    /**
     * Receive and upsert return items from terminal
     */
    static async receiveReturnItems(
        items: (SyncRecordBase & Record<string, unknown>)[]
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const item of items) {
            try {
                // Check if exists
                const existing = await prisma.returnItem.findUnique({
                    where: { id: item.id },
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                // Verify parent return exists
                const ret = await prisma.return.findUnique({
                    where: { id: item.returnId as string },
                });

                if (!ret) {
                    result.rejected++;
                    result.errors.push({ id: item.id, error: 'Parent return not found' });
                    continue;
                }

                // Insert new return item
                await prisma.returnItem.create({
                    data: item as any,
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: item.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== STOCK MOVEMENTS ====================

    /**
     * Receive and process stock movements from terminal
     * This is the core of inventory sync - uses StockMovementService
     */
    static async receiveStockMovements(
        movements: SyncMovementInput[]
    ): Promise<SyncResult & { inventoriesRecalculated: number }> {
        // Delegate to StockMovementService which handles:
        // - Duplicate detection
        // - Inventory creation if needed
        // - Inventory recalculation
        const syncResult = await StockMovementService.syncMovementsFromOffline(movements);

        return {
            success: syncResult.success,
            accepted: syncResult.inserted,
            rejected: syncResult.errors.length,
            skipped: syncResult.skipped,
            errors: syncResult.errors.map(e => ({
                id: e.movementId,
                error: e.error,
            })),
            inventoriesRecalculated: syncResult.inventoriesRecalculated,
        };
    }

    // ==================== CUSTOMERS ====================

    /**
     * Receive and upsert customers from terminal
     */
    static async receiveCustomers(
        customers: (SyncRecordBase & Record<string, unknown>)[]
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const customer of customers) {
            try {
                // Customer uses customerId as identifier, not id
                const customerId = (customer.customerId || customer.id) as string;
                if (!customerId) {
                    result.rejected++;
                    result.errors.push({ id: 'unknown', error: 'Missing customerId' });
                    continue;
                }

                // Extract required IDs
                const branchId = customer.branchId as string;
                const tenantId = customer.tenantId as string;

                if (!branchId) {
                    result.rejected++;
                    result.errors.push({ id: customerId, error: 'Missing branchId' });
                    continue;
                }

                // Check if exists
                const existing = await prisma.customer.findUnique({
                    where: { customerId },
                });

                // Build data without auto-increment id and with proper relations
                const { id: _id, branchId: _branchId, ...customerData } = customer;

                if (existing) {
                    // Update if local is newer (based on updatedAt)
                    const localUpdatedAt = customer.updatedAt as Date | string;
                    if (localUpdatedAt && new Date(localUpdatedAt) > existing.updatedAt) {
                        await prisma.customer.update({
                            where: { customerId },
                            data: {
                                ...customerData,
                                customerId, // Ensure customerId is set
                            } as any,
                        });
                        result.accepted++;
                    } else {
                        result.skipped++;
                    }
                    continue;
                }

                // Insert new customer with relation connect syntax
                await prisma.customer.create({
                    data: {
                        ...customerData,
                        customerId,
                        tenantId, // Keep scalar - no Tenant relation on Customer
                        branch: { connect: { branchId } },
                    } as any,
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: customer.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== ORDERS ====================

    /**
     * Receive and upsert orders from terminal
     */
    static async receiveOrders(
        orders: (SyncRecordBase & Record<string, unknown>)[]
    ): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            accepted: 0,
            rejected: 0,
            skipped: 0,
            errors: [],
        };

        for (const order of orders) {
            try {
                // Check if exists
                const existing = await prisma.order.findUnique({
                    where: { id: order.id },
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                // Insert new order
                await prisma.order.create({
                    data: order as any,
                });

                result.accepted++;
            } catch (error: any) {
                result.rejected++;
                result.errors.push({ id: order.id, error: error.message });
            }
        }

        result.success = result.rejected === 0;
        return result;
    }

    // ==================== BATCH SYNC ====================

    /**
     * Process a complete sync batch in the correct dependency order
     * This is the main entry point for bulk sync operations
     */
    static async processSyncBatch(
        data: {
            sales?: any[];
            saleItems?: any[];
            salePayments?: any[];
            returns?: any[];
            returnItems?: any[];
            stockMovements?: SyncMovementInput[];
            customers?: any[];
            orders?: any[];
        },
        terminalId: string
    ): Promise<{
        success: boolean;
        results: Record<string, SyncResult>;
        summary: { total: number; accepted: number; rejected: number; skipped: number };
    }> {
        const results: Record<string, SyncResult> = {};
        const summary = { total: 0, accepted: 0, rejected: 0, skipped: 0 };

        // Process in dependency order
        const operations: [string, () => Promise<SyncResult>][] = [
            ['sales', () => this.receiveSales(data.sales || [], terminalId)],
            ['saleItems', () => this.receiveSaleItems(data.saleItems || [], terminalId)],
            ['salePayments', () => this.receiveSalePayments(data.salePayments || [])],
            ['returns', () => this.receiveReturns(data.returns || [], terminalId)],
            ['returnItems', () => this.receiveReturnItems(data.returnItems || [])],
            ['stockMovements', () => this.receiveStockMovements(data.stockMovements || [])],
            ['customers', () => this.receiveCustomers(data.customers || [])],
            ['orders', () => this.receiveOrders(data.orders || [])],
        ];

        for (const [table, operation] of operations) {
            const tableData = data[table as keyof typeof data];
            if (!tableData || tableData.length === 0) continue;

            const result = await operation();
            results[table] = result;

            summary.total += tableData.length;
            summary.accepted += result.accepted;
            summary.rejected += result.rejected;
            summary.skipped += result.skipped;
        }

        return {
            success: summary.rejected === 0,
            results,
            summary,
        };
    }

    // ==================== PULL OPERATIONS ====================
    // These methods provide data for terminals to pull from the server

    /**
     * Get all data that has changed since a given timestamp for a terminal to pull
     * This is the main entry point for the PULL phase of bidirectional sync
     */
    static async getPullData(
        tenantId: string,
        branchId: string,
        terminalId: string,
        since?: Date | null,
        options?: {
            tables?: PullTableName[];
            limit?: number;
        }
    ): Promise<PullDataResult> {
        const result: PullDataResult = {
            success: true,
            data: {
                products: [],
                productVariants: [],
                categories: [],
                inventory: [],
                paymentMethods: [],
                stockMovements: [],
                customers: [],
            },
            counts: {
                products: 0,
                productVariants: 0,
                categories: 0,
                inventory: 0,
                paymentMethods: 0,
                stockMovements: 0,
                customers: 0,
            },
            serverTime: new Date(),
            errors: [],
        };

        const tables = options?.tables || PULL_TABLES;
        const limit = options?.limit || 500;
        const whereBase = { tenantId, branchId };
        const sinceFilter = since ? { updatedAt: { gt: since } } : {};

        try {
            // Fetch each table in parallel for efficiency
            const [
                products,
                productVariants,
                categories,
                inventory,
                paymentMethods,
                stockMovements,
                customers,
            ] = await Promise.all([
                tables.includes('products')
                    ? this.getPullProducts(whereBase, sinceFilter, limit)
                    : [],
                tables.includes('productVariants')
                    ? this.getPullProductVariants(whereBase, sinceFilter, limit)
                    : [],
                tables.includes('categories')
                    ? this.getPullCategories(whereBase, sinceFilter, limit)
                    : [],
                tables.includes('inventory')
                    ? this.getPullInventory(whereBase, sinceFilter, terminalId, limit)
                    : [],
                tables.includes('paymentMethods')
                    ? this.getPullPaymentMethods(whereBase, sinceFilter, limit)
                    : [],
                tables.includes('stockMovements')
                    ? this.getPullStockMovements(whereBase, sinceFilter, terminalId, limit)
                    : [],
                tables.includes('customers')
                    ? this.getPullCustomers(whereBase, sinceFilter, limit)
                    : [],
            ]);

            result.data = {
                products,
                productVariants,
                categories,
                inventory,
                paymentMethods,
                stockMovements,
                customers,
            };

            result.counts = {
                products: products.length,
                productVariants: productVariants.length,
                categories: categories.length,
                inventory: inventory.length,
                paymentMethods: paymentMethods.length,
                stockMovements: stockMovements.length,
                customers: customers.length,
            };

        } catch (error: any) {
            result.success = false;
            result.errors.push(error.message);
            console.error('[SyncReceiver] Pull data error:', error);
        }

        return result;
    }

    /**
     * Get products updated since timestamp
     */
    private static async getPullProducts(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        limit: number
    ): Promise<any[]> {
        return prisma.product.findMany({
            where: {
                ...whereBase,
                ...sinceFilter,
                deletedAt: null,
            },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get product variants updated since timestamp
     */
    private static async getPullProductVariants(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        limit: number
    ): Promise<any[]> {
        return prisma.productVariant.findMany({
            where: {
                ...whereBase,
                ...sinceFilter,
                deletedAt: null,
            },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get categories updated since timestamp
     */
    private static async getPullCategories(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        limit: number
    ): Promise<any[]> {
        return prisma.category.findMany({
            where: {
                ...whereBase,
                ...sinceFilter,
                deletedAt: null,
            },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get inventory records updated since timestamp
     * This includes recalculated quantities from all terminals
     */
    private static async getPullInventory(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        terminalId: string,
        limit: number
    ): Promise<any[]> {
        return prisma.inventory.findMany({
            where: {
                ...whereBase,
                ...sinceFilter,
                deletedAt: null,
            },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get payment methods updated since timestamp
     */
    private static async getPullPaymentMethods(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        limit: number
    ): Promise<any[]> {
        return prisma.paymentMethod.findMany({
            where: {
                ...whereBase,
                ...sinceFilter,
                deletedAt: null,
            },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get stock movements from OTHER terminals since timestamp
     * This allows terminals to see movements made by other terminals
     * and recalculate their local inventory accordingly
     */
    private static async getPullStockMovements(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        terminalId: string,
        limit: number
    ): Promise<any[]> {
        // Get movements NOT from this terminal (other terminals' movements)
        return prisma.stockMovement.findMany({
            where: {
                ...whereBase,
                createdAt: sinceFilter.updatedAt ? { gt: sinceFilter.updatedAt.gt } : undefined,
                // Include movements from other terminals or server
                OR: [
                    { terminalId: { not: terminalId } },
                    { terminalId: null },
                ],
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get customers updated since timestamp
     */
    private static async getPullCustomers(
        whereBase: { tenantId: string; branchId: string },
        sinceFilter: { updatedAt?: { gt: Date } },
        limit: number
    ): Promise<any[]> {
        return prisma.customer.findMany({
            where: {
                ...whereBase,
                ...sinceFilter,
                deletedAt: null,
            },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
    }

    /**
     * Get delta changes for a specific table
     * Useful for incremental sync of individual tables
     */
    static async getTableDelta(
        tableName: PullTableName,
        tenantId: string,
        branchId: string,
        terminalId: string,
        since?: Date | null,
        limit = 500
    ): Promise<{ records: any[]; count: number; hasMore: boolean }> {
        const whereBase = { tenantId, branchId };
        const sinceFilter = since ? { updatedAt: { gt: since } } : {};

        let records: any[] = [];

        switch (tableName) {
            case 'products':
                records = await this.getPullProducts(whereBase, sinceFilter, limit + 1);
                break;
            case 'productVariants':
                records = await this.getPullProductVariants(whereBase, sinceFilter, limit + 1);
                break;
            case 'categories':
                records = await this.getPullCategories(whereBase, sinceFilter, limit + 1);
                break;
            case 'inventory':
                records = await this.getPullInventory(whereBase, sinceFilter, terminalId, limit + 1);
                break;
            case 'paymentMethods':
                records = await this.getPullPaymentMethods(whereBase, sinceFilter, limit + 1);
                break;
            case 'stockMovements':
                records = await this.getPullStockMovements(whereBase, sinceFilter, terminalId, limit + 1);
                break;
            case 'customers':
                records = await this.getPullCustomers(whereBase, sinceFilter, limit + 1);
                break;
        }

        const hasMore = records.length > limit;
        if (hasMore) {
            records = records.slice(0, limit);
        }

        return {
            records,
            count: records.length,
            hasMore,
        };
    }
}

export default SyncReceiverService;
