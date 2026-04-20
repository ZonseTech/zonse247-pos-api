/**
 * Migration: 20260419_04
 * Description: Drop tenant_subscriptions table - replaced by branch_subscriptions
 *
 * The tenant_subscriptions table is a legacy table that was used before
 * subscriptions were moved to branch level via branch_subscriptions.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260419_04',
    description: 'Drop tenant_subscriptions table - replaced by branch_subscriptions',
    up: {
        sqlite: [
            `DROP TABLE IF EXISTS "tenant_subscriptions"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`tenant_subscriptions\``,
        ],
    },
    down: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
                "tenant_subscription_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT,
                "subscription_plan_id" TEXT NOT NULL,
                "status" TEXT DEFAULT 'active',
                "starts_at" DATETIME NOT NULL,
                "ends_at" DATETIME,
                "auto_renew" INTEGER DEFAULT 1,
                "payment_method" TEXT,
                "max_branches" INTEGER DEFAULT 1,
                "synced" INTEGER DEFAULT 0,
                "last_payment_date" DATETIME,
                "next_payment_date" DATETIME,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`tenant_subscriptions\` (
                \`tenant_subscription_id\` VARCHAR(191) NOT NULL,
                \`tenant_id\` VARCHAR(191) NOT NULL,
                \`branch_id\` VARCHAR(191) NULL,
                \`subscription_plan_id\` VARCHAR(191) NOT NULL,
                \`status\` ENUM('active', 'cancelled', 'expired', 'past_due') DEFAULT 'active',
                \`starts_at\` DATETIME(3) NOT NULL,
                \`ends_at\` DATETIME(3) NULL,
                \`auto_renew\` TINYINT(1) DEFAULT 1,
                \`payment_method\` VARCHAR(191) NULL,
                \`max_branches\` INT DEFAULT 1,
                \`synced\` INT DEFAULT 0,
                \`last_payment_date\` DATETIME(3) NULL,
                \`next_payment_date\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`tenant_subscription_id\`)
            )`,
        ],
    },
};
