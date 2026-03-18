/**
 * Migration: 20260318_05
 * Description: Add requisition_id column to purchase_orders table
 *
 * Links PurchaseOrder back to PurchaseRequisition (optional).
 * Adds nullable FK column + index for the relationship.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_05',
    description: 'Add requisition_id column to purchase_orders table',
    up: {
        sqlite: [
            `ALTER TABLE "purchase_orders" ADD COLUMN "requisition_id" TEXT REFERENCES "purchase_requisitions" ("requisition_id") ON DELETE SET NULL ON UPDATE CASCADE`,
            `CREATE INDEX IF NOT EXISTS "purchase_orders_requisition_id_idx" ON "purchase_orders"("requisition_id")`,
        ],
        mysql: [
            `ALTER TABLE \`purchase_orders\` ADD COLUMN \`requisition_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
            `ALTER TABLE \`purchase_orders\` ADD INDEX \`purchase_orders_requisition_id_idx\` (\`requisition_id\`)`,
            `ALTER TABLE \`purchase_orders\` ADD CONSTRAINT \`purchase_orders_requisition_id_fkey\` FOREIGN KEY (\`requisition_id\`) REFERENCES \`purchase_requisitions\` (\`requisition_id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
        ],
    },
    down: {
        sqlite: [
            `DROP INDEX IF EXISTS "purchase_orders_requisition_id_idx"`,
            // SQLite doesn't support DROP COLUMN in older versions, but modern SQLite (3.35+) does
            `ALTER TABLE "purchase_orders" DROP COLUMN "requisition_id"`,
        ],
        mysql: [
            `ALTER TABLE \`purchase_orders\` DROP FOREIGN KEY \`purchase_orders_requisition_id_fkey\``,
            `ALTER TABLE \`purchase_orders\` DROP INDEX \`purchase_orders_requisition_id_idx\``,
            `ALTER TABLE \`purchase_orders\` DROP COLUMN \`requisition_id\``,
        ],
    },
};

export default migration;
