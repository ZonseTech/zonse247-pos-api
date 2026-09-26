/**
 * Migration: 20260926_01
 * Description: scope_product_name_uniqueness_to_non_deleted_products
 *
 * Created: 2026-09-26
 *
 * Soft-deleted products kept holding their name through the (branch_id, name)
 * unique index, so a deleted product's name could never be reused. The index
 * now only covers rows where deleted_at IS NULL. Deleted rows keep their
 * original name, so historical sales and reports are unchanged.
 *
 * IMPORTANT:
 * - Never modify this migration once deployed
 * - Use IF NOT EXISTS / IF EXISTS for idempotent operations
 * - Test on both SQLite and MySQL
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260926_01',
    description: 'scope_product_name_uniqueness_to_non_deleted_products',
    up: {
        sqlite: [
            `DROP INDEX IF EXISTS "unique_branch_product_name"`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "unique_branch_active_product_name" ON "products" ("branch_id", "name") WHERE "deleted_at" IS NULL`,
        ],
        mysql: [
            // MySQL has no partial indexes. A functional key part (8.0.13+) that is
            // NULL for deleted rows gives the same result, since NULLs never collide
            // in a unique index. It keeps the name column's collation, so matching
            // stays case-insensitive as before. Re-runs are covered by the runner
            // skipping "Can't DROP" and "Duplicate key name".
            `ALTER TABLE products DROP INDEX unique_branch_product_name`,
            `CREATE UNIQUE INDEX unique_branch_active_product_name ON products (branch_id, ((CASE WHEN deleted_at IS NULL THEN name END)))`,
        ],
    },
    down: {
        // Fails if a deleted product and a live product now share a name in a branch
        sqlite: [
            `DROP INDEX IF EXISTS "unique_branch_active_product_name"`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "unique_branch_product_name" ON "products" ("branch_id", "name")`,
        ],
        mysql: [
            `ALTER TABLE products DROP INDEX unique_branch_active_product_name`,
            `CREATE UNIQUE INDEX unique_branch_product_name ON products (branch_id, name)`,
        ],
    },
};
