/**
 * Migration: 20260402_07
 * Description: Remove legacy staffId column from service_order_items (replaced by staff_assignments table)
 *
 * Changes:
 * 1. Drop foreign key on staff_id (if exists)
 * 2. Drop index on staff_id
 * 3. Drop staff_id column
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_07',
    description: 'Remove legacy staffId column from service_order_items (replaced by staff_assignments table)',
    up: {
        sqlite: [
            // SQLite can't DROP COLUMN when it's in a FK definition — must recreate table
            `CREATE TABLE "service_order_items_new" (
                "service_order_item_id" TEXT PRIMARY KEY,
                "service_order_id"     TEXT NOT NULL,
                "service_id"           TEXT NOT NULL,
                "tenant_id"            TEXT NOT NULL,
                "branch_id"            TEXT NOT NULL,
                "terminal_id"          TEXT,
                "quantity"             INTEGER NOT NULL DEFAULT 1,
                "unit_price"           REAL NOT NULL,
                "discount_amount"      REAL NOT NULL DEFAULT 0,
                "subtotal"             REAL NOT NULL,
                "tax_amount"           REAL NOT NULL DEFAULT 0,
                "total_price"          REAL NOT NULL,
                "status"               TEXT NOT NULL DEFAULT 'PENDING',
                "notes"                TEXT,
                "started_at"           DATETIME,
                "completed_at"         DATETIME,
                "version"              INTEGER NOT NULL DEFAULT 1,
                "deleted_at"           DATETIME,
                "created_at"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "last_synced_at"       DATETIME,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE,
                FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT
            )`,
            `INSERT INTO "service_order_items_new" SELECT "service_order_item_id", "service_order_id", "service_id", "tenant_id", "branch_id", "terminal_id", "quantity", "unit_price", "discount_amount", "subtotal", "tax_amount", "total_price", "status", "notes", "started_at", "completed_at", "version", "deleted_at", "created_at", "updated_at", "last_synced_at" FROM "service_order_items"`,
            `DROP TABLE "service_order_items"`,
            `ALTER TABLE "service_order_items_new" RENAME TO "service_order_items"`,
            // Re-create indexes (without staff_id index)
            `CREATE INDEX IF NOT EXISTS "idx_soi_service_order" ON "service_order_items"("service_order_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_service" ON "service_order_items"("service_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_status" ON "service_order_items"("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_sync" ON "service_order_items"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_updated" ON "service_order_items"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_deleted" ON "service_order_items"("deleted_at")`,
        ],
        mysql: [
            // Drop FK, index, and column in one atomic ALTER TABLE statement
            // FK name 'fk_soi_staff' and index 'idx_soi_staff' from migration 20260402_03
            `ALTER TABLE \`service_order_items\` DROP FOREIGN KEY \`fk_soi_staff\`, DROP INDEX \`idx_soi_staff\`, DROP COLUMN \`staff_id\``,
        ],
    },
    down: {
        sqlite: [
            `ALTER TABLE "service_order_items" ADD COLUMN "staff_id" TEXT`,
        ],
        mysql: [
            // Re-add the column
            `ALTER TABLE \`service_order_items\` ADD COLUMN \`staff_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
            // Re-add the index
            `CREATE INDEX \`idx_soi_staff\` ON \`service_order_items\`(\`staff_id\`)`,
            // Re-add the FK
            `ALTER TABLE \`service_order_items\` ADD CONSTRAINT \`fk_soi_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staff\`(\`staff_id\`) ON DELETE SET NULL`,
        ],
    },
};
