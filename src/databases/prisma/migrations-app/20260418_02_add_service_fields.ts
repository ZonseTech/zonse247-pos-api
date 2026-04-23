/**
 * Migration: 20260418_02
 * Description: Add missing fields to services table (sku, isTaxable, taxRate, imageUrl)
 * 
 * These fields are useful for service catalog management:
 * - sku: Service SKU for inventory tracking
 * - is_taxable: Whether tax applies to this service
 * - tax_rate: Custom tax rate for this service
 * - image_url: Service image for display
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260418_02',
    description: 'Add missing fields to services table (sku, isTaxable, taxRate, imageUrl)',
    up: {
        sqlite: [
            `ALTER TABLE "services" ADD COLUMN "sku" TEXT`,
            `ALTER TABLE "services" ADD COLUMN "is_taxable" INTEGER NOT NULL DEFAULT 1`,
            `ALTER TABLE "services" ADD COLUMN "tax_rate" REAL NOT NULL DEFAULT 0`,
            `ALTER TABLE "services" ADD COLUMN "image_url" TEXT`,
        ],
        mysql: [
            `ALTER TABLE \`services\` ADD COLUMN \`sku\` VARCHAR(191) NULL`,
            `ALTER TABLE \`services\` ADD COLUMN \`is_taxable\` TINYINT(1) NOT NULL DEFAULT 1`,
            `ALTER TABLE \`services\` ADD COLUMN \`tax_rate\` DECIMAL(5,2) NOT NULL DEFAULT 0.00`,
            `ALTER TABLE \`services\` ADD COLUMN \`image_url\` VARCHAR(500) NULL`,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN directly in older versions
            // These are no-ops for safety, actual column drop would require table rebuild
        ],
        mysql: [
            `ALTER TABLE \`services\` DROP COLUMN \`sku\``,
            `ALTER TABLE \`services\` DROP COLUMN \`is_taxable\``,
            `ALTER TABLE \`services\` DROP COLUMN \`tax_rate\``,
            `ALTER TABLE \`services\` DROP COLUMN \`image_url\``,
        ],
    },
};
