/**
 * Migration: 20260121_01
 * Description: Change saleNumber from global unique to per-tenant-branch unique (for offline support)
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260121_01',
    description: 'Change saleNumber from global unique to per-tenant-branch unique (for offline support)',
    up: {
        sqlite: [
            `CREATE TABLE IF NOT EXISTS "sales_new" (
                    "sale_id" TEXT PRIMARY KEY NOT NULL,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "sale_number" TEXT NOT NULL,
                    "customer_id" TEXT,
                    "terminal_id" TEXT,
                    "user_id" TEXT NOT NULL,
                    "subtotal" REAL NOT NULL DEFAULT 0.00,
                    "tax_amount" REAL NOT NULL DEFAULT 0.00,
                    "discount_amount" REAL NOT NULL DEFAULT 0.00,
                    "total_amount" REAL NOT NULL DEFAULT 0.00,
                    "amount_paid" REAL NOT NULL DEFAULT 0.00,
                    "change_amount" REAL NOT NULL DEFAULT 0.00,
                    "payment_method_id" TEXT,
                    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
                    "sale_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "notes" TEXT,
                    "is_voided" INTEGER NOT NULL DEFAULT 0,
                    "voided_at" DATETIME,
                    "voided_by" TEXT,
                    "void_reason" TEXT,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE("tenant_id", "branch_id", "sale_number")
                )`,
            `INSERT INTO "sales_new" ("sale_id", "tenant_id", "branch_id", "sale_number", "customer_id", "terminal_id", "user_id", "subtotal", "tax_amount", "discount_amount", "total_amount", "amount_paid", "change_amount", "payment_method_id", "status", "sale_date", "notes", "is_voided", "voided_at", "voided_by", "void_reason", "created_at", "updated_at")
                SELECT "sale_id", "tenant_id", "branch_id", "sale_number", "customer_id", "terminal_id", "user_id", "subtotal", "tax_amount", "discount_amount", "total_amount", "amount_paid", "change_amount", "payment_method_id", "status", "sale_date", "notes", "is_voided", "voided_at", "voided_by", "void_reason", "created_at", "updated_at" FROM "sales"`,
            `DROP TABLE "sales"`,
            `ALTER TABLE "sales_new" RENAME TO "sales"`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_branch_id" ON "sales" ("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_tenant_id" ON "sales" ("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_customer_id" ON "sales" ("customer_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_terminal_id" ON "sales" ("terminal_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_user_id" ON "sales" ("user_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_sale_date" ON "sales" ("sale_date")`,
            `CREATE INDEX IF NOT EXISTS "idx_sales_sale_number" ON "sales" ("sale_number")`,
        ],
        mysql: [
            `DROP PROCEDURE IF EXISTS migrate_sale_number_unique`,
            `CREATE PROCEDURE migrate_sale_number_unique()
                BEGIN
                    DECLARE index_exists INT DEFAULT 0;
                    
                    -- Check for old index 'sales_sale_number_key' and drop if exists
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'sales' 
                    AND index_name = 'sales_sale_number_key';
                    
                    IF index_exists > 0 THEN
                        ALTER TABLE sales DROP INDEX sales_sale_number_key;
                    END IF;
                    
                    -- Check for old index 'sale_number' and drop if exists
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'sales' 
                    AND index_name = 'sale_number';
                    
                    IF index_exists > 0 THEN
                        ALTER TABLE sales DROP INDEX sale_number;
                    END IF;
                    
                    -- Check for old index 'unique_sale_number' and drop if exists
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'sales' 
                    AND index_name = 'unique_sale_number';
                    
                    IF index_exists > 0 THEN
                        ALTER TABLE sales DROP INDEX unique_sale_number;
                    END IF;
                    
                    -- Check if new composite unique already exists
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'sales' 
                    AND index_name = 'unique_tenant_branch_sale_number';
                    
                    -- Only create if it doesn't exist
                    IF index_exists = 0 THEN
                        ALTER TABLE sales ADD CONSTRAINT unique_tenant_branch_sale_number UNIQUE (tenant_id, branch_id, sale_number);
                    END IF;
                END`,
            `CALL migrate_sale_number_unique()`,
            `DROP PROCEDURE IF EXISTS migrate_sale_number_unique`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            `ALTER TABLE sales DROP INDEX unique_tenant_sale_number`,
            `ALTER TABLE sales ADD CONSTRAINT sales_sale_number_key UNIQUE (sale_number)`,
        ],
    },
};
