/**
 * Migration: 20260302_03
 * Description: Add origin tracking (terminal_id) to syncable tables to identify which terminal created/modified records
 * 
 * This migration adds a nullable `terminal_id` column to syncable tables that don't already have it.
 * This enables:
 * - Tracking which terminal originated a record
 * - Conflict resolution during sync (knowing the source)
 * - Audit trail for multi-terminal environments
 * 
 * Records created centrally (admin panel, API) will have terminal_id = NULL.
 * 
 * Tables already having terminal_id (skipped):
 * - sales, categories, parked_sales, printers, print_jobs
 * 
 * Tables receiving terminal_id:
 * - products, product_variants, variant_barcodes, suppliers
 * - purchase_orders, purchase_order_items, inventory, stock_movements
 * - sale_items, sale_payments, customers, payment_methods
 * - parked_sale_items, staff
 */

import { Migration } from '../migration.types';

// Tables that need terminal_id added (don't already have it)
const tablesNeedingTerminalId = [
    'products',
    'product_variants',
    'variant_barcodes',
    'suppliers',
    'purchase_orders',
    'purchase_order_items',
    'inventory',
    'stock_movements',
    'sale_items',
    'sale_payments',
    'customers',
    'payment_methods',
    'parked_sale_items',
    'staff',
];

// Generate SQLite ALTER TABLE statements
const sqliteStatements = tablesNeedingTerminalId.map(table =>
    `ALTER TABLE "${table}" ADD COLUMN "terminal_id" TEXT`
);

// Add indexes for terminal_id on frequently queried tables
const sqliteIndexStatements = [
    'products',
    'product_variants',
    'inventory',
    'sale_items',
    'customers',
].map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_terminal_id" ON "${table}" ("terminal_id")`
);

// Generate MySQL ALTER TABLE statements
const mysqlStatements = tablesNeedingTerminalId.map(table =>
    `ALTER TABLE \`${table}\` ADD COLUMN \`terminal_id\` VARCHAR(191) NULL`
);

// Add indexes for terminal_id on frequently queried tables (MySQL)
const mysqlIndexStatements = [
    'products',
    'product_variants',
    'inventory',
    'sale_items',
    'customers',
].map(table =>
    `CREATE INDEX \`idx_${table}_terminal_id\` ON \`${table}\` (\`terminal_id\`)`
);

export const migration: Migration = {
    version: '20260302_03',
    description: 'Add origin tracking (terminal_id) to syncable tables to identify which terminal created/modified records',
    up: {
        sqlite: [
            ...sqliteStatements,
            ...sqliteIndexStatements,
        ],
        mysql: [
            ...mysqlStatements,
            ...mysqlIndexStatements,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN directly, would need table recreation
            ...tablesNeedingTerminalId.map(table =>
                `-- Cannot drop column in SQLite: ALTER TABLE "${table}" DROP COLUMN "terminal_id"`
            ),
        ],
        mysql: tablesNeedingTerminalId.map(table =>
            `ALTER TABLE \`${table}\` DROP COLUMN \`terminal_id\``
        ),
    },
};
