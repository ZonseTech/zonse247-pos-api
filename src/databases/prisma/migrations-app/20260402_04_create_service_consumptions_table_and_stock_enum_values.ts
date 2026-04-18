/**
 * Migration: 20260402_04
 * Description: Create service_consumptions table, add SERVICE_CONSUMPTION to StockMovementType and SERVICE_ORDER_ITEM to StockReferenceType
 *
 * Changes:
 * 1. Add `SERVICE_CONSUMPTION` to StockMovementType enum (MySQL only — SQLite uses TEXT)
 * 2. Add `SERVICE_ORDER_ITEM` to StockReferenceType enum (MySQL only — SQLite uses TEXT)
 * 3. Create `service_consumptions` table
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_04',
    description: 'Create service_consumptions table and add SERVICE_CONSUMPTION/SERVICE_ORDER_ITEM enum values',
    up: {
        sqlite: [
            // SQLite uses TEXT for enums — no ALTER needed
            // 1. Create service_consumptions table
            `CREATE TABLE IF NOT EXISTS "service_consumptions" (
                "service_consumption_id" TEXT PRIMARY KEY,
                "service_order_item_id"  TEXT NOT NULL,
                "product_variant_id"     TEXT NOT NULL,
                "tenant_id"              TEXT NOT NULL,
                "branch_id"              TEXT NOT NULL,
                "terminal_id"            TEXT,
                "quantity"               REAL NOT NULL DEFAULT 1,
                "unit_cost_at_time"      REAL NOT NULL,
                "total_cost"             REAL NOT NULL,
                "stock_movement_id"      TEXT,
                "notes"                  TEXT,
                "version"                INTEGER NOT NULL DEFAULT 1,
                "deleted_at"             DATETIME,
                "created_at"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("service_order_item_id") REFERENCES "service_order_items"("service_order_item_id") ON DELETE CASCADE,
                FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("variant_id") ON DELETE RESTRICT
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_sc_service_order_item" ON "service_consumptions"("service_order_item_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sc_product_variant" ON "service_consumptions"("product_variant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sc_stock_movement" ON "service_consumptions"("stock_movement_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sc_sync" ON "service_consumptions"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_sc_updated" ON "service_consumptions"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_sc_deleted" ON "service_consumptions"("deleted_at")`,
        ],
        mysql: [
            // 1. Add SERVICE_CONSUMPTION to StockMovementType enum
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`movement_type\` ENUM('PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DAMAGE','EXPIRY','OPENING_BALANCE','RETURN_TO_SUPPLIER','SERVICE_CONSUMPTION') NOT NULL`,
            // 2. Add SERVICE_ORDER_ITEM to StockReferenceType enum
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER','GOODS_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER','OPENING_BALANCE','SUPPLIER_RETURN','SERVICE_ORDER_ITEM') NULL`,
            // 3. Create service_consumptions table
            `CREATE TABLE IF NOT EXISTS \`service_consumptions\` (
                \`service_consumption_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`service_order_item_id\`  VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`product_variant_id\`     VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\`              VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\`              VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\`            VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`quantity\`               DECIMAL(10, 2) NOT NULL DEFAULT 1,
                \`unit_cost_at_time\`      DECIMAL(10, 2) NOT NULL,
                \`total_cost\`             DECIMAL(10, 2) NOT NULL,
                \`stock_movement_id\`      VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`notes\`                  TEXT NULL,
                \`version\`                INT NOT NULL DEFAULT 1,
                \`deleted_at\`             DATETIME(3) NULL,
                \`created_at\`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\`             DATETIME(3) NOT NULL,
                PRIMARY KEY (\`service_consumption_id\`),
                CONSTRAINT \`fk_sc_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_sc_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_sc_service_order_item\` FOREIGN KEY (\`service_order_item_id\`) REFERENCES \`service_order_items\`(\`service_order_item_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_sc_product_variant\` FOREIGN KEY (\`product_variant_id\`) REFERENCES \`product_variants\`(\`variant_id\`) ON DELETE RESTRICT
            )`,
            `CREATE INDEX \`idx_sc_service_order_item\` ON \`service_consumptions\`(\`service_order_item_id\`)`,
            `CREATE INDEX \`idx_sc_product_variant\` ON \`service_consumptions\`(\`product_variant_id\`)`,
            `CREATE INDEX \`idx_sc_stock_movement\` ON \`service_consumptions\`(\`stock_movement_id\`)`,
            `CREATE INDEX \`idx_sc_sync\` ON \`service_consumptions\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,
            `CREATE INDEX \`idx_sc_updated\` ON \`service_consumptions\`(\`updated_at\`)`,
            `CREATE INDEX \`idx_sc_deleted\` ON \`service_consumptions\`(\`deleted_at\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "service_consumptions"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`service_consumptions\``,
            // Revert enum values
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`movement_type\` ENUM('PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DAMAGE','EXPIRY','OPENING_BALANCE','RETURN_TO_SUPPLIER') NOT NULL`,
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER','GOODS_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER','OPENING_BALANCE','SUPPLIER_RETURN') NULL`,
        ],
    },
};
