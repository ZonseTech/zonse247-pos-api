#!/usr/bin/env npx ts-node
/**
 * Find Orphan Sales Script
 *
 * Identifies stock movements (and other sale-derived records) on the server
 * whose parent sale is missing — typically caused by a partial sync where
 * stock_movements were accepted but sales/sale_items/sale_payments were
 * rejected by the Prisma client.
 *
 * Usage:
 *   npx ts-node scripts/find-orphan-sales.ts
 *   npx ts-node scripts/find-orphan-sales.ts --tenant=<tenantId>
 *   npx ts-node scripts/find-orphan-sales.ts --tenant=<tenantId> --branch=<branchId>
 *   npx ts-node scripts/find-orphan-sales.ts --since=2026-05-01
 */

import prisma from '../src/databases/prisma/client';

const args = process.argv.slice(2);
const arg = (key: string): string | null => {
    const a = args.find((x) => x.startsWith(`--${key}=`));
    return a ? a.split('=')[1] : null;
};

const tenantId = arg('tenant');
const branchId = arg('branch');
const since = arg('since'); // ISO date

async function main() {
    console.log('🔍 Scanning for orphan stock movements (SALE reference with missing parent sale)\n');

    const where: any = { referenceType: 'SALE' };
    if (tenantId) where.tenantId = tenantId;
    if (branchId) where.branchId = branchId;
    if (since) where.createdAt = { gte: new Date(since) };

    const movements: Array<{
        id: string;
        referenceId: string | null;
        tenantId: string;
        branchId: string;
        terminalId: string | null;
        createdAt: Date;
    }> = await (prisma as any).stockMovement.findMany({
        where,
        select: {
            id: true,
            referenceId: true,
            tenantId: true,
            branchId: true,
            terminalId: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    const saleIds = [
        ...new Set(movements.map((m) => m.referenceId).filter((x): x is string => !!x)),
    ];

    if (saleIds.length === 0) {
        console.log('✓ No SALE-typed stock movements found in the requested scope.');
        return;
    }

    const existingSales: Array<{ id: string }> = await (prisma as any).sale.findMany({
        where: { id: { in: saleIds } },
        select: { id: true },
    });
    const existingIds = new Set(existingSales.map((s) => s.id));

    const orphanSaleIds = saleIds.filter((id) => !existingIds.has(id));
    const orphanMovements = movements.filter(
        (m) => m.referenceId && !existingIds.has(m.referenceId)
    );

    console.log(`Total SALE stock movements scanned : ${movements.length}`);
    console.log(`Distinct sale_id references         : ${saleIds.length}`);
    console.log(`Sales present on server             : ${existingIds.size}`);
    console.log(`Orphan sale_ids (missing parent)    : ${orphanSaleIds.length}`);
    console.log(`Orphan stock_movement rows          : ${orphanMovements.length}\n`);

    if (orphanSaleIds.length === 0) {
        console.log('✓ No orphans found.');
        return;
    }

    // Group by terminal for actionable summary
    const byTerminal = new Map<string, Set<string>>();
    for (const m of orphanMovements) {
        const t = m.terminalId ?? '(unknown)';
        if (!byTerminal.has(t)) byTerminal.set(t, new Set());
        byTerminal.get(t)!.add(m.referenceId!);
    }

    console.log('Orphan sales grouped by terminal:');
    for (const [t, ids] of byTerminal.entries()) {
        console.log(`  terminal=${t}  saleCount=${ids.size}`);
    }

    console.log('\nFirst 20 orphan sale_ids:');
    for (const id of orphanSaleIds.slice(0, 20)) {
        console.log(`  ${id}`);
    }

    if (orphanSaleIds.length > 20) {
        console.log(`  ... and ${orphanSaleIds.length - 20} more`);
    }

    // Date range
    const dates = orphanMovements.map((m) => m.createdAt).sort((a, b) => +a - +b);
    if (dates.length) {
        console.log(`\nOrphan date range: ${dates[0].toISOString()} → ${dates[dates.length - 1].toISOString()}`);
    }
}

main()
    .catch((err) => {
        console.error('❌ Error:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        try { await (prisma as any).$disconnect?.(); } catch { /* ignore */ }
    });
