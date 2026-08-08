/**
 * Migration: 20260808_01
 * Description: Drop legacy global unique constraints on barcode columns (MySQL)
 *
 * Migration 20260302_04 added tenant/branch-scoped unique indexes for barcodes
 * but failed to drop the original global unique keys, because it guessed the
 * wrong index names. The tables were originally created (20260208_02) with
 * explicitly-named MySQL keys:
 *   - product_variants: UNIQUE KEY unique_primary_barcode (primary_barcode)
 *   - variant_barcodes: UNIQUE KEY unique_barcode (barcode)
 * 20260302_04 instead tried to drop `product_variants_primary_barcode_key` /
 * `variant_barcodes_barcode_key` (Prisma's default naming), which never
 * existed, so those DROP statements silently no-op'd. The result: barcodes
 * were still rejected as duplicates across different tenants, even though the
 * new tenant/branch-scoped unique index was already in place alongside it.
 *
 * SQLite is not affected: template.db is built directly from the current
 * schema.sqlite.prisma via `prisma db push`, so fresh offline branches never
 * had the legacy inline UNIQUE constraint to begin with.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260808_01',
    description: 'Drop legacy global unique constraints on barcode columns (MySQL)',
    up: {
        sqlite: [],
        mysql: [
            `DROP PROCEDURE IF EXISTS drop_index_if_exists_20260808`,
            `CREATE PROCEDURE drop_index_if_exists_20260808(IN tbl VARCHAR(255), IN idx VARCHAR(255))
             BEGIN
                 IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP INDEX \`', idx, '\`');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            `CALL drop_index_if_exists_20260808('product_variants', 'unique_primary_barcode')`,
            `CALL drop_index_if_exists_20260808('variant_barcodes', 'unique_barcode')`,

            `DROP PROCEDURE IF EXISTS drop_index_if_exists_20260808`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            `DROP PROCEDURE IF EXISTS create_index_if_not_exists_20260808`,
            `CREATE PROCEDURE create_index_if_not_exists_20260808(IN idx VARCHAR(255), IN tbl VARCHAR(255), IN cols VARCHAR(500))
             BEGIN
                 IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
                     SET @sql = CONCAT('CREATE UNIQUE INDEX \`', idx, '\` ON \`', tbl, '\` (', cols, ')');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            `CALL create_index_if_not_exists_20260808('unique_primary_barcode', 'product_variants', '\`primary_barcode\`')`,
            `CALL create_index_if_not_exists_20260808('unique_barcode', 'variant_barcodes', '\`barcode\`')`,

            `DROP PROCEDURE IF EXISTS create_index_if_not_exists_20260808`,
        ],
    },
};
