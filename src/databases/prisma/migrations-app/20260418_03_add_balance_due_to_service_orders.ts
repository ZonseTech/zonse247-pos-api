/**
 * Migration: 20260418_03
 * Description: Add balance_due column to service_orders table
 *
 * Changes:
 * 1. Add `balance_due` column to `service_orders` table
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260418_03',
    description: 'Add balance_due column to service_orders table',
    up: {
        sqlite: [
            `ALTER TABLE "service_orders" ADD COLUMN "balance_due" REAL NOT NULL DEFAULT 0`,
        ],
        mysql: [
            `ALTER TABLE \`service_orders\` ADD COLUMN \`balance_due\` DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER \`amount_paid\``,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN easily
        ],
        mysql: [
            `ALTER TABLE \`service_orders\` DROP COLUMN \`balance_due\``,
        ],
    },
};
