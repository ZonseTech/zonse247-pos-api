/**
 * Migration: 20260219_02
 * Description: Restructure SQLite products table to remove old variant columns (sku, unit, selling_price, etc.)
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260219_02',
    description: 'Restructure SQLite products table to remove old variant columns (sku, unit, selling_price, etc.)',
    up: {
            sqlite: [
                `DROP INDEX IF EXISTS "products_sku_key"`,
                `DROP INDEX IF EXISTS "products_branch_id_sku_key"`,
                `DROP INDEX IF EXISTS "products_primary_barcode_key"`,
                `DROP INDEX IF EXISTS "sku"`,
                `DROP INDEX IF EXISTS "unique_branch_sku"`,
                `CREATE INDEX IF NOT EXISTS "products_branch_id_idx" ON "products" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "products_tenant_id_idx" ON "products" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" ("category_id")`,
                `CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" ("name")`,
                `CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products" ("is_active")`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS drop_products_old_cols`,
                `CREATE PROCEDURE drop_products_old_cols()
                BEGIN
                    -- Drop old indexes first
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'products_sku_key') THEN
                        ALTER TABLE products DROP INDEX products_sku_key;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'products_branch_id_sku_key') THEN
                        ALTER TABLE products DROP INDEX products_branch_id_sku_key;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'products_primary_barcode_key') THEN
                        ALTER TABLE products DROP INDEX products_primary_barcode_key;
                    END IF;
                    
                    -- Drop old columns
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sku') THEN
                        ALTER TABLE products DROP COLUMN sku;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'unit') THEN
                        ALTER TABLE products DROP COLUMN unit;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'selling_price') THEN
                        ALTER TABLE products DROP COLUMN selling_price;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'primary_barcode') THEN
                        ALTER TABLE products DROP COLUMN primary_barcode;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'color') THEN
                        ALTER TABLE products DROP COLUMN color;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'size') THEN
                        ALTER TABLE products DROP COLUMN size;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'dimensions') THEN
                        ALTER TABLE products DROP COLUMN dimensions;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'weight') THEN
                        ALTER TABLE products DROP COLUMN weight;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'promo_price') THEN
                        ALTER TABLE products DROP COLUMN promo_price;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'promo_start') THEN
                        ALTER TABLE products DROP COLUMN promo_start;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'promo_end') THEN
                        ALTER TABLE products DROP COLUMN promo_end;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'expiration_date') THEN
                        ALTER TABLE products DROP COLUMN expiration_date;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'manufacture_date') THEN
                        ALTER TABLE products DROP COLUMN manufacture_date;
                    END IF;
                END`,
                `CALL drop_products_old_cols()`,
                `DROP PROCEDURE IF EXISTS drop_products_old_cols`,
            ],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "products_branch_id_idx"`,
                `DROP INDEX IF EXISTS "products_tenant_id_idx"`,
                `DROP INDEX IF EXISTS "products_category_id_idx"`,
                `DROP INDEX IF EXISTS "products_name_idx"`,
                `DROP INDEX IF EXISTS "products_is_active_idx"`,
            ],
            mysql: [],
        },
};
