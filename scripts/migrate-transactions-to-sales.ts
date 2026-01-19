#!/usr/bin/env npx ts-node
/**
 * Transaction to Sale Migration Script
 * 
 * This script migrates all historical transaction data to the new sales module.
 * Run this script ONCE during deployment or maintenance window.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-transactions-to-sales.ts
 *   npx ts-node scripts/migrate-transactions-to-sales.ts --dry-run
 *   npx ts-node scripts/migrate-transactions-to-sales.ts --batch-size=50
 * 
 * Options:
 *   --dry-run       Preview changes without modifying the database
 *   --batch-size=N  Process N transactions at a time (default: 100)
 *   --tenant=ID     Migrate specific tenant only
 *   --branch=ID     Migrate specific branch only
 */

import { v4 as uuidv4 } from 'uuid';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;
const tenantArg = args.find(a => a.startsWith('--tenant='));
const specificTenantId = tenantArg ? tenantArg.split('=')[1] : null;
const branchArg = args.find(a => a.startsWith('--branch='));
const specificBranchId = branchArg ? branchArg.split('=')[1] : null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const log = {
    info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

interface MigrationResult {
    tenantId: string;
    branchId: string;
    migrated: number;
    skipped: number;
    failed: number;
    errors: string[];
}

async function main() {
    log.header('═══════════════════════════════════════════════════════════');
    log.header('       TRANSACTION TO SALE MIGRATION SCRIPT');
    log.header('═══════════════════════════════════════════════════════════');

    if (isDryRun) {
        log.warning('DRY RUN MODE - No changes will be made to the database');
    }

    log.info(`Batch size: ${batchSize}`);
    if (specificTenantId) log.info(`Filtering by tenant: ${specificTenantId}`);
    if (specificBranchId) log.info(`Filtering by branch: ${specificBranchId}`);

    // Import prisma client dynamically to ensure proper initialization
    const { prisma, getPrismaClient } = await import('../src/databases/prisma/client');

    try {
        // Initialize database connection
        log.info('Connecting to database...');
        await getPrismaClient(); // This initializes the connection
        log.success('Database connected');

        // Get all tenant/branch combinations to migrate
        const whereClause: any = {
            saleId: null, // Only transactions not yet migrated
            // Include completed, refunded, and other non-pending statuses
            status: { in: ['completed', 'refunded', 'voided', 'cancelled'] },
        };

        if (specificTenantId) whereClause.tenantId = specificTenantId;
        if (specificBranchId) whereClause.branchId = specificBranchId;

        // Get distinct tenant/branch combinations
        const transactionGroups = await prisma.transaction.groupBy({
            by: ['tenantId', 'branchId'],
            where: whereClause,
            _count: true,
        });

        if (transactionGroups.length === 0) {
            log.success('No transactions to migrate!');
            process.exit(0);
        }

        log.info(`Found ${transactionGroups.length} tenant/branch combinations to process`);

        const results: MigrationResult[] = [];
        let totalMigrated = 0;
        let totalFailed = 0;

        // Process each tenant/branch
        for (const group of transactionGroups) {
            const { tenantId, branchId, _count } = group;
            log.header(`Processing: Tenant ${tenantId.substring(0, 8)}... | Branch ${branchId.substring(0, 8)}...`);
            log.info(`Transactions to migrate: ${_count}`);

            const result: MigrationResult = {
                tenantId,
                branchId,
                migrated: 0,
                skipped: 0,
                failed: 0,
                errors: [],
            };

            if (isDryRun) {
                result.migrated = _count;
                results.push(result);
                totalMigrated += _count;
                continue;
            }

            // Process in batches
            let processed = 0;
            while (processed < _count) {
                const transactions = await prisma.transaction.findMany({
                    where: {
                        tenantId,
                        branchId,
                        saleId: null,
                        status: { in: ['completed', 'refunded', 'voided', 'cancelled'] },
                    },
                    take: batchSize,
                    orderBy: { date: 'asc' },
                    include: {
                        paymentMethod: true,
                    },
                });

                if (transactions.length === 0) break;

                for (const transaction of transactions) {
                    try {
                        await migrateTransaction(prisma, transaction, tenantId, branchId);
                        result.migrated++;
                    } catch (error: any) {
                        result.failed++;
                        result.errors.push(`${transaction.transactionId}: ${error.message}`);
                        log.error(`Failed: ${transaction.transactionId} - ${error.message}`);
                    }
                }

                processed += transactions.length;
                process.stdout.write(`\r  Progress: ${processed}/${_count} (${Math.round(processed / _count * 100)}%)`);
            }

            console.log(''); // New line after progress
            log.success(`Completed: ${result.migrated} migrated, ${result.failed} failed`);

            results.push(result);
            totalMigrated += result.migrated;
            totalFailed += result.failed;
        }

        // Print summary
        log.header('═══════════════════════════════════════════════════════════');
        log.header('                    MIGRATION SUMMARY');
        log.header('═══════════════════════════════════════════════════════════');

        console.log('\n');
        console.log(`  ${colors.green}Total Migrated:${colors.reset}  ${totalMigrated}`);
        console.log(`  ${colors.red}Total Failed:${colors.reset}    ${totalFailed}`);
        console.log('\n');

        if (isDryRun) {
            log.warning('This was a DRY RUN. Run without --dry-run to apply changes.');
        }

        // Print errors if any
        const allErrors = results.flatMap(r => r.errors);
        if (allErrors.length > 0) {
            log.header('ERRORS:');
            allErrors.slice(0, 20).forEach(e => log.error(e));
            if (allErrors.length > 20) {
                log.warning(`... and ${allErrors.length - 20} more errors`);
            }
        }

        process.exit(totalFailed > 0 ? 1 : 0);

    } catch (error: any) {
        log.error(`Migration failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

/**
 * Migrate a single transaction to the sales module
 */
async function migrateTransaction(
    prisma: any,
    transaction: any,
    tenantId: string,
    branchId: string
): Promise<string> {
    return await prisma.$transaction(async (tx: any) => {
        // Check if already migrated (by sale number)
        const existingSale = await tx.sale.findFirst({
            where: {
                saleNumber: `MIG-${transaction.refNumber || transaction.transactionId}`,
                tenantId,
                branchId,
            },
        });

        if (existingSale) {
            // Just link transaction to existing sale
            await tx.transaction.update({
                where: { transactionId: transaction.transactionId },
                data: { saleId: existingSale.id },
            });
            return existingSale.id;
        }

        // Get order items for this transaction
        const orderItems = await tx.order.findMany({
            where: {
                OR: [
                    { refNumber: transaction.refNumber },
                    { transactionId: transaction.transactionId },
                ]
            },
        });

        // Find valid userId
        let userId = transaction.userId;
        if (!userId) {
            const systemUser = await tx.user.findFirst({
                where: { tenantId },
                select: { userId: true },
            });
            userId = systemUser?.userId;
            if (!userId) {
                throw new Error('No user found for tenant');
            }
        }

        // Calculate totals from order items if transaction totals are missing
        let subtotal = Number(transaction.subtotal) || 0;
        let totalAmount = Number(transaction.total) || 0;

        if (orderItems.length > 0 && subtotal === 0) {
            subtotal = orderItems.reduce((sum: number, item: any) => {
                return sum + (Number(item.quantity) * Number(item.sellPrice));
            }, 0);
        }

        if (totalAmount === 0) {
            totalAmount = subtotal + (Number(transaction.tax) || 0) - (Number(transaction.discount) || 0);
        }

        // Determine sale status
        let status = 'COMPLETED';
        if (transaction.isRefund) {
            status = 'REFUNDED';
        } else if (transaction.status === 'voided' || transaction.status === 'cancelled') {
            status = 'VOIDED';
        }

        // Create the sale
        const saleId = uuidv4();
        await tx.sale.create({
            data: {
                id: saleId,
                tenantId,
                branchId,
                saleNumber: `MIG-${transaction.refNumber || transaction.transactionId}`,
                customerId: transaction.customerId || null,
                terminalId: transaction.terminalId || null,
                userId: userId,
                subtotal: subtotal,
                taxAmount: Number(transaction.tax) || 0,
                discountAmount: Number(transaction.discount) || 0,
                totalAmount: totalAmount,
                amountPaid: Number(transaction.paid) || totalAmount,
                changeAmount: Number(transaction.changeAmount) || 0,
                paymentMethodId: transaction.paymentMethodId || null,
                status: status,
                saleDate: transaction.date || transaction.createdAt,
                notes: `Migrated from transaction ${transaction.transactionId}`,
                isVoided: transaction.isRefund || false,
                voidReason: transaction.refundReason || null,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt || new Date(),
            },
        });

        // Create sale items from order items
        if (orderItems.length > 0) {
            await tx.saleItem.createMany({
                data: orderItems.map((item: any) => ({
                    id: uuidv4(),
                    saleId: saleId,
                    productId: item.productId,
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.sellPrice) || 0,
                    unitCost: Number(item.purchasePrice) || 0,
                    subtotal: Number(item.quantity) * Number(item.sellPrice),
                    taxAmount: 0,
                    discountAmount: 0,
                    totalAmount: Number(item.quantity) * Number(item.sellPrice),
                })),
            });
        }

        // Create payment record
        if (transaction.paymentMethodId) {
            await tx.salePayment.create({
                data: {
                    id: uuidv4(),
                    saleId: saleId,
                    paymentMethodId: transaction.paymentMethodId,
                    amount: Number(transaction.paid) || totalAmount,
                    reference: transaction.externalTransactionRef || null,
                    providerId: transaction.paymentServiceProviderId || null,
                    providerRef: null,
                    status: 'COMPLETED',
                    processedAt: transaction.date || transaction.createdAt,
                },
            });
        }

        // Link the original transaction to the new sale
        await tx.transaction.update({
            where: { transactionId: transaction.transactionId },
            data: { saleId: saleId },
        });

        return saleId;
    });
}

// Run the migration
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
