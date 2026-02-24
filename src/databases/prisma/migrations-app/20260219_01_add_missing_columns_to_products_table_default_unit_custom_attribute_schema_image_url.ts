/**
 * Migration: 20260219_01
 * Description: Add missing columns to products table (default_unit, custom_attribute_schema, image_url)
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260219_01',
    description: 'Add missing columns to products table (default_unit, custom_attribute_schema, image_url)',
    up: {
            sqlite: [
                `ALTER TABLE "products" ADD COLUMN "default_unit" TEXT`,
                `ALTER TABLE "products" ADD COLUMN "custom_attribute_schema" TEXT`,
                `ALTER TABLE "products" ADD COLUMN "image_url" TEXT`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS add_products_missing_cols`,
                `CREATE PROCEDURE add_products_missing_cols()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'default_unit'
                    ) THEN
                        ALTER TABLE products ADD COLUMN default_unit VARCHAR(50) DEFAULT NULL;
                    END IF;
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'custom_attribute_schema'
                    ) THEN
                        ALTER TABLE products ADD COLUMN custom_attribute_schema TEXT DEFAULT NULL;
                    END IF;
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'image_url'
                    ) THEN
                        ALTER TABLE products ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;
                    END IF;
                END`,
                `CALL add_products_missing_cols()`,
                `DROP PROCEDURE IF EXISTS add_products_missing_cols`,
            ],
        },
    down: {
            sqlite: [],
            mysql: [],
        },
};
