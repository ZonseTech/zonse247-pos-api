/**
 * Migration: 20260727_01
 * Description: Add payment_methods.category and backfill it from the existing hierarchy
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260727_01',
    description: 'Add payment_methods.category column and backfill it from the existing parent/root hierarchy',
    up: {
        sqlite: [
            `ALTER TABLE "payment_methods" ADD COLUMN "category" TEXT`,
            `CREATE INDEX IF NOT EXISTS "idx_payment_methods_category" ON "payment_methods" ("category")`,

            // Root methods (no parent) categorize themselves.
            `UPDATE "payment_methods" SET "category" = "method_id" WHERE "parent_method_id" IS NULL AND "category" IS NULL`,
            // Leaf/channel methods (POS, Bank Transfer) inherit their root's category.
            `UPDATE "payment_methods" SET "category" = "parent_method_id" WHERE "parent_method_id" IS NOT NULL AND "category" IS NULL`,
        ],
        mysql: [
            `ALTER TABLE payment_methods ADD COLUMN category VARCHAR(191) DEFAULT NULL`,
            `CREATE INDEX idx_payment_methods_category ON payment_methods (category)`,

            `UPDATE payment_methods SET category = method_id WHERE parent_method_id IS NULL AND category IS NULL`,
            `UPDATE payment_methods SET category = parent_method_id WHERE parent_method_id IS NOT NULL AND category IS NULL`,
        ],
    },
    down: {
        sqlite: [
            `UPDATE "payment_methods" SET "category" = NULL`,
        ],
        mysql: [
            `UPDATE payment_methods SET category = NULL`,
        ],
    },
};

export default migration;
