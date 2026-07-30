/**
 * Migration: 20260723_01
 * Description: Add expense_categories and expenses tables for the expense tracking module
 *
 * Adds:
 * - expense_categories: per-branch categories used to classify expenses.
 * - expenses: individual expense records with approval workflow (PENDING_APPROVAL ->
 *   APPROVED/REJECTED/VOIDED), optional links to payment method and supplier.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260723_01',
    description: 'Add expense_categories and expenses tables for the expense tracking module',
    up: {
        sqlite: [
            // Create expense_categories table
            `CREATE TABLE IF NOT EXISTS "expense_categories" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "expense_category_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "name" TEXT NOT NULL,
                "is_active" BOOLEAN NOT NULL DEFAULT 1,
                "sort_order" INTEGER DEFAULT 0,
                "last_synced_at" DATETIME,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "expense_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "expense_categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
            )`,

            `CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_expense_category_id_key" ON "expense_categories"("expense_category_id")`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_branch_id_name_key" ON "expense_categories"("branch_id", "name")`,
            `CREATE INDEX IF NOT EXISTS "expense_categories_tenant_id_idx" ON "expense_categories"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "expense_categories_branch_id_idx" ON "expense_categories"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "expense_categories_tenant_id_branch_id_updated_at_idx" ON "expense_categories"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "expense_categories_updated_at_idx" ON "expense_categories"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "expense_categories_deleted_at_idx" ON "expense_categories"("deleted_at")`,

            // Create expenses table
            `CREATE TABLE IF NOT EXISTS "expenses" (
                "expense_id" TEXT NOT NULL PRIMARY KEY,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "terminal_id" TEXT,
                "expense_number" TEXT NOT NULL,
                "category_id" TEXT NOT NULL,
                "amount" REAL NOT NULL,
                "payment_method_id" TEXT,
                "supplier_id" TEXT,
                "expense_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "reference" TEXT,
                "notes" TEXT,
                "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
                "recorded_by" TEXT NOT NULL,
                "approved_by" TEXT,
                "approved_at" DATETIME,
                "rejected_by" TEXT,
                "rejected_at" DATETIME,
                "rejected_reason" TEXT,
                "version" INTEGER NOT NULL DEFAULT 1,
                "deleted_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL,
                CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories" ("expense_category_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "expenses_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("method_id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "expenses_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
            )`,

            `CREATE UNIQUE INDEX IF NOT EXISTS "expenses_tenant_id_branch_id_expense_number_key" ON "expenses"("tenant_id", "branch_id", "expense_number")`,
            `CREATE INDEX IF NOT EXISTS "expenses_tenant_id_idx" ON "expenses"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "expenses_branch_id_idx" ON "expenses"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id")`,
            `CREATE INDEX IF NOT EXISTS "expenses_payment_method_id_idx" ON "expenses"("payment_method_id")`,
            `CREATE INDEX IF NOT EXISTS "expenses_supplier_id_idx" ON "expenses"("supplier_id")`,
            `CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses"("status")`,
            `CREATE INDEX IF NOT EXISTS "expenses_recorded_by_idx" ON "expenses"("recorded_by")`,
            `CREATE INDEX IF NOT EXISTS "expenses_tenant_id_branch_id_updated_at_idx" ON "expenses"("tenant_id", "branch_id", "updated_at")`,
            `CREATE INDEX IF NOT EXISTS "expenses_updated_at_idx" ON "expenses"("updated_at")`,
            `CREATE INDEX IF NOT EXISTS "expenses_deleted_at_idx" ON "expenses"("deleted_at")`,
        ],
        mysql: [
            // Create expense_categories table
            `CREATE TABLE IF NOT EXISTS \`expense_categories\` (
                \`id\` INTEGER NOT NULL AUTO_INCREMENT,
                \`expense_category_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`name\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`is_active\` BOOLEAN NOT NULL DEFAULT true,
                \`sort_order\` INTEGER NULL DEFAULT 0,
                \`last_synced_at\` DATETIME(3) NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`expense_categories_expense_category_id_key\` (\`expense_category_id\`),
                UNIQUE INDEX \`expense_categories_branch_id_name_key\` (\`branch_id\`, \`name\`),
                INDEX \`expense_categories_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`expense_categories_branch_id_idx\` (\`branch_id\`),
                INDEX \`expense_categories_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`expense_categories_updated_at_idx\` (\`updated_at\`),
                INDEX \`expense_categories_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`expense_categories_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`expense_categories_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Create expenses table
            `CREATE TABLE IF NOT EXISTS \`expenses\` (
                \`expense_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`tenant_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`branch_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`terminal_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`expense_number\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`category_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`amount\` DECIMAL(10, 2) NOT NULL,
                \`payment_method_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`supplier_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`expense_date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`reference\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`notes\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`status\` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'VOIDED') NOT NULL DEFAULT 'PENDING_APPROVAL',
                \`recorded_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                \`approved_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`approved_at\` DATETIME(3) NULL,
                \`rejected_by\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`rejected_at\` DATETIME(3) NULL,
                \`rejected_reason\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                \`version\` INTEGER NOT NULL DEFAULT 1,
                \`deleted_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`expense_id\`),
                UNIQUE INDEX \`expenses_tenant_id_branch_id_expense_number_key\` (\`tenant_id\`, \`branch_id\`, \`expense_number\`),
                INDEX \`expenses_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`expenses_branch_id_idx\` (\`branch_id\`),
                INDEX \`expenses_category_id_idx\` (\`category_id\`),
                INDEX \`expenses_payment_method_id_idx\` (\`payment_method_id\`),
                INDEX \`expenses_supplier_id_idx\` (\`supplier_id\`),
                INDEX \`expenses_status_idx\` (\`status\`),
                INDEX \`expenses_recorded_by_idx\` (\`recorded_by\`),
                INDEX \`expenses_tenant_id_branch_id_updated_at_idx\` (\`tenant_id\`, \`branch_id\`, \`updated_at\`),
                INDEX \`expenses_updated_at_idx\` (\`updated_at\`),
                INDEX \`expenses_deleted_at_idx\` (\`deleted_at\`),
                CONSTRAINT \`expenses_tenant_id_fkey\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`expenses_branch_id_fkey\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`branch_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`expenses_category_id_fkey\` FOREIGN KEY (\`category_id\`) REFERENCES \`expense_categories\` (\`expense_category_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`expenses_payment_method_id_fkey\` FOREIGN KEY (\`payment_method_id\`) REFERENCES \`payment_methods\` (\`method_id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`expenses_supplier_id_fkey\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`supplier_id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`expenses_recorded_by_fkey\` FOREIGN KEY (\`recorded_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`expenses_approved_by_fkey\` FOREIGN KEY (\`approved_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`expenses_rejected_by_fkey\` FOREIGN KEY (\`rejected_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "expenses"`,
            `DROP TABLE IF EXISTS "expense_categories"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`expenses\``,
            `DROP TABLE IF EXISTS \`expense_categories\``,
        ],
    },
};

export default migration;
