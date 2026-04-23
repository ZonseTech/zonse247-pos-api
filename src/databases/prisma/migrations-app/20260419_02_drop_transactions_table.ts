/**
 * Migration: 20260419_02
 * Description: Drop transactions table - legacy table replaced by sales and sale_payments
 *
 * The transactions table is a legacy table that was used before the sales/sale_payments
 * system was implemented. All transaction data should now be in the sales tables.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260419_02',
    description: 'Drop transactions table - legacy table replaced by sales and sale_payments',
    up: {
        sqlite: [
            `DROP TABLE IF EXISTS "transactions"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`transactions\``,
        ],
    },
    down: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "transactions" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "transaction_id" TEXT NOT NULL UNIQUE,
                "external_transaction_ref" TEXT,
                "ref_number" TEXT NOT NULL,
                "discount" REAL DEFAULT 0,
                "customer_id" TEXT,
                "subtotal" REAL DEFAULT 0,
                "tax" REAL DEFAULT 0,
                "date" DATETIME,
                "payment_method_id" TEXT,
                "phone_number" TEXT,
                "payment_service_provider_id" TEXT,
                "total" REAL DEFAULT 0,
                "paid" REAL DEFAULT 0,
                "change_amount" REAL DEFAULT 0,
                "terminal_id" TEXT,
                "user_id" TEXT,
                "tenant_id" TEXT NOT NULL,
                "branch_id" TEXT NOT NULL,
                "status" TEXT,
                "is_refund" INTEGER DEFAULT 0,
                "original_transaction_id" TEXT,
                "refund_reason" TEXT,
                "refunded_amount" REAL DEFAULT 0,
                "refunded_at" DATETIME,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "sale_id" TEXT
            )`,
        ],
        mysql: [
            `CREATE TABLE IF NOT EXISTS \`transactions\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`transaction_id\` VARCHAR(191) NOT NULL,
                \`external_transaction_ref\` VARCHAR(191) NULL,
                \`ref_number\` VARCHAR(191) NOT NULL,
                \`discount\` DECIMAL(65,30) DEFAULT 0,
                \`customer_id\` VARCHAR(191) NULL,
                \`subtotal\` DECIMAL(65,30) DEFAULT 0,
                \`tax\` DECIMAL(65,30) DEFAULT 0,
                \`date\` DATETIME(3) NULL,
                \`payment_method_id\` VARCHAR(191) NULL,
                \`phone_number\` VARCHAR(191) NULL,
                \`payment_service_provider_id\` VARCHAR(191) NULL,
                \`total\` DECIMAL(65,30) DEFAULT 0,
                \`paid\` DECIMAL(65,30) DEFAULT 0,
                \`change_amount\` DECIMAL(65,30) DEFAULT 0,
                \`terminal_id\` VARCHAR(191) NULL,
                \`user_id\` VARCHAR(191) NULL,
                \`tenant_id\` VARCHAR(191) NOT NULL,
                \`branch_id\` VARCHAR(191) NOT NULL,
                \`status\` VARCHAR(191) NULL,
                \`is_refund\` TINYINT(1) DEFAULT 0,
                \`original_transaction_id\` VARCHAR(191) NULL,
                \`refund_reason\` VARCHAR(191) NULL,
                \`refunded_amount\` DECIMAL(65,30) DEFAULT 0,
                \`refunded_at\` DATETIME(3) NULL,
                \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                \`sale_id\` VARCHAR(191) NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`transaction_id\` (\`transaction_id\`)
            )`,
        ],
    },
};
