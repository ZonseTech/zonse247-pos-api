/**
 * Migration: 20260402_03
 * Description: Create service_order_items table with ServiceItemStatus enum
 *
 * Changes:
 * 1. Create `service_order_items` table with FK references to service_orders, services, staff
 * 2. Add ServiceItemStatus ENUM for MySQL (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
 * 3. Add indexes for service_order lookup, service, staff, status filtering, and sync
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_03',
    description: 'Create service_order_items table with ServiceItemStatus enum',
    up: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "service_order_items" (
                "service_order_item_id" TEXT PRIMARY KEY,
                "service_order_id"     TEXT NOT NULL,
                "service_id"           TEXT NOT NULL,
                "tenant_id"            TEXT NOT NULL,
                "branch_id"            TEXT NOT NULL,
                "terminal_id"          TEXT,
                "staff_id"             TEXT,
                "quantity"             INTEGER NOT NULL DEFAULT 1,
                "unit_price"           REAL NOT NULL,
                "discount_amount"      REAL NOT NULL DEFAULT 0,
                "subtotal"             REAL NOT NULL,
                "tax_amount"           REAL NOT NULL DEFAULT 0,
                "total_price"          REAL NOT NULL,
                "status"               TEXT NOT NULL DEFAULT 'PENDING',
                "notes"                TEXT,
                "started_at"           DATETIME,
                "completed_at"         DATETIME,
                "version"              INTEGER NOT NULL DEFAULT 1,
                "deleted_at"           DATETIME,
                "created_at"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "last_synced_at"       DATETIME,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE,
                FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE RESTRICT,
                FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_service_order" ON "service_order_items"("service_order_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_service" ON "service_order_items"("service_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_staff" ON "service_order_items"("staff_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_status" ON "service_order_items"("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_sync" ON "service_order_items"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_updated" ON "service_order_items"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_soi_deleted" ON "service_order_items"("deleted_at")`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`service_order_items\` (
                \`service_order_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`service_order_id\`     VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`service_id\`           VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\`            VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\`            VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\`          VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`staff_id\`             VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`quantity\`             INT NOT NULL DEFAULT 1,
                \`unit_price\`           DECIMAL(10, 2) NOT NULL,
                \`discount_amount\`      DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`subtotal\`             DECIMAL(10, 2) NOT NULL,
                \`tax_amount\`           DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`total_price\`          DECIMAL(10, 2) NOT NULL,
                \`status\`               ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                \`notes\`                TEXT NULL,
                \`started_at\`           DATETIME(3) NULL,
                \`completed_at\`         DATETIME(3) NULL,
                \`version\`              INT NOT NULL DEFAULT 1,
                \`deleted_at\`           DATETIME(3) NULL,
                \`created_at\`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\`           DATETIME(3) NOT NULL,
                \`last_synced_at\`       DATETIME(3) NULL,
                PRIMARY KEY (\`service_order_item_id\`),
                CONSTRAINT \`fk_soi_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_soi_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_soi_service_order\` FOREIGN KEY (\`service_order_id\`) REFERENCES \`service_orders\`(\`service_order_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_soi_service\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`service_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_soi_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staff\`(\`staff_id\`) ON DELETE SET NULL
            )`,
            `CREATE INDEX \`idx_soi_service_order\` ON \`service_order_items\`(\`service_order_id\`)`,
            `CREATE INDEX \`idx_soi_service\` ON \`service_order_items\`(\`service_id\`)`,
            `CREATE INDEX \`idx_soi_staff\` ON \`service_order_items\`(\`staff_id\`)`,
            `CREATE INDEX \`idx_soi_status\` ON \`service_order_items\`(\`status\`)`,
            `CREATE INDEX \`idx_soi_sync\` ON \`service_order_items\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,
            `CREATE INDEX \`idx_soi_updated\` ON \`service_order_items\`(\`updated_at\`)`,
            `CREATE INDEX \`idx_soi_deleted\` ON \`service_order_items\`(\`deleted_at\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "service_order_items"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`service_order_items\``,
        ],
    },
};
