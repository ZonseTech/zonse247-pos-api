/**
 * Migration: 20260402_02
 * Description: Create service_orders table for job card tracking (ServiceOrderStatus enum)
 *
 * Changes:
 * 1. Create `service_orders` table with FK references to tenants, branches, customers, staff
 * 2. Add ServiceOrderStatus ENUM for MySQL (DRAFT, OPEN, IN_PROGRESS, COMPLETED, INVOICED, CANCELLED, ON_HOLD)
 * 3. Add indexes for status, customer lookup, staff assignment, date range queries, and sync
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_02',
    description: 'Create service_orders table for job card / work order tracking',
    up: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "service_orders" (
                "service_order_id"  TEXT NOT NULL PRIMARY KEY,
                "tenant_id"         TEXT NOT NULL,
                "branch_id"         TEXT NOT NULL,
                "terminal_id"       TEXT,
                "customer_id"       TEXT,
                "assigned_staff_id" TEXT,
                "order_number"      TEXT NOT NULL,
                "status"            TEXT NOT NULL DEFAULT 'DRAFT',
                "scheduled_start"   DATETIME,
                "scheduled_end"     DATETIME,
                "actual_start"      DATETIME,
                "actual_end"        DATETIME,
                "subtotal"          REAL NOT NULL DEFAULT 0,
                "tax_amount"        REAL NOT NULL DEFAULT 0,
                "discount_amount"   REAL NOT NULL DEFAULT 0,
                "total_amount"      REAL NOT NULL DEFAULT 0,
                "amount_paid"       REAL NOT NULL DEFAULT 0,
                "notes"             TEXT,
                "internal_notes"    TEXT,
                "vehicle_info"      TEXT,
                "created_by"        TEXT,
                "version"           INTEGER NOT NULL DEFAULT 1,
                "deleted_at"        DATETIME,
                "created_at"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "last_synced_at"    DATETIME,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL,
                FOREIGN KEY ("assigned_staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL,
                FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL
            )`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_orders_order_number" ON "service_orders"("tenant_id", "branch_id", "order_number")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_status" ON "service_orders"("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_customer" ON "service_orders"("customer_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_staff" ON "service_orders"("assigned_staff_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_scheduled" ON "service_orders"("scheduled_start", "scheduled_end")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_sync" ON "service_orders"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_updated" ON "service_orders"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_service_orders_deleted" ON "service_orders"("deleted_at")`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`service_orders\` (
                \`service_order_id\`  VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\`         VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\`         VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\`       VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`customer_id\`       VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`assigned_staff_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`order_number\`      VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`status\`            ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'DRAFT',
                \`scheduled_start\`   DATETIME(3) NULL,
                \`scheduled_end\`     DATETIME(3) NULL,
                \`actual_start\`      DATETIME(3) NULL,
                \`actual_end\`        DATETIME(3) NULL,
                \`subtotal\`          DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`tax_amount\`        DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`discount_amount\`   DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`total_amount\`      DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`amount_paid\`       DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`notes\`             TEXT NULL,
                \`internal_notes\`    TEXT NULL,
                \`vehicle_info\`      JSON NULL,
                \`created_by\`        VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`version\`           INT NOT NULL DEFAULT 1,
                \`deleted_at\`        DATETIME(3) NULL,
                \`created_at\`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\`        DATETIME(3) NOT NULL,
                \`last_synced_at\`    DATETIME(3) NULL,
                PRIMARY KEY (\`service_order_id\`),
                UNIQUE KEY \`idx_service_orders_order_number\` (\`tenant_id\`, \`branch_id\`, \`order_number\`),
                CONSTRAINT \`fk_service_orders_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_service_orders_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_service_orders_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`customer_id\`) ON DELETE SET NULL,
                CONSTRAINT \`fk_service_orders_staff\` FOREIGN KEY (\`assigned_staff_id\`) REFERENCES \`staff\`(\`staff_id\`) ON DELETE SET NULL,
                CONSTRAINT \`fk_service_orders_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`user_id\`) ON DELETE SET NULL
            )`,
            `CREATE INDEX \`idx_service_orders_status\` ON \`service_orders\`(\`status\`)`,
            `CREATE INDEX \`idx_service_orders_customer\` ON \`service_orders\`(\`customer_id\`)`,
            `CREATE INDEX \`idx_service_orders_staff\` ON \`service_orders\`(\`assigned_staff_id\`)`,
            `CREATE INDEX \`idx_service_orders_scheduled\` ON \`service_orders\`(\`scheduled_start\`, \`scheduled_end\`)`,
            `CREATE INDEX \`idx_service_orders_sync\` ON \`service_orders\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,
            `CREATE INDEX \`idx_service_orders_updated\` ON \`service_orders\`(\`updated_at\`)`,
            `CREATE INDEX \`idx_service_orders_deleted\` ON \`service_orders\`(\`deleted_at\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "service_orders"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`service_orders\``,
        ],
    },
};
