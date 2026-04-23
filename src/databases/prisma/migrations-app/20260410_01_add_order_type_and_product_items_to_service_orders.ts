/**
 * Migration: 20260410_01
 * Description: Add order_type to service_orders and create service_order_product_items table
 *              to support unified transactions (services only, products only, or both).
 *
 * Changes:
 * 1. Add `order_type` column to `service_orders` (SERVICE_ONLY, PRODUCT_ONLY, HYBRID)
 * 2. Create `service_order_product_items` table for product line items within a service order
 * 3. Add indexes for performance
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260410_01',
    description: 'Add order_type to service_orders and create service_order_product_items for unified transactions',
    up: {
        sqlite: [
            // 1. Add order_type column to service_orders
            `ALTER TABLE "service_orders" ADD COLUMN "order_type" TEXT NOT NULL DEFAULT 'SERVICE_ONLY'`,
            // 2. Create service_order_product_items table
            `CREATE TABLE IF NOT EXISTS "service_order_product_items" (
                "service_order_product_item_id" TEXT PRIMARY KEY NOT NULL,
                "service_order_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "product_id" TEXT NOT NULL,
                "variant_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "quantity" INTEGER NOT NULL DEFAULT 1,
                "unit_price" REAL NOT NULL DEFAULT 0,
                "unit_cost" REAL NOT NULL DEFAULT 0,
                "subtotal" REAL NOT NULL DEFAULT 0,
                "tax_amount" REAL NOT NULL DEFAULT 0,
                "discount_amount" REAL NOT NULL DEFAULT 0,
                "total_amount" REAL NOT NULL DEFAULT 0,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("service_order_id") ON DELETE CASCADE,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE RESTRICT
            )`,
            // 3. Add indexes
            `CREATE INDEX IF NOT EXISTS "idx_so_product_items_order" ON "service_order_product_items"("service_order_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_so_product_items_variant" ON "service_order_product_items"("variant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_so_product_items_tenant_branch" ON "service_order_product_items"("tenant_id", "branch_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_so_product_items_updated" ON "service_order_product_items"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_so_product_items_deleted" ON "service_order_product_items"("deleted_at")`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_so_product_items_unique_order_variant" ON "service_order_product_items"("service_order_id", "variant_id")`,
        ],
        mysql: [
            // 1. Add order_type column to service_orders
            `ALTER TABLE \`service_orders\` ADD COLUMN \`order_type\` ENUM('SERVICE_ONLY', 'PRODUCT_ONLY', 'HYBRID') NOT NULL DEFAULT 'SERVICE_ONLY'`,
            // 2. Create service_order_product_items table
            `CREATE TABLE IF NOT EXISTS \`service_order_product_items\` (
                \`service_order_product_item_id\` VARCHAR(191) NOT NULL,
                \`service_order_id\` VARCHAR(191) NOT NULL,
                \`tenant_id\` VARCHAR(191) NOT NULL,
                \`branch_id\` VARCHAR(191) NOT NULL,
                \`product_id\` VARCHAR(191) NOT NULL,
                \`variant_id\` VARCHAR(191) NOT NULL,
                \`terminal_id\` VARCHAR(191) NULL,
                \`quantity\` INT NOT NULL DEFAULT 1,
                \`unit_price\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`unit_cost\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`subtotal\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`tax_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`discount_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`total_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`version\` INT NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME NULL,
                \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`service_order_product_item_id\`),
                CONSTRAINT \`fk_so_product_items_order\` FOREIGN KEY (\`service_order_id\`) REFERENCES \`service_orders\`(\`service_order_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_so_product_items_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_so_product_items_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_so_product_items_variant\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`variant_id\`) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            // 3. Add indexes
            `CREATE INDEX \`idx_so_product_items_order\` ON \`service_order_product_items\`(\`service_order_id\`)`,
            `CREATE INDEX \`idx_so_product_items_variant\` ON \`service_order_product_items\`(\`variant_id\`)`,
            `CREATE INDEX \`idx_so_product_items_tenant_branch\` ON \`service_order_product_items\`(\`tenant_id\`, \`branch_id\`)`,
            `CREATE INDEX \`idx_so_product_items_updated\` ON \`service_order_product_items\`(\`updated_at\`)`,
            `CREATE INDEX \`idx_so_product_items_deleted\` ON \`service_order_product_items\`(\`deleted_at\`)`,
            `ALTER TABLE \`service_order_product_items\` ADD UNIQUE INDEX \`idx_so_product_items_unique_order_variant\`(\`service_order_id\`, \`variant_id\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "service_order_product_items"`,
            // SQLite: can't drop columns easily — order_type column remains
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`service_order_product_items\``,
            `ALTER TABLE \`service_orders\` DROP COLUMN \`order_type\``,
        ],
    },
};
