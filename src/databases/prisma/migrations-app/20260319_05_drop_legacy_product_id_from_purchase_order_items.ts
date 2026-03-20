/**
 * Migration: 20260319_05
 * Description: Drop legacy product_id column from purchase_order_items and fix constraints
 *
 * The purchase_order_items table originally had a `product_id` NOT NULL column.
 * Migration 20260208_02 added `variant_id` and migrated data, but never dropped
 * `product_id`. The Prisma schema no longer maps this column, so inserts fail
 * with "Null constraint violation on the fields: (`product_id`)" and
 * "Unique constraint failed on purchase_order_items_purchase_order_id_product_id_key".
 *
 * Changes:
 * 1. Drop ALL FK constraints referencing product_id on purchase_order_items
 * 2. Drop ALL indexes/unique constraints referencing product_id
 * 3. Drop the product_id column from purchase_order_items
 * 4. Make variant_id NOT NULL (was nullable from the ADD COLUMN migration)
 * 5. Add unique constraint on (purchase_order_id, variant_id) matching Prisma schema
 * 6. Add variant_id index and FK constraint
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260319_05',
    description: 'Drop legacy product_id column from purchase_order_items and fix constraints',
    up: {
        sqlite: [
            // SQLite uses TEXT columns — no constraint issues. Column may not exist if fresh.
        ],
        mysql: [
            // 1. Drop ALL FK constraints that reference product_id
            `DROP PROCEDURE IF EXISTS drop_poi_product_id_fks`,
            `CREATE PROCEDURE drop_poi_product_id_fks()
            BEGIN
                DECLARE done INT DEFAULT FALSE;
                DECLARE fk_name VARCHAR(255);
                DECLARE cur CURSOR FOR
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'purchase_order_items'
                      AND COLUMN_NAME = 'product_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL;
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

                OPEN cur;
                read_loop: LOOP
                    FETCH cur INTO fk_name;
                    IF done THEN LEAVE read_loop; END IF;
                    SET @sql = CONCAT('ALTER TABLE \`purchase_order_items\` DROP FOREIGN KEY \`', fk_name, '\`');
                    PREPARE stmt FROM @sql;
                    EXECUTE stmt;
                    DEALLOCATE PREPARE stmt;
                END LOOP;
                CLOSE cur;
            END`,
            `CALL drop_poi_product_id_fks()`,
            `DROP PROCEDURE IF EXISTS drop_poi_product_id_fks`,

            // 2. Drop ALL indexes/unique constraints that reference product_id
            `DROP PROCEDURE IF EXISTS drop_poi_product_id_indexes`,
            `CREATE PROCEDURE drop_poi_product_id_indexes()
            BEGIN
                DECLARE done INT DEFAULT FALSE;
                DECLARE idx_name VARCHAR(255);
                DECLARE cur CURSOR FOR
                    SELECT DISTINCT INDEX_NAME
                    FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'purchase_order_items'
                      AND COLUMN_NAME = 'product_id'
                      AND INDEX_NAME != 'PRIMARY';
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

                OPEN cur;
                read_loop: LOOP
                    FETCH cur INTO idx_name;
                    IF done THEN LEAVE read_loop; END IF;
                    SET @sql = CONCAT('DROP INDEX \`', idx_name, '\` ON \`purchase_order_items\`');
                    PREPARE stmt FROM @sql;
                    EXECUTE stmt;
                    DEALLOCATE PREPARE stmt;
                END LOOP;
                CLOSE cur;
            END`,
            `CALL drop_poi_product_id_indexes()`,
            `DROP PROCEDURE IF EXISTS drop_poi_product_id_indexes`,

            // 3. Drop the column itself
            `DROP PROCEDURE IF EXISTS drop_poi_product_id_col`,
            `CREATE PROCEDURE drop_poi_product_id_col()
            BEGIN
                IF EXISTS (
                    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'purchase_order_items'
                      AND COLUMN_NAME = 'product_id'
                ) THEN
                    ALTER TABLE \`purchase_order_items\` DROP COLUMN \`product_id\`;
                END IF;
            END`,
            `CALL drop_poi_product_id_col()`,
            `DROP PROCEDURE IF EXISTS drop_poi_product_id_col`,

            // 4. Make variant_id NOT NULL (was nullable from ADD COLUMN in 20260208_02)
            `ALTER TABLE \`purchase_order_items\` MODIFY COLUMN \`variant_id\` VARCHAR(191) NOT NULL`,

            // 5. Add unique constraint matching Prisma schema @@unique([purchaseOrderId, variantId])
            `DROP PROCEDURE IF EXISTS add_poi_unique_po_variant`,
            `CREATE PROCEDURE add_poi_unique_po_variant()
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'purchase_order_items'
                      AND INDEX_NAME = 'unique_po_variant'
                ) THEN
                    ALTER TABLE \`purchase_order_items\` ADD UNIQUE KEY \`unique_po_variant\` (\`purchase_order_id\`, \`variant_id\`);
                END IF;
            END`,
            `CALL add_poi_unique_po_variant()`,
            `DROP PROCEDURE IF EXISTS add_poi_unique_po_variant`,

            // 6. Add variant_id index if missing
            `DROP PROCEDURE IF EXISTS add_poi_variant_id_idx`,
            `CREATE PROCEDURE add_poi_variant_id_idx()
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'purchase_order_items'
                      AND INDEX_NAME = 'purchase_order_items_variant_id_idx'
                ) THEN
                    CREATE INDEX \`purchase_order_items_variant_id_idx\` ON \`purchase_order_items\` (\`variant_id\`);
                END IF;
            END`,
            `CALL add_poi_variant_id_idx()`,
            `DROP PROCEDURE IF EXISTS add_poi_variant_id_idx`,

            // 7. Add FK for variant_id if missing
            `DROP PROCEDURE IF EXISTS add_poi_variant_id_fk`,
            `CREATE PROCEDURE add_poi_variant_id_fk()
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'purchase_order_items'
                      AND COLUMN_NAME = 'variant_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                ) THEN
                    ALTER TABLE \`purchase_order_items\` ADD CONSTRAINT \`purchase_order_items_variant_id_fkey\`
                        FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\` (\`variant_id\`)
                        ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
            END`,
            `CALL add_poi_variant_id_fk()`,
            `DROP PROCEDURE IF EXISTS add_poi_variant_id_fk`,
        ],
    },
};
