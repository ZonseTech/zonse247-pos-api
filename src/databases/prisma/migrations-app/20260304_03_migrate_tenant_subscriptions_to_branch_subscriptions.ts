/**
 * Migration: 20260304_03
 * Description: Migrate data from tenant_subscriptions to branch_subscriptions
 * 
 * This migration:
 * - Copies subscription data from tenant_subscriptions to branch_subscriptions
 * - Links branches to their corresponding branch_subscriptions via branch_subscription_id
 * - Preserves subscription status, dates, and payment info
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260304_03',
    description: 'Migrate data from tenant_subscriptions to branch_subscriptions',
    up: {
        sqlite: [
            // Insert into branch_subscriptions from tenant_subscriptions (for each branch)
            `INSERT OR IGNORE INTO "branch_subscriptions" (
                "branch_subscription_id",
                "subscription_plan_id",
                "status",
                "starts_at",
                "ends_at",
                "auto_renew",
                "payment_method",
                "last_payment_date",
                "next_payment_date",
                "synced",
                "created_at",
                "updated_at"
            )
            SELECT 
                'bs-' || ts."tenant_subscription_id" AS "branch_subscription_id",
                ts."subscription_plan_id",
                ts."status",
                ts."starts_at",
                ts."ends_at",
                ts."auto_renew",
                ts."payment_method",
                ts."last_payment_date",
                ts."next_payment_date",
                ts."synced",
                ts."created_at",
                ts."updated_at"
            FROM "tenant_subscriptions" ts
            WHERE ts."branch_id" IS NOT NULL
            AND ts."subscription_plan_id" IS NOT NULL`,

            // Update branches to link to the new branch_subscriptions
            `UPDATE "branches" 
            SET "branch_subscription_id" = (
                SELECT 'bs-' || ts."tenant_subscription_id"
                FROM "tenant_subscriptions" ts
                WHERE ts."branch_id" = "branches"."branch_id"
                AND ts."status" = 'active'
                ORDER BY ts."created_at" DESC
                LIMIT 1
            )
            WHERE "branch_subscription_id" IS NULL
            AND EXISTS (
                SELECT 1 FROM "tenant_subscriptions" ts
                WHERE ts."branch_id" = "branches"."branch_id"
            )`,

            // For branches without branch_id in tenant_subscriptions, create subscriptions from tenant-level
            `INSERT OR IGNORE INTO "branch_subscriptions" (
                "branch_subscription_id",
                "subscription_plan_id",
                "status",
                "starts_at",
                "ends_at",
                "auto_renew",
                "payment_method",
                "last_payment_date",
                "next_payment_date",
                "synced",
                "created_at",
                "updated_at"
            )
            SELECT 
                'bs-' || b."branch_id" AS "branch_subscription_id",
                ts."subscription_plan_id",
                ts."status",
                ts."starts_at",
                ts."ends_at",
                ts."auto_renew",
                ts."payment_method",
                ts."last_payment_date",
                ts."next_payment_date",
                ts."synced",
                ts."created_at",
                ts."updated_at"
            FROM "branches" b
            INNER JOIN "tenant_subscriptions" ts ON ts."tenant_id" = b."tenant_id"
            WHERE b."branch_subscription_id" IS NULL
            AND ts."subscription_plan_id" IS NOT NULL
            AND ts."status" = 'active'`,

            // Update remaining branches to link to tenant-level subscriptions
            `UPDATE "branches" 
            SET "branch_subscription_id" = 'bs-' || "branch_id"
            WHERE "branch_subscription_id" IS NULL
            AND EXISTS (
                SELECT 1 FROM "branch_subscriptions" bs
                WHERE bs."branch_subscription_id" = 'bs-' || "branches"."branch_id"
            )`,
        ],
        mysql: [
            // Insert into branch_subscriptions from tenant_subscriptions (for branches with branch_id)
            `INSERT IGNORE INTO \`branch_subscriptions\` (
                \`branch_subscription_id\`,
                \`subscription_plan_id\`,
                \`status\`,
                \`starts_at\`,
                \`ends_at\`,
                \`auto_renew\`,
                \`payment_method\`,
                \`last_payment_date\`,
                \`next_payment_date\`,
                \`synced\`,
                \`created_at\`,
                \`updated_at\`
            )
            SELECT 
                CONCAT('bs-', ts.\`tenant_subscription_id\`) AS \`branch_subscription_id\`,
                ts.\`subscription_plan_id\`,
                ts.\`status\`,
                ts.\`starts_at\`,
                ts.\`ends_at\`,
                ts.\`auto_renew\`,
                ts.\`payment_method\`,
                ts.\`last_payment_date\`,
                ts.\`next_payment_date\`,
                ts.\`synced\`,
                ts.\`created_at\`,
                ts.\`updated_at\`
            FROM \`tenant_subscriptions\` ts
            WHERE ts.\`branch_id\` IS NOT NULL
            AND ts.\`subscription_plan_id\` IS NOT NULL`,

            // Update branches to link to the new branch_subscriptions (for those with branch_id in tenant_subscriptions)
            `UPDATE \`branches\` b
            INNER JOIN (
                SELECT ts.\`branch_id\`, CONCAT('bs-', ts.\`tenant_subscription_id\`) AS \`new_subscription_id\`
                FROM \`tenant_subscriptions\` ts
                WHERE ts.\`branch_id\` IS NOT NULL
                AND ts.\`status\` = 'active'
            ) sub ON sub.\`branch_id\` = b.\`branch_id\`
            SET b.\`branch_subscription_id\` = sub.\`new_subscription_id\`
            WHERE b.\`branch_subscription_id\` IS NULL`,

            // For branches without branch_id in tenant_subscriptions, create subscriptions from tenant-level
            `INSERT IGNORE INTO \`branch_subscriptions\` (
                \`branch_subscription_id\`,
                \`subscription_plan_id\`,
                \`status\`,
                \`starts_at\`,
                \`ends_at\`,
                \`auto_renew\`,
                \`payment_method\`,
                \`last_payment_date\`,
                \`next_payment_date\`,
                \`synced\`,
                \`created_at\`,
                \`updated_at\`
            )
            SELECT 
                CONCAT('bs-', b.\`branch_id\`) AS \`branch_subscription_id\`,
                ts.\`subscription_plan_id\`,
                ts.\`status\`,
                ts.\`starts_at\`,
                ts.\`ends_at\`,
                ts.\`auto_renew\`,
                ts.\`payment_method\`,
                ts.\`last_payment_date\`,
                ts.\`next_payment_date\`,
                ts.\`synced\`,
                ts.\`created_at\`,
                ts.\`updated_at\`
            FROM \`branches\` b
            INNER JOIN \`tenant_subscriptions\` ts ON ts.\`tenant_id\` = b.\`tenant_id\`
            WHERE b.\`branch_subscription_id\` IS NULL
            AND ts.\`subscription_plan_id\` IS NOT NULL
            AND ts.\`status\` = 'active'`,

            // Update remaining branches to link to tenant-level subscriptions
            `UPDATE \`branches\` b
            INNER JOIN \`branch_subscriptions\` bs ON bs.\`branch_subscription_id\` = CONCAT('bs-', b.\`branch_id\`)
            SET b.\`branch_subscription_id\` = bs.\`branch_subscription_id\`
            WHERE b.\`branch_subscription_id\` IS NULL`,
        ],
    },
    down: {
        sqlite: [
            // Remove branch_subscription_id from branches
            `UPDATE "branches" SET "branch_subscription_id" = NULL WHERE "branch_subscription_id" LIKE 'bs-%'`,
            // Delete migrated branch_subscriptions
            `DELETE FROM "branch_subscriptions" WHERE "branch_subscription_id" LIKE 'bs-%'`,
        ],
        mysql: [
            // Remove branch_subscription_id from branches
            `UPDATE \`branches\` SET \`branch_subscription_id\` = NULL WHERE \`branch_subscription_id\` LIKE 'bs-%'`,
            // Delete migrated branch_subscriptions
            `DELETE FROM \`branch_subscriptions\` WHERE \`branch_subscription_id\` LIKE 'bs-%'`,
        ],
    },
};
