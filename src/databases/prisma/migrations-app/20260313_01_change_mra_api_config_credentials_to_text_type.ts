/**
 * Migration: 20260313_01
 * Description: Change api_key and api_secret columns to TEXT type in mra_api_config_table
 * 
 * The JWT token returned by MRA terminal activation is too long for VARCHAR(191).
 * This migration changes both api_key and api_secret columns to TEXT to accommodate
 * longer credential values (JWT tokens can be 500+ characters).
 * 
 * Note: SQLite TEXT is already unlimited, but MySQL VARCHAR has limits.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260313_01',
    description: 'Change MRA API config credentials columns to TEXT type for longer JWT tokens',
    up: {
        sqlite: [
            // SQLite TEXT is already unlimited, no changes needed
            // But we can add these as no-ops for completeness
            `SELECT 1 WHERE 0`, // No-op
        ],
        mysql: [
            // Change api_key to TEXT
            `ALTER TABLE \`mra_api_config_table\` MODIFY COLUMN \`api_key\` TEXT NULL`,
            // Change api_secret to TEXT
            `ALTER TABLE \`mra_api_config_table\` MODIFY COLUMN \`api_secret\` TEXT NULL`,
        ],
    },
    down: {
        sqlite: [
            `SELECT 1 WHERE 0`, // No-op
        ],
        mysql: [
            // Revert to VARCHAR(191) - WARNING: may truncate data
            `ALTER TABLE \`mra_api_config_table\` MODIFY COLUMN \`api_key\` VARCHAR(191) NULL`,
            `ALTER TABLE \`mra_api_config_table\` MODIFY COLUMN \`api_secret\` VARCHAR(191) NULL`,
        ],
    },
};

export default migration;
