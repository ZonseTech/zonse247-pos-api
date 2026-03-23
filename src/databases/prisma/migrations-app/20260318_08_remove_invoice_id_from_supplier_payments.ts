/**
 * Migration: 20260318_08
 * Description: Remove supplier_invoice_id from supplier_payments
 *
 * Removes the direct invoice link from SupplierPayment. Invoice allocation
 * will now be handled via a separate SupplierPaymentAllocation join table,
 * allowing one payment to be split across multiple invoices.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_08',
    description: 'Remove supplier_invoice_id from supplier_payments',
    up: {
        sqlite: [
            // SQLite cannot DROP COLUMN when there's a foreign key constraint.
            // Use the table recreation approach instead.
            `PRAGMA foreign_keys=OFF`,
            `DROP TABLE IF EXISTS "supplier_payments_new"`,
            `CREATE TABLE "supplier_payments_new" (
                "supplier_payment_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "supplier_id" TEXT NOT NULL,
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
                CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE
            )`,
            `INSERT INTO "supplier_payments_new" ("supplier_payment_id", "tenant_id", "branch_id", "terminal_id", "supplier_id", "payment_number", "payment_date", "amount", "payment_method", "reference", "status", "notes", "version", "deleted_at", "created_at", "updated_at")
             SELECT "supplier_payment_id", "tenant_id", "branch_id", "terminal_id", "supplier_id", "payment_number", "payment_date", "amount", "payment_method", "reference", "status", "notes", "version", "deleted_at", "created_at", "updated_at"
             FROM "supplier_payments"`,
            `DROP TABLE "supplier_payments"`,
            `ALTER TABLE "supplier_payments_new" RENAME TO "supplier_payments"`,
            // Recreate all indexes (excluding the removed supplier_invoice_id index)
            `CREATE UNIQUE INDEX IF NOT EXISTS "supplier_payments_tenant_id_branch_id_payment_number_key" ON "supplier_payments"("tenant_id", "branch_id", "payment_number")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_tenant_id_idx" ON "supplier_payments"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_branch_id_idx" ON "supplier_payments"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_supplier_id_idx" ON "supplier_payments"("supplier_id")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_tenant_id_branch_id_updated_at_idx" ON "supplier_payments"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_updated_at_idx" ON "supplier_payments"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_deleted_at_idx" ON "supplier_payments"("deleted_at")`,
            `PRAGMA foreign_keys=ON`,
        ],
        mysql: [
            `ALTER TABLE \`supplier_payments\` DROP FOREIGN KEY \`supplier_payments_supplier_invoice_id_fkey\``,
            `ALTER TABLE \`supplier_payments\` DROP INDEX \`supplier_payments_supplier_invoice_id_idx\``,
            `ALTER TABLE \`supplier_payments\` DROP COLUMN \`supplier_invoice_id\``,
        ],
    },
    down: {
        sqlite: [
            `ALTER TABLE "supplier_payments" ADD COLUMN "supplier_invoice_id" TEXT REFERENCES "supplier_invoices" ("supplier_invoice_id") ON DELETE SET NULL ON UPDATE CASCADE`,
            `CREATE INDEX IF NOT EXISTS "supplier_payments_supplier_invoice_id_idx" ON "supplier_payments"("supplier_invoice_id")`,
        ],
        mysql: [
            `ALTER TABLE \`supplier_payments\` ADD COLUMN \`supplier_invoice_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
            `ALTER TABLE \`supplier_payments\` ADD INDEX \`supplier_payments_supplier_invoice_id_idx\` (\`supplier_invoice_id\`)`,
            `ALTER TABLE \`supplier_payments\` ADD CONSTRAINT \`supplier_payments_supplier_invoice_id_fkey\` FOREIGN KEY (\`supplier_invoice_id\`) REFERENCES \`supplier_invoices\` (\`supplier_invoice_id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
        ],
    },
};

export default migration;
