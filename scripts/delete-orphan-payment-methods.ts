#!/usr/bin/env npx tsx
/**
 * Orphan Payment Methods Cleanup Script
 *
 * Deletes the tenant-less payment_methods rows (tenantId IS NULL, branchId
 * IS NULL) that historically absorbed every sale's literal 'cash' /
 * 'bank-transfer' / 'mobile-money' payment_method_id (see
 * backfill-sale-payment-method-ids.ts for the full root-cause writeup).
 *
 * Run the backfill script FIRST. This script only deletes a row once it has
 * confirmed there are zero remaining references to it anywhere - sales,
 * salePayments, expenses, paymentServiceProviders, and other payment_methods
 * rows' parentMethodId. A row with any remaining reference is left alone and
 * reported, never force-deleted.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/delete-orphan-payment-methods.ts
 */

import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';

async function main() {
    setDatabaseReady();
    const prisma = await getPrisma();

    // tenantId/branchId are declared non-nullable in schema.prisma, so Prisma's
    // client rejects `null` as a filter value even though these legacy rows
    // genuinely have a NULL column value at the DB level. Raw SQL bypasses that.
    const orphans = await prisma.$queryRaw<Array<{ methodId: string; name: string }>>`
        SELECT method_id as methodId, name FROM payment_methods
        WHERE tenant_id IS NULL AND branch_id IS NULL
    `;

    console.log(`Found ${orphans.length} tenant-less payment_methods row(s):`);
    orphans.forEach((o: any) => console.log(`  ${o.methodId}  (${o.name})`));

    if (orphans.length === 0) {
        await disconnectPrisma();
        return;
    }

    const ids = orphans.map((o: any) => o.methodId);
    const stillReferenced = new Set<string>();

    console.log('\nChecking for remaining references:');

    const salesCount = await prisma.sale.count({ where: { paymentMethodId: { in: ids } } });
    console.log(`  sales.paymentMethodId: ${salesCount} reference(s)`);
    if (salesCount > 0) {
        const rows = await prisma.sale.findMany({ where: { paymentMethodId: { in: ids } }, select: { paymentMethodId: true }, distinct: ['paymentMethodId'] });
        rows.forEach((r: any) => stillReferenced.add(r.paymentMethodId));
    }

    const salePaymentsCount = await prisma.salePayment.count({ where: { paymentMethodId: { in: ids } } });
    console.log(`  salePayments.paymentMethodId: ${salePaymentsCount} reference(s)`);
    if (salePaymentsCount > 0) {
        const rows = await prisma.salePayment.findMany({ where: { paymentMethodId: { in: ids } }, select: { paymentMethodId: true }, distinct: ['paymentMethodId'] });
        rows.forEach((r: any) => stillReferenced.add(r.paymentMethodId));
    }

    const expensesCount = await prisma.expense.count({ where: { paymentMethodId: { in: ids } } });
    console.log(`  expenses.paymentMethodId: ${expensesCount} reference(s)`);
    if (expensesCount > 0) {
        const rows = await prisma.expense.findMany({ where: { paymentMethodId: { in: ids } }, select: { paymentMethodId: true }, distinct: ['paymentMethodId'] });
        rows.forEach((r: any) => r.paymentMethodId && stillReferenced.add(r.paymentMethodId));
    }

    const providersCount = await prisma.paymentServiceProvider.count({ where: { paymentMethodId: { in: ids } } });
    console.log(`  paymentServiceProviders.paymentMethodId: ${providersCount} reference(s)`);
    if (providersCount > 0) {
        const rows = await prisma.paymentServiceProvider.findMany({ where: { paymentMethodId: { in: ids } }, select: { paymentMethodId: true }, distinct: ['paymentMethodId'] });
        rows.forEach((r: any) => r.paymentMethodId && stillReferenced.add(r.paymentMethodId));
    }

    const childCount = await prisma.paymentMethod.count({ where: { parentMethodId: { in: ids } } });
    console.log(`  paymentMethods.parentMethodId: ${childCount} reference(s)`);
    if (childCount > 0) {
        const rows = await prisma.paymentMethod.findMany({ where: { parentMethodId: { in: ids } }, select: { parentMethodId: true }, distinct: ['parentMethodId'] });
        rows.forEach((r: any) => r.parentMethodId && stillReferenced.add(r.parentMethodId));
    }

    const safeToDelete = orphans.filter((o: any) => !stillReferenced.has(o.methodId));
    const blocked = orphans.filter((o: any) => stillReferenced.has(o.methodId));

    console.log(`\nSafe to delete (zero references anywhere): ${safeToDelete.length}`);
    safeToDelete.forEach((o: any) => console.log(`  ${o.methodId}  (${o.name})`));

    if (blocked.length > 0) {
        console.log(`\nBLOCKED — still referenced, will NOT delete: ${blocked.length}`);
        blocked.forEach((o: any) => console.log(`  ${o.methodId}  (${o.name})`));
        console.log('\n(run backfill-sale-payment-method-ids.ts first if these should have zero references)');
    }

    if (safeToDelete.length === 0) {
        console.log('\nNothing safe to delete.');
    } else {
        const { count } = await prisma.paymentMethod.deleteMany({
            where: { methodId: { in: safeToDelete.map((o: any) => o.methodId) } },
        });
        console.log(`\nDeleted ${count} row(s).`);
    }
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error deleting orphan payment methods:', e);
        await disconnectPrisma();
        process.exit(1);
    });
