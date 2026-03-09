/**
 * Migration: 20260302_01
 * Description: Add soft-delete (deleted_at) column to all syncable tables for offline sync tombstone support
 * 
 * This migration adds the `deleted_at` timestamp to every syncable table to enable:
 * - Offline sync tombstone records (marking records as deleted during sync)
 * - Multi-tenant isolation with proper record lifecycle tracking
 * - Financial integrity by preserving audit trail
 * 
 * Note: existing `is_active` fields are preserved for temporary deactivation (e.g., suspending a product).
 * Soft-delete (deleted_at != null) means the record is permanently gone for sync purposes.
 * 
 * Tables NOT affected (immutable/audit logs):
 * - audit_logs
 * - transactions
 * - mra_api_config_table
 * - db_meta
 */

import { Migration } from '../migration.types';

// List of tables that need soft-delete support
const tablesWithSoftDelete = [
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
const sqliteStatements = tablesWithSoftDelete.map(table =>
    `ALTER TABLE "${table}" ADD COLUMN "deleted_at" DATETIME`
);

// Add indexes for deleted_at on frequently queried tables
const sqliteIndexStatements = [
    'products',
    'product_variants',
    'inventory',
    'sales',
    'customers',
    'categories',
    'users',
    'terminals',
].map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_deleted_at" ON "${table}" ("deleted_at")`
);

// Generate MySQL ALTER TABLE statements
const mysqlStatements = tablesWithSoftDelete.map(table =>
    `ALTER TABLE \`${table}\` ADD COLUMN \`deleted_at\` DATETIME(3) NULL`
);

// Add indexes for deleted_at on frequently queried tables (MySQL)
const mysqlIndexStatements = [
    'products',
    'product_variants',
    'inventory',
    'sales',
    'customers',
    'categories',
    'users',
    'terminals',
].map(table =>
    `CREATE INDEX \`idx_${table}_deleted_at\` ON \`${table}\` (\`deleted_at\`)`
);

export const migration: Migration = {
    version: '20260302_01',
    description: 'Add soft-delete (deleted_at) column to all syncable tables for offline sync tombstone support',
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
            // For rollback purposes, we document what needs to be done
            `-- Note: SQLite doesn't support DROP COLUMN. To rollback, tables need to be recreated.`,
            `-- This is a soft migration - deleted_at columns will remain but can be ignored.`,
        ],
        mysql: [
            // Drop indexes first
            ...[
                'products',
                'product_variants',
                'inventory',
                'sales',
                'customers',
                'categories',
                'users',
                'terminals',
            ].map(table =>
                `DROP INDEX \`idx_${table}_deleted_at\` ON \`${table}\``
            ),
            // Then drop columns
            ...tablesWithSoftDelete.map(table =>
                `ALTER TABLE \`${table}\` DROP COLUMN \`deleted_at\``
            ),
        ],
    },
};
