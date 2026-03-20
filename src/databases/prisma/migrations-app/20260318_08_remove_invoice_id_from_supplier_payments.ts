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
            `DROP INDEX IF EXISTS "supplier_payments_supplier_invoice_id_idx"`,
            `ALTER TABLE "supplier_payments" DROP COLUMN "supplier_invoice_id"`,
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
