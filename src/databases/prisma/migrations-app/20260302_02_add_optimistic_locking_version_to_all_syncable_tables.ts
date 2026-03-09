/**
 * Migration: 20260302_02
 * Description: Add optimistic locking (version) column to all syncable tables for conflict detection during sync
 * 
 * This migration adds the `version` counter to every syncable table to enable:
 * - Optimistic locking for concurrent update detection
 * - Sync conflict resolution (detect when records have been modified elsewhere)
 * - Prevent lost updates in multi-device scenarios
 * 
 * Usage: Increment version on every UPDATE. During sync, if version doesn't match expected, handle conflict.
 * 
 * Tables NOT affected (immutable/audit logs):
 * - audit_logs
 * - transactions
 * - mra_api_config_table
 * - db_meta
 */

import { Migration } from '../migration.types';

// List of tables that need optimistic locking (same as soft-delete tables)
const tablesWithVersion = [
    'products',
    'product_variants',
    'variant_barcodes',
    'suppliers',
    'purchase_orders',
    'purchase_order_items',
    'inventory',
    'stock_movements',
    'sales',
    'sale_items',
    'sale_payments',
    'categories',
    'customers',
    'payment_methods',
    'terminals',
    'users',
    'printers',
    'print_jobs',
    'parked_sales',
    'parked_sale_items',
    'staff',
];

// Generate SQLite ALTER TABLE statements
const sqliteStatements = tablesWithVersion.map(table =>
    `ALTER TABLE "${table}" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1`
);

// Generate MySQL ALTER TABLE statements
const mysqlStatements = tablesWithVersion.map(table =>
    `ALTER TABLE \`${table}\` ADD COLUMN \`version\` INT NOT NULL DEFAULT 1`
);

export const migration: Migration = {
    version: '20260302_02',
    description: 'Add optimistic locking (version) column to all syncable tables for conflict detection during sync',
    up: {
        sqlite: sqliteStatements,
        mysql: mysqlStatements,
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN directly, would need table recreation
            // These are here for documentation purposes
            ...tablesWithVersion.map(table =>
                `-- Cannot drop column in SQLite: ALTER TABLE "${table}" DROP COLUMN "version"`
            ),
        ],
        mysql: tablesWithVersion.map(table =>
            `ALTER TABLE \`${table}\` DROP COLUMN \`version\``
        ),
    },
};
