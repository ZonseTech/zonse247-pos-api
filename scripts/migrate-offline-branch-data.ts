#!/usr/bin/env npx ts-node
/**
 * Offline Branch Data Migration Script (SQLite → MySQL)
 *
 * Reads an offline POS SQLite .db backup directly and migrates the
 * inventory (products, variants, barcodes, inventory records), sales
 * (sale, items, payments), and stock movements into the online MySQL
 * database for a specific tenant + branch.
 *
 * The SQLite schema uses the same table/column names as the Prisma
 * schema @@map / @map values (snake_case).
 *
 * ── Prerequisites ──────────────────────────────────────────────────
 *  1. The target tenant and branch must already exist in the online
 *     MySQL database (created via the normal onboarding flow).
 *  2. At least one user must exist for this tenant (used as the
 *     `moved_by` reference for stock movements).
 *  3. `better-sqlite3` is already a project dependency.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx ts-node scripts/migrate-offline-branch-data.ts \
 *       --db=path/to/backup.db --tenant=<ID> --branch=<ID> [options]
 *
 * ── Options ────────────────────────────────────────────────────────
 *   --db=PATH           (required) Path to the SQLite .db backup file
 *   --tenant=ID         (required) Target tenant ID in MySQL
 *   --branch=ID         (required) Target branch ID in MySQL
 *   --dry-run           Preview record counts without writing anything
 *   --batch-size=N      Records per transaction batch (default: 50)
 *   --skip-products     Skip products / variants / inventory import
 *   --skip-sales        Skip sales / sale_items / sale_payments import
 *   --skip-movements    Skip stock-movement import (auto-generated
 *                       from sales when the table has data)
 *   --skip-categories   Skip category import
 *   --skip-customers    Skip customer import
 *   --recalc-inventory  After import, recompute availableQuantity
 *                       from imported stock movements
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

// ──────────────────────────────────────────────────────────────────
// CLI Argument Parsing
// ──────────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);

function getArg(name: string): string | null {
    const arg = cliArgs.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : null;
}

const hasFlag = (name: string) => cliArgs.includes(`--${name}`);

const dbPath = getArg('db');
const tenantId = getArg('tenant');
const branchId = getArg('branch');
const isDryRun = hasFlag('dry-run');
const batchSize = parseInt(getArg('batch-size') || '50', 10);
const skipProducts = hasFlag('skip-products');
const skipSales = hasFlag('skip-sales');
const skipMovements = hasFlag('skip-movements');
const skipCategories = hasFlag('skip-categories');
const skipCustomers = hasFlag('skip-customers');
const recalcInventory = hasFlag('recalc-inventory');

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
// SQLite helper: safe table read
// ──────────────────────────────────────────────────────────────────
function readTable(sqliteDb: Database.Database, table: string): any[] {
    try {
        return sqliteDb.prepare(`SELECT * FROM "${table}"`).all();
    } catch (err: any) {
        if (err.message.includes('no such table')) {
            log.dim(`Table "${table}" not found in backup — skipping.`);
            return [];
        }
        throw err;
    }
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
// ID Mapping (old offline ID → new online ID)
// ──────────────────────────────────────────────────────────────────
const idMap = {
    category: new Map<string, string>(),
    product: new Map<string, string>(),
    variant: new Map<string, string>(),
    inventory: new Map<string, string>(),
    customer: new Map<string, string>(),
    sale: new Map<string, string>(),
    paymentMethod: new Map<string, string>(),
    user: new Map<string, string>(),
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
    customers: Counter;
    products: Counter;
    variants: Counter;
    barcodes: Counter;
    inventory: Counter;
    sales: Counter;
    saleItems: Counter;
    salePayments: Counter;
    stockMovements: Counter;
    errors: string[];
}

function emptyCounter(): Counter {
    return { created: 0, skipped: 0, failed: 0 };
}

function emptyStats(): MigrationStats {
    return {
        categories: emptyCounter(),
        customers: emptyCounter(),
        products: emptyCounter(),
        variants: emptyCounter(),
        barcodes: emptyCounter(),
        inventory: emptyCounter(),
        sales: emptyCounter(),
        saleItems: emptyCounter(),
        salePayments: emptyCounter(),
        stockMovements: emptyCounter(),
        errors: [],
    };
}

// ──────────────────────────────────────────────────────────────────
// Main Migration
// ──────────────────────────────────────────────────────────────────
async function main() {
    log.header('═══════════════════════════════════════════════════════════');
    log.header('       OFFLINE BRANCH DATA MIGRATION  (SQLite → MySQL)');
    log.header('═══════════════════════════════════════════════════════════');

    // ── Validate args ───────────────────────────────────────────
    if (!dbPath || !tenantId || !branchId) {
        log.err('Missing required arguments.');
        log.info('Usage: npx ts-node scripts/migrate-offline-branch-data.ts \\');
        log.info('         --db=path/to/backup.db --tenant=<ID> --branch=<ID>');
        process.exit(1);
    }

    if (!fs.existsSync(dbPath)) {
        log.err(`SQLite file not found: ${dbPath}`);
        process.exit(1);
    }

    if (isDryRun) log.warn('DRY RUN MODE — no changes will be written');
    log.info(`SQLite DB:  ${path.resolve(dbPath)}`);
    log.info(`Tenant:     ${tenantId}`);
    log.info(`Branch:     ${branchId}`);
    log.info(`Batch size: ${batchSize}`);

    // ── Open SQLite backup (read-only) ──────────────────────────
    log.header('Opening SQLite backup…');
    const sqliteDb = new Database(dbPath, { readonly: true });

    // List all tables for diagnostics
    const tables: any[] = sqliteDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all();
    log.info(`Tables in backup: ${tables.map((t: any) => t.name).join(', ')}`);

    // ── Read all source data ────────────────────────────────────
    log.header('Reading data from SQLite…');

    const srcCategories = skipCategories ? [] : readTable(sqliteDb, 'categories');
    const srcCustomers = skipCustomers ? [] : readTable(sqliteDb, 'customers');
    const srcProducts = skipProducts ? [] : readTable(sqliteDb, 'products');
    const srcVariants = skipProducts ? [] : readTable(sqliteDb, 'product_variants');
    const srcBarcodes = skipProducts ? [] : readTable(sqliteDb, 'variant_barcodes');
    const srcInventory = skipProducts ? [] : readTable(sqliteDb, 'inventory');
    const srcSales = skipSales ? [] : readTable(sqliteDb, 'sales');
    const srcSaleItems = skipSales ? [] : readTable(sqliteDb, 'sale_items');
    const srcSalePayments = skipSales ? [] : readTable(sqliteDb, 'sale_payments');
    const srcStockMovements = skipMovements ? [] : readTable(sqliteDb, 'stock_movements');
    const srcPaymentMethods = readTable(sqliteDb, 'payment_methods');
    const srcUsers = readTable(sqliteDb, 'users');

    log.ok(`Categories:       ${srcCategories.length}`);
    log.ok(`Customers:        ${srcCustomers.length}`);
    log.ok(`Products:         ${srcProducts.length}`);
    log.ok(`Variants:         ${srcVariants.length}`);
    log.ok(`Barcodes:         ${srcBarcodes.length}`);
    log.ok(`Inventory:        ${srcInventory.length}`);
    log.ok(`Sales:            ${srcSales.length}`);
    log.ok(`Sale items:       ${srcSaleItems.length}`);
    log.ok(`Sale payments:    ${srcSalePayments.length}`);
    log.ok(`Stock movements:  ${srcStockMovements.length}`);
    log.ok(`Payment methods:  ${srcPaymentMethods.length}`);
    log.ok(`Users (source):   ${srcUsers.length}`);

    sqliteDb.close();

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

    // ── Pre-load online payment methods for mapping ─────────────
    const onlinePMs = await prisma.paymentMethod.findMany({
        where: { tenantId, branchId, deletedAt: null },
    });
    for (const pm of onlinePMs) {
        // Map by lowercase name for fuzzy matching
        idMap.paymentMethod.set(pm.name.toLowerCase(), pm.methodId);
    }
    // Map offline payment-method IDs to online ones by name match
    for (const pm of srcPaymentMethods) {
        const match = onlinePMs.find(
            (e: any) => e.name.toLowerCase() === (pm.name || '').toLowerCase()
        );
        if (match) {
            idMap.paymentMethod.set(pm.method_id, match.methodId);
        }
    }

    // ── Resolve terminal ID ─────────────────────────────────────
    // All offline sales map to this specific terminal
    const MIGRATION_TERMINAL_ID = '9e095a07-c04d-4fcc-9778-b94301960835';
    const migTerminal = await prisma.terminal.findUnique({ where: { terminalId: MIGRATION_TERMINAL_ID } });
    if (!migTerminal) {
        log.err(`Terminal ${MIGRATION_TERMINAL_ID} not found. Create it first.`);
        process.exit(1);
    }
    log.ok(`Terminal: ${migTerminal.terminalLabel} (${MIGRATION_TERMINAL_ID})`);

    // ── Pre-load online users for mapping ───────────────────────
    const onlineUsers = await prisma.user.findMany({
        where: { tenantId },
        select: { userId: true, email: true },
    });
    for (const u of onlineUsers) {
        idMap.user.set(u.userId, u.userId); // identity
        if (u.email) idMap.user.set(u.email.toLowerCase(), u.userId);
    }
    // Try matching offline users by email
    for (const su of srcUsers) {
        if (su.email) {
            const onlineId = idMap.user.get(su.email.toLowerCase());
            if (onlineId && su.user_id) {
                idMap.user.set(su.user_id, onlineId);
            }
        }
    }

    const stats = emptyStats();

    // ══════════════════════════════════════════════════════════════
    // PHASE 1: Categories
    // ══════════════════════════════════════════════════════════════
    if (srcCategories.length > 0) {
        log.header('Phase 1: Importing Categories…');
        for (const cat of srcCategories) {
            try {
                const offlineId = cat.category_id;
                const existing = await prisma.category.findFirst({
                    where: { tenantId, branchId, name: cat.name },
                });
                if (existing) {
                    idMap.category.set(offlineId, existing.categoryId);
                    stats.categories.skipped++;
                    continue;
                }
                const newId = uuidv4();
                await prisma.category.create({
                    data: {
                        categoryId: newId,
                        tenantId,
                        branchId,
                        userId: idMap.user.get(cat.user_id) || systemUserId,
                        name: cat.name,
                        description: cat.description || null,
                        color: cat.color || null,
                        isActive: boolVal(cat.is_active, true),
                        isDefault: boolVal(cat.is_default, false),
                        sortOrder: cat.sort_order ?? 0,
                    },
                });
                idMap.category.set(offlineId, newId);
                stats.categories.created++;
            } catch (err: any) {
                stats.categories.failed++;
                stats.errors.push(`Category "${cat.name}": ${err.message}`);
            }
        }
        logPhaseResult('Categories', stats.categories);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 2: Customers
    // ══════════════════════════════════════════════════════════════
    if (srcCustomers.length > 0) {
        log.header('Phase 2: Importing Customers…');
        for (const cust of srcCustomers) {
            try {
                const offlineId = cust.customer_id;
                const orClauses: any[] = [{ name: cust.name }];
                if (cust.email) orClauses.push({ email: cust.email });
                if (cust.phone) orClauses.push({ phone: cust.phone });

                const existing = await prisma.customer.findFirst({
                    where: { tenantId, branchId, OR: orClauses },
                });
                if (existing) {
                    idMap.customer.set(offlineId, existing.customerId);
                    stats.customers.skipped++;
                    continue;
                }
                const newId = uuidv4();
                await prisma.customer.create({
                    data: {
                        customerId: newId,
                        tenantId,
                        branchId,
                        userId: idMap.user.get(cust.user_id) || systemUserId,
                        name: cust.name,
                        email: cust.email || null,
                        phone: cust.phone || null,
                        address: cust.address || null,
                        isDefault: boolVal(cust.is_default, false),
                    },
                });
                idMap.customer.set(offlineId, newId);
                stats.customers.created++;
            } catch (err: any) {
                stats.customers.failed++;
                stats.errors.push(`Customer "${cust.name}": ${err.message}`);
            }
        }
        logPhaseResult('Customers', stats.customers);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 3: Products → Variants → Barcodes → Inventory
    // ══════════════════════════════════════════════════════════════
    if (!skipProducts) {
        log.header('Phase 3: Importing Products & Inventory…');

        // ── 3a. Products ────────────────────────────────────────
        const productBatches = chunk(srcProducts, batchSize);
        for (const batch of productBatches) {
            for (const p of batch) {
                try {
                    const offlineId: string = p.product_id;
                    const existing = await prisma.product.findFirst({
                        where: { tenantId, branchId, name: p.name },
                    });
                    if (existing) {
                        idMap.product.set(offlineId, existing.id);
                        stats.products.skipped++;
                        continue;
                    }
                    const newId = uuidv4();
                    await prisma.product.create({
                        data: {
                            id: newId,
                            tenantId,
                            branchId,
                            name: p.name,
                            categoryId: p.category_id
                                ? (idMap.category.get(p.category_id) || p.category_id)
                                : null,
                            description: p.description || null,
                            brand: p.brand || null,
                            isTaxable: boolVal(p.is_taxable, null),
                            supplierName: p.supplier_name || null,
                            supplierCode: p.supplier_code || null,
                            defaultUnit: p.default_unit || null,
                            imageUrl: p.image_url || null,
                            isActive: boolVal(p.is_active, true),
                        },
                    });
                    idMap.product.set(offlineId, newId);
                    stats.products.created++;
                } catch (err: any) {
                    stats.products.failed++;
                    stats.errors.push(`Product "${p.name}": ${err.message}`);
                }
            }
        }
        logPhaseResult('Products', stats.products);

        // ── 3b. Variants ────────────────────────────────────────
        const variantBatches = chunk(srcVariants, batchSize);
        for (const batch of variantBatches) {
            for (const v of batch) {
                try {
                    const offlineId: string = v.variant_id;
                    const productId = idMap.product.get(v.product_id) || v.product_id;
                    const variantName = v.variant_name || 'Default';

                    const existing = await prisma.productVariant.findFirst({
                        where: { productId, variantName },
                    });
                    if (existing) {
                        idMap.variant.set(offlineId, existing.id);
                        stats.variants.skipped++;
                        continue;
                    }
                    const newId = uuidv4();
                    await prisma.productVariant.create({
                        data: {
                            id: newId,
                            productId,
                            tenantId,
                            branchId,
                            variantName,
                            sku: v.sku || null,
                            primaryBarcode: v.primary_barcode || null,
                            sellingPrice: v.selling_price ?? 0,
                            costPrice: v.cost_price ?? 0,
                            unit: v.unit || 'piece',
                            isDefault: boolVal(v.is_default, true),
                            isActive: boolVal(v.is_active, true),
                            description: v.description || null,
                            brand: v.brand || null,
                            imageUrl: v.image_url || null,
                            isTaxable: boolVal(v.is_taxable, null),
                            size: v.size || null,
                            weight: v.weight ?? null,
                            weightUnit: v.weight_unit || null,
                            volume: v.volume ?? null,
                            volumeUnit: v.volume_unit || null,
                            dimensions: v.dimensions || null,
                            customAttributes: v.custom_attributes || undefined,
                            supplierName: v.supplier_name || null,
                            supplierCode: v.supplier_code || null,
                            promoPrice: v.promo_price ?? null,
                            promoStart: v.promo_start ? new Date(v.promo_start) : null,
                            promoEnd: v.promo_end ? new Date(v.promo_end) : null,
                            expirationDate: v.expiration_date ? new Date(v.expiration_date) : null,
                            manufactureDate: v.manufacture_date ? new Date(v.manufacture_date) : null,
                            expiryDateAlert: v.expiry_date_alert ?? null,
                        },
                    });
                    idMap.variant.set(offlineId, newId);
                    stats.variants.created++;
                } catch (err: any) {
                    stats.variants.failed++;
                    stats.errors.push(`Variant "${v.variant_name}" (product ${v.product_id}): ${err.message}`);
                }
            }
        }
        logPhaseResult('Variants', stats.variants);

        // ── 3c. Barcodes ────────────────────────────────────────
        if (srcBarcodes.length > 0) {
            for (const bc of srcBarcodes) {
                try {
                    const variantId = idMap.variant.get(bc.variant_id) || bc.variant_id;
                    const existing = await prisma.variantBarcode.findFirst({
                        where: { tenantId, branchId, barcode: bc.barcode },
                    });
                    if (existing) {
                        stats.barcodes.skipped++;
                        continue;
                    }
                    await prisma.variantBarcode.create({
                        data: {
                            id: uuidv4(),
                            variantId,
                            tenantId,
                            branchId,
                            barcode: bc.barcode,
                            barcodeType: bc.barcode_type || 'EAN13',
                            barcodeSource: bc.barcode_source || 'SUPPLIER',
                            description: bc.description || null,
                            isActive: boolVal(bc.is_active, true),
                        },
                    });
                    stats.barcodes.created++;
                } catch (err: any) {
                    stats.barcodes.failed++;
                    stats.errors.push(`Barcode "${bc.barcode}": ${err.message}`);
                }
            }
            logPhaseResult('Barcodes', stats.barcodes);
        }

        // ── 3d. Inventory ───────────────────────────────────────
        const invBatches = chunk(srcInventory, batchSize);
        for (const batch of invBatches) {
            for (const inv of batch) {
                try {
                    const offlineInvId: string = inv.inventory_id;
                    const productId = idMap.product.get(inv.product_id) || inv.product_id;
                    const variantId = inv.variant_id
                        ? (idMap.variant.get(inv.variant_id) || inv.variant_id)
                        : null;

                    // Unique constraint: [branchId, variantId]
                    if (variantId) {
                        const existing = await prisma.inventory.findFirst({
                            where: { branchId, variantId },
                        });
                        if (existing) {
                            idMap.inventory.set(offlineInvId, existing.id);
                            stats.inventory.skipped++;
                            continue;
                        }
                    }

                    const newId = uuidv4();
                    await prisma.inventory.create({
                        data: {
                            id: newId,
                            tenantId,
                            branchId,
                            productId,
                            variantId,
                            availableQuantity: inv.available_quantity ?? 0,
                            reservedQuantity: inv.reserved_quantity ?? 0,
                            damagedQuantity: inv.damaged_quantity ?? 0,
                            averageCost: inv.average_cost ?? 0,
                            lastPurchaseCost: inv.last_purchase_cost ?? 0,
                            reorderPoint: inv.reorder_point ?? null,
                            maxStock: inv.max_stock ?? null,
                            trackInventory: boolVal(inv.track_inventory, true),
                            allowNegativeStock: boolVal(inv.allow_negative_stock, false),
                            costingMethod: inv.costing_method || 'WEIGHTED_AVERAGE',
                            lastRestockedAt: inv.last_restocked_at ? new Date(inv.last_restocked_at) : null,
                            lastSoldAt: inv.last_sold_at ? new Date(inv.last_sold_at) : null,
                        },
                    });
                    idMap.inventory.set(offlineInvId, newId);
                    stats.inventory.created++;
                } catch (err: any) {
                    stats.inventory.failed++;
                    stats.errors.push(`Inventory (variant ${inv.variant_id}): ${err.message}`);
                }
            }
        }
        logPhaseResult('Inventory', stats.inventory);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 4: Sales → SaleItems → SalePayments
    // ══════════════════════════════════════════════════════════════
    // Build lookups that are also used in Phase 5
    const itemsBySale = new Map<string, any[]>();
    for (const item of srcSaleItems) {
        const key = item.sale_id;
        const list = itemsBySale.get(key) || [];
        list.push(item);
        itemsBySale.set(key, list);
    }

    const paymentsBySale = new Map<string, any[]>();
    for (const pay of srcSalePayments) {
        const key = pay.sale_id;
        const list = paymentsBySale.get(key) || [];
        list.push(pay);
        paymentsBySale.set(key, list);
    }

    if (!skipSales && srcSales.length > 0) {
        log.header('Phase 4: Importing Sales…');

        const MIGRATION_PREFIX = 'MIG';
        const saleBatches = chunk(srcSales, batchSize);

        for (const batch of saleBatches) {
            for (const sale of batch) {
                try {
                    const offlineSaleId: string = sale.sale_id;
                    const migratedSaleNumber = `${MIGRATION_PREFIX}-${sale.sale_number || offlineSaleId}`;

                    // Duplicate check
                    const existing = await prisma.sale.findFirst({
                        where: { tenantId, branchId, saleNumber: migratedSaleNumber },
                    });
                    if (existing) {
                        idMap.sale.set(offlineSaleId, existing.id);
                        stats.sales.skipped++;
                        continue;
                    }

                    const newSaleId = uuidv4();

                    // Resolve foreign keys
                    const userId = idMap.user.get(sale.user_id) || systemUserId;
                    const customerId = sale.customer_id
                        ? (idMap.customer.get(sale.customer_id) || sale.customer_id)
                        : null;
                    const paymentMethodId = sale.payment_method_id
                        ? (idMap.paymentMethod.get(sale.payment_method_id) || sale.payment_method_id)
                        : null;

                    const items = itemsBySale.get(offlineSaleId) || [];
                    const payments = paymentsBySale.get(offlineSaleId) || [];

                    // ── Atomic transaction: sale + items + payments ──
                    await prisma.$transaction(async (tx: any) => {
                        await tx.sale.create({
                            data: {
                                id: newSaleId,
                                tenantId,
                                branchId,
                                saleNumber: migratedSaleNumber,
                                customerId,
                                terminalId: MIGRATION_TERMINAL_ID,
                                userId,
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
                                isVoided: boolVal(sale.is_voided, false),
                                voidedAt: sale.voided_at ? new Date(sale.voided_at) : null,
                                voidedBy: sale.voided_by || null,
                                voidReason: sale.void_reason || null,
                                notes: sale.notes
                                    ? `[MIGRATED] ${sale.notes}`
                                    : `[MIGRATED] Offline sale ${sale.sale_number || offlineSaleId}`,
                                createdAt: sale.created_at ? new Date(sale.created_at) : new Date(),
                                updatedAt: sale.updated_at ? new Date(sale.updated_at) : new Date(),
                            },
                        });

                        // Sale items
                        for (const item of items) {
                            const variantId = idMap.variant.get(item.variant_id) || item.variant_id;
                            const productId = idMap.product.get(item.product_id) || item.product_id;

                            await tx.saleItem.create({
                                data: {
                                    id: uuidv4(),
                                    tenantId,
                                    branchId,
                                    saleId: newSaleId,
                                    productId,
                                    variantId,
                                    quantity: item.quantity ?? 1,
                                    unitPrice: item.unit_price ?? 0,
                                    unitCost: item.unit_cost ?? 0,
                                    subtotal: item.subtotal ?? ((item.quantity ?? 1) * (item.unit_price ?? 0)),
                                    taxAmount: item.tax_amount ?? 0,
                                    discountAmount: item.discount_amount ?? 0,
                                    totalAmount: item.total_amount
                                        ?? item.subtotal
                                        ?? ((item.quantity ?? 1) * (item.unit_price ?? 0)),
                                },
                            });
                            stats.saleItems.created++;
                        }

                        // Sale payments
                        if (payments.length > 0) {
                            for (const pay of payments) {
                                const pmId = idMap.paymentMethod.get(pay.payment_method_id)
                                    || pay.payment_method_id;

                                await tx.salePayment.create({
                                    data: {
                                        id: uuidv4(),
                                        tenantId,
                                        branchId,
                                        saleId: newSaleId,
                                        paymentMethodId: pmId,
                                        amount: pay.amount ?? 0,
                                        reference: pay.reference || null,
                                        providerId: pay.provider_id || null,
                                        providerRef: pay.provider_ref || null,
                                        status: pay.status || 'COMPLETED',
                                        processedAt: pay.processed_at ? new Date(pay.processed_at) : new Date(),
                                        notes: pay.notes || null,
                                    },
                                });
                                stats.salePayments.created++;
                            }
                        } else if (paymentMethodId) {
                            // Auto-create a single payment from sale header
                            await tx.salePayment.create({
                                data: {
                                    id: uuidv4(),
                                    tenantId,
                                    branchId,
                                    saleId: newSaleId,
                                    paymentMethodId,
                                    amount: sale.amount_paid ?? sale.total_amount ?? 0,
                                    status: 'COMPLETED',
                                    processedAt: sale.sale_date ? new Date(sale.sale_date) : new Date(),
                                },
                            });
                            stats.salePayments.created++;
                        }
                    });

                    idMap.sale.set(offlineSaleId, newSaleId);
                    stats.sales.created++;
                } catch (err: any) {
                    stats.sales.failed++;
                    stats.errors.push(`Sale "${sale.sale_number || sale.sale_id}": ${err.message}`);
                }
            }
            printProgress('Sales', stats.sales, srcSales.length);
        }
        logPhaseResult('Sales', stats.sales);
        logPhaseResult('Sale Items', stats.saleItems);
        logPhaseResult('Sale Payments', stats.salePayments);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 5: Stock Movements
    // ══════════════════════════════════════════════════════════════
    log.header('Phase 5: Stock Movements…');

    if (srcStockMovements.length > 0 && !skipMovements) {
        // ── Import explicit movements from the backup ───────────
        log.info('Importing stock movements from SQLite…');
        const mvBatches = chunk(srcStockMovements, batchSize);
        for (const batch of mvBatches) {
            for (const mv of batch) {
                try {
                    const inventoryId = idMap.inventory.get(mv.inventory_id) || mv.inventory_id;
                    const referenceId = mv.reference_id
                        ? (idMap.sale.get(mv.reference_id) || mv.reference_id)
                        : null;

                    // Duplicate check: same inventory + reference + type
                    const existingMv = await prisma.stockMovement.findFirst({
                        where: {
                            tenantId, branchId, inventoryId,
                            referenceId: referenceId,
                            movementType: mv.movement_type,
                            deletedAt: null,
                        },
                    });
                    if (existingMv) {
                        stats.stockMovements.skipped++;
                        continue;
                    }

                    await prisma.stockMovement.create({
                        data: {
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            inventoryId,
                            movementType: mv.movement_type,
                            quantity: mv.quantity,
                            previousQuantity: mv.previous_quantity ?? 0,
                            newQuantity: mv.new_quantity ?? 0,
                            referenceType: mv.reference_type || null,
                            referenceId: referenceId,
                            unitCost: mv.unit_cost ?? 0,
                            totalCost: mv.total_cost ?? ((mv.unit_cost ?? 0) * (mv.quantity ?? 0)),
                            notes: mv.notes || `[MIGRATED] ${mv.movement_type}`,
                            movedBy: idMap.user.get(mv.moved_by) || systemUserId,
                            movementDate: mv.movement_date ? new Date(mv.movement_date) : new Date(),
                        },
                    });
                    stats.stockMovements.created++;
                } catch (err: any) {
                    stats.stockMovements.failed++;
                    stats.errors.push(`StockMovement (inv ${mv.inventory_id}): ${err.message}`);
                }
            }
        }
    } else if (!skipSales && !skipMovements && srcSales.length > 0) {
        // ── Auto-generate SALE movements from imported sales ────
        log.info('Auto-generating stock movements from imported sales…');

        // Build variant → inventoryId lookup from online DB
        const allInventory = await prisma.inventory.findMany({
            where: { tenantId, branchId },
            select: { id: true, variantId: true },
        });
        const variantToInv = new Map<string, string>();
        for (const inv of allInventory) {
            if (inv.variantId) variantToInv.set(inv.variantId, inv.id);
        }

        for (const sale of srcSales) {
            const offlineSaleId: string = sale.sale_id;
            const newSaleId = idMap.sale.get(offlineSaleId);
            if (!newSaleId) continue;

            // Only for non-voided completed sales
            const status = sale.status || 'COMPLETED';
            if (status === 'VOIDED' || boolVal(sale.is_voided, false)) continue;

            const items = itemsBySale.get(offlineSaleId) || [];
            for (const item of items) {
                try {
                    const variantId = idMap.variant.get(item.variant_id) || item.variant_id;
                    const inventoryId = variantToInv.get(variantId);
                    if (!inventoryId) {
                        stats.errors.push(
                            `No inventory for variant ${item.variant_id} (sale ${offlineSaleId})`
                        );
                        stats.stockMovements.failed++;
                        continue;
                    }

                    // Duplicate check: same inventory + sale reference
                    const existingMv = await prisma.stockMovement.findFirst({
                        where: {
                            tenantId, branchId, inventoryId,
                            referenceId: newSaleId,
                            referenceType: 'SALE',
                            movementType: 'SALE',
                            deletedAt: null,
                        },
                    });
                    if (existingMv) {
                        stats.stockMovements.skipped++;
                        continue;
                    }

                    await prisma.stockMovement.create({
                        data: {
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            inventoryId,
                            movementType: 'SALE',
                            quantity: item.quantity ?? 1,
                            previousQuantity: 0,
                            newQuantity: 0,
                            referenceType: 'SALE',
                            referenceId: newSaleId,
                            unitCost: item.unit_cost ?? 0,
                            totalCost: (item.unit_cost ?? 0) * (item.quantity ?? 1),
                            notes: `[MIGRATED] Sale ${sale.sale_number || offlineSaleId}`,
                            movedBy: systemUserId,
                            movementDate: sale.sale_date ? new Date(sale.sale_date) : new Date(),
                        },
                    });
                    stats.stockMovements.created++;
                } catch (err: any) {
                    stats.stockMovements.failed++;
                    stats.errors.push(`Auto-movement (sale ${offlineSaleId}, variant ${item.variant_id}): ${err.message}`);
                }
            }
        }
    } else {
        log.dim('Stock movements skipped.');
    }
    logPhaseResult('Stock Movements', stats.stockMovements);

    // ══════════════════════════════════════════════════════════════
    // PHASE 6: (Optional) Recalculate Inventory from Movements
    // ══════════════════════════════════════════════════════════════
    if (recalcInventory) {
        log.header('Phase 6: Recalculating inventory from stock movements…');
        await recalculateInventoryFromMovements(prisma, tenantId, branchId);
        log.ok('Inventory quantities recalculated');
    }

    // ══════════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════════
    printFinalSummary(stats);

    // Save ID mappings for reference / debugging
    const mappingFile = path.resolve('mapped-data', '_id_mappings.json');
    fs.mkdirSync(path.dirname(mappingFile), { recursive: true });
    const mappings: Record<string, Record<string, string>> = {};
    for (const [key, map] of Array.from(Object.entries(idMap))) {
        mappings[key] = Object.fromEntries(Array.from(map.entries()));
    }
    fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2));
    log.ok(`ID mappings saved to ${mappingFile}`);

    process.exit(stats.errors.length > 0 ? 1 : 0);
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/** SQLite stores booleans as 0/1 integers. Convert safely. */
function boolVal(v: any, fallback: boolean): boolean;
function boolVal(v: any, fallback: null): boolean | null;
function boolVal(v: any, fallback: boolean | null): boolean | null {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
    return fallback;
}

// ──────────────────────────────────────────────────────────────────
// Recalculate Inventory
// ──────────────────────────────────────────────────────────────────
const INCREASE_TYPES = new Set([
    'PURCHASE_RECEIPT', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'OPENING_BALANCE',
]);
const DECREASE_TYPES = new Set([
    'SALE', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY', 'RETURN_TO_SUPPLIER',
]);

async function recalculateInventoryFromMovements(
    prisma: any,
    tid: string,
    bid: string,
) {
    const inventories = await prisma.inventory.findMany({
        where: { tenantId: tid, branchId: bid },
        select: { id: true },
    });

    for (const inv of inventories) {
        const movements = await prisma.stockMovement.findMany({
            where: { inventoryId: inv.id },
            orderBy: { movementDate: 'asc' },
        });

        let runningQty = 0;
        for (const mv of movements) {
            if (INCREASE_TYPES.has(mv.movementType)) {
                runningQty += mv.quantity;
            } else if (DECREASE_TYPES.has(mv.movementType)) {
                runningQty -= mv.quantity;
            }
        }

        await prisma.inventory.update({
            where: { id: inv.id },
            data: { availableQuantity: runningQty },
        });
    }
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
        ['Customers', stats.customers],
        ['Products', stats.products],
        ['Variants', stats.variants],
        ['Barcodes', stats.barcodes],
        ['Inventory', stats.inventory],
        ['Sales', stats.sales],
        ['Sale Items', stats.saleItems],
        ['Sale Payments', stats.salePayments],
        ['Stock Movements', stats.stockMovements],
    ];

    console.log('');
    for (const [label, s] of sections) {
        if (s.created + s.skipped + s.failed > 0) {
            console.log(
                `  ${label.padEnd(18)} ` +
                `${C.green}${String(s.created).padStart(5)} created${C.reset}  ` +
                `${C.yellow}${String(s.skipped).padStart(5)} skipped${C.reset}  ` +
                `${C.red}${String(s.failed).padStart(5)} failed${C.reset}`
            );
        }
    }
    console.log('');

    if (stats.errors.length > 0) {
        log.header('ERRORS:');
        stats.errors.slice(0, 30).forEach(e => log.err(e));
        if (stats.errors.length > 30) {
            log.warn(`… and ${stats.errors.length - 30} more errors`);
        }
    } else {
        log.ok('No errors!');
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
