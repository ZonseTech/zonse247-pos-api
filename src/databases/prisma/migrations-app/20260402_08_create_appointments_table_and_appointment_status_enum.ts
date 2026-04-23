/**
 * Migration: 20260402_08
 * Description: Create appointments table and AppointmentStatus enum for booking system
 *
 * Changes:
 * 1. Create `appointments` table with FK references to tenants, branches, customers, staff, services, service_orders, users
 * 2. Indexes for scheduling queries, status filtering, and sync
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_08',
    description: 'Create appointments table and AppointmentStatus enum for booking system',
    up: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "appointments" (
                "appointment_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "customer_id" TEXT NOT NULL,
                "staff_id" TEXT,
                "service_id" TEXT NOT NULL,
                "start_time" DATETIME NOT NULL,
                "end_time" DATETIME NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
                "service_order_id" TEXT UNIQUE,
                "notes" TEXT,
                "created_by" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "fk_appointments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                CONSTRAINT "fk_appointments_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                CONSTRAINT "fk_appointments_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT,
                CONSTRAINT "fk_appointments_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL,
                CONSTRAINT "fk_appointments_service" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT,
                CONSTRAINT "fk_appointments_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE SET NULL,
                CONSTRAINT "fk_appointments_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_tenant_branch_start" ON "appointments"("tenant_id", "branch_id", "start_time")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_customer" ON "appointments"("customer_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_staff_start" ON "appointments"("staff_id", "start_time")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments"("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_service_order" ON "appointments"("service_order_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_sync" ON "appointments"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_updated" ON "appointments"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_appointments_deleted" ON "appointments"("deleted_at")`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`appointments\` (
                \`appointment_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`customer_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`staff_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`service_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`start_time\` DATETIME(3) NOT NULL,
                \`end_time\` DATETIME(3) NOT NULL,
                \`status\` ENUM('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
                \`service_order_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`notes\` TEXT NULL,
                \`created_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`version\` INT NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`appointment_id\`),
                UNIQUE KEY \`idx_appointments_service_order_unique\` (\`service_order_id\`),
                KEY \`idx_appointments_tenant_branch_start\` (\`tenant_id\`, \`branch_id\`, \`start_time\`),
                KEY \`idx_appointments_customer\` (\`customer_id\`),
                KEY \`idx_appointments_staff_start\` (\`staff_id\`, \`start_time\`),
                KEY \`idx_appointments_status\` (\`status\`),
                KEY \`idx_appointments_service_order\` (\`service_order_id\`),
                KEY \`idx_appointments_sync\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                KEY \`idx_appointments_updated\` (\`updated_at\`),
                KEY \`idx_appointments_deleted\` (\`deleted_at\`),
                CONSTRAINT \`fk_appointments_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_appointments_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_appointments_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`customer_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_appointments_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staff\`(\`staff_id\`) ON DELETE SET NULL,
                CONSTRAINT \`fk_appointments_service\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`service_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_appointments_service_order\` FOREIGN KEY (\`service_order_id\`) REFERENCES \`service_orders\`(\`service_order_id\`) ON DELETE SET NULL,
                CONSTRAINT \`fk_appointments_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`user_id\`) ON DELETE SET NULL
            )`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "appointments"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`appointments\``,
        ],
    },
};
