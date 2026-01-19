import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';

/**
 * Transaction to Sale Migration Service
 * Handles migration from legacy Transaction system to new Sale system
 * 
 * IMPORTANT: Run this during a maintenance window
 * This preserves all historical data while enabling the new features
 */
export class TransactionToSaleMigrationService {

    /**
     * Migrate transactions to sales for a specific tenant/branch
     * Can be run incrementally (safe to run multiple times)
     */
    static async migrateTransactionsToSales(
        tenantId: string,
        branchId: string,
        options: {
            batchSize?: number;
            dryRun?: boolean;
            startDate?: Date;
            endDate?: Date;
        } = {}
    ): Promise<{
        migrated: number;
        skipped: number;
        failed: number;
        errors: string[];
    }> {
        const { batchSize = 100, dryRun = false, startDate, endDate } = options;

        const result = {
            migrated: 0,
            skipped: 0,
            failed: 0,
            errors: [] as string[],
        };

        try {
            // Build query for transactions not yet migrated
            const where: any = {
                tenantId,
                branchId,
                saleId: null, // Not yet linked to a sale
                status: 'completed', // Only completed transactions
            };

            if (startDate) {
                where.date = { ...where.date, gte: startDate };
            }
            if (endDate) {
                where.date = { ...where.date, lte: endDate };
            }

            // Count total to migrate
            const totalCount = await prisma.transaction.count({ where });
            console.log(`Found ${totalCount} transactions to migrate for branch ${branchId}`);

            if (dryRun) {
                console.log('DRY RUN - No changes will be made');
                return { ...result, migrated: totalCount };
            }

            // Process in batches
            let processed = 0;
            while (processed < totalCount) {
                const transactions = await prisma.transaction.findMany({
                    where,
                    take: batchSize,
                    skip: 0, // Always take from start since we're updating saleId
                    orderBy: { date: 'asc' },
                });

                if (transactions.length === 0) break;

                for (const transaction of transactions) {
                    try {
                        await this.migrateTransaction(transaction, tenantId, branchId);
                        result.migrated++;
                    } catch (error: any) {
                        result.failed++;
                        result.errors.push(`Transaction ${transaction.transactionId}: ${error.message}`);
                    }
                }

                processed += transactions.length;
                console.log(`Processed ${processed}/${totalCount} transactions`);
            }

            return result;
        } catch (error: any) {
            throw new Error(`Migration failed: ${error.message}`);
        }
    }

    /**
     * Migrate a single transaction to sale
     */
    private static async migrateTransaction(
        transaction: any,
        tenantId: string,
        branchId: string
    ): Promise<string> {
        return await prisma.$transaction(async (tx) => {
            // Check if already migrated
            const existingSale = await tx.sale.findFirst({
                where: {
                    saleNumber: `MIG-${transaction.refNumber}`,
                    tenantId,
                    branchId,
                },
            });

            if (existingSale) {
                // Link transaction to existing sale
                await tx.transaction.update({
                    where: { transactionId: transaction.transactionId },
                    data: { saleId: existingSale.id },
                });
                return existingSale.id;
            }

            // Get order items for this transaction
            const orderItems = await tx.order.findMany({
                where: { refNumber: transaction.refNumber },
            });

            // We need a valid userId - use transaction's userId or find a system user
            let userId = transaction.userId;
            if (!userId) {
                // Find any user for this tenant as fallback
                const systemUser = await tx.user.findFirst({
                    where: { tenantId },
                    select: { userId: true },
                });
                userId = systemUser?.userId || 'system-migration';
            }

            // Create the sale
            const saleId = uuidv4();
            const sale = await tx.sale.create({
                data: {
                    id: saleId,
                    tenantId,
                    branchId,
                    saleNumber: `MIG-${transaction.refNumber}`, // Prefix to identify migrated sales
                    customerId: transaction.customerId,
                    terminalId: transaction.terminalId,
                    userId: userId,
                    subtotal: Number(transaction.subtotal) || 0,
                    taxAmount: Number(transaction.tax) || 0,
                    discountAmount: Number(transaction.discount) || 0,
                    totalAmount: Number(transaction.total) || 0,
                    amountPaid: Number(transaction.paid) || 0,
                    changeAmount: Number(transaction.changeAmount) || 0,
                    paymentMethodId: transaction.paymentMethodId,
                    status: transaction.isRefund ? 'VOIDED' : 'COMPLETED',
                    saleDate: transaction.date || transaction.createdAt,
                    notes: `Migrated from transaction ${transaction.transactionId}`,
                    isVoided: transaction.isRefund || false,
                    voidReason: transaction.refundReason,
                    // Create sale items from order items
                    items: {
                        create: orderItems.map((item) => ({
                            id: uuidv4(),
                            productId: item.productId,
                            quantity: Number(item.quantity) || 1,
                            unitPrice: Number(item.sellPrice) || 0,
                            unitCost: Number(item.purchasePrice) || 0,
                            subtotal: Number(item.quantity) * Number(item.sellPrice),
                            taxAmount: 0,
                            discountAmount: 0,
                            totalAmount: Number(item.quantity) * Number(item.sellPrice),
                        })),
                    },
                    // Create single payment record
                    payments: {
                        create: transaction.paymentMethodId ? [{
                            id: uuidv4(),
                            paymentMethodId: transaction.paymentMethodId,
                            amount: Number(transaction.paid) || 0,
                            reference: transaction.externalTransactionRef,
                            providerId: transaction.paymentServiceProviderId,
                            status: 'COMPLETED',
                        }] : [],
                    },
                },
            });

            // Link the original transaction to the new sale
            await tx.transaction.update({
                where: { transactionId: transaction.transactionId },
                data: { saleId: sale.id },
            });

            return sale.id;
        });
    }

    /**
     * Get migration status for a branch
     */
    static async getMigrationStatus(
        tenantId: string,
        branchId: string
    ): Promise<{
        totalTransactions: number;
        migratedTransactions: number;
        pendingTransactions: number;
        percentComplete: number;
        totalSales: number;
        migratedSales: number;
    }> {
        const [totalTransactions, migratedTransactions, totalSales, migratedSales] = await Promise.all([
            prisma.transaction.count({
                where: { tenantId, branchId, status: 'completed' },
            }),
            prisma.transaction.count({
                where: { tenantId, branchId, status: 'completed', saleId: { not: null } },
            }),
            prisma.sale.count({
                where: { tenantId, branchId },
            }),
            prisma.sale.count({
                where: { tenantId, branchId, saleNumber: { startsWith: 'MIG-' } },
            }),
        ]);

        const pendingTransactions = totalTransactions - migratedTransactions;
        const percentComplete = totalTransactions > 0
            ? Math.round((migratedTransactions / totalTransactions) * 100)
            : 100;

        return {
            totalTransactions,
            migratedTransactions,
            pendingTransactions,
            percentComplete,
            totalSales,
            migratedSales,
        };
    }

    /**
     * Get unified sales data (from both systems)
     * Use this for reports that need historical + new data
     */
    static async getUnifiedSalesData(
        tenantId: string,
        branchId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        } = {}
    ): Promise<{
        data: any[];
        totals: {
            totalSales: number;
            totalAmount: number;
            totalTransactions: number;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const { startDate, endDate, page = 1, limit = 50 } = options;

        // Build date filter
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter.lte = endOfDay;
        }

        // Get sales from new system
        const salesWhere: any = { tenantId, branchId, isVoided: false };
        if (Object.keys(dateFilter).length > 0) {
            salesWhere.saleDate = dateFilter;
        }

        // Get transactions from legacy system (not migrated)
        const txWhere: any = {
            tenantId,
            branchId,
            status: 'completed',
            isRefund: false,
            saleId: null, // Not migrated
        };
        if (Object.keys(dateFilter).length > 0) {
            txWhere.date = dateFilter;
        }

        const [sales, transactions, salesCount, txCount] = await Promise.all([
            prisma.sale.findMany({
                where: salesWhere,
                include: {
                    items: { include: { product: { select: { name: true, sku: true } } } },
                    payments: { include: { paymentMethod: { select: { name: true } } } },
                    customer: { select: { name: true } },
                    user: { select: { fullname: true } },
                },
                orderBy: { saleDate: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.transaction.findMany({
                where: txWhere,
                include: {
                    customer: true,
                    user: true,
                    paymentMethod: true,
                },
                orderBy: { date: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.sale.count({ where: salesWhere }),
            prisma.transaction.count({ where: txWhere }),
        ]);

        // Normalize data to unified format
        const unifiedData = [
            ...sales.map((sale) => ({
                id: sale.id,
                type: 'sale',
                number: sale.saleNumber,
                date: sale.saleDate,
                customer: sale.customer?.name || null,
                user: sale.user?.fullname || null,
                subtotal: Number(sale.subtotal),
                tax: Number(sale.taxAmount),
                discount: Number(sale.discountAmount),
                total: Number(sale.totalAmount),
                paid: Number(sale.amountPaid),
                change: Number(sale.changeAmount),
                payments: sale.payments.map((p) => ({
                    method: p.paymentMethod?.name,
                    amount: Number(p.amount),
                })),
                itemCount: sale.items.length,
                status: sale.status,
                source: sale.saleNumber.startsWith('MIG-') ? 'migrated' : 'new',
            })),
            ...transactions.map((tx) => ({
                id: tx.transactionId,
                type: 'transaction',
                number: tx.refNumber,
                date: tx.date,
                customer: tx.customer?.name || null,
                user: tx.user?.fullname || null,
                subtotal: Number(tx.subtotal),
                tax: Number(tx.tax),
                discount: Number(tx.discount),
                total: Number(tx.total),
                paid: Number(tx.paid),
                change: Number(tx.changeAmount),
                payments: tx.paymentMethod ? [{
                    method: tx.paymentMethod.name,
                    amount: Number(tx.paid),
                }] : [],
                itemCount: 0, // Would need to fetch orders
                status: tx.status,
                source: 'legacy',
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate totals
        const salesTotal = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const txTotal = transactions.reduce((sum, t) => sum + Number(t.total), 0);

        const total = salesCount + txCount;
        const totalPages = Math.ceil(total / limit);

        return {
            data: unifiedData.slice(0, limit),
            totals: {
                totalSales: salesCount + txCount,
                totalAmount: salesTotal + txTotal,
                totalTransactions: total,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get unified summary/analytics (from both systems)
     */
    static async getUnifiedSummary(
        tenantId: string,
        branchId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
        } = {}
    ): Promise<{
        totalRevenue: number;
        totalSalesCount: number;
        averageOrderValue: number;
        breakdown: {
            newSales: { count: number; amount: number };
            migratedSales: { count: number; amount: number };
            legacyTransactions: { count: number; amount: number };
        };
    }> {
        const { startDate, endDate } = options;

        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter.lte = endOfDay;
        }

        // New sales (not migrated)
        const newSalesWhere: any = {
            tenantId, branchId, isVoided: false,
            saleNumber: { not: { startsWith: 'MIG-' } },
        };
        if (Object.keys(dateFilter).length > 0) {
            newSalesWhere.saleDate = dateFilter;
        }

        // Migrated sales
        const migratedSalesWhere: any = {
            tenantId, branchId, isVoided: false,
            saleNumber: { startsWith: 'MIG-' },
        };
        if (Object.keys(dateFilter).length > 0) {
            migratedSalesWhere.saleDate = dateFilter;
        }

        // Legacy transactions (not migrated)
        const legacyTxWhere: any = {
            tenantId, branchId,
            status: 'completed',
            isRefund: false,
            saleId: null,
        };
        if (Object.keys(dateFilter).length > 0) {
            legacyTxWhere.date = dateFilter;
        }

        const [newSales, migratedSales, legacyTx] = await Promise.all([
            prisma.sale.aggregate({
                where: newSalesWhere,
                _count: true,
                _sum: { totalAmount: true },
            }),
            prisma.sale.aggregate({
                where: migratedSalesWhere,
                _count: true,
                _sum: { totalAmount: true },
            }),
            prisma.transaction.aggregate({
                where: legacyTxWhere,
                _count: true,
                _sum: { total: true },
            }),
        ]);

        const newSalesAmount = Number(newSales._sum.totalAmount) || 0;
        const migratedAmount = Number(migratedSales._sum.totalAmount) || 0;
        const legacyAmount = Number(legacyTx._sum.total) || 0;

        const totalRevenue = newSalesAmount + migratedAmount + legacyAmount;
        const totalSalesCount = newSales._count + migratedSales._count + legacyTx._count;
        const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        return {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalSalesCount,
            averageOrderValue: Math.round(averageOrderValue * 100) / 100,
            breakdown: {
                newSales: {
                    count: newSales._count,
                    amount: Math.round(newSalesAmount * 100) / 100
                },
                migratedSales: {
                    count: migratedSales._count,
                    amount: Math.round(migratedAmount * 100) / 100
                },
                legacyTransactions: {
                    count: legacyTx._count,
                    amount: Math.round(legacyAmount * 100) / 100
                },
            },
        };
    }
}
