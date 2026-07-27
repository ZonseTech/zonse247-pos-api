#!/usr/bin/env npx tsx
/**
 * Payment Methods Backfill Script
 *
 * payment-methods.seed.ts only ever provisioned the default payment-method
 * hierarchy (Cash, Bank -> POS/Bank Transfer, Mobile Money, ...) for the
 * default tenant/branch ('-1'/'-1'). Every other tenant has zero payment_methods
 * rows, so their Sales-page provider filter and POS checkout provider picker are
 * always empty (see the 20260727_01 migration for the full root-cause writeup).
 *
 * This script loops over every existing branch and provisions whichever default
 * methods it's missing. Safe to run repeatedly - provisionDefaultPaymentMethods()
 * is idempotent per template (matched by name), not an all-or-nothing skip, so a
 * branch that already has one or more custom/legacy payment methods still gets
 * the missing defaults added alongside them.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/backfill-payment-methods.ts
 */

import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';
import { provisionDefaultPaymentMethods } from '../src/services/payment-method-provisioning.service';

async function main() {
    console.log('🌱 Backfilling default payment methods for existing branches...');

    setDatabaseReady();

    const prisma = await getPrisma();
    const branches: Array<{ tenantId: string; branchId: string }> = await prisma.branch.findMany({
        select: { tenantId: true, branchId: true },
    });

    let updated = 0;
    let unchanged = 0;

    for (const branch of branches) {
        const before = await prisma.paymentMethod.count({
            where: { tenantId: branch.tenantId, branchId: branch.branchId },
        });

        await provisionDefaultPaymentMethods(branch.tenantId, branch.branchId);

        const after = await prisma.paymentMethod.count({
            where: { tenantId: branch.tenantId, branchId: branch.branchId },
        });

        if (after > before) {
            updated++;
            console.log(`  → tenant ${branch.tenantId} / branch ${branch.branchId}: ${before} -> ${after} payment methods`);
        } else {
            unchanged++;
        }
    }

    console.log(`🎉 Done. Updated ${updated} branch(es), ${unchanged} already fully provisioned.`);
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error backfilling payment methods:', e);
        await disconnectPrisma();
        process.exit(1);
    });
