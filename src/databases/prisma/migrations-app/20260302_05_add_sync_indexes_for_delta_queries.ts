/**
 * Migration: 20260302_05
 * Description: Add sync indexes for efficient delta queries during synchronization
 * 
 * This migration adds indexes to support efficient delta sync queries:
 * - @@index([tenantId, branchId, updatedAt]) - For filtering by tenant/branch and sorting by update time
 * - @@index([updatedAt]) - For global timestamp-based queries
 * - @@index([deletedAt]) - For soft-delete filtering
 * 
 * For tables without branchId (like User), we use @@index([tenantId, updatedAt]) instead.
 * For child tables (like SaleItem, PurchaseOrderItem), only updatedAt and deletedAt indexes are added.
 * 
 * Syncable tables receiving indexes:
 * - products, product_variants, variant_barcodes
 * - suppliers, purchase_orders, purchase_order_items
 * - inventory, stock_movements
 * - sales, sale_items, sale_payments
 * - categories, customers, payment_methods
 * - terminals, users
 * - parked_sales, parked_sale_items
 * - printers, print_jobs
 * - staff
 */

import { Migration } from '../migration.types';

// Tables with tenantId AND branchId (full sync delta index)
const tablesWithTenantAndBranch = [
    'products',
    'product_variants',
    'variant_barcodes',
    'suppliers',
    'purchase_orders',
    'inventory',
    'sales',
    'categories',
    'customers',
    'terminals',
    'parked_sales',
    'printers',
    'print_jobs',
    'staff',
];

// Tables with tenantId but NO branchId
const tablesWithTenantOnly = [
    'users',
];

// Child tables without tenant_id/branch_id that HAVE updatedAt column
const childTablesWithUpdatedAt = [
    'purchase_order_items',
    'sale_payments',
];

// Child tables without tenant_id/branch_id that do NOT have updatedAt column
const childTablesNoUpdatedAt = [
    'sale_items',
    'parked_sale_items',
];

// Tables without tenant_id/branch_id but have updatedAt
const tablesNoTenant = [
    'payment_methods',
];

// Tables that don't have updated_at column yet (only deletedAt index)
const tablesNoUpdatedAt = [
    'stock_movements',
];

// All tables that have updatedAt column (for updatedAt index)
const tablesWithUpdatedAt = [
    ...tablesWithTenantAndBranch,
    ...tablesWithTenantOnly,
    ...childTablesWithUpdatedAt,
    ...tablesNoTenant,
];

// All tables that have deletedAt column (all syncable tables)
const tablesWithDeletedAt = [
    ...tablesWithTenantAndBranch,
    ...tablesWithTenantOnly,
    ...childTablesWithUpdatedAt,
    ...childTablesNoUpdatedAt,
    ...tablesNoTenant,
    ...tablesNoUpdatedAt,
];

// Generate SQLite index statements for tables with tenant + branch
const sqliteTenantBranchIndexes = tablesWithTenantAndBranch.map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_sync_delta" ON "${table}" ("tenant_id", "branch_id", "updated_at")`
);

// Tables with tenant only - different index
const sqliteTenantOnlyIndexes = tablesWithTenantOnly.map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_sync_delta" ON "${table}" ("tenant_id", "updated_at")`
);

const sqliteUpdatedAtIndexes = tablesWithUpdatedAt.map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_updated_at" ON "${table}" ("updated_at")`
);

const sqliteDeletedAtIndexes = tablesWithDeletedAt.map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_deleted_at" ON "${table}" ("deleted_at")`
);

// For MySQL, we need separate statements: procedure, calls, cleanup
// 1. Create a helper stored procedure
const createMysqlProcedure = `
CREATE PROCEDURE IF NOT EXISTS create_idx_if_not_exists(
    IN p_table VARCHAR(255), 
    IN p_index VARCHAR(255), 
    IN p_columns VARCHAR(500)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO index_exists 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index;
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX \`', p_index, '\` ON \`', p_table, '\` (', p_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END
`;

// 2. DROP procedure if exists first (for clean slate)
const dropMysqlProcedureFirst = `DROP PROCEDURE IF EXISTS create_idx_if_not_exists`;

// 3. Drop procedure at the end
const dropMysqlProcedure = `DROP PROCEDURE IF EXISTS create_idx_if_not_exists`;

// Generate CALL statements for MySQL indexes
const mysqlTenantBranchIndexes = tablesWithTenantAndBranch.map(table =>
    `CALL create_idx_if_not_exists('${table}', 'idx_${table}_sync_delta', '\`tenant_id\`, \`branch_id\`, \`updated_at\`')`
);

const mysqlTenantOnlyIndexes = tablesWithTenantOnly.map(table =>
    `CALL create_idx_if_not_exists('${table}', 'idx_${table}_sync_delta', '\`tenant_id\`, \`updated_at\`')`
);

const mysqlUpdatedAtIndexes = tablesWithUpdatedAt.map(table =>
    `CALL create_idx_if_not_exists('${table}', 'idx_${table}_updated_at', '\`updated_at\`')`
);

const mysqlDeletedAtIndexes = tablesWithDeletedAt.map(table =>
    `CALL create_idx_if_not_exists('${table}', 'idx_${table}_deleted_at', '\`deleted_at\`')`
);

export const migration: Migration = {
    version: '20260302_05',
    description: 'Add sync indexes for efficient delta queries during synchronization',
    up: {
        sqlite: [
            ...sqliteTenantBranchIndexes,
            ...sqliteTenantOnlyIndexes,
            ...sqliteUpdatedAtIndexes,
            ...sqliteDeletedAtIndexes,
        ],
        mysql: [
            // Setup: create helper procedure
            dropMysqlProcedureFirst,
            createMysqlProcedure,
            // Create indexes via procedure calls
            ...mysqlTenantBranchIndexes,
            ...mysqlTenantOnlyIndexes,
            ...mysqlUpdatedAtIndexes,
            ...mysqlDeletedAtIndexes,
            // Cleanup: drop helper procedure
            dropMysqlProcedure,
        ],
    },
    down: {
        sqlite: [
            // Drop sync delta indexes
            ...tablesWithTenantAndBranch.map(table =>
                `DROP INDEX IF EXISTS "idx_${table}_sync_delta"`
            ),
            ...tablesWithTenantOnly.map(table =>
                `DROP INDEX IF EXISTS "idx_${table}_sync_delta"`
            ),
            // Drop updated_at indexes
            ...tablesWithUpdatedAt.map(table =>
                `DROP INDEX IF EXISTS "idx_${table}_updated_at"`
            ),
            // Drop deleted_at indexes
            ...tablesWithDeletedAt.map(table =>
                `DROP INDEX IF EXISTS "idx_${table}_deleted_at"`
            ),
        ],
        mysql: [
            // Drop sync delta indexes
            ...tablesWithTenantAndBranch.map(table =>
                `DROP INDEX \`idx_${table}_sync_delta\` ON \`${table}\``
            ),
            ...tablesWithTenantOnly.map(table =>
                `DROP INDEX \`idx_${table}_sync_delta\` ON \`${table}\``
            ),
            // Drop updated_at indexes
            ...tablesWithUpdatedAt.map(table =>
                `DROP INDEX \`idx_${table}_updated_at\` ON \`${table}\``
            ),
            // Drop deleted_at indexes
            ...tablesWithDeletedAt.map(table =>
                `DROP INDEX \`idx_${table}_deleted_at\` ON \`${table}\``
            ),
        ],
    },
};
