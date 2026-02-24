/**
 * Migration: 20260208_02
 * Description: Add ProductVariant model and migrate existing products to variants (non-destructive)
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260208_02',
    description: 'Add ProductVariant model and migrate existing products to variants (non-destructive)',
    up: {
            sqlite: [
                `ALTER TABLE "products" ADD COLUMN "default_unit" TEXT`,
                `UPDATE "products" SET "default_unit" = "unit" WHERE "unit" IS NOT NULL AND "default_unit" IS NULL`,
                `ALTER TABLE "products" ADD COLUMN "custom_attribute_schema" TEXT`,
                `ALTER TABLE "products" ADD COLUMN "image_url" TEXT`,
                `CREATE TABLE IF NOT EXISTS "product_variants" (
                    "variant_id" TEXT PRIMARY KEY NOT NULL,
                    "product_id" TEXT NOT NULL,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "sku" TEXT,
                    "variant_name" TEXT NOT NULL,
                    "primary_barcode" TEXT UNIQUE,
                    "selling_price" REAL NOT NULL DEFAULT 0.00,
                    "cost_price" REAL NOT NULL DEFAULT 0.00,
                    "unit" TEXT NOT NULL DEFAULT 'piece',
                    "description" TEXT,
                    "brand" TEXT,
                    "image_url" TEXT,
                    "is_taxable" INTEGER,
                    "supplier_name" TEXT,
                    "supplier_code" TEXT,
                    "size" TEXT,
                    "weight" REAL,
                    "weight_unit" TEXT,
                    "volume" REAL,
                    "volume_unit" TEXT,
                    "dimensions" TEXT,
                    "custom_attributes" TEXT,
                    "promo_price" REAL,
                    "promo_start" DATETIME,
                    "promo_end" DATETIME,
                    "expiration_date" DATETIME,
                    "manufacture_date" DATETIME,
                    "is_default" INTEGER NOT NULL DEFAULT 1,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE
                )`,
                `CREATE TABLE IF NOT EXISTS "variant_barcodes" (
                    "variant_barcode_id" TEXT PRIMARY KEY NOT NULL,
                    "variant_id" TEXT NOT NULL,
                    "barcode" TEXT NOT NULL UNIQUE,
                    "barcode_type" TEXT NOT NULL DEFAULT 'EAN13',
                    "barcode_source" TEXT NOT NULL DEFAULT 'SUPPLIER',
                    "description" TEXT,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE CASCADE
                )`,
                `INSERT OR IGNORE INTO "product_variants" (
                    "variant_id", "product_id", "tenant_id", "branch_id", "sku", "variant_name",
                    "primary_barcode", "selling_price", "cost_price", "unit", "description", "brand",
                    "image_url", "is_taxable", "supplier_name", "supplier_code", "size", "weight",
                    "dimensions", "promo_price", "promo_start", "promo_end", "expiration_date",
                    "manufacture_date", "is_default", "is_active", "created_at", "updated_at"
                )
                SELECT 
                    lower(hex(randomblob(16))), p."product_id", p."tenant_id", p."branch_id", p."sku", 'Default',
                    p."primary_barcode", p."selling_price", 0.00, COALESCE(p."unit", 'piece'), p."description", p."brand",
                    NULL, p."is_taxable", p."supplier_name", p."supplier_code", p."size", p."weight",
                    p."dimensions", p."promo_price", p."promo_start", p."promo_end", p."expiration_date",
                    p."manufacture_date", 1, p."is_active", p."created_at", p."updated_at"
                FROM "products" p
                WHERE NOT EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."product_id" = p."product_id")`,
                `INSERT OR IGNORE INTO "variant_barcodes" (
                    "variant_barcode_id", "variant_id", "barcode", "barcode_type", "barcode_source",
                    "description", "is_active", "created_at", "updated_at"
                )
                SELECT 
                    pb."product_barcode_id", pv."variant_id", pb."barcode", pb."barcode_type", pb."barcode_source",
                    pb."description", pb."is_active", pb."created_at", pb."updated_at"
                FROM "product_barcodes" pb
                INNER JOIN "product_variants" pv ON pb."product_id" = pv."product_id"`,
                `ALTER TABLE "inventory" ADD COLUMN "variant_id" TEXT`,
                `UPDATE "inventory" SET "variant_id" = (
                    SELECT pv."variant_id" FROM "product_variants" pv 
                    WHERE pv."product_id" = "inventory"."product_id" AND pv."is_default" = 1
                    LIMIT 1
                ) WHERE "variant_id" IS NULL`,
                `ALTER TABLE "sale_items" ADD COLUMN "variant_id" TEXT`,
                `UPDATE "sale_items" SET "variant_id" = (
                    SELECT pv."variant_id" FROM "product_variants" pv 
                    WHERE pv."product_id" = "sale_items"."product_id" AND pv."is_default" = 1
                    LIMIT 1
                ) WHERE "variant_id" IS NULL`,
                `ALTER TABLE "purchase_order_items" ADD COLUMN "variant_id" TEXT`,
                `UPDATE "purchase_order_items" SET "variant_id" = (
                    SELECT pv."variant_id" FROM "product_variants" pv 
                    WHERE pv."product_id" = "purchase_order_items"."product_id" AND pv."is_default" = 1
                    LIMIT 1
                ) WHERE "variant_id" IS NULL`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_product_id" ON "product_variants" ("product_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_branch_id" ON "product_variants" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_tenant_id" ON "product_variants" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_variant_name" ON "product_variants" ("variant_name")`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_variants_unique" ON "product_variants" ("product_id", "variant_name")`,
                `CREATE INDEX IF NOT EXISTS "idx_variant_barcodes_variant_id" ON "variant_barcodes" ("variant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_variant_barcodes_barcode" ON "variant_barcodes" ("barcode")`,
                `CREATE INDEX IF NOT EXISTS "idx_inventory_variant_id" ON "inventory" ("variant_id")`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS add_products_default_unit_col`,
                `CREATE PROCEDURE add_products_default_unit_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'default_unit'
                    ) THEN
                        ALTER TABLE products ADD COLUMN default_unit VARCHAR(50) DEFAULT NULL AFTER supplier_code;
                    END IF;
                END`,
                `CALL add_products_default_unit_col()`,
                `DROP PROCEDURE IF EXISTS add_products_default_unit_col`,
                `DROP PROCEDURE IF EXISTS copy_unit_to_default_unit`,
                `CREATE PROCEDURE copy_unit_to_default_unit()
                BEGIN
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'unit'
                    ) THEN
                        UPDATE products SET default_unit = unit WHERE unit IS NOT NULL AND default_unit IS NULL;
                    END IF;
                END`,
                `CALL copy_unit_to_default_unit()`,
                `DROP PROCEDURE IF EXISTS copy_unit_to_default_unit`,
                `DROP PROCEDURE IF EXISTS add_products_custom_attr_col`,
                `CREATE PROCEDURE add_products_custom_attr_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'custom_attribute_schema'
                    ) THEN
                        ALTER TABLE products ADD COLUMN custom_attribute_schema TEXT DEFAULT NULL;
                    END IF;
                END`,
                `CALL add_products_custom_attr_col()`,
                `DROP PROCEDURE IF EXISTS add_products_custom_attr_col`,
                `DROP PROCEDURE IF EXISTS add_products_image_url_col`,
                `CREATE PROCEDURE add_products_image_url_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'image_url'
                    ) THEN
                        ALTER TABLE products ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;
                    END IF;
                END`,
                `CALL add_products_image_url_col()`,
                `DROP PROCEDURE IF EXISTS add_products_image_url_col`,
                `CREATE TABLE IF NOT EXISTS product_variants (
                    variant_id VARCHAR(191) NOT NULL,
                    product_id VARCHAR(191) NOT NULL,
                    tenant_id VARCHAR(191) NOT NULL,
                    branch_id VARCHAR(191) NOT NULL,
                    sku VARCHAR(191),
                    variant_name VARCHAR(191) NOT NULL,
                    primary_barcode VARCHAR(191),
                    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
                    description TEXT,
                    brand VARCHAR(191),
                    image_url VARCHAR(500),
                    is_taxable BOOLEAN,
                    supplier_name VARCHAR(191),
                    supplier_code VARCHAR(191),
                    size VARCHAR(50),
                    weight DECIMAL(10,3),
                    weight_unit VARCHAR(10),
                    volume DECIMAL(10,3),
                    volume_unit VARCHAR(10),
                    dimensions VARCHAR(100),
                    custom_attributes TEXT,
                    promo_price DECIMAL(10,2),
                    promo_start DATETIME,
                    promo_end DATETIME,
                    expiration_date DATETIME,
                    manufacture_date DATETIME,
                    is_default BOOLEAN NOT NULL DEFAULT TRUE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (variant_id),
                    UNIQUE KEY unique_primary_barcode (primary_barcode),
                    UNIQUE KEY unique_product_variant (product_id, variant_name),
                    INDEX idx_product_id (product_id),
                    INDEX idx_branch_id (branch_id),
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_sku (sku),
                    INDEX idx_variant_name (variant_name),
                    CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                `CREATE TABLE IF NOT EXISTS variant_barcodes (
                    variant_barcode_id VARCHAR(191) NOT NULL,
                    variant_id VARCHAR(191) NOT NULL,
                    barcode VARCHAR(191) NOT NULL,
                    barcode_type ENUM('EAN13', 'EAN8', 'UPCA', 'UPCE', 'CODE39', 'CODE128', 'QR', 'CUSTOM') NOT NULL DEFAULT 'EAN13',
                    barcode_source ENUM('MANUFACTURER', 'SUPPLIER', 'STORE', 'BUNDLE', 'PACKAGING', 'CUSTOM') NOT NULL DEFAULT 'SUPPLIER',
                    description VARCHAR(500),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (variant_barcode_id),
                    UNIQUE KEY unique_barcode (barcode),
                    UNIQUE KEY unique_variant_barcode (variant_id, barcode),
                    INDEX idx_variant_id (variant_id),
                    INDEX idx_barcode (barcode),
                    CONSTRAINT variant_barcodes_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                `DROP PROCEDURE IF EXISTS migrate_products_to_variants`,
                `CREATE PROCEDURE migrate_products_to_variants()
                BEGIN
                    DECLARE has_old_columns BOOLEAN DEFAULT FALSE;
                    
                    -- Check if old schema columns exist (sku indicates old schema with variant columns in products)
                    SELECT COUNT(*) > 0 INTO has_old_columns
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sku';
                    
                    IF has_old_columns THEN
                        -- Old schema: products table has variant-level columns (sku, selling_price, etc.)
                        -- Migrate all product data to variants
                        SET @sql = CONCAT(
                            'INSERT INTO product_variants (',
                            'variant_id, product_id, tenant_id, branch_id, sku, variant_name, ',
                            'primary_barcode, selling_price, cost_price, unit, description, brand, ',
                            'image_url, is_taxable, supplier_name, supplier_code, size, weight, ',
                            'dimensions, promo_price, promo_start, promo_end, expiration_date, ',
                            'manufacture_date, is_default, is_active, created_at, updated_at) ',
                            'SELECT UUID(), product_id, tenant_id, branch_id, sku, ''Default'', ',
                            'primary_barcode, COALESCE(selling_price, 0), 0.00, ',
                            'COALESCE(',
                            (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'unit'), 'unit', 'default_unit')),
                            ', ''piece''), description, brand, ',
                            'NULL, is_taxable, supplier_name, supplier_code, size, weight, ',
                            'dimensions, promo_price, promo_start, promo_end, expiration_date, ',
                            'manufacture_date, TRUE, is_active, created_at, updated_at ',
                            'FROM products p ',
                            'WHERE NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.product_id)'
                        );
                        PREPARE stmt FROM @sql;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    ELSE
                        -- New schema: products table only has core fields, variants are separate
                        -- Create default variants with minimal data
                        INSERT INTO product_variants (
                            variant_id, product_id, tenant_id, branch_id, sku, variant_name,
                            primary_barcode, selling_price, cost_price, unit, description, brand,
                            image_url, is_taxable, supplier_name, supplier_code,
                            is_default, is_active, created_at, updated_at
                        )
                        SELECT 
                            UUID(), product_id, tenant_id, branch_id, NULL, 'Default',
                            NULL, 0.00, 0.00, COALESCE(default_unit, 'piece'), description, brand,
                            image_url, is_taxable, supplier_name, supplier_code,
                            TRUE, is_active, created_at, updated_at
                        FROM products p
                        WHERE NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.product_id);
                    END IF;
                END`,
                `CALL migrate_products_to_variants()`,
                `DROP PROCEDURE IF EXISTS migrate_products_to_variants`,
                `INSERT IGNORE INTO variant_barcodes (
                    variant_barcode_id, variant_id, barcode, barcode_type, barcode_source,
                    description, is_active, created_at, updated_at
                )
                SELECT 
                    pb.product_barcode_id, pv.variant_id, pb.barcode, pb.barcode_type, pb.barcode_source,
                    pb.description, pb.is_active, pb.created_at, pb.updated_at
                FROM product_barcodes pb
                INNER JOIN product_variants pv ON pb.product_id = pv.product_id`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_col`,
                `CREATE PROCEDURE add_inventory_variant_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'variant_id'
                    ) THEN
                        ALTER TABLE inventory ADD COLUMN variant_id VARCHAR(191) AFTER product_id;
                    END IF;
                END`,
                `CALL add_inventory_variant_id_col()`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_col`,
                `DROP PROCEDURE IF EXISTS update_inventory_variant_id`,
                `CREATE PROCEDURE update_inventory_variant_id()
                BEGIN
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'product_id'
                    ) THEN
                        UPDATE inventory i 
                        SET variant_id = (
                            SELECT pv.variant_id FROM product_variants pv 
                            WHERE pv.product_id = i.product_id AND pv.is_default = TRUE
                            LIMIT 1
                        ) WHERE i.variant_id IS NULL;
                    END IF;
                END`,
                `CALL update_inventory_variant_id()`,
                `DROP PROCEDURE IF EXISTS update_inventory_variant_id`,
                `DROP PROCEDURE IF EXISTS add_sale_items_variant_id_col`,
                `CREATE PROCEDURE add_sale_items_variant_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'variant_id'
                    ) THEN
                        ALTER TABLE sale_items ADD COLUMN variant_id VARCHAR(191) AFTER product_id;
                    END IF;
                END`,
                `CALL add_sale_items_variant_id_col()`,
                `DROP PROCEDURE IF EXISTS add_sale_items_variant_id_col`,
                `DROP PROCEDURE IF EXISTS update_sale_items_variant_id`,
                `CREATE PROCEDURE update_sale_items_variant_id()
                BEGIN
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'product_id'
                    ) THEN
                        UPDATE sale_items si 
                        SET variant_id = (
                            SELECT pv.variant_id FROM product_variants pv 
                            WHERE pv.product_id = si.product_id AND pv.is_default = TRUE
                            LIMIT 1
                        ) WHERE si.variant_id IS NULL;
                    END IF;
                END`,
                `CALL update_sale_items_variant_id()`,
                `DROP PROCEDURE IF EXISTS update_sale_items_variant_id`,
                `DROP PROCEDURE IF EXISTS add_purchase_order_items_variant_id_col`,
                `CREATE PROCEDURE add_purchase_order_items_variant_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'variant_id'
                    ) THEN
                        ALTER TABLE purchase_order_items ADD COLUMN variant_id VARCHAR(191) AFTER product_id;
                    END IF;
                END`,
                `CALL add_purchase_order_items_variant_id_col()`,
                `DROP PROCEDURE IF EXISTS add_purchase_order_items_variant_id_col`,
                `DROP PROCEDURE IF EXISTS update_purchase_order_items_variant_id`,
                `CREATE PROCEDURE update_purchase_order_items_variant_id()
                BEGIN
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'product_id'
                    ) THEN
                        UPDATE purchase_order_items poi 
                        SET variant_id = (
                            SELECT pv.variant_id FROM product_variants pv 
                            WHERE pv.product_id = poi.product_id AND pv.is_default = TRUE
                            LIMIT 1
                        ) WHERE poi.variant_id IS NULL;
                    END IF;
                END`,
                `CALL update_purchase_order_items_variant_id()`,
                `DROP PROCEDURE IF EXISTS update_purchase_order_items_variant_id`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_idx`,
                `CREATE PROCEDURE add_inventory_variant_id_idx()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_variant_id'
                    ) THEN
                        CREATE INDEX idx_inventory_variant_id ON inventory (variant_id);
                    END IF;
                END`,
                `CALL add_inventory_variant_id_idx()`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_idx`,
            ],
        },
    down: {
            sqlite: [
                `DROP TABLE IF EXISTS "variant_barcodes"`,
                `DROP TABLE IF EXISTS "product_variants"`,
            ],
            mysql: [
                `ALTER TABLE inventory DROP COLUMN variant_id`,
                `ALTER TABLE sale_items DROP COLUMN variant_id`,
                `ALTER TABLE purchase_order_items DROP COLUMN variant_id`,
                `DROP TABLE IF EXISTS variant_barcodes`,
                `DROP TABLE IF EXISTS product_variants`,
            ],
        },
};
