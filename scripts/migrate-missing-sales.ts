#!/usr/bin/env npx ts-node
/**
 * Migrate Missing Sales Script (local.db SQLite → MySQL)
 *
 * Finds every sale present in local.db whose `sale_id` is NOT on the
 * MySQL server and inserts it (with items, payments, and stock movements)
 * preserving original IDs.
 *
 * Differences vs merge-orphan-sales.ts:
 *   • merge-orphan-sales: only handles sales that have orphan stock_movements
 *     on the server (i.e. partial sync).
 *   • migrate-missing-sales (THIS): handles ALL sales in local.db that
 *     are missing on the server, regardless of whether stock_movements
 *     have already arrived.
 *
 * For each missing sale this script will (in a single transaction):
 *   1. Insert the sales row (preserving sale_id)
 *   2. Insert sale_items (preserving sale_item_id)
 *   3. Insert sale_payments (preserving sale_payment_id)
 *   4. Insert/skip stock_movements for the sale's items so inventory
 *      decrements correctly. Skipped if a SALE-typed movement already
 *      exists for (inventory, sale).
 *
 * Foreign-key safety:
 *   IDs in local.db (variant, customer, user, payment_method, terminal,
 *   tenant, branch) come from the same global ID space as the server, so
 *   they are reused as-is. Any referenced row that doesn't exist on the
 *   server is replaced with NULL where allowed; sales with hard-required
 *   missing FKs (user_id, items with missing variants) are skipped with
 *   a clear error.
 *
 * Usage:
 *   npx ts-node scripts/migrate-missing-sales.ts --db=local.db [--dry-run]
 *   npx ts-node scripts/migrate-missing-sales.ts --db=local.db --tenant=<id>
 *   npx ts-node scripts/migrate-missing-sales.ts --db=local.db --branch=<id>
 *   npx ts-node scripts/migrate-missing-sales.ts --db=local.db --since=2026-04-01
 *   npx ts-node scripts/migrate-missing-sales.ts --db=local.db --no-movements
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

import prisma from '../src/databases/prisma/client';

// ──────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (k: string) => {
    const a = args.find((x) => x.startsWith(`--${k}=`));
    return a ? a.split('=').slice(1).join('=') : null;
};
const flag = (k: string) => args.includes(`--${k}`);

const dbPath = arg('db') || 'local.db';
const tenantFilter = arg('tenant');
const branchFilter = arg('branch');
const since = arg('since'); // applies to sale_date
const isDryRun = flag('dry-run');
const skipMovements = flag('no-movements');

// ──────────────────────────────────────────────────────────────────
// Console helpers
// ──────────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};
const log = {
    info: (m: string) => console.log(`${C.blue}ℹ${C.reset} ${m}`),
    ok: (m: string) => console.log(`${C.green}✓${C.reset} ${m}`),
    warn: (m: string) => console.log(`${C.yellow}⚠${C.reset} ${m}`),
    err: (m: string) => console.log(`${C.red}✗${C.reset} ${m}`),
    head: (m: string) => console.log(`\n${C.bright}${C.cyan}${m}${C.reset}\n`),
    step: (m: string) => console.log(`  ${C.magenta}→${C.reset} ${m}`),
    dim: (m: string) => console.log(`  ${C.dim}${m}${C.reset}`),
};

function boolVal(v: any, fb: boolean): boolean {
    if (v === null || v === undefined) return fb;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
    return fb;
}

function chunk<T>(a: T[], n: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
    return out;
}

// ──────────────────────────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────────────────────────
const stats = {
    localSales: 0,
    alreadyOnServer: 0,
    toInsert: 0,
    sales: { created: 0, skipped: 0, failed: 0 },
    saleItems: { created: 0, skipped: 0, failed: 0 },
    salePayments: { created: 0, skipped: 0, failed: 0 },
    stockMovements: { created: 0, skipped: 0, failed: 0 },
    errors: [] as string[],
};

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
    log.head('═══════════════════════════════════════════════════════════');
    log.head('   MIGRATE MISSING SALES  (local.db SQLite → MySQL)');
    log.head('═══════════════════════════════════════════════════════════');

    if (!fs.existsSync(dbPath)) { log.err(`SQLite file not found: ${dbPath}`); process.exit(1); }
    log.info(`SQLite DB:        ${path.resolve(dbPath)}`);
    if (tenantFilter) log.info(`Tenant filter:    ${tenantFilter}`);
    if (branchFilter) log.info(`Branch filter:    ${branchFilter}`);
    if (since)        log.info(`Since (saleDate): ${since}`);
    if (skipMovements) log.warn('Stock movements will be skipped (--no-movements)');
    if (isDryRun)     log.warn('DRY RUN — nothing will be written');

    // ── 1. Read all candidate sales from SQLite ───────────────
    log.head('Step 1: Reading candidate sales from local.db…');
    const sqlite = new Database(dbPath, { readonly: true });

    const tableNames = new Set(
        (sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[])
            .map((t: any) => t.name)
    );
    for (const t of ['sales', 'sale_items', 'sale_payments']) {
        if (!tableNames.has(t)) {
            log.err(`Required table "${t}" missing in ${dbPath}`);
            sqlite.close(); process.exit(1);
        }
    }

    const filters: string[] = [];
    const params: any[] = [];
    if (tenantFilter) { filters.push('tenant_id = ?'); params.push(tenantFilter); }
    if (branchFilter) { filters.push('branch_id = ?'); params.push(branchFilter); }
    if (since)        { filters.push('sale_date >= ?'); params.push(since); }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const localSales: any[] = sqlite
        .prepare(`SELECT * FROM sales ${whereClause} ORDER BY sale_date ASC`)
        .all(...params) as any[];

    stats.localSales = localSales.length;
    log.ok(`Sales in local.db (after filters): ${localSales.length}`);

    if (localSales.length === 0) {
        log.warn('Nothing to migrate.');
        sqlite.close();
        process.exit(0);
    }

    // ── 2. Identify which sales are missing on server ─────────
    log.head('Step 2: Comparing against MySQL…');
    const localIds = localSales.map((s) => s.sale_id);

    const presentIds = new Set<string>();
    for (const batch of chunk(localIds, 500)) {
        const found = await prisma.sale.findMany({
            where: { id: { in: batch } },
            select: { id: true },
        });
        for (const r of found) presentIds.add(r.id);
    }

    const missingSales = localSales.filter((s) => !presentIds.has(s.sale_id));
    stats.alreadyOnServer = presentIds.size;
    stats.toInsert = missingSales.length;

    log.info(`Already on server : ${presentIds.size}`);
    log.info(`Missing on server : ${missingSales.length}`);

    if (missingSales.length === 0) {
        log.ok('Server is already up to date — nothing to migrate.');
        sqlite.close();
        process.exit(0);
    }

    // ── 3. Pre-fetch related rows from local.db ───────────────
    const missingIds = missingSales.map((s) => s.sale_id);

    const itemsBySale = new Map<string, any[]>();
    const paysBySale = new Map<string, any[]>();
    for (const batch of chunk(missingIds, 500)) {
        const placeholders = batch.map(() => '?').join(',');
        const items = sqlite
            .prepare(`SELECT * FROM sale_items WHERE sale_id IN (${placeholders})`)
            .all(...batch) as any[];
        const pays = sqlite
            .prepare(`SELECT * FROM sale_payments WHERE sale_id IN (${placeholders})`)
            .all(...batch) as any[];
        for (const it of items) {
            const list = itemsBySale.get(it.sale_id) || [];
            list.push(it); itemsBySale.set(it.sale_id, list);
        }
        for (const p of pays) {
            const list = paysBySale.get(p.sale_id) || [];
            list.push(p); paysBySale.set(p.sale_id, list);
        }
    }

    sqlite.close();

    if (isDryRun) {
        log.head('DRY RUN summary:');
        for (const s of missingSales.slice(0, 15)) {
            log.dim(`  sale=${s.sale_id} number=${s.sale_number} ` +
                `items=${(itemsBySale.get(s.sale_id) || []).length} ` +
                `pays=${(paysBySale.get(s.sale_id) || []).length} ` +
                `total=${s.total_amount}`);
        }
        if (missingSales.length > 15) log.dim(`  … and ${missingSales.length - 15} more`);
        log.warn('Run again without --dry-run to apply.');
        process.exit(0);
    }

    // ── 4. Validate FKs on the server ─────────────────────────
    log.head('Step 4: Validating foreign keys on server…');
    const variantIds = new Set<string>();
    const customerIds = new Set<string>();
    const userIds = new Set<string>();
    const pmIds = new Set<string>();
    const terminalIds = new Set<string>();

    for (const s of missingSales) {
        if (s.user_id) userIds.add(s.user_id);
        if (s.customer_id) customerIds.add(s.customer_id);
        if (s.payment_method_id) pmIds.add(s.payment_method_id);
        if (s.terminal_id) terminalIds.add(s.terminal_id);
        if (s.voided_by) userIds.add(s.voided_by);
        for (const it of itemsBySale.get(s.sale_id) || []) {
            if (it.variant_id) variantIds.add(it.variant_id);
        }
        for (const p of paysBySale.get(s.sale_id) || []) {
            if (p.payment_method_id) pmIds.add(p.payment_method_id);
        }
    }

    const [variantRows, customerRows, userRows, pmRows, terminalRows] = await Promise.all([
        prisma.productVariant.findMany({
            where: { id: { in: [...variantIds] } },
            select: { id: true, productId: true },
        }),
        prisma.customer.findMany({
            where: { customerId: { in: [...customerIds] } },
            select: { customerId: true },
        }),
        prisma.user.findMany({
            where: { userId: { in: [...userIds] } },
            select: { userId: true },
        }),
        prisma.paymentMethod.findMany({
            where: { methodId: { in: [...pmIds] } },
            select: { methodId: true },
        }),
        prisma.terminal.findMany({
            where: { terminalId: { in: [...terminalIds] } },
            select: { terminalId: true },
        }),
    ]);

    const validVariants = new Map<string, string>(variantRows.map((v: any) => [v.id, v.productId]));
    const validCustomers = new Set<string>(customerRows.map((c: any) => c.customerId));
    const validUsers = new Set<string>(userRows.map((u: any) => u.userId));
    const validPMs = new Set<string>(pmRows.map((p: any) => p.methodId));
    const validTerminals = new Set<string>(terminalRows.map((t: any) => t.terminalId));

    log.info(`Variants present  : ${validVariants.size} / ${variantIds.size}`);
    log.info(`Customers present : ${validCustomers.size} / ${customerIds.size}`);
    log.info(`Users present     : ${validUsers.size} / ${userIds.size}`);
    log.info(`Payment methods   : ${validPMs.size} / ${pmIds.size}`);
    log.info(`Terminals present : ${validTerminals.size} / ${terminalIds.size}`);

    // ── 5. Pre-build variant → inventoryId map per (branch, variant) ──
    let variantToInv = new Map<string, string>();
    if (!skipMovements) {
        const branchIds = [...new Set(missingSales.map((s) => s.branch_id).filter(Boolean))];
        const inventories = await prisma.inventory.findMany({
            where: { branchId: { in: branchIds }, variantId: { in: [...variantIds] } },
            select: { id: true, branchId: true, variantId: true },
        });
        for (const inv of inventories as any[]) {
            if (inv.variantId) variantToInv.set(`${inv.branchId}|${inv.variantId}`, inv.id);
        }
        log.info(`Inventory rows    : ${variantToInv.size} (for movement creation)`);
    }

    // ── 6. Insert missing sales ───────────────────────────────
    log.head('Step 6: Inserting missing sales into MySQL…');
    let processed = 0;
    for (const sale of missingSales) {
        processed++;
        const sid: string = sale.sale_id;
        try {
            // Final safety: still missing?
            const exists = await prisma.sale.findUnique({ where: { id: sid } });
            if (exists) { stats.sales.skipped++; continue; }

            if (!validUsers.has(sale.user_id)) {
                throw new Error(`user_id ${sale.user_id} not on server`);
            }

            const customerId = sale.customer_id && validCustomers.has(sale.customer_id)
                ? sale.customer_id : null;
            const paymentMethodId = sale.payment_method_id && validPMs.has(sale.payment_method_id)
                ? sale.payment_method_id : null;
            const terminalId = sale.terminal_id && validTerminals.has(sale.terminal_id)
                ? sale.terminal_id : null;
            const voidedBy = sale.voided_by && validUsers.has(sale.voided_by)
                ? sale.voided_by : null;

            const items = itemsBySale.get(sid) || [];
            const payments = paysBySale.get(sid) || [];
            const validItems = items.filter((it) => validVariants.has(it.variant_id));
            const dropped = items.length - validItems.length;
            if (dropped > 0) {
                stats.errors.push(
                    `sale ${sid}: ${dropped} item(s) skipped (variant missing on server)`
                );
            }

            await prisma.$transaction(async (tx: any) => {
                // 6a. Sale
                await tx.sale.create({
                    data: {
                        id: sid,
                        tenantId: sale.tenant_id,
                        branchId: sale.branch_id,
                        saleNumber: sale.sale_number,
                        customerId,
                        terminalId,
                        userId: sale.user_id,
                        subtotal: sale.subtotal ?? 0,
                        taxAmount: sale.tax_amount ?? 0,
                        discountAmount: sale.discount_amount ?? 0,
                        otherCharges: sale.other_charges ?? 0,
                        totalAmount: sale.total_amount ?? 0,
                        amountPaid: sale.amount_paid ?? sale.total_amount ?? 0,
                        changeAmount: sale.change_amount ?? 0,
                        paymentMethodId,
                        status: sale.status || 'COMPLETED',
                        saleDate: sale.sale_date ? new Date(sale.sale_date) : new Date(),
                        notes: sale.notes
                            ? `[OFFLINE-MIGRATED] ${sale.notes}`
                            : `[OFFLINE-MIGRATED] From local.db`,
                        isVoided: boolVal(sale.is_voided, false),
                        voidedAt: sale.voided_at ? new Date(sale.voided_at) : null,
                        voidedBy,
                        voidReason: sale.void_reason || null,
                        createdAt: sale.created_at ? new Date(sale.created_at) : new Date(),
                        updatedAt: sale.updated_at ? new Date(sale.updated_at) : new Date(),
                    },
                });

                // 6b. Items
                for (const it of validItems) {
                    const productId = validVariants.get(it.variant_id) || it.product_id;
                    try {
                        await tx.saleItem.create({
                            data: {
                                id: it.sale_item_id || uuidv4(),
                                tenantId: it.tenant_id || sale.tenant_id,
                                branchId: it.branch_id || sale.branch_id,
                                saleId: sid,
                                productId,
                                variantId: it.variant_id,
                                terminalId: it.terminal_id && validTerminals.has(it.terminal_id)
                                    ? it.terminal_id : null,
                                quantity: it.quantity ?? 1,
                                unitPrice: it.unit_price ?? 0,
                                unitCost: it.unit_cost ?? 0,
                                subtotal: it.subtotal
                                    ?? ((it.quantity ?? 1) * (it.unit_price ?? 0)),
                                taxAmount: it.tax_amount ?? 0,
                                discountAmount: it.discount_amount ?? 0,
                                totalAmount: it.total_amount
                                    ?? it.subtotal
                                    ?? ((it.quantity ?? 1) * (it.unit_price ?? 0)),
                                createdAt: it.created_at ? new Date(it.created_at) : new Date(),
                                updatedAt: it.updated_at ? new Date(it.updated_at) : new Date(),
                            },
                        });
                        stats.saleItems.created++;
                    } catch (e: any) {
                        stats.saleItems.failed++;
                        stats.errors.push(`sale_item sale=${sid} variant=${it.variant_id}: ${e.message}`);
                    }
                }

                // 6c. Payments
                if (payments.length > 0) {
                    for (const p of payments) {
                        if (!validPMs.has(p.payment_method_id)) {
                            stats.salePayments.failed++;
                            stats.errors.push(
                                `sale_payment sale=${sid}: pm ${p.payment_method_id} missing on server`
                            );
                            continue;
                        }
                        try {
                            await tx.salePayment.create({
                                data: {
                                    id: p.sale_payment_id || uuidv4(),
                                    tenantId: p.tenant_id || sale.tenant_id,
                                    branchId: p.branch_id || sale.branch_id,
                                    saleId: sid,
                                    paymentMethodId: p.payment_method_id,
                                    terminalId: p.terminal_id && validTerminals.has(p.terminal_id)
                                        ? p.terminal_id : null,
                                    amount: p.amount ?? 0,
                                    reference: p.reference || null,
                                    providerId: p.provider_id || null,
                                    providerRef: p.provider_ref || null,
                                    status: p.status || 'COMPLETED',
                                    processedAt: p.processed_at ? new Date(p.processed_at) : new Date(),
                                    notes: p.notes || null,
                                    createdAt: p.created_at ? new Date(p.created_at) : new Date(),
                                    updatedAt: p.updated_at ? new Date(p.updated_at) : new Date(),
                                },
                            });
                            stats.salePayments.created++;
                        } catch (e: any) {
                            stats.salePayments.failed++;
                            stats.errors.push(`sale_payment sale=${sid}: ${e.message}`);
                        }
                    }
                } else if (paymentMethodId) {
                    // Auto-create one payment from the sale header
                    await tx.salePayment.create({
                        data: {
                            id: uuidv4(),
                            tenantId: sale.tenant_id,
                            branchId: sale.branch_id,
                            saleId: sid,
                            paymentMethodId,
                            amount: sale.amount_paid ?? sale.total_amount ?? 0,
                            status: 'COMPLETED',
                            processedAt: sale.sale_date ? new Date(sale.sale_date) : new Date(),
                            notes: '[OFFLINE-MIGRATED] Auto-generated from sale header',
                        },
                    });
                    stats.salePayments.created++;
                }
            });

            stats.sales.created++;

            // 6d. Stock movements (outside the sale transaction so a single
            //     bad inventory row doesn't roll back the whole sale)
            if (!skipMovements) {
                const status = sale.status || 'COMPLETED';
                const voided = boolVal(sale.is_voided, false);
                if (status !== 'VOIDED' && !voided) {
                    for (const it of validItems) {
                        try {
                            const invId = variantToInv.get(`${sale.branch_id}|${it.variant_id}`);
                            if (!invId) {
                                stats.stockMovements.failed++;
                                stats.errors.push(
                                    `stock_movement sale=${sid}: no inventory for variant ${it.variant_id} in branch ${sale.branch_id}`
                                );
                                continue;
                            }
                            // Skip if already exists
                            const existingMv = await prisma.stockMovement.findFirst({
                                where: {
                                    inventoryId: invId,
                                    referenceId: sid,
                                    referenceType: 'SALE',
                                    movementType: 'SALE',
                                    deletedAt: null,
                                },
                                select: { id: true },
                            });
                            if (existingMv) {
                                stats.stockMovements.skipped++;
                                continue;
                            }
                            await prisma.stockMovement.create({
                                data: {
                                    id: uuidv4(),
                                    tenantId: sale.tenant_id,
                                    branchId: sale.branch_id,
                                    inventoryId: invId,
                                    movementType: 'SALE',
                                    quantity: it.quantity ?? 1,
                                    previousQuantity: 0,
                                    newQuantity: 0,
                                    referenceType: 'SALE',
                                    referenceId: sid,
                                    unitCost: it.unit_cost ?? 0,
                                    totalCost: (it.unit_cost ?? 0) * (it.quantity ?? 1),
                                    notes: `[OFFLINE-MIGRATED] sale ${sale.sale_number || sid}`,
                                    movedBy: sale.user_id,
                                    movementDate: sale.sale_date ? new Date(sale.sale_date) : new Date(),
                                },
                            });
                            stats.stockMovements.created++;
                        } catch (e: any) {
                            stats.stockMovements.failed++;
                            stats.errors.push(`stock_movement sale=${sid} variant=${it.variant_id}: ${e.message}`);
                        }
                    }
                }
            }

            if (processed % 25 === 0 || processed === missingSales.length) {
                process.stdout.write(`\r  Sales processed: ${processed}/${missingSales.length}`);
            }
        } catch (err: any) {
            stats.sales.failed++;
            stats.errors.push(`sale ${sid} (${sale.sale_number}): ${err.message}`);
        }
    }
    console.log('');

    // ── 7. Summary ────────────────────────────────────────────
    log.head('═══════════════════════════════════════════════════════════');
    log.head('                  MIGRATION COMPLETE');
    log.head('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  Local sales scanned       : ${stats.localSales}`);
    console.log(`  Already on server         : ${stats.alreadyOnServer}`);
    console.log(`  Missing → to insert       : ${stats.toInsert}`);
    console.log('');
    console.log(`  ${C.green}Sales created${C.reset}            : ${stats.sales.created}`);
    console.log(`  ${C.yellow}Sales already present${C.reset}    : ${stats.sales.skipped}`);
    console.log(`  ${C.red}Sales failed${C.reset}             : ${stats.sales.failed}`);
    console.log(`  ${C.green}Sale items created${C.reset}       : ${stats.saleItems.created}`);
    console.log(`  ${C.red}Sale items failed${C.reset}        : ${stats.saleItems.failed}`);
    console.log(`  ${C.green}Sale payments created${C.reset}    : ${stats.salePayments.created}`);
    console.log(`  ${C.red}Sale payments failed${C.reset}     : ${stats.salePayments.failed}`);
    if (!skipMovements) {
        console.log(`  ${C.green}Stock movements created${C.reset}  : ${stats.stockMovements.created}`);
        console.log(`  ${C.yellow}Stock movements skipped${C.reset}  : ${stats.stockMovements.skipped}`);
        console.log(`  ${C.red}Stock movements failed${C.reset}   : ${stats.stockMovements.failed}`);
    }
    console.log('');

    if (stats.errors.length) {
        log.head('Errors / warnings:');
        for (const e of stats.errors.slice(0, 30)) log.err(e);
        if (stats.errors.length > 30) log.warn(`… and ${stats.errors.length - 30} more`);
    } else {
        log.ok('No errors!');
    }

    process.exit(stats.sales.failed > 0 ? 1 : 0);
}

main()
    .catch((err) => {
        log.err(`Unhandled error: ${err.message}`);
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        try { await (prisma as any).$disconnect?.(); } catch { /* ignore */ }
    });
