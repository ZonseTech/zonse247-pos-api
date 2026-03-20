/**
 * Migration: 20260318_01
 * Description: Add purchase_requisitions and purchase_requisition_items tables for procurement workflow
 *
 * Adds the PurchaseRequisition and PurchaseRequisitionItem tables to support
 * the requisition step of the procurement workflow:
 * Requisition → Purchase Order → Goods Receipt Note → Stock Update → Supplier Invoice → Payment
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_01',
    description: 'Add purchase_requisitions and purchase_requisition_items tables for procurement workflow',
    up: {
        sqlite: [
            // Create purchase_requisitions table
            `CREATE TABLE IF NOT EXISTS "purchase_requisitions" (
                "requisition_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "requisition_number" TEXT NOT NULL,
                "requested_by" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "notes" TEXT,
                "approved_at" DATETIME,
                "approved_by" TEXT,
                "rejected_at" DATETIME,
                "rejected_by" TEXT,
                "rejected_reason" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "purchase_requisitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisitions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisitions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisitions_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
            )`,

            // Unique constraint: tenant + branch + requisition_number
            `CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_tenant_id_branch_id_requisition_number_key" ON "purchase_requisitions"("tenant_id", "branch_id", "requisition_number")`,

            // Indexes for purchase_requisitions
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_id_idx" ON "purchase_requisitions"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_branch_id_idx" ON "purchase_requisitions"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_status_idx" ON "purchase_requisitions"("status")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_requested_by_idx" ON "purchase_requisitions"("requested_by")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_id_branch_id_updated_at_idx" ON "purchase_requisitions"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_updated_at_idx" ON "purchase_requisitions"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisitions_deleted_at_idx" ON "purchase_requisitions"("deleted_at")`,

            // Create purchase_requisition_items table
            `CREATE TABLE IF NOT EXISTS "purchase_requisition_items" (
                "requisition_item_id" TEXT NOT NULL PRIMARY KEY,
                "requisition_id" TEXT NOT NULL,
                "variant_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "requested_quantity" INTEGER NOT NULL,
                "approved_quantity" INTEGER,
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "purchase_requisition_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisition_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions" ("requisition_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "purchase_requisition_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,

            // Unique constraint: requisition + variant
            `CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisition_items_requisition_id_variant_id_key" ON "purchase_requisition_items"("requisition_id", "variant_id")`,

            // Indexes for purchase_requisition_items
            `CREATE INDEX IF NOT EXISTS "purchase_requisition_items_tenant_id_idx" ON "purchase_requisition_items"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisition_items_branch_id_idx" ON "purchase_requisition_items"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisition_items_tenant_id_branch_id_updated_at_idx" ON "purchase_requisition_items"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisition_items_updated_at_idx" ON "purchase_requisition_items"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "purchase_requisition_items_deleted_at_idx" ON "purchase_requisition_items"("deleted_at")`,
        ],
        mysql: [
            // Create purchase_requisitions table
            `CREATE TABLE IF NOT EXISTS \`purchase_requisitions\` (
                \`requisition_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`requisition_number\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`requested_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'PARTIALLY_APPROVED') NOT NULL DEFAULT 'PENDING',
                \`notes\` TEXT NULL,
                \`approved_at\` DATETIME(3) NULL,
                \`approved_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`rejected_at\` DATETIME(3) NULL,
                \`rejected_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`rejected_reason\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`requisition_id\`),
                UNIQUE INDEX \`purchase_requisitions_tenant_id_branch_id_requisition_number_key\` (\`tenant_id\`, \`branch_id\`, \`requisition_number\`),
                INDEX \`purchase_requisitions_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`purchase_requisitions_branch_id_idx\` (\`branch_id\`),
                INDEX \`purchase_requisitions_status_idx\` (\`status\`),
                INDEX \`purchase_requisitions_requested_by_idx\` (\`requested_by\`),
                INDEX \`purchase_requisitions_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`purchase_requisitions_updated_at_idx\` (\`updated_at\`),
                INDEX \`purchase_requisitions_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`purchase_requisitions_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisitions_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisitions_requested_by_fkey\` FOREIGN KEY (\`requested_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisitions_approved_by_fkey\` FOREIGN KEY (\`approved_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisitions_rejected_by_fkey\` FOREIGN KEY (\`rejected_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Create purchase_requisition_items table
            `CREATE TABLE IF NOT EXISTS \`purchase_requisition_items\` (
                \`requisition_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`requisition_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`variant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`requested_quantity\` INTEGER NOT NULL,
                \`approved_quantity\` INTEGER NULL,
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`requisition_item_id\`),
                UNIQUE INDEX \`purchase_requisition_items_requisition_id_variant_id_key\` (\`requisition_id\`, \`variant_id\`),
                INDEX \`purchase_requisition_items_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`purchase_requisition_items_branch_id_idx\` (\`branch_id\`),
                INDEX \`purchase_requisition_items_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`purchase_requisition_items_updated_at_idx\` (\`updated_at\`),
                INDEX \`purchase_requisition_items_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`purchase_requisition_items_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisition_items_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisition_items_requisition_id_fkey\` FOREIGN KEY (\`requisition_id\`) REFERENCES \`purchase_requisitions\` (\`requisition_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`purchase_requisition_items_variant_id_fkey\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\` (\`variant_id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "purchase_requisition_items"`,
            `DROP TABLE IF EXISTS "purchase_requisitions"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`purchase_requisition_items\``,
            `DROP TABLE IF EXISTS \`purchase_requisitions\``,
        ],
    },
};

export default migration;
