/**
 * Migration: 20260402_06
 * Description: Create staff_assignments table and CommissionType enum for multi-staff assignment & commission tracking
 *
 * Changes:
 * 1. Create `staff_assignments` table
 * 2. Add `CommissionType` enum (PERCENTAGE, FIXED_AMOUNT)
 * 3. Unique constraint on (service_order_item_id, staff_id)
 * 4. Indexes for staffId, serviceOrderItemId, isSettled, sync
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_06',
    description: 'Create staff_assignments table and CommissionType enum for multi-staff assignment & commission tracking',
    up: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "staff_assignments" (
                "staff_assignment_id" TEXT NOT NULL PRIMARY KEY,
                "service_order_item_id" TEXT NOT NULL,
                "staff_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "role" TEXT,
                "commission_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
                "commission_value" REAL DEFAULT 0,
                "commission_amount" REAL DEFAULT 0,
                "is_settled" INTEGER NOT NULL DEFAULT 0,
                "settled_at" DATETIME,
                "settled_by" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "fk_staff_assignments_service_order_item" FOREIGN KEY ("service_order_item_id") REFERENCES "service_order_items"("service_order_item_id") ON DELETE CASCADE,
                CONSTRAINT "fk_staff_assignments_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT,
                CONSTRAINT "fk_staff_assignments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                CONSTRAINT "fk_staff_assignments_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                CONSTRAINT "fk_staff_assignments_settled_by" FOREIGN KEY ("settled_by") REFERENCES "users"("user_id") ON DELETE SET NULL
            )`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_staff_assignments_item_staff" ON "staff_assignments"("service_order_item_id", "staff_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_staff_assignments_staff" ON "staff_assignments"("staff_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_staff_assignments_item" ON "staff_assignments"("service_order_item_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_staff_assignments_settled" ON "staff_assignments"("is_settled")`,
            `CREATE INDEX IF NOT EXISTS "idx_staff_assignments_sync" ON "staff_assignments"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_staff_assignments_updated" ON "staff_assignments"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_staff_assignments_deleted" ON "staff_assignments"("deleted_at")`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`staff_assignments\` (
                \`staff_assignment_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`service_order_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`staff_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`role\` VARCHAR(191) NULL,
                \`commission_type\` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL DEFAULT 'PERCENTAGE',
                \`commission_value\` DECIMAL(10, 2) DEFAULT 0,
                \`commission_amount\` DECIMAL(10, 2) DEFAULT 0,
                \`is_settled\` BOOLEAN NOT NULL DEFAULT FALSE,
                \`settled_at\` DATETIME(3) NULL,
                \`settled_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`version\` INT NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`staff_assignment_id\`),
                UNIQUE KEY \`idx_staff_assignments_item_staff\` (\`service_order_item_id\`, \`staff_id\`),
                KEY \`idx_staff_assignments_staff\` (\`staff_id\`),
                KEY \`idx_staff_assignments_item\` (\`service_order_item_id\`),
                KEY \`idx_staff_assignments_settled\` (\`is_settled\`),
                KEY \`idx_staff_assignments_sync\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                KEY \`idx_staff_assignments_updated\` (\`updated_at\`),
                KEY \`idx_staff_assignments_deleted\` (\`deleted_at\`),
                CONSTRAINT \`fk_staff_assignments_service_order_item\` FOREIGN KEY (\`service_order_item_id\`) REFERENCES \`service_order_items\`(\`service_order_item_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_staff_assignments_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staff\`(\`staff_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_staff_assignments_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_staff_assignments_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_staff_assignments_settled_by\` FOREIGN KEY (\`settled_by\`) REFERENCES \`users\`(\`user_id\`) ON DELETE SET NULL
            )`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "staff_assignments"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`staff_assignments\``,
        ],
    },
};
