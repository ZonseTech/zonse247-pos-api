/**
 * Migration: 20260318_09
 * Description: Add supplier_payment_allocations table and remove supplier_invoice_id from supplier_payments
 *
 * Replaces the direct SupplierPayment -> SupplierInvoice link with a
 * SupplierPaymentAllocation join table, enabling one payment to be
 * split across multiple invoices.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_09',
    description: 'Add supplier_payment_allocations table for multi-invoice payment splitting',
    up: {
        sqlite: [
            // Create supplier_payment_allocations table
            `CREATE TABLE IF NOT EXISTS "supplier_payment_allocations" (
                "allocation_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "payment_id" TEXT NOT NULL,
                "invoice_id" TEXT NOT NULL,
                "allocated_amount" REAL NOT NULL,
                "allocated_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "notes" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "supplier_payment_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_payment_allocations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "supplier_payments" ("supplier_payment_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "supplier_payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices" ("supplier_invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,

            `CREATE UNIQUE INDEX IF NOT EXISTS "unique_payment_invoice" ON "supplier_payment_allocations"("payment_id", "invoice_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_tenant_id_idx" ON "supplier_payment_allocations"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_branch_id_idx" ON "supplier_payment_allocations"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_payment_id_idx" ON "supplier_payment_allocations"("payment_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_invoice_id_idx" ON "supplier_payment_allocations"("invoice_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_tenant_id_branch_id_updated_at_idx" ON "supplier_payment_allocations"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_updated_at_idx" ON "supplier_payment_allocations"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_deleted_at_idx" ON "supplier_payment_allocations"("deleted_at")`,
        ],
        mysql: [
            // Create supplier_payment_allocations table
            `CREATE TABLE IF NOT EXISTS \`supplier_payment_allocations\` (
                \`allocation_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`payment_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`invoice_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`allocated_amount\` DECIMAL(10, 2) NOT NULL,
                \`allocated_date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`notes\` TEXT NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`allocation_id\`),
                UNIQUE INDEX \`unique_payment_invoice\` (\`payment_id\`, \`invoice_id\`),
                INDEX \`supplier_payment_allocations_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`supplier_payment_allocations_branch_id_idx\` (\`branch_id\`),
                INDEX \`supplier_payment_allocations_payment_id_idx\` (\`payment_id\`),
                INDEX \`supplier_payment_allocations_invoice_id_idx\` (\`invoice_id\`),
                INDEX \`supplier_payment_allocations_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`supplier_payment_allocations_updated_at_idx\` (\`updated_at\`),
                INDEX \`supplier_payment_allocations_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`supplier_payment_allocations_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_payment_allocations_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_payment_allocations_payment_id_fkey\` FOREIGN KEY (\`payment_id\`) REFERENCES \`supplier_payments\` (\`supplier_payment_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`supplier_payment_allocations_invoice_id_fkey\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`supplier_invoices\` (\`supplier_invoice_id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "supplier_payment_allocations"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`supplier_payment_allocations\``,
        ],
    },
};

export default migration;
