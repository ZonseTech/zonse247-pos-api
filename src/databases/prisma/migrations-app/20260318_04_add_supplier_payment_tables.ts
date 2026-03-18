/**
 * Migration: 20260318_04
 * Description: Add supplier_payments table for tracking payments to suppliers
 *
 * Adds the SupplierPayment table to track partial or full payments
 * against supplier invoices. Uses the existing PaymentStatus enum.
 * Part of the procurement workflow:
 * Requisition → Purchase Order → Goods Receipt Note → Stock Update → Supplier Invoice → Payment
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_04',
    description: 'Add supplier_payments table for tracking payments to suppliers',
    up: {
        sqlite: [
            // Create supplier_payments table
            `CREATE TABLE IF NOT EXISTS "supplier_payments" (
                "supplier_payment_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "supplier_id" TEXT NOT NULL,
                "supplier_invoice_id" TEXT,
                "payment_number" TEXT NOT NULL,
                "payment_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "amount" REAL NOT NULL,
                "payment_method" TEXT,
                "reference" TEXT,
                "status" TEXT NOT NULL DEFAULT 'COMPLETED',
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "supplier_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "supplier_payments_supplier_invoice_id_fkey" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices" ("supplier_invoice_id") ON DELETE SET NULL ON UPDATE CASCADE
            )`,

            `CREATE UNIQUE INDEX IF NOT EXISTS "supplier_payments_tenant_id_branch_id_payment_number_key" ON "supplier_payments"("tenant_id", "branch_id", "payment_number")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_tenant_id_idx" ON "supplier_payments"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_branch_id_idx" ON "supplier_payments"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_supplier_id_idx" ON "supplier_payments"("supplier_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_supplier_invoice_id_idx" ON "supplier_payments"("supplier_invoice_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_tenant_id_branch_id_updated_at_idx" ON "supplier_payments"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_updated_at_idx" ON "supplier_payments"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_deleted_at_idx" ON "supplier_payments"("deleted_at")`,
        ],
        mysql: [
            // Create supplier_payments table
            `CREATE TABLE IF NOT EXISTS \`supplier_payments\` (
                \`supplier_payment_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`supplier_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`supplier_invoice_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`payment_number\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`payment_date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`amount\` DECIMAL(10, 2) NOT NULL,
                \`payment_method\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`reference\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`status\` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`supplier_payment_id\`),
                UNIQUE INDEX \`supplier_payments_tenant_id_branch_id_payment_number_key\` (\`tenant_id\`, \`branch_id\`, \`payment_number\`),
                INDEX \`supplier_payments_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`supplier_payments_branch_id_idx\` (\`branch_id\`),
                INDEX \`supplier_payments_supplier_id_idx\` (\`supplier_id\`),
                INDEX \`supplier_payments_supplier_invoice_id_idx\` (\`supplier_invoice_id\`),
                INDEX \`supplier_payments_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`supplier_payments_updated_at_idx\` (\`updated_at\`),
                INDEX \`supplier_payments_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`supplier_payments_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_payments_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_payments_supplier_id_fkey\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`supplier_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`supplier_payments_supplier_invoice_id_fkey\` FOREIGN KEY (\`supplier_invoice_id\`) REFERENCES \`supplier_invoices\` (\`supplier_invoice_id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "supplier_payments"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`supplier_payments\``,
        ],
    },
};

export default migration;
