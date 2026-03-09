/**
 * Migration: 20260304_01
 * Description: Add branch_id column to tenant_subscriptions table for branch-level subscription tracking
 * 
 * This migration adds the `branch_id` field to the tenant_subscriptions table to enable:
 * - Per-branch subscription management
 * - Branch-level subscription periods tracking
 * - Support for creating subscriptions when branches are created
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260304_01',
    description: 'Add branch_id column to tenant_subscriptions table for branch-level subscription tracking',
    up: {
        sqlite: [
            // Add branch_id column
            `ALTER TABLE "tenant_subscriptions" ADD COLUMN "branch_id" TEXT`,
            // Add index for branch_id
            `CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_branch_id" ON "tenant_subscriptions" ("branch_id")`,
        ],
        mysql: [
            // Add branch_id column
            `ALTER TABLE \`tenant_subscriptions\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL AFTER \`tenant_id\``,
            // Add index for branch_id
            `CREATE INDEX \`idx_tenant_subscriptions_branch_id\` ON \`tenant_subscriptions\` (\`branch_id\`)`,
            // Add foreign key constraint
            `ALTER TABLE \`tenant_subscriptions\` ADD CONSTRAINT \`tenant_subscriptions_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
        ],
    },
    down: {
        sqlite: [
            // SQLite doesn't support DROP COLUMN directly
            `-- Note: SQLite doesn't support DROP COLUMN. To rollback, table needs to be recreated.`,
        ],
        mysql: [
            // Drop foreign key first
            `ALTER TABLE \`tenant_subscriptions\` DROP FOREIGN KEY \`tenant_subscriptions_branch_id_fkey\``,
            // Drop index
            `DROP INDEX \`idx_tenant_subscriptions_branch_id\` ON \`tenant_subscriptions\``,
            // Drop column
            `ALTER TABLE \`tenant_subscriptions\` DROP COLUMN \`branch_id\``,
        ],
    },
};
