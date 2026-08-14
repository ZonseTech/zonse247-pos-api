/**
 * Migration: 20260808_01
 * Description: Drop legacy global unique constraints on barcode columns (MySQL)
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260808_01',
    description: 'Drop legacy global unique constraints on barcode columns (MySQL)',
    up: {
        sqlite: [],
        mysql: [
            'ALTER TABLE `product_variants` DROP INDEX `unique_primary_barcode`',
            'ALTER TABLE `variant_barcodes` DROP INDEX `unique_barcode`',
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            'CREATE UNIQUE INDEX `unique_primary_barcode` ON `product_variants` (`primary_barcode`)',
            'CREATE UNIQUE INDEX `unique_barcode` ON `variant_barcodes` (`barcode`)',
        ],
    },
};
