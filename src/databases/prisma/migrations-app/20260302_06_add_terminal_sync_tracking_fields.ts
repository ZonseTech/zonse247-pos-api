/**
 * Migration: 20260302_06
 * Description: Add sync tracking fields to Terminal model
 * 
 * Adds:
 * - lastSyncAt: DateTime? - Last successful sync timestamp
 * - lastSeenAt: DateTime? - Last heartbeat/activity timestamp
 * 
 * These fields will be updated by the sync service to track terminal connectivity.
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

const dropProcedureFirst = `DROP PROCEDURE IF EXISTS add_column_if_not_exists`;
const dropProcedure = `DROP PROCEDURE IF EXISTS add_column_if_not_exists`;

export const migration: Migration = {
    version: '20260302_06',
    description: 'Add sync tracking fields to Terminal model',
    up: {
        sqlite: [
            `ALTER TABLE "terminals" ADD COLUMN "last_sync_at" DATETIME`,
            `ALTER TABLE "terminals" ADD COLUMN "last_seen_at" DATETIME`,
        ],
        mysql: [
            dropProcedureFirst,
            createColumnProcedure,
            `CALL add_column_if_not_exists('terminals', 'last_sync_at', 'DATETIME NULL')`,
            `CALL add_column_if_not_exists('terminals', 'last_seen_at', 'DATETIME NULL')`,
            dropProcedure,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN easily, but for completeness:
            `ALTER TABLE "terminals" DROP COLUMN "last_sync_at"`,
            `ALTER TABLE "terminals" DROP COLUMN "last_seen_at"`,
        ],
        mysql: [
            `ALTER TABLE \`terminals\` DROP COLUMN \`last_sync_at\``,
            `ALTER TABLE \`terminals\` DROP COLUMN \`last_seen_at\``,
        ],
    },
};
