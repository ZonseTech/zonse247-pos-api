/**
 * Migration: 20260410_03
 * Description: Refactor loyalty tables from branch-scoped to tenant-scoped
 *
 * Changes:
 * 1. Drop branch_id column and branch FK from loyalty_programs, loyalty_tiers, loyalty_members
 * 2. Update unique constraints: tenant_branch → tenant-only
 * 3. Update sync indexes to use tenant_id only
 * 4. LoyaltyTransaction keeps branch_id (records which branch the sale happened at)
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260410_03',
    description: 'Refactor loyalty program, tier, and member tables from branch-scoped to tenant-scoped',
    up: {
        sqlite: [
            // ── SQLite requires table recreation since it can't drop columns ──
            // 1. loyalty_programs: recreate without branch_id
            `CREATE TABLE IF NOT EXISTS "loyalty_programs_new" (
                "loyalty_program_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "description" TEXT,
                "points_per_currency" REAL NOT NULL DEFAULT 1,
                "currency_per_point" REAL NOT NULL DEFAULT 0.01,
                "min_redeem_points" INTEGER NOT NULL DEFAULT 100,
                "points_expiry_days" INTEGER,
                "auto_enroll" INTEGER NOT NULL DEFAULT 0,
                "is_active" INTEGER NOT NULL DEFAULT 1,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "fk_loyalty_programs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE
            )`,
            `INSERT OR IGNORE INTO "loyalty_programs_new" SELECT "loyalty_program_id", "tenant_id", "name", "description", "points_per_currency", "currency_per_point", "min_redeem_points", "points_expiry_days", "auto_enroll", "is_active", "version", "deleted_at", "created_at", "updated_at" FROM "loyalty_programs"`,
            `DROP TABLE IF EXISTS "loyalty_programs"`,
            `ALTER TABLE "loyalty_programs_new" RENAME TO "loyalty_programs"`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_loyalty_programs_tenant" ON "loyalty_programs"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_programs_active" ON "loyalty_programs"("is_active")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_programs_sync" ON "loyalty_programs"("tenant_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_programs_updated" ON "loyalty_programs"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_programs_deleted" ON "loyalty_programs"("deleted_at")`,
            // 2. loyalty_tiers: recreate without branch_id
            `CREATE TABLE IF NOT EXISTS "loyalty_tiers_new" (
                "loyalty_tier_id" TEXT NOT NULL PRIMARY KEY,
                "loyalty_program_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "min_points" INTEGER NOT NULL DEFAULT 0,
                "points_multiplier" REAL NOT NULL DEFAULT 1.0,
                "discount_percentage" REAL NOT NULL DEFAULT 0,
                "benefits" TEXT,
                "sort_order" INTEGER NOT NULL DEFAULT 0,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "fk_loyalty_tiers_program" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("loyalty_program_id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_tiers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE
            )`,
            `INSERT OR IGNORE INTO "loyalty_tiers_new" SELECT "loyalty_tier_id", "loyalty_program_id", "tenant_id", "name", "min_points", "points_multiplier", "discount_percentage", "benefits", "sort_order", "version", "deleted_at", "created_at", "updated_at" FROM "loyalty_tiers"`,
            `DROP TABLE IF EXISTS "loyalty_tiers"`,
            `ALTER TABLE "loyalty_tiers_new" RENAME TO "loyalty_tiers"`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_program" ON "loyalty_tiers"("loyalty_program_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_min_points" ON "loyalty_tiers"("min_points")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_sync" ON "loyalty_tiers"("tenant_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_updated" ON "loyalty_tiers"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_tiers_deleted" ON "loyalty_tiers"("deleted_at")`,
            // 3. loyalty_members: recreate without branch_id
            `CREATE TABLE IF NOT EXISTS "loyalty_members_new" (
                "loyalty_member_id" TEXT NOT NULL PRIMARY KEY,
                "loyalty_program_id" TEXT NOT NULL,
                "customer_id" TEXT NOT NULL,
                "loyalty_tier_id" TEXT,
                "tenant_id" TEXT NOT NULL,
                "membership_number" TEXT NOT NULL,
                "available_points" INTEGER NOT NULL DEFAULT 0,
                "lifetime_points" INTEGER NOT NULL DEFAULT 0,
                "redeemed_points" INTEGER NOT NULL DEFAULT 0,
                "is_active" INTEGER NOT NULL DEFAULT 1,
                "enrolled_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "last_activity_at" DATETIME,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "fk_loyalty_members_program" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("loyalty_program_id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_members_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_members_tier" FOREIGN KEY ("loyalty_tier_id") REFERENCES "loyalty_tiers"("loyalty_tier_id") ON DELETE SET NULL,
                CONSTRAINT "fk_loyalty_members_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE
            )`,
            `INSERT OR IGNORE INTO "loyalty_members_new" SELECT "loyalty_member_id", "loyalty_program_id", "customer_id", "loyalty_tier_id", "tenant_id", "membership_number", "available_points", "lifetime_points", "redeemed_points", "is_active", "enrolled_at", "last_activity_at", "version", "deleted_at", "created_at", "updated_at" FROM "loyalty_members"`,
            `DROP TABLE IF EXISTS "loyalty_members"`,
            `ALTER TABLE "loyalty_members_new" RENAME TO "loyalty_members"`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_loyalty_members_program_customer" ON "loyalty_members"("loyalty_program_id", "customer_id")`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_loyalty_members_membership_number" ON "loyalty_members"("tenant_id", "membership_number")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_members_customer" ON "loyalty_members"("customer_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_members_tier" ON "loyalty_members"("loyalty_tier_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_members_active" ON "loyalty_members"("is_active")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_members_sync" ON "loyalty_members"("tenant_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_members_updated" ON "loyalty_members"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_loyalty_members_deleted" ON "loyalty_members"("deleted_at")`,
        ],
        mysql: [
            // ── loyalty_programs: add replacement indexes FIRST so FK has a backing index ──
            `ALTER TABLE \`loyalty_programs\` DROP FOREIGN KEY \`fk_loyalty_programs_branch\``,
            `ALTER TABLE \`loyalty_programs\` DROP INDEX \`idx_loyalty_programs_tenant_branch\``,
            `ALTER TABLE \`loyalty_programs\` ADD UNIQUE KEY \`idx_loyalty_programs_tenant\` (\`tenant_id\`)`,
            `ALTER TABLE \`loyalty_programs\` DROP INDEX \`idx_loyalty_programs_sync\``,
            `ALTER TABLE \`loyalty_programs\` ADD KEY \`idx_loyalty_programs_sync\` (\`tenant_id\`, \`updated_at\`)`,
            `ALTER TABLE \`loyalty_programs\` DROP COLUMN \`branch_id\``,
            // ── loyalty_tiers: add replacement index FIRST ──
            `ALTER TABLE \`loyalty_tiers\` DROP FOREIGN KEY \`fk_loyalty_tiers_branch\``,
            `ALTER TABLE \`loyalty_tiers\` ADD KEY \`idx_loyalty_tiers_sync_new\` (\`tenant_id\`, \`updated_at\`)`,
            `ALTER TABLE \`loyalty_tiers\` DROP INDEX \`idx_loyalty_tiers_sync\``,
            `ALTER TABLE \`loyalty_tiers\` DROP COLUMN \`branch_id\``,
            // ── loyalty_members: add replacement indexes FIRST ──
            `ALTER TABLE \`loyalty_members\` DROP FOREIGN KEY \`fk_loyalty_members_branch\``,
            `ALTER TABLE \`loyalty_members\` ADD UNIQUE KEY \`idx_loyalty_members_membership_number_new\` (\`tenant_id\`, \`membership_number\`)`,
            `ALTER TABLE \`loyalty_members\` DROP INDEX \`idx_loyalty_members_membership_number\``,
            `ALTER TABLE \`loyalty_members\` ADD KEY \`idx_loyalty_members_sync_new\` (\`tenant_id\`, \`updated_at\`)`,
            `ALTER TABLE \`loyalty_members\` DROP INDEX \`idx_loyalty_members_sync\``,
            `ALTER TABLE \`loyalty_members\` DROP COLUMN \`branch_id\``,
        ],
    },
    down: {
        sqlite: [
        // Rolling back SQLite table recreation is not practical; re-run 20260410_02 instead
        ],
        mysql: [
            // Re-add branch_id columns (would need default value or be nullable)
            `ALTER TABLE \`loyalty_programs\` ADD COLUMN \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER \`tenant_id\``,
            `ALTER TABLE \`loyalty_tiers\` ADD COLUMN \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER \`tenant_id\``,
            `ALTER TABLE \`loyalty_members\` ADD COLUMN \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER \`tenant_id\``,
        ],
    },
};
