/**
 * Migration: 20260210_03
 * Description: Fix sale_items unique constraint from (sale_id, product_id) to (sale_id, variant_id)
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260210_03',
    description: 'Fix sale_items unique constraint from (sale_id, product_id) to (sale_id, variant_id)',
    up: {
            sqlite: [
                `DROP INDEX IF EXISTS "sale_items_sale_id_product_id_key"`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "unique_sale_variant" ON "sale_items" ("sale_id", "variant_id")`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS fix_sale_items_unique_constraint`,
                `CREATE PROCEDURE fix_sale_items_unique_constraint()
                BEGIN
                    -- Drop old constraint if exists (sale_id, product_id)
                    IF EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND INDEX_NAME = 'sale_items_sale_id_product_id_key'
                    ) THEN
                        ALTER TABLE sale_items DROP INDEX sale_items_sale_id_product_id_key;
                    END IF;
                    
                    -- Create new constraint if not exists (sale_id, variant_id)
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND INDEX_NAME = 'unique_sale_variant'
                    ) THEN
                        CREATE UNIQUE INDEX unique_sale_variant ON sale_items (sale_id, variant_id);
                    END IF;
                END`,
                `CALL fix_sale_items_unique_constraint()`,
                `DROP PROCEDURE IF EXISTS fix_sale_items_unique_constraint`,
            ],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "unique_sale_variant"`,
                `CREATE UNIQUE INDEX "sale_items_sale_id_product_id_key" ON "sale_items" ("sale_id", "product_id")`,
            ],
            mysql: [
                `DROP INDEX unique_sale_variant ON sale_items`,
                `CREATE UNIQUE INDEX sale_items_sale_id_product_id_key ON sale_items (sale_id, product_id)`,
            ],
        },
};
