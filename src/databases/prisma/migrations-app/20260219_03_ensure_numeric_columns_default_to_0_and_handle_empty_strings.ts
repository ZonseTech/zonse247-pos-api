/**
 * Migration: 20260219_03
 * Description: Ensure numeric columns default to 0 and handle empty strings
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260219_03',
    description: 'Ensure numeric columns default to 0 and handle empty strings',
    up: {
            sqlite: [
                `UPDATE "products" SET "sku" = 'SKU-' || substr(product_id, 1, 8) WHERE "sku" = ''`,
                `UPDATE "products" SET "selling_price" = 0 WHERE "selling_price" IS NULL`,
                `UPDATE "products" SET "weight" = 0 WHERE "weight" IS NULL`,
                `UPDATE "products" SET "promo_price" = 0 WHERE "promo_price" IS NULL`,
                `UPDATE "product_variants" SET "sku" = NULL WHERE "sku" = ''`,
                `UPDATE "product_variants" SET "selling_price" = 0 WHERE "selling_price" IS NULL`,
                `UPDATE "product_variants" SET "cost_price" = 0 WHERE "cost_price" IS NULL`,
                `UPDATE "product_variants" SET "weight" = 0 WHERE "weight" IS NULL`,
                `UPDATE "product_variants" SET "volume" = 0 WHERE "volume" IS NULL`,
                `UPDATE "product_variants" SET "promo_price" = 0 WHERE "promo_price" IS NULL`,
                `UPDATE "inventory" SET "available_quantity" = 0 WHERE "available_quantity" IS NULL`,
                `UPDATE "inventory" SET "reserved_quantity" = 0 WHERE "reserved_quantity" IS NULL`,
                `UPDATE "inventory" SET "damaged_quantity" = 0 WHERE "damaged_quantity" IS NULL`,
                `UPDATE "inventory" SET "reorder_point" = 0 WHERE "reorder_point" IS NULL`,
                `UPDATE "inventory" SET "max_stock" = 0 WHERE "max_stock" IS NULL`,
                `UPDATE "inventory" SET "average_cost" = 0 WHERE "average_cost" IS NULL`,
                `UPDATE "inventory" SET "last_purchase_cost" = 0 WHERE "last_purchase_cost" IS NULL`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS make_sku_nullable`,
                `CREATE PROCEDURE make_sku_nullable()
                BEGIN
                    -- Make products.sku nullable if column exists
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sku'
                    ) THEN
                        ALTER TABLE products MODIFY COLUMN sku VARCHAR(191) NULL;
                        UPDATE products SET sku = CONCAT('SKU-', LEFT(product_id, 8)) WHERE sku = '';
                    END IF;

                    -- Make product_variants.sku nullable (should already be, but ensure)
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_variants' AND COLUMN_NAME = 'sku'
                    ) THEN
                        ALTER TABLE product_variants MODIFY COLUMN sku VARCHAR(191) NULL;
                        UPDATE product_variants SET sku = NULL WHERE sku = '';
                    END IF;
                END`,
                `CALL make_sku_nullable()`,
                `DROP PROCEDURE IF EXISTS make_sku_nullable`,
                `DROP PROCEDURE IF EXISTS update_numeric_defaults`,
                `CREATE PROCEDURE update_numeric_defaults()
                BEGIN
                    -- Products table
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'selling_price') THEN
                        UPDATE products SET selling_price = 0 WHERE selling_price IS NULL;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'weight') THEN
                        UPDATE products SET weight = 0 WHERE weight IS NULL;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'promo_price') THEN
                        UPDATE products SET promo_price = 0 WHERE promo_price IS NULL;
                    END IF;

                    -- Product variants table
                    UPDATE product_variants SET selling_price = 0 WHERE selling_price IS NULL;
                    UPDATE product_variants SET cost_price = 0 WHERE cost_price IS NULL;
                    UPDATE product_variants SET weight = 0 WHERE weight IS NULL;
                    UPDATE product_variants SET volume = 0 WHERE volume IS NULL;
                    UPDATE product_variants SET promo_price = 0 WHERE promo_price IS NULL;

                    -- Inventory table
                    UPDATE inventory SET available_quantity = 0 WHERE available_quantity IS NULL;
                    UPDATE inventory SET reserved_quantity = 0 WHERE reserved_quantity IS NULL;
                    UPDATE inventory SET damaged_quantity = 0 WHERE damaged_quantity IS NULL;
                    UPDATE inventory SET reorder_point = 0 WHERE reorder_point IS NULL;
                    UPDATE inventory SET max_stock = 0 WHERE max_stock IS NULL;
                    UPDATE inventory SET average_cost = 0 WHERE average_cost IS NULL;
                    UPDATE inventory SET last_purchase_cost = 0 WHERE last_purchase_cost IS NULL;
                END`,
                `CALL update_numeric_defaults()`,
                `DROP PROCEDURE IF EXISTS update_numeric_defaults`,
            ],
        },
    down: {
            sqlite: [],
            mysql: [],
        },
};
