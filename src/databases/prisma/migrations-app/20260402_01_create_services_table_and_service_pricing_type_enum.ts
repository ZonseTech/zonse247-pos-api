/**
 * Migration: 20260402_01
 * Description: Create services table and ServicePricingType enum
 *
 * Changes:
 * 1. Create `services` table with FK references to tenants, branches, categories
 * 2. Add ServicePricingType ENUM (FIXED, HOURLY, PER_UNIT, PACKAGE) for MySQL; SQLite uses TEXT
 * 3. Add indexes for name search, category filter, active flag, and sync queries
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_01',
    description: 'Create services table and ServicePricingType enum',
    up: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "services" (
                "service_id"    TEXT NOT NULL PRIMARY KEY,
                "tenant_id"     TEXT NOT NULL,
                "branch_id"     TEXT NOT NULL,
                "terminal_id"   TEXT,
                "category_id"   TEXT,
                "name"          TEXT NOT NULL,
                "description"   TEXT,
                "pricing_type"  TEXT NOT NULL DEFAULT 'FIXED',
                "base_price"    REAL NOT NULL DEFAULT 0,
                "duration_minutes" INTEGER,
                "is_active"     INTEGER NOT NULL DEFAULT 1,
                "sort_order"    INTEGER NOT NULL DEFAULT 0,
                "version"       INTEGER NOT NULL DEFAULT 1,
                "deleted_at"    DATETIME,
                "created_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "last_synced_at" DATETIME,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_services_tenant_branch" ON "services"("tenant_id", "branch_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_services_name" ON "services"("name")`,
            `CREATE INDEX IF NOT EXISTS "idx_services_category" ON "services"("category_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_services_active" ON "services"("is_active")`,
            `CREATE INDEX IF NOT EXISTS "idx_services_sync" ON "services"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_services_updated" ON "services"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_services_deleted" ON "services"("deleted_at")`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`services\` (
                \`service_id\`      VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\`       VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\`       VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\`     VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`category_id\`     VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`name\`            VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`description\`     TEXT NULL,
                \`pricing_type\`    ENUM('FIXED', 'HOURLY', 'PER_UNIT', 'PACKAGE') NOT NULL DEFAULT 'FIXED',
                \`base_price\`      DECIMAL(10, 2) NOT NULL DEFAULT 0,
                \`duration_minutes\` INT NULL,
                \`is_active\`       BOOLEAN NOT NULL DEFAULT TRUE,
                \`sort_order\`      INT NOT NULL DEFAULT 0,
                \`version\`         INT NOT NULL DEFAULT 1,
                \`deleted_at\`      DATETIME(3) NULL,
                \`created_at\`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\`      DATETIME(3) NOT NULL,
                \`last_synced_at\`  DATETIME(3) NULL,
                PRIMARY KEY (\`service_id\`),
                CONSTRAINT \`fk_services_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_services_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_services_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`category_id\`) ON DELETE SET NULL
            )`,
            `CREATE INDEX \`idx_services_tenant_branch\` ON \`services\`(\`tenant_id\`, \`branch_id\`)`,
            `CREATE INDEX \`idx_services_name\` ON \`services\`(\`name\`)`,
            `CREATE INDEX \`idx_services_category\` ON \`services\`(\`category_id\`)`,
            `CREATE INDEX \`idx_services_active\` ON \`services\`(\`is_active\`)`,
            `CREATE INDEX \`idx_services_sync\` ON \`services\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,
            `CREATE INDEX \`idx_services_updated\` ON \`services\`(\`updated_at\`)`,
            `CREATE INDEX \`idx_services_deleted\` ON \`services\`(\`deleted_at\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "services"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`services\``,
        ],
    },
};
