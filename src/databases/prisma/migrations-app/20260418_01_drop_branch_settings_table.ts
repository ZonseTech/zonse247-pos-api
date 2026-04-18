/**
 * Migration: 20260418_01
 * Description: Drop branch_settings and inventory_old tables - no longer used
 * 
 * The branch_settings table is being removed as settings are now
 * managed through terminal_settings.
 * The inventory_old table is a legacy backup table no longer needed.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260418_01',
    description: 'Drop branch_settings and inventory_old tables - no longer used',
    up: {
        sqlite: [
            `DROP TABLE IF EXISTS "branch_settings"`,
            `DROP TABLE IF EXISTS "inventory_old"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`branch_settings\``,
            `DROP TABLE IF EXISTS \`inventory_old\``,
        ],
    },
    down: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "branch_settings" (
                "id" TEXT PRIMARY KEY NOT NULL,
                "branch_id" TEXT NOT NULL,
                "settings" TEXT,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL
            )`,
            // inventory_old is a backup table - not recreated on rollback
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`branch_settings\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`branch_id\` VARCHAR(191) NOT NULL,
                \`settings\` JSON,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`id\`)
            )`,
            // inventory_old is a backup table - not recreated on rollback
        ],
    },
};
