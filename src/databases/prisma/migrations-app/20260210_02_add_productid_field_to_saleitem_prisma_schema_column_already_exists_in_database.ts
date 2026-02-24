/**
 * Migration: 20260210_02
 * Description: Add productId field to SaleItem Prisma schema (column already exists in database)
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260210_02',
    description: 'Add productId field to SaleItem Prisma schema (column already exists in database)',
    up: {
            sqlite: [
                `CREATE INDEX IF NOT EXISTS "idx_sale_items_product_id" ON "sale_items" ("product_id")`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS add_sale_items_product_id_idx`,
                `CREATE PROCEDURE add_sale_items_product_id_idx()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND INDEX_NAME = 'idx_sale_items_product_id'
                    ) THEN
                        CREATE INDEX idx_sale_items_product_id ON sale_items (product_id);
                    END IF;
                END`,
                `CALL add_sale_items_product_id_idx()`,
                `DROP PROCEDURE IF EXISTS add_sale_items_product_id_idx`,
            ],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "idx_sale_items_product_id"`,
            ],
            mysql: [
                `DROP INDEX idx_sale_items_product_id ON sale_items`,
            ],
        },
};
