/**
 * Sync Receiver Service
 * 
 * Handles incoming sync requests from offline terminals.
 * Runs on the SERVER to receive and process pushed data.
 * 
 * RESPONSIBILITIES:
 * -----------------
 * 1. Receive batches of records from terminals
 * 2. Upsert records (insert if not exists, skip if exists)
 * 3. Recalculate inventories from stock movements
 * 4. Return acceptance/rejection status
 * 
 * IDEMPOTENCY:
 * ------------
 * All operations are idempotent - pushing the same record twice
 * will not create duplicates. This is crucial for offline sync
 * where terminals may retry failed pushes.
 */

import { prisma } from '../../databases/prisma/client';
import { StockMovementService } from '../stock-movement.service';
import type { SyncMovementInput } from '../../models/stock-movement.model';

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

                // Insert new sale
                await prisma.sale.create({
                    data: {
                        ...(sale as any),
                        terminalId,
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

                // Insert new sale item
                await prisma.saleItem.create({
                    data: {
                        ...(item as any),
                        terminalId,
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

                // Insert new return
                await prisma.return.create({
                    data: {
                        ...(ret as any),
                        terminalId,
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
                // Check if exists
                const existing = await prisma.customer.findUnique({
                    where: { customerId: customer.id },
                });

                if (existing) {
                    // Update if local is newer (based on updatedAt)
                    const localUpdatedAt = customer.updatedAt as Date | string;
                    if (localUpdatedAt && new Date(localUpdatedAt) > existing.updatedAt) {
                        await prisma.customer.update({
                            where: { customerId: customer.id },
                            data: customer as any,
                        });
                        result.accepted++;
                    } else {
                        result.skipped++;
                    }
                    continue;
                }

                // Insert new customer
                await prisma.customer.create({
                    data: customer as any,
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
}

export default SyncReceiverService;
