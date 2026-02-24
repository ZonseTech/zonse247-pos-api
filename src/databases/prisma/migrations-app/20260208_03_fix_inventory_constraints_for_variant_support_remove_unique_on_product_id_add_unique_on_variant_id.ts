/**
 * Migration: 20260208_03
 * Description: Fix inventory constraints for variant support - remove unique on product_id, add unique on variant_id
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260208_03',
    description: 'Fix inventory constraints for variant support - remove unique on product_id, add unique on variant_id',
    up: {
            sqlite: [
                `DROP INDEX IF EXISTS "inventory_product_id_key"`,
                `CREATE INDEX IF NOT EXISTS "idx_inventory_product_id" ON "inventory" ("product_id")`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_variant_id_key" ON "inventory" ("variant_id")`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS fix_inventory_product_id_constraint`,
                `CREATE PROCEDURE fix_inventory_product_id_constraint()
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'inventory_product_id_key'
                    ) THEN
                        ALTER TABLE inventory DROP INDEX inventory_product_id_key;
                    END IF;
                END`,
                `CALL fix_inventory_product_id_constraint()`,
                `DROP PROCEDURE IF EXISTS fix_inventory_product_id_constraint`,
                `DROP PROCEDURE IF EXISTS add_inventory_product_id_idx`,
                `CREATE PROCEDURE add_inventory_product_id_idx()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_product_id'
                    ) THEN
                        CREATE INDEX idx_inventory_product_id ON inventory (product_id);
                    END IF;
                END`,
                `CALL add_inventory_product_id_idx()`,
                `DROP PROCEDURE IF EXISTS add_inventory_product_id_idx`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_unique`,
                `CREATE PROCEDURE add_inventory_variant_id_unique()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'inventory_variant_id_key'
                    ) THEN
                        CREATE UNIQUE INDEX inventory_variant_id_key ON inventory (variant_id);
                    END IF;
                END`,
                `CALL add_inventory_variant_id_unique()`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_unique`,
            ],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "inventory_variant_id_key"`,
                `DROP INDEX IF EXISTS "idx_inventory_product_id"`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_product_id_key" ON "inventory" ("product_id")`,
            ],
            mysql: [
                `DROP INDEX inventory_variant_id_key ON inventory`,
                `DROP INDEX idx_inventory_product_id ON inventory`,
                `CREATE UNIQUE INDEX inventory_product_id_key ON inventory (product_id)`,
            ],
        },
};
