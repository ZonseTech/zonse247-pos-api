/**
 * Migration: 20260419_01
 * Description: Change ServiceOrderStatus enum values
 *
 * Changes:
 * 1. Update status enum from (DRAFT, OPEN, IN_PROGRESS, COMPLETED, INVOICED, CANCELLED, ON_HOLD)
 *    to (PENDING, IN_PROGRESS, COMPLETED, CANCELLED, PARTIALLY_PAID, PAID)
 * 2. Migrate existing data: DRAFT/OPEN -> PENDING, INVOICED -> PAID, ON_HOLD -> CANCELLED
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260419_01',
    description: 'Change ServiceOrderStatus enum to PENDING/IN_PROGRESS/COMPLETED/CANCELLED/PARTIALLY_PAID/PAID',
    up: {
        sqlite: [
            // SQLite: Update existing data first
            `UPDATE "service_orders" SET "status" = 'PENDING' WHERE "status" IN ('DRAFT', 'OPEN')`,
            `UPDATE "service_orders" SET "status" = 'PAID' WHERE "status" = 'INVOICED'`,
            `UPDATE "service_orders" SET "status" = 'CANCELLED' WHERE "status" = 'ON_HOLD'`,
        ],
        mysql: [
            // MySQL: Need to modify enum column
            // First migrate existing data to new values that exist in both old and new enums
            `UPDATE \`service_orders\` SET \`status\` = 'CANCELLED' WHERE \`status\` = 'ON_HOLD'`,
            // Now alter the column with new enum values
            `ALTER TABLE \`service_orders\` MODIFY COLUMN \`status\` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PARTIALLY_PAID', 'PAID', 'DRAFT', 'OPEN', 'INVOICED') NOT NULL DEFAULT 'PENDING'`,
            // Migrate old values to new
            `UPDATE \`service_orders\` SET \`status\` = 'PENDING' WHERE \`status\` IN ('DRAFT', 'OPEN')`,
            `UPDATE \`service_orders\` SET \`status\` = 'PAID' WHERE \`status\` = 'INVOICED'`,
            // Finally, remove old values from enum
            `ALTER TABLE \`service_orders\` MODIFY COLUMN \`status\` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PARTIALLY_PAID', 'PAID') NOT NULL DEFAULT 'PENDING'`,
        ],
    },
    down: {
        sqlite: [
            // Reverse: PENDING -> OPEN, PAID -> INVOICED, PARTIALLY_PAID -> IN_PROGRESS
            `UPDATE "service_orders" SET "status" = 'OPEN' WHERE "status" = 'PENDING'`,
            `UPDATE "service_orders" SET "status" = 'INVOICED' WHERE "status" = 'PAID'`,
            `UPDATE "service_orders" SET "status" = 'IN_PROGRESS' WHERE "status" = 'PARTIALLY_PAID'`,
        ],
        mysql: [
            `ALTER TABLE \`service_orders\` MODIFY COLUMN \`status\` ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED', 'ON_HOLD', 'PENDING', 'PAID', 'PARTIALLY_PAID') NOT NULL DEFAULT 'DRAFT'`,
            `UPDATE \`service_orders\` SET \`status\` = 'OPEN' WHERE \`status\` = 'PENDING'`,
            `UPDATE \`service_orders\` SET \`status\` = 'INVOICED' WHERE \`status\` = 'PAID'`,
            `UPDATE \`service_orders\` SET \`status\` = 'IN_PROGRESS' WHERE \`status\` = 'PARTIALLY_PAID'`,
            `ALTER TABLE \`service_orders\` MODIFY COLUMN \`status\` ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'DRAFT'`,
        ],
    },
};
