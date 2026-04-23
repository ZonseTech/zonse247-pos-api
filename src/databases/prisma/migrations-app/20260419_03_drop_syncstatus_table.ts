/**
 * Migration: 20260419_03
 * Description: Drop syncstatus table - legacy table replaced by terminal_sync_state
 *
 * The syncstatus table is a legacy table that was used for sync tracking.
 * This functionality is now handled by the terminal_sync_state table.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260419_03',
    description: 'Drop syncstatus table - legacy table replaced by terminal_sync_state',
    up: {
        sqlite: [
            `DROP TABLE IF EXISTS "syncstatus"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`syncstatus\``,
        ],
    },
    down: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "syncstatus" (
                "tableName" TEXT NOT NULL PRIMARY KEY,
                "status" TEXT NOT NULL,
                "lastSyncAt" DATETIME NOT NULL,
                "errorMessage" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL
            )`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`syncstatus\` (
                \`tableName\` VARCHAR(191) NOT NULL,
                \`status\` VARCHAR(191) NOT NULL,
                \`lastSyncAt\` DATETIME(3) NOT NULL,
                \`errorMessage\` VARCHAR(191) NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updatedAt\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`tableName\`)
            )`,
        ],
    },
};
