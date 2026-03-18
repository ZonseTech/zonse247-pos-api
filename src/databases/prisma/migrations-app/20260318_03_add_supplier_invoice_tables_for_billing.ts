/**
 * Migration: 20260318_03
 * Description: Add supplier_invoices and supplier_invoice_items tables for supplier billing
 *
 * Adds the SupplierInvoice and SupplierInvoiceItem tables to track supplier bills,
 * enabling 3-way matching between PO, GRN, and Invoice.
 * Part of the procurement workflow:
 * Requisition → Purchase Order → Goods Receipt Note → Stock Update → Supplier Invoice → Payment
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_03',
    description: 'Add supplier_invoices and supplier_invoice_items tables for supplier billing',
    up: {
        sqlite: [
            // Create supplier_invoices table
            `CREATE TABLE IF NOT EXISTS "supplier_invoices" (
                "supplier_invoice_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "supplier_id" TEXT NOT NULL,
                "purchase_order_id" TEXT,
                "invoice_number" TEXT NOT NULL,
                "invoice_date" DATETIME NOT NULL,
                "due_date" DATETIME,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "subtotal" REAL NOT NULL DEFAULT 0.00,
                "tax_amount" REAL NOT NULL DEFAULT 0.00,
                "discount_amount" REAL NOT NULL DEFAULT 0.00,
                "total_amount" REAL NOT NULL DEFAULT 0.00,
                "amount_paid" REAL NOT NULL DEFAULT 0.00,
                "balance_due" REAL NOT NULL DEFAULT 0.00,
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "supplier_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("purchase_order_id") ON DELETE SET NULL ON UPDATE CASCADE
            )`,

            `CREATE UNIQUE INDEX IF NOT EXISTS "supplier_invoices_tenant_id_branch_id_invoice_number_key" ON "supplier_invoices"("tenant_id", "branch_id", "invoice_number")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_tenant_id_idx" ON "supplier_invoices"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_branch_id_idx" ON "supplier_invoices"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_supplier_id_idx" ON "supplier_invoices"("supplier_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_purchase_order_id_idx" ON "supplier_invoices"("purchase_order_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_status_idx" ON "supplier_invoices"("status")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_due_date_idx" ON "supplier_invoices"("due_date")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_tenant_id_branch_id_updated_at_idx" ON "supplier_invoices"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_updated_at_idx" ON "supplier_invoices"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoices_deleted_at_idx" ON "supplier_invoices"("deleted_at")`,

            // Create supplier_invoice_items table
            `CREATE TABLE IF NOT EXISTS "supplier_invoice_items" (
                "supplier_invoice_item_id" TEXT NOT NULL PRIMARY KEY,
                "supplier_invoice_id" TEXT NOT NULL,
                "purchase_order_item_id" TEXT,
                "variant_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "quantity" INTEGER NOT NULL,
                "unit_price" REAL NOT NULL,
                "tax_rate" REAL DEFAULT 0.00,
                "tax_amount" REAL NOT NULL DEFAULT 0.00,
                "discount_amount" REAL NOT NULL DEFAULT 0.00,
                "total_price" REAL NOT NULL,
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "supplier_invoice_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoice_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoice_items_supplier_invoice_id_fkey" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices" ("supplier_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoice_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items" ("purchase_order_item_id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "supplier_invoice_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,

            `CREATE UNIQUE INDEX IF NOT EXISTS "sup_inv_items_invoice_id_po_item_id_key" ON "supplier_invoice_items"("supplier_invoice_id", "purchase_order_item_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_tenant_id_idx" ON "supplier_invoice_items"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_branch_id_idx" ON "supplier_invoice_items"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_purchase_order_item_id_idx" ON "supplier_invoice_items"("purchase_order_item_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_variant_id_idx" ON "supplier_invoice_items"("variant_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_tenant_id_branch_id_updated_at_idx" ON "supplier_invoice_items"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_updated_at_idx" ON "supplier_invoice_items"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_invoice_items_deleted_at_idx" ON "supplier_invoice_items"("deleted_at")`,
        ],
        mysql: [
            // Create supplier_invoices table
            `CREATE TABLE IF NOT EXISTS \`supplier_invoices\` (
                \`supplier_invoice_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`supplier_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`purchase_order_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`invoice_number\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`invoice_date\` DATETIME(3) NOT NULL,
                \`due_date\` DATETIME(3) NULL,
                \`status\` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
                \`subtotal\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`tax_amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`discount_amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`total_amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`amount_paid\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`balance_due\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`supplier_invoice_id\`),
                UNIQUE INDEX \`supplier_invoices_tenant_id_branch_id_invoice_number_key\` (\`tenant_id\`, \`branch_id\`, \`invoice_number\`),
                INDEX \`supplier_invoices_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`supplier_invoices_branch_id_idx\` (\`branch_id\`),
                INDEX \`supplier_invoices_supplier_id_idx\` (\`supplier_id\`),
                INDEX \`supplier_invoices_purchase_order_id_idx\` (\`purchase_order_id\`),
                INDEX \`supplier_invoices_status_idx\` (\`status\`),
                INDEX \`supplier_invoices_due_date_idx\` (\`due_date\`),
                INDEX \`supplier_invoices_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`supplier_invoices_updated_at_idx\` (\`updated_at\`),
                INDEX \`supplier_invoices_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`supplier_invoices_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoices_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoices_supplier_id_fkey\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`supplier_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoices_purchase_order_id_fkey\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`purchase_order_id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Create supplier_invoice_items table
            `CREATE TABLE IF NOT EXISTS \`supplier_invoice_items\` (
                \`supplier_invoice_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`supplier_invoice_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`purchase_order_item_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`variant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`quantity\` INTEGER NOT NULL,
                \`unit_price\` DECIMAL(10, 2) NOT NULL,
                \`tax_rate\` DECIMAL(5, 2) NULL DEFAULT 0.00,
                \`tax_amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`discount_amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`total_price\` DECIMAL(10, 2) NOT NULL,
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`supplier_invoice_item_id\`),
                UNIQUE INDEX \`sup_inv_items_invoice_id_po_item_id_key\` (\`supplier_invoice_id\`, \`purchase_order_item_id\`),
                INDEX \`supplier_invoice_items_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`supplier_invoice_items_branch_id_idx\` (\`branch_id\`),
                INDEX \`supplier_invoice_items_purchase_order_item_id_idx\` (\`purchase_order_item_id\`),
                INDEX \`supplier_invoice_items_variant_id_idx\` (\`variant_id\`),
                INDEX \`supplier_invoice_items_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`supplier_invoice_items_updated_at_idx\` (\`updated_at\`),
                INDEX \`supplier_invoice_items_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`supplier_invoice_items_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoice_items_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoice_items_supplier_invoice_id_fkey\` FOREIGN KEY (\`supplier_invoice_id\`) REFERENCES \`supplier_invoices\` (\`supplier_invoice_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoice_items_purchase_order_item_id_fkey\` FOREIGN KEY (\`purchase_order_item_id\`) REFERENCES \`purchase_order_items\` (\`purchase_order_item_id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`supplier_invoice_items_variant_id_fkey\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\` (\`variant_id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "supplier_invoice_items"`,
            `DROP TABLE IF EXISTS "supplier_invoices"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`supplier_invoice_items\``,
            `DROP TABLE IF EXISTS \`supplier_invoices\``,
        ],
    },
};

export default migration;
