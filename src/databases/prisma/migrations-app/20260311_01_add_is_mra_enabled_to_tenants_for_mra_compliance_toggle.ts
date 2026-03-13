/**
 * Migration: 20260311_01
 * Description: Add MRA compliance toggle and environment fields to Tenant model
 * 
 * Adds:
 * - isMraEnabled: Boolean (default false) - Toggle for MRA compliance requirements
 * - mraEnvironment: String (default 'SANDBOX') - MRA API environment (SANDBOX/PRODUCTION)
 * 
 * Also adds NOT_APPLICABLE to MraSaleStatus enum for sales from non-MRA tenants.
 * 
 * This allows tenants to operate without MRA compliance requirements:
 * - Non-Malawi businesses
 * - Businesses below turnover threshold
 * - Exempt businesses
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

export const migration: Migration = {
    version: '20260311_01',
    description: 'Add MRA compliance toggle and environment fields to Tenant model',
    up: {
        sqlite: [
            // Add is_mra_enabled column with default false
            `ALTER TABLE "tenants" ADD COLUMN "is_mra_enabled" INTEGER DEFAULT 0`,
            // Add mra_environment column with default 'SANDBOX'
            `ALTER TABLE "tenants" ADD COLUMN "mra_environment" TEXT DEFAULT 'SANDBOX'`,
        ],
        mysql: [
            // Ensure procedure exists
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            createColumnProcedure,
            // Add is_mra_enabled column
            `CALL add_column_if_not_exists('tenants', 'is_mra_enabled', 'TINYINT(1) DEFAULT 0')`,
            // Add mra_environment column
            `CALL add_column_if_not_exists('tenants', 'mra_environment', "VARCHAR(20) DEFAULT 'SANDBOX'")`,
            // Clean up
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN easily, skip for down migration
        ],
        mysql: [
            `ALTER TABLE \`tenants\` DROP COLUMN IF EXISTS \`is_mra_enabled\``,
            `ALTER TABLE \`tenants\` DROP COLUMN IF EXISTS \`mra_environment\``,
        ],
    },
};
