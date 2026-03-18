/**
 * Migration: 20260318_02
 * Description: Add goods_receipts and goods_receipt_items tables for GRN workflow
 *
 * Adds the GoodsReceipt and GoodsReceiptItem tables to decouple receiving from
 * the Purchase Order, enabling partial deliveries and damaged goods tracking.
 * Part of the procurement workflow:
 * Requisition → Purchase Order → Goods Receipt Note → Stock Update → Supplier Invoice → Payment
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_02',
    description: 'Add goods_receipts and goods_receipt_items tables for GRN workflow',
    up: {
        sqlite: [
            // Create goods_receipts table
            `CREATE TABLE IF NOT EXISTS "goods_receipts" (
                "goods_receipt_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "purchase_order_id" TEXT NOT NULL,
                "receipt_number" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'DRAFT',
                "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "received_by" TEXT NOT NULL,
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "goods_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "goods_receipts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("purchase_order_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "goods_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,

            // Unique constraint: tenant + branch + receipt_number
            `CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_tenant_id_branch_id_receipt_number_key" ON "goods_receipts"("tenant_id", "branch_id", "receipt_number")`,

            // Indexes for goods_receipts
            `CREATE INDEX IF NOT EXISTS "goods_receipts_tenant_id_idx" ON "goods_receipts"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipts_branch_id_idx" ON "goods_receipts"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipts_status_idx" ON "goods_receipts"("status")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipts_tenant_id_branch_id_updated_at_idx" ON "goods_receipts"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipts_updated_at_idx" ON "goods_receipts"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipts_deleted_at_idx" ON "goods_receipts"("deleted_at")`,

            // Create goods_receipt_items table
            `CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
                "goods_receipt_item_id" TEXT NOT NULL PRIMARY KEY,
                "goods_receipt_id" TEXT NOT NULL,
                "purchase_order_item_id" TEXT NOT NULL,
                "variant_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "received_quantity" INTEGER NOT NULL,
                "rejected_quantity" INTEGER NOT NULL DEFAULT 0,
                "rejection_reason" TEXT,
                "unit_cost" REAL NOT NULL,
                "total_cost" REAL NOT NULL,
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "goods_receipt_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "goods_receipt_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts" ("goods_receipt_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "goods_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items" ("purchase_order_item_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "goods_receipt_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,

            // Unique constraint: goods_receipt + purchase_order_item
            `CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_items_goods_receipt_id_purchase_order_item_id_key" ON "goods_receipt_items"("goods_receipt_id", "purchase_order_item_id")`,

            // Indexes for goods_receipt_items
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_tenant_id_idx" ON "goods_receipt_items"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_branch_id_idx" ON "goods_receipt_items"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_purchase_order_item_id_idx" ON "goods_receipt_items"("purchase_order_item_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_variant_id_idx" ON "goods_receipt_items"("variant_id")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_tenant_id_branch_id_updated_at_idx" ON "goods_receipt_items"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_updated_at_idx" ON "goods_receipt_items"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "goods_receipt_items_deleted_at_idx" ON "goods_receipt_items"("deleted_at")`,
        ],
        mysql: [
            // Create goods_receipts table
            `CREATE TABLE IF NOT EXISTS \`goods_receipts\` (
                \`goods_receipt_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`purchase_order_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`receipt_number\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`status\` ENUM('DRAFT', 'VERIFIED', 'POSTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
                \`received_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`received_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`goods_receipt_id\`),
                UNIQUE INDEX \`goods_receipts_tenant_id_branch_id_receipt_number_key\` (\`tenant_id\`, \`branch_id\`, \`receipt_number\`),
                INDEX \`goods_receipts_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`goods_receipts_branch_id_idx\` (\`branch_id\`),
                INDEX \`goods_receipts_purchase_order_id_idx\` (\`purchase_order_id\`),
                INDEX \`goods_receipts_status_idx\` (\`status\`),
                INDEX \`goods_receipts_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`goods_receipts_updated_at_idx\` (\`updated_at\`),
                INDEX \`goods_receipts_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`goods_receipts_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipts_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipts_purchase_order_id_fkey\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`purchase_order_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipts_received_by_fkey\` FOREIGN KEY (\`received_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Create goods_receipt_items table
            `CREATE TABLE IF NOT EXISTS \`goods_receipt_items\` (
                \`goods_receipt_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`goods_receipt_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`purchase_order_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`variant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`received_quantity\` INTEGER NOT NULL,
                \`rejected_quantity\` INTEGER NOT NULL DEFAULT 0,
                \`rejection_reason\` TEXT NULL,
                \`unit_cost\` DECIMAL(10, 2) NOT NULL,
                \`total_cost\` DECIMAL(10, 2) NOT NULL,
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`goods_receipt_item_id\`),
                UNIQUE INDEX \`goods_receipt_items_goods_receipt_id_purchase_order_item_id_key\` (\`goods_receipt_id\`, \`purchase_order_item_id\`),
                INDEX \`goods_receipt_items_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`goods_receipt_items_branch_id_idx\` (\`branch_id\`),
                INDEX \`goods_receipt_items_purchase_order_item_id_idx\` (\`purchase_order_item_id\`),
                INDEX \`goods_receipt_items_variant_id_idx\` (\`variant_id\`),
                INDEX \`goods_receipt_items_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`goods_receipt_items_updated_at_idx\` (\`updated_at\`),
                INDEX \`goods_receipt_items_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`goods_receipt_items_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipt_items_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipt_items_goods_receipt_id_fkey\` FOREIGN KEY (\`goods_receipt_id\`) REFERENCES \`goods_receipts\` (\`goods_receipt_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipt_items_purchase_order_item_id_fkey\` FOREIGN KEY (\`purchase_order_item_id\`) REFERENCES \`purchase_order_items\` (\`purchase_order_item_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`goods_receipt_items_variant_id_fkey\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\` (\`variant_id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "goods_receipt_items"`,
            `DROP TABLE IF EXISTS "goods_receipts"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`goods_receipt_items\``,
            `DROP TABLE IF EXISTS \`goods_receipts\``,
        ],
    },
};

export default migration;
