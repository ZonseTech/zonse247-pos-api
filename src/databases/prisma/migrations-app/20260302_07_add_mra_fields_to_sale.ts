/**
 * Migration: 20260302_07
 * Description: Add MRA (Malawi Revenue Authority) fields to Sale model
 * 
 * Adds:
 * - mraSubmissionId: String? - MRA submission reference ID
 * - mraResponseCode: String? - Response code from MRA
 * - mraResponseDesc: String? - Response description from MRA
 * - mraQrCode: String? - QR code (base64 or URL) for receipt verification
 * - mraVerificationUrl: String? - URL for verifying the receipt
 * - mraStatus: MraSaleStatus? - Status of MRA submission (NONE, PENDING, SYNCED, FAILED)
 * - mraLastSyncAt: DateTime? - Last MRA sync timestamp
 * 
 * These fields support fiscal compliance with Malawi Revenue Authority requirements.
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

// Helper stored procedure for idempotent index creation
const createIndexProcedure = `
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

export const migration: Migration = {
    version: '20260302_07',
    description: 'Add MRA fields to Sale model for fiscal compliance',
    up: {
        sqlite: [
            `ALTER TABLE "sales" ADD COLUMN "mra_submission_id" TEXT`,
            `ALTER TABLE "sales" ADD COLUMN "mra_response_code" TEXT`,
            `ALTER TABLE "sales" ADD COLUMN "mra_response_desc" TEXT`,
            `ALTER TABLE "sales" ADD COLUMN "mra_qr_code" TEXT`,
            `ALTER TABLE "sales" ADD COLUMN "mra_verification_url" TEXT`,
            `ALTER TABLE "sales" ADD COLUMN "mra_status" TEXT DEFAULT 'NONE'`,
            `ALTER TABLE "sales" ADD COLUMN "mra_last_sync_at" DATETIME`,
            // Add index for querying sales by MRA status
            `CREATE INDEX IF NOT EXISTS "idx_sales_mra_status" ON "sales" ("mra_status")`,
        ],
        mysql: [
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            createColumnProcedure,
            `DROP PROCEDURE IF EXISTS create_idx_if_not_exists`,
            createIndexProcedure,
            `CALL add_column_if_not_exists('sales', 'mra_submission_id', 'VARCHAR(191) NULL')`,
            `CALL add_column_if_not_exists('sales', 'mra_response_code', 'VARCHAR(191) NULL')`,
            `CALL add_column_if_not_exists('sales', 'mra_response_desc', 'VARCHAR(191) NULL')`,
            `CALL add_column_if_not_exists('sales', 'mra_qr_code', 'TEXT NULL')`,
            `CALL add_column_if_not_exists('sales', 'mra_verification_url', 'VARCHAR(500) NULL')`,
            `CALL add_column_if_not_exists('sales', 'mra_status', "ENUM('NONE', 'PENDING', 'SYNCED', 'FAILED') DEFAULT 'NONE'")`,
            `CALL add_column_if_not_exists('sales', 'mra_last_sync_at', 'DATETIME NULL')`,
            // Add index for querying sales by MRA status
            `CALL create_idx_if_not_exists('sales', 'idx_sales_mra_status', '\`mra_status\`')`,
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            `DROP PROCEDURE IF EXISTS create_idx_if_not_exists`,
        ],
    },
    down: {
        sqlite: [
            `DROP INDEX IF EXISTS "idx_sales_mra_status"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_submission_id"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_response_code"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_response_desc"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_qr_code"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_verification_url"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_status"`,
            `ALTER TABLE "sales" DROP COLUMN "mra_last_sync_at"`,
        ],
        mysql: [
            `DROP INDEX \`idx_sales_mra_status\` ON \`sales\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_submission_id\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_response_code\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_response_desc\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_qr_code\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_verification_url\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_status\``,
            `ALTER TABLE \`sales\` DROP COLUMN \`mra_last_sync_at\``,
        ],
    },
};
