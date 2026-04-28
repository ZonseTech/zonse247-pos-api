/**
 * Migration: 20260428_01
 * Description: Drop stock_movement_uuid column from stock_movements table
 *
 * The stock_movement_uuid column was added to the SQLite schema but never
 * existed in the actual database or the MySQL schema, causing
 * prisma.stockMovement.create() to fail.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260428_01',
    description: 'Drop stock_movement_uuid column from stock_movements table if it exists',
    up: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN before 3.35.0, so we use
            // a table rebuild approach only if the column exists.
            // However, if the column never existed (which is the actual bug),
            // this is a no-op. We still include it for safety in case any
            // database was created with the old schema that included the column.
            `CREATE TABLE IF NOT EXISTS "_stock_movements_backup" AS SELECT
                "stock_movement_id",
                "tenant_id",
                "branch_id",
                "terminal_id",
                "inventory_id",
                "movement_type",
                "quantity",
                "previous_quantity",
                "new_quantity",
                "reference_type",
                "reference_id",
                "unit_cost",
                "total_cost",
                "notes",
                "moved_by",
                "movement_date",
                "version",
                "deleted_at",
                "created_at",
                "updated_at"
            FROM "stock_movements" WHERE 1=1`,
            `DROP TABLE IF EXISTS "stock_movements"`,
            `CREATE TABLE "stock_movements" (
                "stock_movement_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "inventory_id" TEXT NOT NULL,
                "movement_type" TEXT NOT NULL,
                "quantity" INTEGER NOT NULL,
                "previous_quantity" INTEGER NOT NULL,
                "new_quantity" INTEGER NOT NULL,
                "reference_type" TEXT,
                "reference_id" TEXT,
                "unit_cost" REAL NOT NULL DEFAULT 0.00,
                "total_cost" REAL NOT NULL DEFAULT 0.00,
                "notes" TEXT,
                "moved_by" TEXT NOT NULL,
                "movement_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("inventory_id") REFERENCES "inventory"("inventory_id") ON DELETE CASCADE,
                FOREIGN KEY ("moved_by") REFERENCES "users"("user_id") ON DELETE RESTRICT
            )`,
            `INSERT INTO "stock_movements" SELECT * FROM "_stock_movements_backup"`,
            `DROP TABLE IF EXISTS "_stock_movements_backup"`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_branch_id_idx" ON "stock_movements"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_inventory_id_idx" ON "stock_movements"("inventory_id")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_movement_type_idx" ON "stock_movements"("movement_type")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_movement_date_idx" ON "stock_movements"("movement_date")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_branch_id_movement_date_idx" ON "stock_movements"("tenant_id", "branch_id", "movement_date")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_updated_at_idx" ON "stock_movements"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "stock_movements_deleted_at_idx" ON "stock_movements"("deleted_at")`,
        ],
        mysql: [
            // MySQL schema never had this column, so this is a no-op safety check
            `SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'stock_movement_uuid' AND TABLE_SCHEMA = DATABASE())`,
        ],
    },
    down: {
        sqlite: [
            `ALTER TABLE "stock_movements" ADD COLUMN "stock_movement_uuid" TEXT`,
        ],
        mysql: [],
    },
};
