/**
 * Migration: 20260306_06
 * Description: Create change_log table for efficient delta sync
 * 
 * This table exists ONLY on the central MySQL server to track:
 * - Every INSERT, UPDATE, DELETE operation on syncable tables
 * - Enables terminals to pull only changes since their last sync
 * - More efficient than scanning tables with updatedAt > lastPulledAt
 * - Enables event-driven sync architecture later
 * 
 * NOT created on SQLite (local terminal databases)
 */

import { Migration } from '../migration.types';

const mysqlStatements = [
    // Create the ChangeLogOperation enum type isn't needed in MySQL - use ENUM directly
    `CREATE TABLE \`change_log\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`table_name\` VARCHAR(50) NOT NULL,
        \`record_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`operation\` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
        \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`version\` INT NOT NULL,
        \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        \`user_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        \`payload\` JSON NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_tenant_branch_time\` (\`tenant_id\`, \`branch_id\`, \`created_at\`),
        INDEX \`idx_tenant_branch_table_time\` (\`tenant_id\`, \`branch_id\`, \`table_name\`, \`created_at\`),
        INDEX \`change_log_record_id_idx\` (\`record_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // Add foreign keys separately
    `ALTER TABLE \`change_log\` ADD CONSTRAINT \`change_log_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE \`change_log\` ADD CONSTRAINT \`change_log_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
];

// SQLite: No-op - this table is server-only
const sqliteStatements: string[] = [
    `-- change_log is a server-only table, not created on local SQLite databases`,
];

export const migration: Migration = {
    version: '20260306_06',
    description: 'Create change_log table for efficient delta sync (server-only)',
    up: {
        sqlite: sqliteStatements,
        mysql: mysqlStatements,
    },
    down: {
        sqlite: [
            `-- No-op: table doesn't exist on SQLite`,
        ],
        mysql: [
            `ALTER TABLE \`change_log\` DROP FOREIGN KEY \`change_log_tenant_id_fkey\``,
            `ALTER TABLE \`change_log\` DROP FOREIGN KEY \`change_log_branch_id_fkey\``,
            `DROP TABLE IF EXISTS \`change_log\``,
        ],
    },
};
