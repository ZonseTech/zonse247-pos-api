#!/usr/bin/env npx tsx
/**
 * Restore a terminal's unsynced data from its SQLite backup into MySQL.
 *
 * Reads a terminal database backup (.db or .db.gz, as stored under
 * BACKUP_STORAGE_PATH) and copies into the server database every sale,
 * sale item, sale payment and stock movement of that terminal that the
 * server does not have yet, preserving the original IDs and every column
 * the server table shares with the terminal table.
 *
 * Guarantees:
 *   • A sale is restored together with all of its items and payments, or
 *     not at all: if any row fails, the rows already inserted for that sale
 *     are deleted again. No half-saved sales.
 *   • Rows already on the server (same primary key) are never touched,
 *     except the status fields of sales the terminal changed later
 *     (refunds / voids), see --no-status-updates.
 *   • Inventory is adjusted by the net quantity of the restored stock
 *     movements, exactly as live sync does.
 *   • Everything runs in ONE transaction. Without --apply the transaction
 *     is rolled back at the end, so a dry run exercises every database
 *     constraint but leaves nothing behind.
 *
 * Sale-number clashes:
 *   The server enforces a unique (tenant, branch, sale_number). When
 *   another terminal of the same branch already used a number, the sale
 *   is restored as <number><suffix> if --renumber-suffix is given, with
 *   the original number recorded in its notes. Without the flag such
 *   sales are reported and skipped.
 *
 * Usage:
 *   npx tsx scripts/restore-terminal-backup.ts \
 *       --db=path/to/2026-11-06T14-03-17-763Z.db.gz \
 *       --terminal=<terminalId> \
 *       [--renumber-suffix=-B] [--report=restore-report.json] [--apply]
 *
 * Options:
 *   --db=PATH               (required) Terminal backup, .db or .db.gz
 *   --terminal=ID           (required) Terminal whose data is restored
 *   --renumber-suffix=TEXT  Suffix for sale numbers that clash on the server
 *   --no-status-updates     Do not update status/void fields of existing sales
 *   --no-inventory          Restore movements without adjusting inventory
 *   --report=PATH           Write a JSON report of everything done
 *   --apply                 Commit. Without it the run is a dry run.
 *
 * The target database is the one in DATABASE_URL (.env).
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';

// ──────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (k: string) => {
    const a = args.find((x) => x.startsWith(`--${k}=`));
    return a ? a.split('=').slice(1).join('=') : null;
};
const flag = (k: string) => args.includes(`--${k}`);

const dbArg = arg('db');
const terminalId = arg('terminal');
const renumberSuffix = arg('renumber-suffix');
const reportPath = arg('report');
const apply = flag('apply');
const statusUpdates = !flag('no-status-updates');
const adjustInventory = !flag('no-inventory');

// Kept in step with StockMovementService.INCREASE_TYPES
const INCREASE_TYPES = new Set(['PURCHASE_RECEIPT', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'OPENING_BALANCE']);
const SALE_STATUS_COLUMNS = ['status', 'notes', 'is_voided', 'voided_at', 'voided_by', 'void_reason', 'deleted_at'];

// ──────────────────────────────────────────────────────────────────
// Console helpers
// ──────────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m',
};
const log = {
    info: (m: string) => console.log(`${C.blue}ℹ${C.reset} ${m}`),
    ok: (m: string) => console.log(`${C.green}✓${C.reset} ${m}`),
    warn: (m: string) => console.log(`${C.yellow}⚠${C.reset} ${m}`),
    err: (m: string) => console.log(`${C.red}✗${C.reset} ${m}`),
    head: (m: string) => console.log(`\n${C.bright}${C.cyan}${m}${C.reset}`),
    dim: (m: string) => console.log(`  ${C.dim}${m}${C.reset}`),
};

class DryRunRollback extends Error {}

type Row = Record<string, any>;

interface TableInfo {
    name: string;
    pk: string;
    columns: string[];
    datetimeColumns: Set<string>;
}

const report = {
    mode: apply ? 'apply' : 'dry-run',
    terminalId,
    backup: dbArg,
    startedAt: new Date().toISOString(),
    sales: { onTerminal: 0, alreadyOnServer: 0, restored: 0, failed: 0 },
    saleItems: { restored: 0 },
    salePayments: { restored: 0 },
    stockMovements: { restored: 0, skipped: 0, failed: 0, byType: {} as Record<string, number> },
    statusUpdates: [] as { saleId: string; saleNumber: string; from: string; to: string }[],
    renumbered: [] as { saleId: string; from: string; to: string }[],
    paymentMethodsRemapped: [] as { from: string; to: string | null; name?: string }[],
    failures: [] as { table: string; id: string; ref?: string; error: string }[],
    inventory: [] as { inventoryId: string; before: number; delta: number; after: number }[],
};

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
interface SqliteDb {
    prepare(sql: string): { all(...params: any[]): unknown[] };
    close(): void;
}

/**
 * Prefers Node's built-in node:sqlite (Node 22.5+) so the script runs on
 * servers whose better-sqlite3 native binding was never built.
 */
function openSqlite(file: string): SqliteDb {
    try {
        const { DatabaseSync } = require('node:sqlite');
        return new DatabaseSync(file, { readOnly: true });
    } catch {
        const BetterSqlite = require('better-sqlite3');
        return new BetterSqlite(file, { readonly: true, fileMustExist: true });
    }
}

function openBackup(file: string): { sqlite: SqliteDb; cleanup: () => void } {
    if (!fs.existsSync(file)) throw new Error(`Backup not found: ${file}`);
    if (!file.endsWith('.gz')) {
        const sqlite = openSqlite(file);
        return { sqlite, cleanup: () => sqlite.close() };
    }
    const tmp = path.join(os.tmpdir(), `restore-${process.pid}-${Date.now()}.db`);
    fs.writeFileSync(tmp, zlib.gunzipSync(fs.readFileSync(file)));
    const sqlite = openSqlite(tmp);
    return {
        sqlite,
        cleanup: () => {
            sqlite.close();
            fs.rmSync(tmp, { force: true });
        },
    };
}

function toMysqlDatetime(value: any): any {
    if (value === null || value === undefined || value === '') return null;
    const d = typeof value === 'number' ? new Date(value) : new Date(String(value));
    if (Number.isNaN(d.getTime())) return value;
    return d.toISOString().replace('T', ' ').replace('Z', '');
}

function chunk<T>(a: T[], n: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
    return out;
}

function errorMessage(e: any): string {
    const msg = String(e?.meta?.message || e?.message || e);
    return msg.split('\n').filter(Boolean).slice(-1)[0].slice(0, 300);
}

async function tableInfo(tx: any, sqlite: SqliteDb, name: string): Promise<TableInfo> {
    const local = sqlite.prepare(`PRAGMA table_info(${name})`).all() as Row[];
    if (local.length === 0) throw new Error(`Table ${name} missing in backup`);
    const pk = local.find((c) => c.pk === 1)?.name;
    if (!pk) throw new Error(`Table ${name} has no primary key in backup`);

    const server = (await tx.$queryRawUnsafe(
        'SELECT column_name AS name, data_type AS type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
        name
    )) as Row[];
    const serverCols = new Map(server.map((c) => [String(c.name ?? c.COLUMN_NAME), String(c.type ?? c.DATA_TYPE)]));
    if (serverCols.size === 0) throw new Error(`Table ${name} missing on server`);

    const columns = local.map((c) => c.name as string).filter((c) => serverCols.has(c));
    const datetimeColumns = new Set(
        columns.filter((c) => ['datetime', 'timestamp', 'date'].includes(serverCols.get(c)!))
    );
    return { name, pk, columns, datetimeColumns };
}

function values(info: TableInfo, row: Row, overrides: Row = {}): any[] {
    return info.columns.map((c) => {
        const v = c in overrides ? overrides[c] : row[c];
        return info.datetimeColumns.has(c) ? toMysqlDatetime(v) : v;
    });
}

async function insertRow(tx: any, info: TableInfo, row: Row, overrides: Row = {}): Promise<void> {
    const cols = info.columns.map((c) => `\`${c}\``).join(', ');
    const marks = info.columns.map(() => '?').join(', ');
    await tx.$executeRawUnsafe(`INSERT INTO \`${info.name}\` (${cols}) VALUES (${marks})`, ...values(info, row, overrides));
}

async function insertAll(tx: any, rows: { info: TableInfo; row: Row; overrides?: Row }[]): Promise<void> {
    const inserted: { info: TableInfo; id: string }[] = [];
    try {
        for (const { info, row, overrides } of rows) {
            await insertRow(tx, info, row, overrides);
            inserted.push({ info, id: row[info.pk] });
        }
    } catch (e) {
        for (const { info, id } of inserted.reverse()) {
            await tx.$executeRawUnsafe(`DELETE FROM \`${info.name}\` WHERE \`${info.pk}\` = ?`, id);
        }
        throw e;
    }
}

async function existingIds(tx: any, info: TableInfo, ids: string[]): Promise<Set<string>> {
    const found = new Set<string>();
    for (const batch of chunk(ids, 500)) {
        if (batch.length === 0) continue;
        const rows = (await tx.$queryRawUnsafe(
            `SELECT \`${info.pk}\` AS id FROM \`${info.name}\` WHERE \`${info.pk}\` IN (${batch.map(() => '?').join(',')})`,
            ...batch
        )) as Row[];
        for (const r of rows) found.add(String(r.id));
    }
    return found;
}

function groupBy(rows: Row[], key: string): Map<string, Row[]> {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
        const k = r[key];
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(r);
    }
    return m;
}

function sameValue(a: any, b: any, isDate: boolean): boolean {
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    if (isDate) return toMysqlDatetime(a) === toMysqlDatetime(b instanceof Date ? b.toISOString() : b);
    const norm = (v: any) => (v === true ? '1' : v === false ? '0' : String(v));
    return norm(a) === norm(b);
}

/**
 * Map a terminal's payment method id to one the server has for the same
 * tenant: the id itself, else a method with the same name, else one with the
 * same category (preferring the sale's branch), else null.
 */
function paymentMethodResolver(tx: any, sqlite: SqliteDb) {
    const cache = new Map<string, string | null>();
    const hasLocalTable =
        sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payment_methods'").all().length > 0;

    return async (methodId: any, tenantId: any, branchId: any): Promise<string | null> => {
        if (methodId === null || methodId === undefined || methodId === '') return null;
        const key = `${tenantId}|${branchId}|${methodId}`;
        if (cache.has(key)) return cache.get(key)!;

        let resolved: string | null = null;
        let localName: string | undefined;
        const exact = (await tx.$queryRawUnsafe(
            'SELECT method_id FROM payment_methods WHERE method_id = ? AND tenant_id = ? LIMIT 1',
            methodId, tenantId
        )) as Row[];

        if (exact.length > 0) {
            resolved = String(methodId);
        } else {
            const local = hasLocalTable
                ? (sqlite.prepare('SELECT * FROM payment_methods WHERE method_id = ? LIMIT 1').all(methodId)[0] as Row | undefined)
                : undefined;
            localName = local?.name ?? undefined;
            if (local) {
                const match = (await tx.$queryRawUnsafe(
                    `SELECT method_id FROM payment_methods
                     WHERE tenant_id = ? AND deleted_at IS NULL
                       AND (LOWER(name) = LOWER(?) OR (? IS NOT NULL AND category = ?))
                     ORDER BY (LOWER(name) = LOWER(?)) DESC, (branch_id = ?) DESC, (parent_method_id IS NOT NULL) DESC
                     LIMIT 1`,
                    tenantId, local.name ?? '', local.category ?? null, local.category ?? null, local.name ?? '', branchId
                )) as Row[];
                if (match.length > 0) resolved = String(match[0].method_id);
            }
            report.paymentMethodsRemapped.push({ from: String(methodId), to: resolved, name: localName });
        }

        cache.set(key, resolved);
        return resolved;
    };
}

// ──────────────────────────────────────────────────────────────────
// Restore
// ──────────────────────────────────────────────────────────────────
async function restore(tx: any, sqlite: SqliteDb) {
    const T = {
        sales: await tableInfo(tx, sqlite, 'sales'),
        items: await tableInfo(tx, sqlite, 'sale_items'),
        payments: await tableInfo(tx, sqlite, 'sale_payments'),
        movements: await tableInfo(tx, sqlite, 'stock_movements'),
    };

    // ── Read terminal data ────────────────────────────────────
    const sales = sqlite
        .prepare('SELECT * FROM sales WHERE terminal_id = ? ORDER BY created_at ASC')
        .all(terminalId) as Row[];
    report.sales.onTerminal = sales.length;
    if (sales.length === 0) {
        log.warn('The backup has no sales for this terminal.');
        return;
    }

    const saleIds = sales.map((s) => s.sale_id);
    const placeholders = (n: number) => Array(n).fill('?').join(',');
    const readChildren = (table: string) =>
        chunk(saleIds, 500).flatMap(
            (b) => sqlite.prepare(`SELECT * FROM ${table} WHERE sale_id IN (${placeholders(b.length)})`).all(...b) as Row[]
        );
    const itemsBySale = groupBy(readChildren('sale_items'), 'sale_id');
    const paymentsBySale = groupBy(readChildren('sale_payments'), 'sale_id');
    const movements = sqlite
        .prepare('SELECT * FROM stock_movements WHERE terminal_id = ? ORDER BY created_at ASC')
        .all(terminalId) as Row[];

    log.info(`Terminal sales in backup : ${sales.length}`);
    log.info(`Terminal movements       : ${movements.length}`);

    // ── Compare with server ───────────────────────────────────
    const serverSales = await existingIds(tx, T.sales, saleIds);
    const serverItems = await existingIds(tx, T.items, [...itemsBySale.values()].flat().map((r) => r[T.items.pk]));
    const serverPayments = await existingIds(tx, T.payments, [...paymentsBySale.values()].flat().map((r) => r[T.payments.pk]));
    report.sales.alreadyOnServer = serverSales.size;
    log.info(`Already on server        : ${serverSales.size}`);
    log.info(`Missing on server        : ${sales.length - serverSales.size}`);

    // ── Restore sales with their items and payments ───────────
    log.head('Restoring sales…');
    const resolveMethod = paymentMethodResolver(tx, sqlite);
    const methodOverride = async (info: TableInfo, row: Row, overrides: Row, tenantId: any, branchId: any) => {
        if (!info.columns.includes('payment_method_id')) return;
        const resolved = await resolveMethod(row.payment_method_id, tenantId, branchId);
        if (resolved !== row.payment_method_id) overrides.payment_method_id = resolved;
    };
    const restoredOrPresent = new Set(serverSales);
    for (const sale of sales) {
        const saleId = sale.sale_id;
        const items = (itemsBySale.get(saleId) || []).filter((r) => !serverItems.has(r[T.items.pk]));
        const payments = (paymentsBySale.get(saleId) || []).filter((r) => !serverPayments.has(r[T.payments.pk]));
        const saleMissing = !serverSales.has(saleId);
        if (!saleMissing && items.length === 0 && payments.length === 0) continue;

        try {
            const rows: { info: TableInfo; row: Row; overrides?: Row }[] = [];
            if (saleMissing) {
                const overrides: Row = {};
                const clash = (await tx.$queryRawUnsafe(
                    'SELECT sale_id FROM sales WHERE tenant_id = ? AND branch_id = ? AND sale_number = ? AND sale_id <> ? LIMIT 1',
                    sale.tenant_id, sale.branch_id, sale.sale_number, saleId
                )) as Row[];
                if (clash.length > 0) {
                    if (!renumberSuffix) {
                        throw new Error(`sale_number ${sale.sale_number} already used by sale ${clash[0].sale_id} (pass --renumber-suffix)`);
                    }
                    overrides.sale_number = `${sale.sale_number}${renumberSuffix}`;
                    const note = `[Restored from terminal backup; original number ${sale.sale_number}]`;
                    overrides.notes = sale.notes ? `${sale.notes} ${note}` : note;
                    report.renumbered.push({ saleId, from: sale.sale_number, to: overrides.sale_number });
                }
                await methodOverride(T.sales, sale, overrides, sale.tenant_id, sale.branch_id);
                rows.push({ info: T.sales, row: sale, overrides });
            }
            for (const item of items) rows.push({ info: T.items, row: item });
            for (const payment of payments) {
                const overrides: Row = {};
                await methodOverride(T.payments, payment, overrides, sale.tenant_id, sale.branch_id);
                rows.push({ info: T.payments, row: payment, overrides });
            }
            await insertAll(tx, rows);

            if (saleMissing) report.sales.restored++;
            report.saleItems.restored += items.length;
            report.salePayments.restored += payments.length;
            restoredOrPresent.add(saleId);
        } catch (e) {
            if (report.renumbered.at(-1)?.saleId === saleId) report.renumbered.pop();
            report.sales.failed++;
            report.failures.push({ table: 'sales', id: saleId, ref: sale.sale_number, error: errorMessage(e) });
        }
    }
    log.ok(`Sales restored: ${report.sales.restored}, items: ${report.saleItems.restored}, payments: ${report.salePayments.restored}`);
    if (report.renumbered.length) log.warn(`Renumbered (clash with another terminal): ${report.renumbered.length}`);
    for (const m of report.paymentMethodsRemapped) {
        log.warn(`Payment method ${m.from}${m.name ? ` (${m.name})` : ''} not on server → ${m.to ?? 'NULL'}`);
    }
    if (report.sales.failed) log.err(`Sales not restored: ${report.sales.failed}`);

    // ── Status of sales the terminal changed later ────────────
    if (statusUpdates) {
        const saleById = new Map(sales.map((s) => [s.sale_id, s]));
        for (const batch of chunk([...serverSales], 500)) {
            const cols = ['sale_id', 'sale_number', 'updated_at', ...SALE_STATUS_COLUMNS].map((c) => `\`${c}\``).join(', ');
            const rows = (await tx.$queryRawUnsafe(
                `SELECT ${cols} FROM sales WHERE sale_id IN (${placeholders(batch.length)})`,
                ...batch
            )) as Row[];
            for (const srv of rows) {
                const local = saleById.get(String(srv.sale_id))!;
                const localNewer = toMysqlDatetime(local.updated_at)! > toMysqlDatetime(srv.updated_at instanceof Date ? srv.updated_at.toISOString() : srv.updated_at)!;
                const changed = SALE_STATUS_COLUMNS.filter(
                    (c) => !sameValue(local[c], srv[c], T.sales.datetimeColumns.has(c))
                );
                if (!localNewer || changed.length === 0) continue;

                const sets = [...changed, 'updated_at'];
                await tx.$executeRawUnsafe(
                    `UPDATE sales SET ${sets.map((c) => `\`${c}\` = ?`).join(', ')} WHERE sale_id = ?`,
                    ...sets.map((c) => (T.sales.datetimeColumns.has(c) ? toMysqlDatetime(local[c]) : local[c])),
                    local.sale_id
                );
                report.statusUpdates.push({ saleId: local.sale_id, saleNumber: local.sale_number, from: String(srv.status), to: String(local.status) });
            }
        }
        log.ok(`Sales status updated (refunds/voids): ${report.statusUpdates.length}`);
    }

    // ── Stock movements and inventory ─────────────────────────
    log.head('Restoring stock movements…');
    const serverMovements = await existingIds(tx, T.movements, movements.map((m) => m[T.movements.pk]));
    const deltas = new Map<string, number>();
    for (const mv of movements) {
        const id = mv[T.movements.pk];
        if (serverMovements.has(id)) continue;
        if (mv.reference_type === 'SALE' && mv.reference_id && !restoredOrPresent.has(mv.reference_id)) {
            report.stockMovements.skipped++;
            report.failures.push({ table: 'stock_movements', id, ref: mv.reference_id, error: 'sale was not restored' });
            continue;
        }
        try {
            await insertRow(tx, T.movements, mv);
            report.stockMovements.restored++;
            report.stockMovements.byType[mv.movement_type] = (report.stockMovements.byType[mv.movement_type] || 0) + 1;
            if (mv.deleted_at) continue;
            const qty = Number(mv.quantity) || 0;
            const delta = INCREASE_TYPES.has(mv.movement_type) ? qty : -qty;
            deltas.set(mv.inventory_id, (deltas.get(mv.inventory_id) || 0) + delta);
        } catch (e) {
            report.stockMovements.failed++;
            report.failures.push({ table: 'stock_movements', id, ref: mv.reference_id, error: errorMessage(e) });
        }
    }
    log.ok(`Stock movements restored: ${report.stockMovements.restored} ${JSON.stringify(report.stockMovements.byType)}`);
    if (report.stockMovements.skipped) log.warn(`Movements skipped (their sale was not restored): ${report.stockMovements.skipped}`);
    if (report.stockMovements.failed) log.err(`Movements failed: ${report.stockMovements.failed}`);

    if (adjustInventory && deltas.size > 0) {
        for (const [inventoryId, delta] of deltas) {
            if (delta === 0) continue;
            const before = (await tx.$queryRawUnsafe(
                'SELECT available_quantity AS q FROM inventory WHERE inventory_id = ?',
                inventoryId
            )) as Row[];
            if (before.length === 0) continue;
            await tx.$executeRawUnsafe(
                'UPDATE inventory SET available_quantity = available_quantity + ?, version = version + 1 WHERE inventory_id = ?',
                delta, inventoryId
            );
            const q = Number(before[0].q);
            report.inventory.push({ inventoryId, before: q, delta, after: q + delta });
        }
        const negative = report.inventory.filter((i) => i.after < 0).length;
        log.ok(`Inventory rows adjusted: ${report.inventory.length}${negative ? ` (${negative} now below zero)` : ''}`);
    } else if (!adjustInventory) {
        log.warn('Inventory left unchanged (--no-inventory)');
    }
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
    log.head('RESTORE TERMINAL BACKUP  (SQLite backup → MySQL)');
    if (!dbArg || !terminalId) {
        log.err('Usage: npx tsx scripts/restore-terminal-backup.ts --db=<backup.db[.gz]> --terminal=<id> [--renumber-suffix=-B] [--report=file.json] [--apply]');
        process.exit(1);
    }

    const target = (process.env.DATABASE_URL || '').replace(/\/\/[^@]*@/, '//***@');
    log.info(`Backup   : ${path.resolve(dbArg)}`);
    log.info(`Terminal : ${terminalId}`);
    log.info(`Target   : ${target}`);
    if (renumberSuffix) log.info(`Clashing sale numbers get suffix "${renumberSuffix}"`);
    if (apply) log.warn('APPLY — changes will be committed');
    else log.warn('DRY RUN — everything is rolled back at the end (add --apply to commit)');

    const { sqlite, cleanup } = openBackup(dbArg);
    const { prisma, getPrismaClient } = await import('../src/databases/prisma/client');
    await getPrismaClient();

    let exitCode = 0;
    try {
        await prisma.$transaction(
            async (tx: any) => {
                await restore(tx, sqlite);
                if (!apply) throw new DryRunRollback();
            },
            { timeout: 15 * 60 * 1000, maxWait: 60 * 1000 }
        );
        log.head('Committed.');
    } catch (e) {
        if (e instanceof DryRunRollback) {
            log.head('Dry run finished — rolled back, nothing was written.');
        } else {
            log.err(`Aborted, nothing was written: ${errorMessage(e)}`);
            exitCode = 1;
        }
    } finally {
        cleanup();
        await (prisma as any).$disconnect?.().catch(() => undefined);
    }

    log.head('Summary');
    console.log(`  Sales on terminal      : ${report.sales.onTerminal}`);
    console.log(`  Already on server      : ${report.sales.alreadyOnServer}`);
    console.log(`  ${C.green}Sales restored${C.reset}         : ${report.sales.restored}`);
    console.log(`  ${C.green}Items restored${C.reset}         : ${report.saleItems.restored}`);
    console.log(`  ${C.green}Payments restored${C.reset}      : ${report.salePayments.restored}`);
    console.log(`  ${C.green}Movements restored${C.reset}     : ${report.stockMovements.restored}`);
    console.log(`  ${C.yellow}Renumbered sales${C.reset}       : ${report.renumbered.length}`);
    console.log(`  ${C.yellow}Status updates${C.reset}         : ${report.statusUpdates.length}`);
    console.log(`  ${C.yellow}Inventory rows adjusted${C.reset}: ${report.inventory.length}`);
    console.log(`  ${C.red}Failures${C.reset}               : ${report.failures.length}`);

    for (const r of report.renumbered) log.dim(`renumbered ${r.from} → ${r.to}  (sale ${r.saleId})`);
    for (const s of report.statusUpdates) log.dim(`status ${s.saleNumber}: ${s.from} → ${s.to}`);
    for (const f of report.failures.slice(0, 30)) log.err(`${f.table} ${f.id}${f.ref ? ` (${f.ref})` : ''}: ${f.error}`);
    if (report.failures.length > 30) log.warn(`… and ${report.failures.length - 30} more (see --report)`);

    if (reportPath) {
        fs.writeFileSync(reportPath, JSON.stringify({ ...report, finishedAt: new Date().toISOString() }, null, 2));
        log.ok(`Report written to ${path.resolve(reportPath)}`);
    }

    if (report.failures.length > 0 && exitCode === 0) exitCode = 2;
    process.exit(exitCode);
}

main().catch((e) => {
    log.err(`Unhandled error: ${errorMessage(e)}`);
    console.error(e);
    process.exit(1);
});
