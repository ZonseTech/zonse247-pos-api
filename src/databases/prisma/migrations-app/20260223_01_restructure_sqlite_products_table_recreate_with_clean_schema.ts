/**
 * Migration: 20260223_01
 * Description: Restructure SQLite products table - recreate with clean schema
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260223_01',
    description: 'Restructure SQLite products table - recreate with clean schema',
    up: {
            sqlite: [
                `PRAGMA foreign_keys = OFF`,
                `DROP INDEX IF EXISTS "products_branch_id_idx"`,
                `DROP INDEX IF EXISTS "products_tenant_id_idx"`,
                `DROP INDEX IF EXISTS "products_category_id_idx"`,
                `DROP INDEX IF EXISTS "products_name_idx"`,
                `DROP INDEX IF EXISTS "products_is_active_idx"`,
                `DROP INDEX IF EXISTS "products_sku_key"`,
                `DROP INDEX IF EXISTS "products_branch_id_sku_key"`,
                `DROP INDEX IF EXISTS "products_primary_barcode_key"`,
                `DROP INDEX IF EXISTS "sku"`,
                `DROP INDEX IF EXISTS "unique_branch_sku"`,
                `DROP INDEX IF EXISTS "unique_branch_product_name"`,
                `CREATE TABLE IF NOT EXISTS "new_products" (
                    "product_id" TEXT NOT NULL PRIMARY KEY,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "category_id" TEXT,
                    "name" TEXT NOT NULL,
                    "description" TEXT,
                    "brand" TEXT,
                    "is_taxable" INTEGER,
                    "supplier_name" TEXT,
                    "supplier_code" TEXT,
                    "default_unit" TEXT,
                    "custom_attribute_schema" TEXT,
                    "image_url" TEXT,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL,

                    FOREIGN KEY ("tenant_id")
                        REFERENCES "tenants"("tenant_id")
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,

                    FOREIGN KEY ("branch_id")
                        REFERENCES "branches"("branch_id")
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,

                    FOREIGN KEY ("category_id")
                        REFERENCES "categories"("category_id")
                        ON DELETE SET NULL
                        ON UPDATE CASCADE
                )`,
                `INSERT INTO "new_products" (
                    "product_id",
                    "tenant_id",
                    "branch_id",
                    "category_id",
                    "name",
                    "description",
                    "brand",
                    "is_taxable",
                    "supplier_name",
                    "supplier_code",
                    "default_unit",
                    "custom_attribute_schema",
                    "image_url",
                    "is_active",
                    "created_at",
                    "updated_at"
                )
                SELECT 
                    "product_id",
                    "tenant_id",
                    "branch_id",
                    "category_id",
                    "name",
                    "description",
                    "brand",
                    "is_taxable",
                    "supplier_name",
                    "supplier_code",
                    "default_unit",
                    "custom_attribute_schema",
                    "image_url",
                    "is_active",
                    "created_at",
                    COALESCE("updated_at", CURRENT_TIMESTAMP)
                FROM "products"`,
                `DROP TABLE IF EXISTS "products"`,
                `ALTER TABLE "new_products" RENAME TO "products"`,
                `DROP TABLE IF EXISTS "new_products"`,
                `CREATE INDEX IF NOT EXISTS "products_branch_id_idx" ON "products" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "products_tenant_id_idx" ON "products" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" ("category_id")`,
                `CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" ("name")`,
                `CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products" ("is_active")`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "unique_branch_product_name" ON "products" ("branch_id", "name")`,
                `PRAGMA foreign_keys = ON`,
            ],
            mysql: [],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "products_branch_id_idx"`,
                `DROP INDEX IF EXISTS "products_tenant_id_idx"`,
                `DROP INDEX IF EXISTS "products_category_id_idx"`,
                `DROP INDEX IF EXISTS "products_name_idx"`,
                `DROP INDEX IF EXISTS "products_is_active_idx"`,
                `DROP INDEX IF EXISTS "unique_branch_product_name"`,
            ],
            mysql: [],
        },
};
