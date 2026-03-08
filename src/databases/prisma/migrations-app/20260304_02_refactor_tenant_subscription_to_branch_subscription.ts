/**
 * Migration: 20260304_02
 * Description: Refactor TenantSubscription to BranchSubscription - Create branch_subscriptions table and add FK to branches
 * 
 * This migration:
 * - Creates the branch_subscriptions table with subscription_plan_id FK
 * - Adds branch_subscription_id FK column to branches table
 * - Establishes one-to-one relationship between Branch and BranchSubscription
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260304_02',
    description: 'Refactor TenantSubscription to BranchSubscription - Create branch_subscriptions table and add FK to branches',
    up: {
        sqlite: [
            // Create branch_subscriptions table
            `CREATE TABLE IF NOT EXISTS "branch_subscriptions" (
                "branch_subscription_id" TEXT PRIMARY KEY NOT NULL,
                "subscription_plan_id" TEXT NOT NULL,
                "status" TEXT DEFAULT 'active',
                "starts_at" DATETIME,
                "ends_at" DATETIME,
                "auto_renew" INTEGER DEFAULT 0,
                "payment_method" TEXT,
                "last_payment_date" DATETIME,
                "next_payment_date" DATETIME,
                "synced" INTEGER DEFAULT 0,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "branch_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans" ("subscription_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,
            // Add synced column if it doesn't exist (for tables created by older migration version)
            `ALTER TABLE "branch_subscriptions" ADD COLUMN "synced" INTEGER DEFAULT 0`,
            // Create index on subscription_plan_id
            `CREATE INDEX IF NOT EXISTS "idx_branch_subscriptions_subscription_plan_id" ON "branch_subscriptions" ("subscription_plan_id")`,
            // Add branch_subscription_id column to branches (SQLite doesn't allow UNIQUE in ALTER TABLE)
            `ALTER TABLE "branches" ADD COLUMN "branch_subscription_id" TEXT`,
            // Create unique index on branch_subscription_id (serves as both unique constraint and index)
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_branches_branch_subscription_id" ON "branches" ("branch_subscription_id")`,
        ],
        mysql: [
            // Create branch_subscriptions table
            `CREATE TABLE IF NOT EXISTS \`branch_subscriptions\` (
                \`branch_subscription_id\` VARCHAR(191) NOT NULL,
                \`subscription_plan_id\` VARCHAR(191) NOT NULL,
                \`status\` ENUM('active', 'cancelled', 'expired', 'past_due') DEFAULT 'active',
                \`starts_at\` DATETIME(3) NULL,
                \`ends_at\` DATETIME(3) NULL,
                \`auto_renew\` TINYINT(1) DEFAULT 0,
                \`payment_method\` VARCHAR(191) NULL,
                \`last_payment_date\` DATETIME(3) NULL,
                \`next_payment_date\` DATETIME(3) NULL,
                \`synced\` TINYINT(1) DEFAULT 0,
                \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`branch_subscription_id\`),
                INDEX \`idx_branch_subscriptions_subscription_plan_id\` (\`subscription_plan_id\`),
                CONSTRAINT \`branch_subscriptions_subscription_plan_id_fkey\` FOREIGN KEY (\`subscription_plan_id\`) REFERENCES \`subscription_plans\` (\`subscription_plan_id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            // Add branch_subscription_id column to branches
            `ALTER TABLE \`branches\` ADD COLUMN \`branch_subscription_id\` VARCHAR(191) NULL UNIQUE AFTER \`subscription_plan_id\``,
            // Add index for branch_subscription_id
            `CREATE INDEX \`idx_branches_branch_subscription_id\` ON \`branches\` (\`branch_subscription_id\`)`,
            // Add foreign key constraint
            `ALTER TABLE \`branches\` ADD CONSTRAINT \`branches_branch_subscription_id_fkey\` FOREIGN KEY (\`branch_subscription_id\`) REFERENCES \`branch_subscriptions\`(\`branch_subscription_id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
        ],
    },
    down: {
        sqlite: [
            // Drop index on branches
            `DROP INDEX IF EXISTS "idx_branches_branch_subscription_id"`,
            // SQLite doesn't support DROP COLUMN directly - would need table recreation
            `-- Note: SQLite doesn't support DROP COLUMN. To rollback branch_subscription_id, table needs to be recreated.`,
            // Drop branch_subscriptions table
            `DROP TABLE IF EXISTS "branch_subscriptions"`,
        ],
        mysql: [
            // Drop foreign key from branches
            `ALTER TABLE \`branches\` DROP FOREIGN KEY \`branches_branch_subscription_id_fkey\``,
            // Drop index from branches
            `DROP INDEX \`idx_branches_branch_subscription_id\` ON \`branches\``,
            // Drop column from branches
            `ALTER TABLE \`branches\` DROP COLUMN \`branch_subscription_id\``,
            // Drop branch_subscriptions table
            `DROP TABLE IF EXISTS \`branch_subscriptions\``,
        ],
    },
};
