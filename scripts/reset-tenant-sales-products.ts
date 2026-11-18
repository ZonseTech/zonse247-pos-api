#!/usr/bin/env npx tsx
/**
 * Tenant Sales & Products Reset Script
 *
 * Wipes one tenant's sales, products, categories and everything that hangs off
 * them (inventory, stock movements, purchasing documents, product lines on
 * service orders) so the tenant can start fresh. Categories still used by a
 * service are kept, and each deleted category gets a DELETE change_log entry so
 * terminals drop it on their next delta pull. Users, branches, terminals,
 * customers, suppliers, payment methods, expenses, loyalty and settings are kept.
 *
 * Every statement is scoped by tenant_id (tables without one are scoped through
 * the tenant's products). Before deleting, the live database's foreign keys are
 * read and the script aborts if any other tenant's row references a row that
 * would be removed. All tenant rows are written to a JSON backup, deletes run
 * in one transaction, and the transaction is rolled back unless the tenant's
 * counts reach zero and every other tenant's counts are unchanged.
 *
 * Default is a dry run. Stop the tenant's terminals before executing: hard
 * deletes are not pushed to terminals, so their local databases must be reset.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/reset-tenant-sales-products.ts --tenant <tenantId>
 *   npx tsx scripts/reset-tenant-sales-products.ts --tenant <tenantId> --execute --confirm <tenantId>
 */

import fs from 'fs';
import path from 'path';
import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';

type Step = { table: string; where: string };

const TENANT_PRODUCTS = 'product_id IN (SELECT product_id FROM products WHERE tenant_id = ?)';
const CATEGORIES_NOT_USED_BY_SERVICES =
    'tenant_id = ? AND category_id NOT IN (SELECT category_id FROM services WHERE tenant_id = ? AND category_id IS NOT NULL)';

const STEPS: Step[] = [
    { table: 'mra_submissions', where: 'tenant_id = ?' },
    { table: 'sale_payments', where: 'tenant_id = ? AND sale_id IS NOT NULL' },
    { table: 'sale_items', where: 'tenant_id = ?' },
    { table: 'sales', where: 'tenant_id = ?' },
    { table: 'parked_sale_items', where: 'tenant_id = ?' },
    { table: 'parked_sales', where: 'tenant_id = ?' },
    { table: 'return_items', where: TENANT_PRODUCTS },
    { table: 'orders', where: TENANT_PRODUCTS },
    { table: 'service_consumptions', where: 'tenant_id = ?' },
    { table: 'service_order_product_items', where: 'tenant_id = ?' },
    { table: 'supplier_payment_allocations', where: 'tenant_id = ?' },
    { table: 'supplier_payments', where: 'tenant_id = ?' },
    { table: 'supplier_credit_notes', where: 'tenant_id = ?' },
    { table: 'supplier_return_items', where: 'tenant_id = ?' },
    { table: 'supplier_returns', where: 'tenant_id = ?' },
    { table: 'supplier_invoice_items', where: 'tenant_id = ?' },
    { table: 'supplier_invoices', where: 'tenant_id = ?' },
    { table: 'goods_receipt_items', where: 'tenant_id = ?' },
    { table: 'goods_receipts', where: 'tenant_id = ?' },
    { table: 'purchase_order_items', where: 'tenant_id = ?' },
    { table: 'purchase_orders', where: 'tenant_id = ?' },
    { table: 'purchase_requisition_items', where: 'tenant_id = ?' },
    { table: 'purchase_requisitions', where: 'tenant_id = ?' },
    { table: 'stock_movements', where: 'tenant_id = ?' },
    { table: 'inventory_cost_layers', where: 'tenant_id = ?' },
    { table: 'inventory', where: 'tenant_id = ?' },
    { table: 'variant_barcodes', where: 'tenant_id = ?' },
    { table: 'product_barcodes', where: TENANT_PRODUCTS },
    { table: 'product_variants', where: 'tenant_id = ?' },
    { table: 'products', where: 'tenant_id = ?' },
    { table: 'categories', where: CATEGORIES_NOT_USED_BY_SERVICES },
];

const UNCONSTRAINED_EDGES = [
    { child: 'sale_items', col: 'variant_id', parent: 'product_variants', refCol: 'variant_id' },
    { child: 'inventory', col: 'variant_id', parent: 'product_variants', refCol: 'variant_id' },
    { child: 'stock_movements', col: 'reference_id', parent: 'sales', refCol: 'sale_id' },
];

function parseArgs() {
    const args = process.argv.slice(2);
    const get = (flag: string) => {
        const i = args.indexOf(flag);
        return i >= 0 ? args[i + 1] : undefined;
    };
    return {
        tenantId: get('--tenant'),
        confirm: get('--confirm'),
        execute: args.includes('--execute'),
    };
}

const toJson = (rows: unknown) =>
    JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);

async function main() {
    const { tenantId, confirm, execute } = parseArgs();

    if (!tenantId || !tenantId.trim()) {
        throw new Error('--tenant <tenantId> is required');
    }
    if (execute && confirm !== tenantId) {
        throw new Error('--execute requires --confirm <tenantId> matching --tenant exactly');
    }

    setDatabaseReady();
    const prisma: any = await getPrisma();
    const q = async (sql: string, ...params: unknown[]) => prisma.$queryRawUnsafe(sql, ...params) as Promise<any[]>;

    const [{ db }] = await q('SELECT DATABASE() AS db');
    const [tenant] = await q('SELECT tenant_id, business_name FROM tenants WHERE tenant_id = ?', tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found in database ${db}`);

    console.log(`Database: ${db}`);
    console.log(`Tenant:   ${tenantId}${tenant.business_name ? `  (${tenant.business_name})` : ''}`);
    console.log(`Mode:     ${execute ? 'EXECUTE' : 'DRY RUN'}\n`);

    const existing = new Set(
        (await q(`SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`)).map((r) => r.t)
    );
    const steps = STEPS.filter((s) => existing.has(s.table)).map((s) =>
        s.table === 'categories' && !existing.has('services') ? { ...s, where: 'tenant_id = ?' } : s
    );
    const missing = STEPS.filter((s) => !existing.has(s.table)).map((s) => s.table);
    if (missing.length) console.log(`Not present in this database, skipped: ${missing.join(', ')}\n`);

    const purged = new Set(steps.map((s) => s.table));
    const tenantCols = new Set(
        (await q(`SELECT TABLE_NAME AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'tenant_id'`)).map(
            (r) => r.t
        )
    );

    const fkEdges: Array<{ child: string; col: string; parent: string; refCol: string; rule: string }> = await q(`
        SELECT k.TABLE_NAME AS child, k.COLUMN_NAME AS col, k.REFERENCED_TABLE_NAME AS parent,
               k.REFERENCED_COLUMN_NAME AS refCol, r.DELETE_RULE AS rule
        FROM information_schema.KEY_COLUMN_USAGE k
        JOIN information_schema.REFERENTIAL_CONSTRAINTS r
          ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL`);

    const edges = [
        ...fkEdges,
        ...UNCONSTRAINED_EDGES.filter((e) => existing.has(e.child) && existing.has(e.parent)).map((e) => ({ ...e, rule: 'NO FK' })),
    ].filter((e) => purged.has(e.parent) && tenantCols.has(e.parent) && tenantCols.has(e.child));

    console.log('Cross-tenant reference check:');
    const violations: string[] = [];
    for (const e of edges) {
        const [{ n }] = await q(
            `SELECT COUNT(*) AS n FROM \`${e.child}\` c JOIN \`${e.parent}\` p ON c.\`${e.col}\` = p.\`${e.refCol}\`
             WHERE p.tenant_id = ? AND c.tenant_id <> ?`,
            tenantId,
            tenantId
        );
        if (Number(n) > 0) violations.push(`  ${e.child}.${e.col} -> ${e.parent}.${e.refCol} (${e.rule}): ${n} row(s) from other tenants`);
    }
    if (violations.length) {
        violations.forEach((v) => console.log(v));
        throw new Error('Other tenants reference this tenant\'s rows. Aborting without changes.');
    }
    console.log(`  OK - ${edges.length} relationship(s) checked, no other tenant references these rows\n`);

    const paramsFor = (s: Step) => Array(s.where.split('?').length - 1).fill(tenantId);
    const countTenant = async (runner: typeof q, s: Step) =>
        Number((await runner(`SELECT COUNT(*) AS n FROM \`${s.table}\` WHERE ${s.where}`, ...paramsFor(s)))[0].n);
    const countAll = async (runner: typeof q, s: Step) => Number((await runner(`SELECT COUNT(*) AS n FROM \`${s.table}\``))[0].n);

    const before: Record<string, { tenant: number; others: number }> = {};
    let total = 0;
    console.log('Rows to delete:');
    for (const s of steps) {
        const tenantCount = await countTenant(q, s);
        const all = await countAll(q, s);
        before[s.table] = { tenant: tenantCount, others: all - tenantCount };
        total += tenantCount;
        if (tenantCount > 0) console.log(`  ${s.table.padEnd(30)} ${tenantCount}`);
    }
    console.log(`  ${'TOTAL'.padEnd(30)} ${total}\n`);

    if (existing.has('categories') && existing.has('services')) {
        const [{ n }] = await q(
            'SELECT COUNT(DISTINCT category_id) AS n FROM services WHERE tenant_id = ? AND category_id IS NOT NULL',
            tenantId
        );
        if (Number(n) > 0) console.log(`Keeping ${n} categor${Number(n) === 1 ? 'y' : 'ies'} still used by services.\n`);
    }

    if (!execute) {
        console.log('Dry run only. Re-run with --execute --confirm <tenantId> to delete.');
        return;
    }
    if (total === 0) {
        console.log('Nothing to delete.');
        return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'storage', 'backups', 'tenant-reset', `${tenantId}-${stamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    await prisma.$transaction(
        async (tx: any) => {
            const tq = async (sql: string, ...params: unknown[]) => tx.$queryRawUnsafe(sql, ...params) as Promise<any[]>;

            console.log(`Backing up to ${backupDir}`);
            for (const s of steps) {
                const rows = await tq(`SELECT * FROM \`${s.table}\` WHERE ${s.where}`, ...paramsFor(s));
                if (rows.length) fs.writeFileSync(path.join(backupDir, `${s.table}.json`), toJson(rows));
            }

            console.log('Deleting:');
            for (const s of steps) {
                if (s.table === 'categories' && existing.has('change_log')) {
                    await tx.$executeRawUnsafe(
                        `INSERT INTO change_log (table_name, record_id, operation, tenant_id, branch_id, version)
                         SELECT 'categories', category_id, 'DELETE', tenant_id, branch_id, COALESCE(version, 0) + 1
                         FROM categories WHERE ${s.where}`,
                        ...paramsFor(s)
                    );
                }
                const n = await tx.$executeRawUnsafe(`DELETE FROM \`${s.table}\` WHERE ${s.where}`, ...paramsFor(s));
                if (n > 0) console.log(`  ${s.table.padEnd(30)} ${n}`);
            }

            const problems: string[] = [];
            for (const s of steps) {
                const left = await countTenant(tq, s);
                const others = (await countAll(tq, s)) - left;
                if (left !== 0) problems.push(`${s.table}: ${left} tenant row(s) remain`);
                if (others !== before[s.table].others)
                    problems.push(`${s.table}: other tenants ${before[s.table].others} -> ${others}`);
            }
            if (problems.length) {
                problems.forEach((p) => console.log(`  ✗ ${p}`));
                throw new Error('Verification failed. Transaction rolled back, nothing was deleted.');
            }

            if (existing.has('terminal_sync_state')) {
                await tx.$executeRawUnsafe(
                    'UPDATE terminal_sync_state SET last_pulled_at = NULL, last_pushed_at = NULL, last_sequence = NULL WHERE tenant_id = ?',
                    tenantId
                );
            }
        },
        { maxWait: 10_000, timeout: 10 * 60_000 }
    );

    console.log('\n✅ Verified: tenant rows removed, other tenants unchanged. Committed.');
    console.log(`Backup: ${backupDir}`);
    console.log('Next: reset local data on this tenant\'s terminals before they sync again.');
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('\n❌', e instanceof Error ? e.message : e);
        await disconnectPrisma();
        process.exit(1);
    });
