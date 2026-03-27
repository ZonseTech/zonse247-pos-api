#!/usr/bin/env npx ts-node
/**
 * CSV/TXT Inventory Migration Script (CSV → MySQL)
 *
 * Reads a tab-delimited CSV/TXT inventory export and migrates
 * products, variants, barcodes, inventory records, and stock
 * movements into the online MySQL database for a specific
 * tenant + branch.
 *
 * ── Expected CSV columns (tab-separated) ──────────────────────────
 *   name | price | barcode | quantity | category | subcategory | note | cost | tax
 *
 * ── Prerequisites ──────────────────────────────────────────────────
 *  1. The target tenant and branch must already exist in the online
 *     MySQL database (created via the normal onboarding flow).
 *  2. At least one user must exist for this tenant (used as the
 *     `moved_by` reference for stock movements).
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx ts-node scripts/migrate-csv-inventory.ts \
 *       --file=path/to/inventory.txt --tenant=<ID> --branch=<ID> [options]
 *
 * ── Options ────────────────────────────────────────────────────────
 *   --file=PATH         (required) Path to the CSV/TXT file
 *   --tenant=ID         (required) Target tenant ID in MySQL
 *   --branch=ID         (required) Target branch ID in MySQL
 *   --dry-run           Preview record counts without writing anything
 *   --batch-size=N      Records per transaction batch (default: 50)
 *   --delimiter=CHAR    Column delimiter (default: tab)
 *   --skip-categories   Skip category import
 *   --skip-movements    Skip creating OPENING_BALANCE stock movements
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────────
// CLI Argument Parsing
// ──────────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);

function getArg(name: string): string | null {
    const arg = cliArgs.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : null;
}

const hasFlag = (name: string) => cliArgs.includes(`--${name}`);

const filePath = getArg('file');
const tenantId = getArg('tenant');
const branchId = getArg('branch');
const isDryRun = hasFlag('dry-run');
const batchSize = parseInt(getArg('batch-size') || '50', 10);
const delimiter = getArg('delimiter') || '\t';
const skipCategories = hasFlag('skip-categories');
const skipMovements = hasFlag('skip-movements');

// ──────────────────────────────────────────────────────────────────
// Console Helpers
// ──────────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

const log = {
    info: (msg: string) => console.log(`${C.blue}ℹ${C.reset} ${msg}`),
    ok: (msg: string) => console.log(`${C.green}✓${C.reset} ${msg}`),
    warn: (msg: string) => console.log(`${C.yellow}⚠${C.reset} ${msg}`),
    err: (msg: string) => console.log(`${C.red}✗${C.reset} ${msg}`),
    header: (msg: string) => console.log(`\n${C.bright}${C.cyan}${msg}${C.reset}\n`),
    step: (msg: string) => console.log(`  ${C.magenta}→${C.reset} ${msg}`),
    dim: (msg: string) => console.log(`  ${C.dim}${msg}${C.reset}`),
};

// ──────────────────────────────────────────────────────────────────
// CSV Row Interface
// ──────────────────────────────────────────────────────────────────
interface CsvRow {
    name: string;
    price: number;
    barcode: string;
    quantity: number;
    category: string;
    subcategory: string;
    note: string;
    cost: number;
    tax: number;
}

// ──────────────────────────────────────────────────────────────────
// CSV Parser
// ──────────────────────────────────────────────────────────────────
function parseCsvFile(csvPath: string, sep: string): CsvRow[] {
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
        log.warn('CSV file has no data rows.');
        return [];
    }

    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
    log.info(`CSV headers: ${headers.join(', ')}`);

    const requiredHeaders = ['name', 'barcode'];
    for (const rh of requiredHeaders) {
        if (!headers.includes(rh)) {
            log.err(`Missing required header "${rh}" in CSV.`);
            process.exit(1);
        }
    }

    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep);
        const get = (header: string) => {
            const idx = headers.indexOf(header);
            return idx >= 0 && idx < cols.length ? cols[idx].trim() : '';
        };

        const name = get('name');
        if (!name) {
            log.dim(`Skipping row ${i + 1}: empty name`);
            continue;
        }

        rows.push({
            name,
            price: parseFloat(get('price')) || 0,
            barcode: get('barcode'),
            quantity: parseInt(get('quantity'), 10) || 0,
            category: get('category'),
            subcategory: get('subcategory'),
            note: get('note'),
            cost: parseFloat(get('cost')) || 0,
            tax: parseFloat(get('tax')) || 0,
        });
    }

    return rows;
}

// ──────────────────────────────────────────────────────────────────
// Batch helper
// ──────────────────────────────────────────────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

// ──────────────────────────────────────────────────────────────────
// ID Mapping
// ──────────────────────────────────────────────────────────────────
const idMap = {
    category: new Map<string, string>(),   // category name (lowercase) → categoryId
    product: new Map<string, string>(),    // product name (lowercase) → productId
    variant: new Map<string, string>(),    // product name (lowercase) → variantId
    inventory: new Map<string, string>(),  // product name (lowercase) → inventoryId
};

// ──────────────────────────────────────────────────────────────────
// Stats Tracker
// ──────────────────────────────────────────────────────────────────
interface Counter {
    created: number;
    skipped: number;
    failed: number;
}

interface MigrationStats {
    categories: Counter;
    products: Counter;
    variants: Counter;
    barcodes: Counter;
    inventory: Counter;
    stockMovements: Counter;
    errors: string[];
}

function emptyCounter(): Counter {
    return { created: 0, skipped: 0, failed: 0 };
}

function emptyStats(): MigrationStats {
    return {
        categories: emptyCounter(),
        products: emptyCounter(),
        variants: emptyCounter(),
        barcodes: emptyCounter(),
        inventory: emptyCounter(),
        stockMovements: emptyCounter(),
        errors: [],
    };
}

// ──────────────────────────────────────────────────────────────────
// Main Migration
// ──────────────────────────────────────────────────────────────────
async function main() {
    log.header('═══════════════════════════════════════════════════════════');
    log.header('       CSV INVENTORY MIGRATION  (CSV/TXT → MySQL)');
    log.header('═══════════════════════════════════════════════════════════');

    // ── Validate args ───────────────────────────────────────────
    if (!filePath || !tenantId || !branchId) {
        log.err('Missing required arguments.');
        log.info('Usage: npx ts-node scripts/migrate-csv-inventory.ts \\');
        log.info('         --file=path/to/inventory.txt --tenant=<ID> --branch=<ID>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        log.err(`File not found: ${filePath}`);
        process.exit(1);
    }

    if (isDryRun) log.warn('DRY RUN MODE — no changes will be written');
    log.info(`File:       ${path.resolve(filePath)}`);
    log.info(`Tenant:     ${tenantId}`);
    log.info(`Branch:     ${branchId}`);
    log.info(`Batch size: ${batchSize}`);
    log.info(`Delimiter:  ${delimiter === '\t' ? 'TAB' : `"${delimiter}"`}`);

    // ── Parse CSV ───────────────────────────────────────────────
    log.header('Parsing CSV file…');
    const rows = parseCsvFile(filePath, delimiter);
    log.ok(`Parsed ${rows.length} product rows`);

    if (rows.length === 0) {
        log.warn('No data to import.');
        process.exit(0);
    }

    // ── Extract unique categories ───────────────────────────────
    const uniqueCategories = [
        ...new Set(
            rows
                .map(r => r.category)
                .filter(c => c.length > 0)
                .map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
        ),
    ];
    log.ok(`Unique categories: ${uniqueCategories.length}`);
    for (const cat of uniqueCategories) {
        log.dim(`  • ${cat}`);
    }

    // ── Summary ────────────────────────────────────────────────
    const withBarcode = rows.filter(r => r.barcode.length > 0).length;
    const withQuantity = rows.filter(r => r.quantity > 0).length;
    log.ok(`Products with barcodes: ${withBarcode}`);
    log.ok(`Products with stock:    ${withQuantity}`);

    // ── Dry-run stops here ──────────────────────────────────────
    if (isDryRun) {
        log.warn('DRY RUN complete. Run without --dry-run to apply changes.');
        process.exit(0);
    }

    // ── Connect to online MySQL database ────────────────────────
    log.header('Connecting to MySQL…');
    const { prisma, getPrismaClient } = await import('../src/databases/prisma/client');
    await getPrismaClient();
    log.ok('MySQL connected');

    // ── Verify tenant & branch exist ────────────────────────────
    const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
    if (!tenant) { log.err(`Tenant ${tenantId} not found`); process.exit(1); }
    log.ok(`Tenant: ${tenant.businessName}`);

    const branch = await prisma.branch.findUnique({ where: { branchId } });
    if (!branch || branch.tenantId !== tenantId) {
        log.err(`Branch ${branchId} not found for tenant ${tenantId}`);
        process.exit(1);
    }
    log.ok(`Branch: ${branch.branchName}`);

    // ── Resolve system user ─────────────────────────────────────
    const systemUser = await prisma.user.findFirst({
        where: { tenantId },
        select: { userId: true, fullname: true, username: true },
        orderBy: { createdAt: 'asc' },
    });
    if (!systemUser) { log.err('No user found for tenant'); process.exit(1); }
    log.ok(`System user: ${systemUser.fullname || systemUser.username} (${systemUser.userId})`);
    const systemUserId = systemUser.userId;

    const stats = emptyStats();

    // ══════════════════════════════════════════════════════════════
    // PHASE 1: Categories
    // ══════════════════════════════════════════════════════════════
    if (!skipCategories && uniqueCategories.length > 0) {
        log.header('Phase 1: Importing Categories…');
        for (const catName of uniqueCategories) {
            try {
                const existing = await prisma.category.findFirst({
                    where: { tenantId, branchId, name: catName },
                });
                if (existing) {
                    idMap.category.set(catName.toLowerCase(), existing.categoryId);
                    stats.categories.skipped++;
                    continue;
                }
                const newId = uuidv4();
                await prisma.category.create({
                    data: {
                        categoryId: newId,
                        tenantId,
                        branchId,
                        userId: systemUserId,
                        name: catName,
                        isActive: true,
                        isDefault: false,
                        sortOrder: 0,
                    },
                });
                idMap.category.set(catName.toLowerCase(), newId);
                stats.categories.created++;
            } catch (err: any) {
                stats.categories.failed++;
                stats.errors.push(`Category "${catName}": ${err.message}`);
            }
        }
        logPhaseResult('Categories', stats.categories);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 2: Products → Variants → Barcodes → Inventory
    // ══════════════════════════════════════════════════════════════
    log.header('Phase 2: Importing Products & Inventory…');

    const productBatches = chunk(rows, batchSize);
    for (const batch of productBatches) {
        for (const row of batch) {
            try {
                // ── 2a. Product ─────────────────────────────────
                const existing = await prisma.product.findFirst({
                    where: { tenantId, branchId, name: row.name },
                });

                let productId: string;
                if (existing) {
                    productId = existing.id;
                    idMap.product.set(row.name.toLowerCase(), productId);
                    stats.products.skipped++;
                } else {
                    productId = uuidv4();
                    const categoryKey = row.category
                        ? (row.category.charAt(0).toUpperCase() + row.category.slice(1).toLowerCase()).toLowerCase()
                        : '';
                    const categoryId = categoryKey ? idMap.category.get(categoryKey) || null : null;

                    await prisma.product.create({
                        data: {
                            id: productId,
                            tenantId,
                            branchId,
                            name: row.name,
                            categoryId,
                            isTaxable: row.tax > 0,
                            isActive: true,
                        },
                    });
                    idMap.product.set(row.name.toLowerCase(), productId);
                    stats.products.created++;
                }

                // ── 2b. Variant ─────────────────────────────────
                const variantName = 'Default';
                const existingVariant = await prisma.productVariant.findFirst({
                    where: { productId, variantName },
                });

                let variantId: string;
                if (existingVariant) {
                    variantId = existingVariant.id;
                    idMap.variant.set(row.name.toLowerCase(), variantId);
                    stats.variants.skipped++;
                } else {
                    variantId = uuidv4();
                    await prisma.productVariant.create({
                        data: {
                            id: variantId,
                            productId,
                            tenantId,
                            branchId,
                            variantName,
                            primaryBarcode: row.barcode || null,
                            sellingPrice: row.price,
                            costPrice: row.cost,
                            unit: 'piece',
                            isDefault: true,
                            isActive: true,
                        },
                    });
                    idMap.variant.set(row.name.toLowerCase(), variantId);
                    stats.variants.created++;
                }

                // ── 2c. Barcode ─────────────────────────────────
                if (row.barcode) {
                    const existingBarcode = await prisma.variantBarcode.findFirst({
                        where: { tenantId, branchId, barcode: row.barcode },
                    });
                    if (existingBarcode) {
                        stats.barcodes.skipped++;
                    } else {
                        await prisma.variantBarcode.create({
                            data: {
                                id: uuidv4(),
                                variantId,
                                tenantId,
                                branchId,
                                barcode: row.barcode,
                                barcodeType: 'EAN13',
                                barcodeSource: 'SUPPLIER',
                                isActive: true,
                            },
                        });
                        stats.barcodes.created++;
                    }
                }

                // ── 2d. Inventory ───────────────────────────────
                const existingInv = await prisma.inventory.findFirst({
                    where: { branchId, variantId },
                });

                let inventoryId: string;
                if (existingInv) {
                    inventoryId = existingInv.id;
                    idMap.inventory.set(row.name.toLowerCase(), inventoryId);
                    stats.inventory.skipped++;
                } else {
                    inventoryId = uuidv4();
                    await prisma.inventory.create({
                        data: {
                            id: inventoryId,
                            tenantId,
                            branchId,
                            productId,
                            variantId,
                            availableQuantity: row.quantity,
                            reservedQuantity: 0,
                            damagedQuantity: 0,
                            averageCost: row.cost,
                            lastPurchaseCost: row.cost,
                            trackInventory: true,
                            allowNegativeStock: false,
                            costingMethod: 'WEIGHTED_AVERAGE',
                        },
                    });
                    idMap.inventory.set(row.name.toLowerCase(), inventoryId);
                    stats.inventory.created++;
                }

                // ── 2e. Opening Balance Stock Movement ──────────
                if (!skipMovements && row.quantity > 0 && !existingInv) {
                    try {
                        await prisma.stockMovement.create({
                            data: {
                                id: uuidv4(),
                                tenantId,
                                branchId,
                                inventoryId,
                                movementType: 'OPENING_BALANCE',
                                quantity: row.quantity,
                                previousQuantity: 0,
                                newQuantity: row.quantity,
                                unitCost: row.cost,
                                totalCost: row.cost * row.quantity,
                                notes: 'CSV inventory import — opening balance',
                                movedBy: systemUserId,
                                movementDate: new Date(),
                            },
                        });
                        stats.stockMovements.created++;
                    } catch (err: any) {
                        stats.stockMovements.failed++;
                        stats.errors.push(`StockMovement "${row.name}": ${err.message}`);
                    }
                }

                printProgress('Products', stats.products, rows.length);
            } catch (err: any) {
                stats.products.failed++;
                stats.errors.push(`Product "${row.name}": ${err.message}`);
            }
        }
    }

    logPhaseResult('Products', stats.products);
    logPhaseResult('Variants', stats.variants);
    logPhaseResult('Barcodes', stats.barcodes);
    logPhaseResult('Inventory', stats.inventory);
    logPhaseResult('Stock Movements', stats.stockMovements);

    // ══════════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════════
    printFinalSummary(stats);

    // Save ID mappings for reference / debugging
    const mappingFile = path.resolve('mapped-data', '_csv_id_mappings.json');
    fs.mkdirSync(path.dirname(mappingFile), { recursive: true });
    const mappings: Record<string, Record<string, string>> = {};
    for (const [key, map] of Object.entries(idMap)) {
        mappings[key] = Object.fromEntries(map);
    }
    fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2));
    log.ok(`ID mappings saved to ${mappingFile}`);

    process.exit(stats.errors.length > 0 ? 1 : 0);
}

// ──────────────────────────────────────────────────────────────────
// Output Helpers
// ──────────────────────────────────────────────────────────────────
function logPhaseResult(label: string, s: Counter) {
    log.step(
        `${label}: ${C.green}${s.created} created${C.reset}, ` +
        `${C.yellow}${s.skipped} skipped${C.reset}, ` +
        `${C.red}${s.failed} failed${C.reset}`
    );
}

function printProgress(label: string, s: Counter, total: number) {
    const done = s.created + s.skipped + s.failed;
    process.stdout.write(`\r  ${label}: ${done}/${total} (${Math.round(done / total * 100)}%)`);
    if (done >= total) console.log('');
}

function printFinalSummary(stats: MigrationStats) {
    log.header('═══════════════════════════════════════════════════════════');
    log.header('               MIGRATION COMPLETE');
    log.header('═══════════════════════════════════════════════════════════');

    const sections: [string, Counter][] = [
        ['Categories', stats.categories],
        ['Products', stats.products],
        ['Variants', stats.variants],
        ['Barcodes', stats.barcodes],
        ['Inventory', stats.inventory],
        ['Stock Movements', stats.stockMovements],
    ];

    console.log('');
    for (const [label, s] of sections) {
        const total = s.created + s.skipped + s.failed;
        if (total === 0) continue;
        const pct = total > 0 ? Math.round(s.created / total * 100) : 0;
        console.log(
            `  ${label.padEnd(20)} ` +
            `${C.green}${String(s.created).padStart(5)} created${C.reset}  ` +
            `${C.yellow}${String(s.skipped).padStart(5)} skipped${C.reset}  ` +
            `${C.red}${String(s.failed).padStart(5)} failed${C.reset}  ` +
            `${C.dim}(${pct}% new)${C.reset}`
        );
    }
    console.log('');

    if (stats.errors.length > 0) {
        log.err(`${stats.errors.length} error(s) encountered:`);
        for (const e of stats.errors) {
            log.dim(`  • ${e}`);
        }
    } else {
        log.ok('All records imported successfully!');
    }
}

// ──────────────────────────────────────────────────────────────────
// Entry
// ──────────────────────────────────────────────────────────────────
main().catch((err) => {
    log.err(`Unhandled error: ${err.message}`);
    console.error(err);
    process.exit(1);
});
