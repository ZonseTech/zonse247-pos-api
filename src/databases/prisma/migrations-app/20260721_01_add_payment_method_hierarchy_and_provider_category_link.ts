/**
 * Migration: 20260721_01
 * Description: Add payment method hierarchy (parent_method_id) and provider category link (paymentMethodId)
 *
 * Adds:
 * - payment_methods.parent_method_id: self-referencing FK, used to nest "POS" and
 *   "Bank Transfer" under a new "Bank" root payment method.
 * - payment_service_providers.paymentMethodId: FK to payment_methods, links each bank/
 *   mobile-money provider to its root category (Bank or Mobile Money).
 *
 * Also seeds the new "bank"/"pos" payment methods, re-parents the existing "bank-transfer"
 * method under "bank" (its id/name are unchanged so historical sale_payments/sales/
 * transactions rows referencing it by methodId keep resolving with no backfill), and
 * seeds the Malawian bank + mobile money provider catalog.
 */

import { Migration } from '../migration.types';

// NOTE: MySQL statements below are plain ALTER TABLE / CREATE INDEX (no stored
// procedures). The @prisma/adapter-mariadb driver executes raw statements via
// the binary prepared-statement protocol, which MySQL/MariaDB rejects for
// CREATE PROCEDURE (error 1295: "not supported in the prepared statement
// protocol yet") - unlike some older migrations in this directory, that
// approach isn't usable here. Idempotency on re-run instead relies on
// MigrationManager.isSkippableError(), which already treats "Duplicate
// column name" / "Duplicate key name" as skippable for MySQL.

const BANK_PROVIDERS: Array<{ id: string; name: string; description: string; sortOrder: number }> = [
    { id: 'national-bank', name: 'National Bank', description: 'National Bank of Malawi (NB)', sortOrder: 1 },
    { id: 'first-capital-bank', name: 'First Capital Bank', description: 'First Capital Bank Malawi (FCB)', sortOrder: 2 },
    { id: 'fdh-bank', name: 'FDH Bank', description: 'FDH Bank Malawi', sortOrder: 3 },
    { id: 'standard-bank', name: 'Standard Bank', description: 'Standard Bank Malawi', sortOrder: 4 },
    { id: 'nbs-bank', name: 'NBS Bank', description: 'NBS Bank Malawi', sortOrder: 5 },
    { id: 'ecobank', name: 'Ecobank', description: 'Ecobank Malawi', sortOrder: 6 },
    { id: 'cdh-investment-bank', name: 'CDH Investment Bank', description: 'CDH Investment Bank Malawi', sortOrder: 7 },
    { id: 'mybucks-banking-corporation', name: 'MyBucks Banking Corporation', description: 'MyBucks Banking Corporation Malawi', sortOrder: 8 },
];

const sqliteBankProviderInserts = BANK_PROVIDERS.map(p =>
    `INSERT OR IGNORE INTO "payment_service_providers" ("providerId", "userId", "name", "type", "description", "isActive", "sortOrder", "paymentMethodId", "createdAt", "updatedAt") VALUES ('${p.id}', '-1', '${p.name}', 'bank', '${p.description}', 1, ${p.sortOrder}, 'bank', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
);

const mysqlBankProviderInserts = BANK_PROVIDERS.map(p =>
    `INSERT IGNORE INTO payment_service_providers (providerId, userId, name, type, description, isActive, sortOrder, paymentMethodId, createdAt, updatedAt) VALUES ('${p.id}', '-1', '${p.name}', 'bank', '${p.description}', 1, ${p.sortOrder}, 'bank', NOW(), NOW())`
);

const bankProviderIdList = BANK_PROVIDERS.map(p => `'${p.id}'`).join(', ');

export const migration: Migration = {
    version: '20260721_01',
    description: 'Add payment method hierarchy (parent_method_id) and provider category link (paymentMethodId); seed Bank/POS nodes and Malawian bank providers',
    up: {
        sqlite: [
            `ALTER TABLE "payment_methods" ADD COLUMN "parent_method_id" TEXT`,
            `CREATE INDEX IF NOT EXISTS "idx_payment_methods_parent_method_id" ON "payment_methods" ("parent_method_id")`,
            `ALTER TABLE "payment_service_providers" ADD COLUMN "paymentMethodId" TEXT`,
            `CREATE INDEX IF NOT EXISTS "idx_payment_service_providers_paymentMethodId" ON "payment_service_providers" ("paymentMethodId")`,

            // New "bank" root and "pos" child payment methods (idempotent)
            `INSERT OR IGNORE INTO "payment_methods" ("method_id", "tenant_id", "branch_id", "name", "icon", "sort_order", "is_active", "version", "created_at", "updated_at")
             VALUES ('bank', '-1', '-1', 'Bank', '🏦', 2, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            `INSERT OR IGNORE INTO "payment_methods" ("method_id", "tenant_id", "branch_id", "name", "sort_order", "parent_method_id", "is_active", "version", "created_at", "updated_at")
             VALUES ('pos', '-1', '-1', 'POS', 1, 'bank', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            // Re-parent the existing "bank-transfer" method under "bank" - id/name unchanged,
            // so historical sale_payments/sales/transactions rows keep resolving correctly.
            `UPDATE "payment_methods" SET "parent_method_id" = 'bank', "sort_order" = 2 WHERE "method_id" = 'bank-transfer'`,

            // Malawian bank providers, linked to the "bank" root. Some ids (e.g.
            // "standard-bank") already existed from the old placeholder seed, so
            // INSERT OR IGNORE alone would leave them without a paymentMethodId -
            // the UPDATE below backfills paymentMethodId for any of these ids
            // regardless of whether the row pre-existed or was just inserted.
            ...sqliteBankProviderInserts,
            `UPDATE "payment_service_providers" SET "paymentMethodId" = 'bank' WHERE "providerId" IN (${bankProviderIdList})`,

            // Re-point existing airtel-money/tnm-mpamba providers to "mobile-money", and
            // insert them if this is a fresh install where the placeholder seed never ran
            `UPDATE "payment_service_providers" SET "paymentMethodId" = 'mobile-money' WHERE "providerId" IN ('airtel-money', 'tnm-mpamba')`,
            `INSERT OR IGNORE INTO "payment_service_providers" ("providerId", "userId", "name", "type", "description", "isActive", "sortOrder", "paymentMethodId", "createdAt", "updatedAt")
             VALUES ('airtel-money', '-1', 'Airtel Money', 'epayment', 'Airtel Mobile Money', 1, 1, 'mobile-money', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            `INSERT OR IGNORE INTO "payment_service_providers" ("providerId", "userId", "name", "type", "description", "isActive", "sortOrder", "paymentMethodId", "createdAt", "updatedAt")
             VALUES ('tnm-mpamba', '-1', 'TNM Mpamba', 'epayment', 'TNM Mobile Money', 1, 2, 'mobile-money', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        ],
        mysql: [
            `ALTER TABLE payment_methods ADD COLUMN parent_method_id VARCHAR(191) DEFAULT NULL`,
            `CREATE INDEX idx_payment_methods_parent_method_id ON payment_methods (parent_method_id)`,
            `ALTER TABLE payment_service_providers ADD COLUMN paymentMethodId VARCHAR(191) DEFAULT NULL`,
            `CREATE INDEX idx_payment_service_providers_paymentMethodId ON payment_service_providers (paymentMethodId)`,

            `INSERT IGNORE INTO payment_methods (method_id, tenant_id, branch_id, name, icon, sort_order, is_active, version, created_at, updated_at)
             VALUES ('bank', '-1', '-1', 'Bank', '🏦', 2, 1, 1, NOW(), NOW())`,
            `INSERT IGNORE INTO payment_methods (method_id, tenant_id, branch_id, name, sort_order, parent_method_id, is_active, version, created_at, updated_at)
             VALUES ('pos', '-1', '-1', 'POS', 1, 'bank', 1, 1, NOW(), NOW())`,
            `UPDATE payment_methods SET parent_method_id = 'bank', sort_order = 2 WHERE method_id = 'bank-transfer'`,

            ...mysqlBankProviderInserts,
            `UPDATE payment_service_providers SET paymentMethodId = 'bank' WHERE providerId IN (${bankProviderIdList})`,

            `UPDATE payment_service_providers SET paymentMethodId = 'mobile-money' WHERE providerId IN ('airtel-money', 'tnm-mpamba')`,
            `INSERT IGNORE INTO payment_service_providers (providerId, userId, name, type, description, isActive, sortOrder, paymentMethodId, createdAt, updatedAt)
             VALUES ('airtel-money', '-1', 'Airtel Money', 'epayment', 'Airtel Mobile Money', 1, 1, 'mobile-money', NOW(), NOW())`,
            `INSERT IGNORE INTO payment_service_providers (providerId, userId, name, type, description, isActive, sortOrder, paymentMethodId, createdAt, updatedAt)
             VALUES ('tnm-mpamba', '-1', 'TNM Mpamba', 'epayment', 'TNM Mobile Money', 1, 2, 'mobile-money', NOW(), NOW())`,
        ],
    },
    down: {
        sqlite: [
            `UPDATE "payment_methods" SET "parent_method_id" = NULL WHERE "method_id" = 'bank-transfer'`,
            `DELETE FROM "payment_methods" WHERE "method_id" IN ('bank', 'pos')`,
            `DELETE FROM "payment_service_providers" WHERE "providerId" IN (${bankProviderIdList})`,
            `UPDATE "payment_service_providers" SET "paymentMethodId" = NULL WHERE "providerId" IN ('airtel-money', 'tnm-mpamba')`,
        ],
        mysql: [
            `UPDATE payment_methods SET parent_method_id = NULL WHERE method_id = 'bank-transfer'`,
            `DELETE FROM payment_methods WHERE method_id IN ('bank', 'pos')`,
            `DELETE FROM payment_service_providers WHERE providerId IN (${bankProviderIdList})`,
            `UPDATE payment_service_providers SET paymentMethodId = NULL WHERE providerId IN ('airtel-money', 'tnm-mpamba')`,
        ],
    },
};
