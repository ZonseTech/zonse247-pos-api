/**
 * Migration: 20260409_02
 * Description: Create resources and appointment_resources tables with ResourceType enum
 *
 * Changes:
 * 1. Create `resources` table for staff, vehicles, tools, test equipment
 * 2. Create `appointment_resources` junction table linking appointments to resources
 * 3. Add indexes for tenant/branch scoping, type filtering, availability, and sync
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260409_02',
    description: 'Create resources and appointment_resources tables with ResourceType enum',
    up: {
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`resources\` (
                \`resource_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`name\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`type\` ENUM('STAFF', 'VEHICLE', 'TOOL', 'TEST_EQUIPMENT', 'OTHER') NOT NULL,
                \`is_available\` BOOLEAN NOT NULL DEFAULT TRUE,
                \`version\` INT NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`resource_id\`),
                KEY \`idx_resources_tenant_branch\` (\`tenant_id\`, \`branch_id\`),
                KEY \`idx_resources_type\` (\`type\`),
                KEY \`idx_resources_is_available\` (\`is_available\`),
                KEY \`idx_resources_sync\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                KEY \`idx_resources_updated\` (\`updated_at\`),
                KEY \`idx_resources_deleted\` (\`deleted_at\`),
                CONSTRAINT \`fk_resources_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_resources_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS \`appointment_resources\` (
                \`appointment_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`resource_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`quantity_used\` INT NOT NULL DEFAULT 1,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`appointment_id\`, \`resource_id\`),
                KEY \`idx_appointment_resources_resource\` (\`resource_id\`),
                CONSTRAINT \`fk_appointment_resources_appointment\` FOREIGN KEY (\`appointment_id\`) REFERENCES \`appointments\`(\`appointment_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_appointment_resources_resource\` FOREIGN KEY (\`resource_id\`) REFERENCES \`resources\`(\`resource_id\`) ON DELETE CASCADE
            )`,
        ],
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "resources" (
                "resource_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "type" TEXT NOT NULL,
                "is_available" INTEGER NOT NULL DEFAULT 1,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "fk_resources_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                CONSTRAINT "fk_resources_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_resources_tenant_branch" ON "resources"("tenant_id", "branch_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_resources_type" ON "resources"("type")`,
            `CREATE INDEX IF NOT EXISTS "idx_resources_is_available" ON "resources"("is_available")`,
            `CREATE INDEX IF NOT EXISTS "idx_resources_sync" ON "resources"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_resources_updated" ON "resources"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_resources_deleted" ON "resources"("deleted_at")`,
            `CREATE TABLE IF NOT EXISTS "appointment_resources" (
                "appointment_id" TEXT NOT NULL,
                "resource_id" TEXT NOT NULL,
                "quantity_used" INTEGER NOT NULL DEFAULT 1,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("appointment_id", "resource_id"),
                CONSTRAINT "fk_appointment_resources_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE,
                CONSTRAINT "fk_appointment_resources_resource" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE CASCADE
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_appointment_resources_resource" ON "appointment_resources"("resource_id")`,
        ],
    },
    down: {
        mysql: [
            `DROP TABLE IF EXISTS \`appointment_resources\``,
            `DROP TABLE IF EXISTS \`resources\``,
        ],
        sqlite: [
            `DROP TABLE IF EXISTS "appointment_resources"`,
            `DROP TABLE IF EXISTS "resources"`,
        ],
    },
};
