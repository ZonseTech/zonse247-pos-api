#!/usr/bin/env npx tsx
/**
 * Sale Payment Method ID Backfill Script
 *
 * The POS checkout flow historically sent literal category strings
 * ('cash', 'bank-transfer', 'mobile-money') as paymentMethodId instead of a
 * branch's real payment_methods.method_id (a per-branch UUID minted by
 * provisionDefaultPaymentMethods). Since method_id has no tenant-ownership
 * check at the FK level, this silently "worked" by resolving to a handful of
 * tenant-less legacy rows shared across every tenant — every sale in the
 * database (sales AND sale_payments) ended up pointing at one of these
 * shared rows instead of its own branch's payment method. The checkout UI
 * fix now resolves to the real per-branch id going forward; this script
 * backfills the historical rows to match.
 *
 * For every sale/sale_payment whose payment_method_id is one of the known
 * literals, looks up that record's own tenant+branch payment_methods row by
 * name and repoints it there. Skips (and reports) any row whose branch has
 * no matching payment method configured — nothing is silently dropped.
 *
 * Safe to run repeatedly - already-correct rows (UUID payment_method_id, not
 * a literal) are simply not selected on a second run.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/backfill-sale-payment-method-ids.ts
 */

import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';

const LITERAL_TO_NAME: Record<string, string> = {
    'cash': 'Cash',
    'bank-transfer': 'Bank Transfer',
    'mobile-money': 'Mobile Money',
    'pos': 'POS',
    'bank': 'Bank',
    'credit-card': 'Credit Card',
    'debit-card': 'Debit Card',
    'cheque': 'Cheque',
};
const LITERALS = Object.keys(LITERAL_TO_NAME);

async function main() {
    setDatabaseReady();
    const prisma = await getPrisma();

    // Cache: "tenantId::branchId::name" -> methodId | null
    const methodCache = new Map<string, string | null>();
    async function resolveMethodId(tenantId: string, branchId: string, literal: string): Promise<string | null> {
        const name = LITERAL_TO_NAME[literal];
        if (!name) return null;

        const key = `${tenantId}::${branchId}::${name}`;
        if (methodCache.has(key)) return methodCache.get(key)!;

        const candidates = await prisma.paymentMethod.findMany({
            where: { tenantId, branchId, name },
            select: { methodId: true, category: true, createdAt: true },
        });

        // Prefer the correctly-provisioned row (category set) if there are
        // duplicates (see the payment-methods dedup fix from this session).
        candidates.sort((a: any, b: any) => {
            const aHasCategory = a.category ? 0 : 1;
            const bHasCategory = b.category ? 0 : 1;
            if (aHasCategory !== bHasCategory) return aHasCategory - bHasCategory;
            return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
        });

        const methodId = candidates[0]?.methodId ?? null;
        methodCache.set(key, methodId);
        return methodId;
    }

    for (const table of ['sales', 'salePayments'] as const) {
        console.log(`\n=== ${table} ===`);

        const rows = table === 'sales'
            ? await prisma.sale.findMany({
                where: { paymentMethodId: { in: LITERALS } },
                select: { id: true, tenantId: true, branchId: true, paymentMethodId: true },
            })
            : await prisma.salePayment.findMany({
                where: { paymentMethodId: { in: LITERALS } },
                select: { id: true, tenantId: true, branchId: true, paymentMethodId: true },
            });

        console.log(`Found ${rows.length} row(s) with a literal payment_method_id`);

        const byTenant = new Map<string, { resolved: number; unresolved: number; unresolvedSamples: unknown[] }>();
        const toApply: Array<{ id: string; to: string }> = [];

        for (const row of rows as Array<{ id: string; tenantId: string; branchId: string; paymentMethodId: string | null }>) {
            const methodId = await resolveMethodId(row.tenantId, row.branchId, row.paymentMethodId!);

            if (!byTenant.has(row.tenantId)) {
                byTenant.set(row.tenantId, { resolved: 0, unresolved: 0, unresolvedSamples: [] });
            }
            const stats = byTenant.get(row.tenantId)!;

            if (methodId) {
                stats.resolved++;
                toApply.push({ id: row.id, to: methodId });
            } else {
                stats.unresolved++;
                if (stats.unresolvedSamples.length < 3) {
                    stats.unresolvedSamples.push({ id: row.id, branchId: row.branchId, literal: row.paymentMethodId });
                }
            }
        }

        console.log('\nPer-tenant summary:');
        for (const [tenantId, stats] of byTenant.entries()) {
            console.log(`  ${tenantId}: ${stats.resolved} resolvable, ${stats.unresolved} UNRESOLVABLE`);
            if (stats.unresolvedSamples.length > 0) {
                console.log(`    unresolved examples: ${JSON.stringify(stats.unresolvedSamples)}`);
            }
        }

        console.log(`\nApplying ${toApply.length} update(s) to ${table}...`);
        for (const change of toApply) {
            if (table === 'sales') {
                await prisma.sale.update({ where: { id: change.id }, data: { paymentMethodId: change.to } });
            } else {
                await prisma.salePayment.update({ where: { id: change.id }, data: { paymentMethodId: change.to } });
            }
        }
        console.log(`Done. ${toApply.length} row(s) updated in ${table}.`);
    }
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error backfilling sale payment method ids:', e);
        await disconnectPrisma();
        process.exit(1);
    });
