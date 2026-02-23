/**
 * Migration: 20260120_01
 * Description: Add SalePayment table for multiple payment method support
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260120_01',
    description: 'Add SalePayment table for multiple payment method support',
    up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "sale_payments" (
                    "sale_payment_id" TEXT PRIMARY KEY NOT NULL,
                    "sale_id" TEXT NOT NULL,
                    "payment_method_id" TEXT NOT NULL,
                    "amount" REAL NOT NULL,
                    "reference" TEXT,
                    "provider_id" TEXT,
                    "provider_ref" TEXT,
                    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
                    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "notes" TEXT,
                    "synced" INTEGER NOT NULL DEFAULT 0,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("sale_id") REFERENCES "sales"("sale_id") ON DELETE CASCADE,
                    FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("method_id") ON DELETE RESTRICT
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_sale_id" ON "sale_payments" ("sale_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_payment_method_id" ON "sale_payments" ("payment_method_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_status" ON "sale_payments" ("status")`,
                `CREATE INDEX IF NOT EXISTS "idx_sale_payments_processed_at" ON "sale_payments" ("processed_at")`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS sale_payments (
                    sale_payment_id VARCHAR(255) PRIMARY KEY NOT NULL,
                    sale_id VARCHAR(255) NOT NULL,
                    payment_method_id VARCHAR(255) NOT NULL,
                    amount DOUBLE NOT NULL,
                    reference VARCHAR(255),
                    provider_id VARCHAR(255),
                    provider_ref VARCHAR(255),
                    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
                    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    synced TINYINT NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
                    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(method_id) ON DELETE RESTRICT,
                    INDEX idx_sale_id (sale_id),
                    INDEX idx_payment_method_id (payment_method_id),
                    INDEX idx_status (status),
                    INDEX idx_processed_at (processed_at)
                )`,
            ],
        },
    down: {
            sqlite: [
                `DROP TABLE IF EXISTS "sale_payments"`,
            ],
            mysql: [
                `DROP TABLE IF EXISTS sale_payments`,
            ],
        },
};
