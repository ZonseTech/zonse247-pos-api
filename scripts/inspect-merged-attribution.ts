#!/usr/bin/env npx ts-node
/**
 * Inspect the user/owner attribution of the previously-merged sales.
 *
 * Looks at sales whose `notes` contain "[MERGED]" and groups them by
 * tenantId, branchId, terminalId, userId — and shows what role/email
 * the user has, plus who the tenant owner is, so we can tell whether
 * the merged data is attributed to the tenant owner.
 */

import prisma from '../src/databases/prisma/client';

async function main() {
    const merged = await prisma.sale.findMany({
        where: { notes: { contains: '[MERGED]' } },
        select: {
            id: true, tenantId: true, branchId: true,
            terminalId: true, userId: true,
        },
    });

    console.log(`\nMerged sales found: ${merged.length}\n`);
    if (merged.length === 0) return;

    // Group by (tenant, branch, terminal, user)
    const groupKey = (s: any) => `${s.tenantId}|${s.branchId}|${s.terminalId ?? '∅'}|${s.userId}`;
    const groups = new Map<string, number>();
    for (const s of merged) groups.set(groupKey(s), (groups.get(groupKey(s)) ?? 0) + 1);

    const tenantIds = [...new Set(merged.map((s) => s.tenantId))];
    const branchIds = [...new Set(merged.map((s) => s.branchId))];
    const userIds   = [...new Set(merged.map((s) => s.userId))];
    const termIds   = [...new Set(merged.map((s) => s.terminalId).filter((x): x is string => !!x))];

    const [tenants, branches, users, terminals] = await Promise.all([
        prisma.tenant.findMany({
            where: { tenantId: { in: tenantIds } },
            select: { tenantId: true, businessName: true, ownerName: true, email: true },
        }),
        prisma.branch.findMany({
            where: { branchId: { in: branchIds } },
            select: { branchId: true, branchName: true, tenantId: true },
        }),
        prisma.user.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, fullname: true, email: true, username: true, tenantId: true },
        }),
        prisma.terminal.findMany({
            where: { terminalId: { in: termIds } },
            select: { terminalId: true, terminalLabel: true, branchId: true },
        }),
    ]);

    const tenantById = new Map<string, any>(tenants.map((t: any) => [t.tenantId, t]));
    const branchById = new Map<string, any>(branches.map((b: any) => [b.branchId, b]));
    const userById   = new Map<string, any>(users.map((u: any) => [u.userId, u]));
    const termById   = new Map<string, any>(terminals.map((t: any) => [t.terminalId, t]));

    // Tenant owner info (Tenant has ownerName, not ownerId)
    for (const t of tenants as any[]) {
        console.log(`Tenant: ${t.businessName} (${t.tenantId})`);
        console.log(`  ownerName : ${t.ownerName ?? '(none)'}`);
        console.log(`  email     : ${t.email ?? '(none)'}`);
    }

    console.log('\nGroups (tenant/branch/terminal/user => count):\n');
    const sortedGroups = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    for (const [k, count] of sortedGroups) {
        const [tid, bid, term, uid] = k.split('|');
        const t = tenantById.get(tid);
        const b = branchById.get(bid);
        const u = userById.get(uid);
        const term_ = term === '∅' ? null : termById.get(term);
        console.log(`  count=${String(count).padStart(4)}`);
        console.log(`    tenant   = ${t?.businessName ?? tid}`);
        console.log(`    branch   = ${b?.branchName ?? bid}`);
        console.log(`    terminal = ${term_?.terminalLabel ?? term}`);
        console.log(`    userId   = ${uid}`);
        console.log(`    user     = ${u ? `${u.fullname} <${u.email}>` : '(unknown)'}`);
        console.log('');
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { try { await prisma.$disconnect(); } catch {} });
