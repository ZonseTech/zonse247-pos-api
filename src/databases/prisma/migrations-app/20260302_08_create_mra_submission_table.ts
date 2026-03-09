/**
 * Migration: 20260302_08
 * Description: Create MraSubmission table for MRA submission tracking
 * 
 * Creates the mra_submissions table on the central MySQL server only.
 * This table tracks MRA (Malawi Revenue Authority) submission attempts
 * and is NOT synced to SQLite terminals.
 * 
 * Fields:
 * - id: UUID primary key
 * - tenantId, branchId, terminalId: Location context
 * - saleId: Reference to the sale (unique - one submission per sale)
 * - status: PENDING, PROCESSING, SUCCESS, FAILED, REJECTED
 * - attemptCount: Number of submission attempts
 * - lastAttemptAt, nextAttemptAt: Timing for retry logic
 * - requestPayload, responsePayload: JSON payloads for debugging
 * - errorMessage: Error details on failure
 * - createdAt, updatedAt: Timestamps
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260302_08',
    description: 'Create MraSubmission table for MRA submission tracking (MySQL only)',
    up: {
        // SQLite: No changes - this table only exists on central MySQL server
        sqlite: [],
        mysql: [
            // Create the mra_submissions table (IF NOT EXISTS for idempotency)
            `CREATE TABLE IF NOT EXISTS \`mra_submissions\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`tenant_id\` VARCHAR(191) NOT NULL,
                \`branch_id\` VARCHAR(191) NOT NULL,
                \`terminal_id\` VARCHAR(191) NULL,
                \`sale_id\` VARCHAR(191) NOT NULL,
                \`status\` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
                \`attempt_count\` INT NOT NULL DEFAULT 0,
                \`last_attempt_at\` DATETIME NULL,
                \`next_attempt_at\` DATETIME NULL,
                \`request_payload\` JSON NULL,
                \`response_payload\` JSON NULL,
                \`error_message\` TEXT NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`mra_submissions_sale_id_key\` (\`sale_id\`),
                INDEX \`idx_mra_submissions_status\` (\`status\`),
                INDEX \`idx_mra_submissions_next_attempt_at\` (\`next_attempt_at\`),
                INDEX \`idx_mra_submissions_tenant_id\` (\`tenant_id\`),
                INDEX \`idx_mra_submissions_branch_id\` (\`branch_id\`),
                
                CONSTRAINT \`mra_submissions_sale_id_fkey\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`sale_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`mra_submissions_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`mra_submissions_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            `DROP TABLE IF EXISTS \`mra_submissions\``,
        ],
    },
};
