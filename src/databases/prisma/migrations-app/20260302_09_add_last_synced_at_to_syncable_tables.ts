/**
 * Migration: 20260302_09
 * Description: Add lastSyncedAt column to tables with synced field
 * 
 * Adds the `last_synced_at` DATETIME column to tables that have the `synced` 
 * field. This allows tracking when each record was last synced, enabling 
 * time-based conflict resolution and sync status monitoring.
 * 
 * Tables affected:
 * - sale_payments
 * - categories
 * - customers
 * - payment_methods
 * - terminals
 * - users
 * - parked_sales
 * - printers
 * - staff
 */

import { Migration } from '../migration.types';

// Helper stored procedure for idempotent column addition
const createColumnProcedure = `
CREATE PROCEDURE IF NOT EXISTS add_column_if_not_exists(
    IN p_table VARCHAR(255), 
    IN p_column VARCHAR(255), 
    IN p_definition VARCHAR(500)
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO column_exists 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column;
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE \`', p_table, '\` ADD COLUMN \`', p_column, '\` ', p_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END
`;

const tables = [
    'sale_payments',
    'categories',
    'customers',
    'payment_methods',
    'terminals',
    'users',
    'parked_sales',
    'printers',
    'staff'
];

export const migration: Migration = {
    version: '20260302_09',
    description: 'Add lastSyncedAt column to tables with synced field',
    up: {
        mysql: [
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            createColumnProcedure,
            ...tables.map(table =>
                `CALL add_column_if_not_exists('${table}', 'last_synced_at', 'DATETIME NULL')`
            ),
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
        ],
        sqlite: [
            // SQLite doesn't support AFTER clause, columns are added at the end
            ...tables.map(table =>
                `ALTER TABLE "${table}" ADD COLUMN "last_synced_at" DATETIME NULL`
            ),
        ]
    },
    down: {
        mysql: [
            ...tables.map(table =>
                `ALTER TABLE \`${table}\` DROP COLUMN \`last_synced_at\``
            ),
        ],
        sqlite: [
            // SQLite doesn't support DROP COLUMN in older versions
            // Would need table recreation for rollback
            `SELECT 1` // Placeholder - manual intervention needed for SQLite rollback
        ]
    }
};
