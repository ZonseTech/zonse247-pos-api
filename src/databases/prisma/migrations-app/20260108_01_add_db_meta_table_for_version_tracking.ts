/**
 * Migration: 20260108_01
 * Description: Add db_meta table for version tracking
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260108_01',
    description: 'Add db_meta table for version tracking',
    up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `INSERT OR IGNORE INTO "db_meta" ("key", "value", "updated_at") 
                 VALUES ('schema_version', '20260108_01', CURRENT_TIMESTAMP)`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
                `INSERT IGNORE INTO db_meta (\`key\`, \`value\`, updated_at) 
                 VALUES ('schema_version', '20260108_01', CURRENT_TIMESTAMP)`,
            ],
        },
    down: {
            sqlite: [
                `DROP TABLE IF EXISTS "db_meta"`,
            ],
            mysql: [
                `DROP TABLE IF EXISTS db_meta`,
            ],
        },
};
