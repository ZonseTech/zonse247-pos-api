/**
 * Migration: 20260418_04
 * Description: Add started_at and completed_at columns to service_orders table
 *
 * Changes:
 * 1. Add `started_at` column to `service_orders` table
 * 2. Add `completed_at` column to `service_orders` table
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260418_04',
    description: 'Add started_at and completed_at columns to service_orders table',
    up: {
        sqlite: [
            `ALTER TABLE "service_orders" ADD COLUMN "started_at" DATETIME`,
            `ALTER TABLE "service_orders" ADD COLUMN "completed_at" DATETIME`,
        ],
        mysql: [
            `ALTER TABLE \`service_orders\` ADD COLUMN \`started_at\` DATETIME(3) NULL AFTER \`actual_end\``,
            `ALTER TABLE \`service_orders\` ADD COLUMN \`completed_at\` DATETIME(3) NULL AFTER \`started_at\``,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN easily
        ],
        mysql: [
            `ALTER TABLE \`service_orders\` DROP COLUMN \`started_at\``,
            `ALTER TABLE \`service_orders\` DROP COLUMN \`completed_at\``,
        ],
    },
};
