/**
 * Migration: 20260306_01
 * Description: Add updatedAt column to sale_items and stock_movements tables for sync support
 * 
 * All tables that participate in sync must have: createdAt, updatedAt, version, deletedAt, terminalId
 * 
 * This migration adds the missing `updatedAt` column to:
 * - sale_items
 * - stock_movements
 * 
 * Also adds indexes on updatedAt for efficient delta sync queries.
 */

import { Migration } from '../migration.types';

// Tables that need updatedAt column added
const tablesNeedingUpdatedAt = [
    'sale_items',
    'stock_movements',
];

// Generate SQLite statements
const sqliteAddColumns = tablesNeedingUpdatedAt.map(table =>
    `ALTER TABLE "${table}" ADD COLUMN "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
);

// Initialize updatedAt to createdAt for existing records
const sqliteUpdateExisting = tablesNeedingUpdatedAt.map(table =>
    `UPDATE "${table}" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL OR "updated_at" = ''`
);

// Add indexes for sync delta queries
const sqliteAddIndexes = tablesNeedingUpdatedAt.map(table =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_updated_at" ON "${table}" ("updated_at")`
);

// Generate MySQL statements
const mysqlAddColumns = tablesNeedingUpdatedAt.map(table =>
    `ALTER TABLE \`${table}\` ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
);

// Initialize updatedAt to createdAt for existing records
const mysqlUpdateExisting = tablesNeedingUpdatedAt.map(table =>
    `UPDATE \`${table}\` SET \`updated_at\` = \`created_at\` WHERE \`updated_at\` IS NULL`
);

// Add indexes for sync delta queries
const mysqlAddIndexes = tablesNeedingUpdatedAt.map(table =>
    `CREATE INDEX \`idx_${table}_updated_at\` ON \`${table}\` (\`updated_at\`)`
);

export const migration: Migration = {
    version: '20260306_01',
    description: 'Add updatedAt column to sale_items and stock_movements tables for sync support',
    up: {
        sqlite: [
            ...sqliteAddColumns,
            ...sqliteUpdateExisting,
            ...sqliteAddIndexes,
        ],
        mysql: [
            ...mysqlAddColumns,
            ...mysqlUpdateExisting,
            ...mysqlAddIndexes,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN directly
            ...tablesNeedingUpdatedAt.map(table =>
                `DROP INDEX IF EXISTS "idx_${table}_updated_at"`
            ),
            ...tablesNeedingUpdatedAt.map(table =>
                `-- Cannot drop column in SQLite: ALTER TABLE "${table}" DROP COLUMN "updated_at"`
            ),
        ],
        mysql: [
            ...tablesNeedingUpdatedAt.map(table =>
                `DROP INDEX \`idx_${table}_updated_at\` ON \`${table}\``
            ),
            ...tablesNeedingUpdatedAt.map(table =>
                `ALTER TABLE \`${table}\` DROP COLUMN \`updated_at\``
            ),
        ],
    },
};
