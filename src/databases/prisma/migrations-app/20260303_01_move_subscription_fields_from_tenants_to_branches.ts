/**
 * Migration: 20260303_01
 * Description: Move subscription_plan_id and subscription_status from tenants to branches
 * 
 * Created: 2026-03-03
 * 
 * IMPORTANT:
 * - Never modify this migration once deployed
 * - Use IF NOT EXISTS / IF EXISTS for idempotent operations
 * - Test on both SQLite and MySQL
 */

import { Migration } from '../migration.types';

// Helper stored procedures for idempotent MySQL operations
const createAddColumnProcedure = `
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

const createDropColumnProcedure = `
CREATE PROCEDURE IF NOT EXISTS drop_column_if_exists(
    IN p_table VARCHAR(255), 
    IN p_column VARCHAR(255)
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO column_exists 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column;
    IF column_exists > 0 THEN
        SET @sql = CONCAT('ALTER TABLE \`', p_table, '\` DROP COLUMN \`', p_column, '\`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END
`;

const createAddIndexProcedure = `
CREATE PROCEDURE IF NOT EXISTS add_index_if_not_exists(
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
        SET @sql = CONCAT('CREATE INDEX \`', p_index, '\` ON \`', p_table, '\`(', p_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END
`;

const createAddFkProcedure = `
CREATE PROCEDURE IF NOT EXISTS add_fk_if_not_exists(
    IN p_table VARCHAR(255), 
    IN p_fk_name VARCHAR(255),
    IN p_column VARCHAR(255),
    IN p_ref_table VARCHAR(255),
    IN p_ref_column VARCHAR(255)
)
BEGIN
    DECLARE fk_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO fk_exists 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_fk_name AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE \`', p_table, '\` ADD CONSTRAINT \`', p_fk_name, '\` FOREIGN KEY (\`', p_column, '\`) REFERENCES \`', p_ref_table, '\`(\`', p_ref_column, '\`) ON UPDATE NO ACTION ON DELETE SET NULL');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END
`;

// Procedure to migrate subscription data only if source column exists
const createMigrateSubscriptionProcedure = `
CREATE PROCEDURE IF NOT EXISTS migrate_subscription_to_branches()
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO column_exists 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'subscription_plan';
    IF column_exists > 0 THEN
        UPDATE branches b 
        INNER JOIN tenants t ON b.tenant_id = t.tenant_id 
        LEFT JOIN subscription_plans sp ON sp.name = t.subscription_plan
        SET b.subscription_plan_id = COALESCE(b.subscription_plan_id, sp.subscription_plan_id)
        WHERE b.subscription_plan_id IS NULL;
    END IF;
END
`;

export const migration: Migration = {
    version: '20260303_01',
    description: 'Add subscription_plan_id to branches and remove subscription fields from tenants',
    up: {
        sqlite: [
            // Add subscription_plan_id column to branches table
            `ALTER TABLE "branches" ADD COLUMN "subscription_plan_id" TEXT REFERENCES "subscription_plans"("subscription_plan_id")`,
            // Note: Data migration from tenants.subscription_plan is handled in MySQL only
            // SQLite is typically used for local dev where this legacy column doesn't exist
            // Note: SQLite doesn't support DROP COLUMN in older versions, so we skip removing from tenants
        ],
        mysql: [
            // Create helper procedures
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            `DROP PROCEDURE IF EXISTS drop_column_if_exists`,
            `DROP PROCEDURE IF EXISTS add_index_if_not_exists`,
            `DROP PROCEDURE IF EXISTS add_fk_if_not_exists`,
            `DROP PROCEDURE IF EXISTS migrate_subscription_to_branches`,
            createAddColumnProcedure,
            createDropColumnProcedure,
            createAddIndexProcedure,
            createAddFkProcedure,
            createMigrateSubscriptionProcedure,
            // Add subscription_plan_id column to branches table (idempotent)
            `CALL add_column_if_not_exists('branches', 'subscription_plan_id', 'VARCHAR(36) NULL')`,
            // Copy subscription plan from tenants to their branches (only if column exists)
            `CALL migrate_subscription_to_branches()`,
            // Add foreign key constraint (idempotent)
            `CALL add_fk_if_not_exists('branches', 'fk_branches_subscription_plan', 'subscription_plan_id', 'subscription_plans', 'subscription_plan_id')`,
            // Add index for subscription_plan_id (idempotent)
            `CALL add_index_if_not_exists('branches', 'idx_branches_subscription_plan_id', 'subscription_plan_id')`,
            // Remove subscription columns from tenants table (idempotent)
            `CALL drop_column_if_exists('tenants', 'subscription_plan')`,
            `CALL drop_column_if_exists('tenants', 'subscription_status')`,
            `CALL drop_column_if_exists('tenants', 'trial_ends_at')`,
            // Clean up procedures
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            `DROP PROCEDURE IF EXISTS drop_column_if_exists`,
            `DROP PROCEDURE IF EXISTS add_index_if_not_exists`,
            `DROP PROCEDURE IF EXISTS add_fk_if_not_exists`,
            `DROP PROCEDURE IF EXISTS migrate_subscription_to_branches`,
        ],
    },
    down: {
        sqlite: [
            // Note: SQLite rollback is limited - columns added cannot be easily dropped
        ],
        mysql: [
            // Create helper procedures for rollback
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            createAddColumnProcedure,
            // Add subscription columns back to tenants table
            `CALL add_column_if_not_exists('tenants', 'subscription_plan', 'VARCHAR(255) NULL')`,
            `CALL add_column_if_not_exists('tenants', 'subscription_status', "ENUM('ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL') DEFAULT 'TRIAL'")`,
            `CALL add_column_if_not_exists('tenants', 'trial_ends_at', 'DATETIME NULL')`,
            // Copy subscription plan from branches back to tenants (using first branch, lookup plan name)
            `UPDATE tenants t 
             INNER JOIN (SELECT b.tenant_id, sp.name as subscription_plan
                         FROM branches b 
                         LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.subscription_plan_id 
                         GROUP BY b.tenant_id) sub 
             ON t.tenant_id = sub.tenant_id 
             SET t.subscription_plan = sub.subscription_plan
             WHERE t.subscription_plan IS NULL`,
            // Add index back on tenants
            `CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status)`,
            // Drop FK constraint from branches (safe if doesn't exist)
            `ALTER TABLE branches DROP FOREIGN KEY fk_branches_subscription_plan`,
            // Remove subscription_plan_id from branches
            `ALTER TABLE branches DROP COLUMN subscription_plan_id`,
            // Drop the index from branches
            `DROP INDEX idx_branches_subscription_plan_id ON branches`,
            // Clean up
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
        ],
    },
};
