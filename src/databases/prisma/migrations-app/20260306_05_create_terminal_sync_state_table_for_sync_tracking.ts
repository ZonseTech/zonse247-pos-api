/**
 * Migration: 20260306_05
 * Description: Create terminal_sync_state table for multi-terminal sync tracking
 * 
 * This table exists ONLY on the central MySQL server to track:
 * - When each terminal last pulled data from the server
 * - When each terminal last pushed data to the server
 * - Optional sequence number for change log tracking
 * 
 * NOT created on SQLite (local terminal databases)
 */

import { Migration } from '../migration.types';

const mysqlStatements = [
    // Create table first without foreign keys to avoid charset/collation issues
    `CREATE TABLE \`terminal_sync_state\` (
        \`terminal_sync_state_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`last_pulled_at\` DATETIME(3) NULL,
        \`last_pushed_at\` DATETIME(3) NULL,
        \`last_sequence\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`terminal_sync_state_id\`),
        UNIQUE INDEX \`unique_terminal_sync\` (\`tenant_id\`, \`branch_id\`, \`terminal_id\`),
        INDEX \`terminal_sync_state_terminal_id_idx\` (\`terminal_id\`),
        INDEX \`terminal_sync_state_tenant_id_idx\` (\`tenant_id\`),
        INDEX \`terminal_sync_state_branch_id_idx\` (\`branch_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // Add foreign keys separately
    `ALTER TABLE \`terminal_sync_state\` ADD CONSTRAINT \`terminal_sync_state_terminal_id_fkey\` FOREIGN KEY (\`terminal_id\`) REFERENCES \`terminals\` (\`terminal_id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE \`terminal_sync_state\` ADD CONSTRAINT \`terminal_sync_state_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE \`terminal_sync_state\` ADD CONSTRAINT \`terminal_sync_state_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
];

// SQLite: No-op - this table is server-only
const sqliteStatements: string[] = [];

export const migration: Migration = {
    version: '20260306_05',
    description: 'Create terminal_sync_state table for multi-terminal sync tracking (server-only)',
    up: {
        sqlite: sqliteStatements,
        mysql: mysqlStatements,
    },
    down: {
        sqlite: [],
        mysql: [
            `ALTER TABLE \`terminal_sync_state\` DROP FOREIGN KEY \`terminal_sync_state_terminal_id_fkey\``,
            `ALTER TABLE \`terminal_sync_state\` DROP FOREIGN KEY \`terminal_sync_state_tenant_id_fkey\``,
            `ALTER TABLE \`terminal_sync_state\` DROP FOREIGN KEY \`terminal_sync_state_branch_id_fkey\``,
            `DROP TABLE IF EXISTS \`terminal_sync_state\``,
        ],
    },
};
