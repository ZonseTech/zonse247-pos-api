/**
 * Database Migration System
 * 
 * Safe versioning & upgrade flow:
 * 1. Template DB has version embedded at build time
 * 2. User's DB has version tracked in db_meta table
 * 3. On startup: compare versions → backup → migrate → verify
 * 
 * Migration scripts are embedded in code (not file-based)
 * to work reliably in packaged Electron apps.
 */

import fs from 'fs/promises';
import path from 'path';
import { getDatabaseConfig } from '../../config/db';

/**
 * Current schema version - INCREMENT THIS when schema changes
 * Format: YYYYMMDD_NN (date + sequence number)
 */
export const CURRENT_DB_VERSION = '20260208_03';

/**
 * Minimum supported version for migration (older versions require fresh install)
 */
export const MIN_MIGRATABLE_VERSION = '20250101_01';

/**
 * Database type detection
 */
export type DatabaseType = 'sqlite' | 'mysql';

/**
 * Get the current database type based on configuration
 */
export const getDatabaseType = (): DatabaseType => {
    const config = getDatabaseConfig()

    return config.provider as unknown as DatabaseType;
};

/**
 * Migration definition with database-specific SQL
 */
export interface Migration {
    version: string;
    description: string;
    up: string[] | { sqlite: string[]; mysql: string[] };      // SQL statements to upgrade
    down?: string[] | { sqlite: string[]; mysql: string[] };   // SQL statements to rollback (optional)
}

/**
 * Get SQL statements for the current database type
 */
const getSqlStatements = (sql: string[] | { sqlite: string[]; mysql: string[] }, dbType: DatabaseType): string[] => {
    if (Array.isArray(sql)) {
        return sql;
    }
    return sql[dbType] || [];
};

/**
 * All migrations in order (oldest to newest)
 * 
 * IMPORTANT: Never modify existing migrations once released!
 * Only add new migrations at the end.
 */
export const MIGRATIONS: Migration[] = [
    {
        version: '20250101_01',
        description: 'Initial schema - baseline version',
        up: [
            // This is the baseline - no SQL needed if starting fresh
            // The template.db already has all tables
        ],
    },
    {
        version: '20260108_01',
        description: 'Add db_meta table for version tracking',
        up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `INSERT OR IGNORE INTO "db_meta" ("key", "value", "updated_at") 
                 VALUES ('schema_version', '20260108_01', CURRENT_TIMESTAMP)`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
                `INSERT IGNORE INTO db_meta (\`key\`, \`value\`, updated_at) 
                 VALUES ('schema_version', '20260108_01', CURRENT_TIMESTAMP)`,
            ],
        },
        down: {
            sqlite: [`DROP TABLE IF EXISTS "db_meta"`],
            mysql: [`DROP TABLE IF EXISTS db_meta`],
        },
    },
    {
        version: '20260110_01',
        description: 'Add tenant_registration_details table for storing temporary registration info',
        up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "tenant_registration_details" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "detail_id" TEXT NOT NULL UNIQUE,
                    "tenant_id" TEXT NOT NULL,
                    "business_name" TEXT NOT NULL,
                    "owner_name" TEXT NOT NULL,
                    "email" TEXT NOT NULL,
                    "tenant_code" TEXT NOT NULL,
                    "verification_token" TEXT NOT NULL,
                    "username" TEXT NOT NULL,
                    "password" TEXT NOT NULL,
                    "is_processed" INTEGER NOT NULL DEFAULT 0,
                    "processed_at" DATETIME,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_tenant_id" ON "tenant_registration_details" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_email" ON "tenant_registration_details" ("email")`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_is_processed" ON "tenant_registration_details" ("is_processed")`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS tenant_registration_details (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    detail_id VARCHAR(255) NOT NULL UNIQUE,
                    tenant_id VARCHAR(255) NOT NULL,
                    business_name VARCHAR(255) NOT NULL,
                    owner_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    tenant_code VARCHAR(255) NOT NULL,
                    verification_token TEXT NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
                    processed_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_email (email),
                    INDEX idx_is_processed (is_processed)
                )`,
            ],
        },
        down: {
            sqlite: [`DROP TABLE IF EXISTS "tenant_registration_details"`],
            mysql: [`DROP TABLE IF EXISTS tenant_registration_details`],
        },
    },
    {
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
            sqlite: [`DROP TABLE IF EXISTS "sale_payments"`],
            mysql: [`DROP TABLE IF EXISTS sale_payments`],
        },
    },
    {
        version: '20260120_02',
        description: 'Add ParkedSale and ParkedSaleItem tables for parked/held sales',
        up: {
            sqlite: [
                // ParkedSale table
                `CREATE TABLE IF NOT EXISTS "parked_sales" (
                    "parked_sale_id" TEXT PRIMARY KEY NOT NULL,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "user_id" TEXT NOT NULL,
                    "terminal_id" TEXT,
                    "customer_id" TEXT,
                    "reference" TEXT NOT NULL UNIQUE,
                    "subtotal" REAL NOT NULL DEFAULT 0,
                    "tax_amount" REAL NOT NULL DEFAULT 0,
                    "discount_amount" REAL NOT NULL DEFAULT 0,
                    "total_amount" REAL NOT NULL DEFAULT 0,
                    "total_items" INTEGER NOT NULL DEFAULT 0,
                    "status" TEXT NOT NULL DEFAULT 'PARKED',
                    "notes" TEXT,
                    "parked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "expires_at" DATETIME,
                    "resumed_at" DATETIME,
                    "synced" INTEGER NOT NULL DEFAULT 0,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_tenant_id" ON "parked_sales" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_branch_id" ON "parked_sales" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_user_id" ON "parked_sales" ("user_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_terminal_id" ON "parked_sales" ("terminal_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_reference" ON "parked_sales" ("reference")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_status" ON "parked_sales" ("status")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_parked_at" ON "parked_sales" ("parked_at")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sales_created_at" ON "parked_sales" ("created_at")`,
                // ParkedSaleItem table
                `CREATE TABLE IF NOT EXISTS "parked_sale_items" (
                    "parked_sale_item_id" TEXT PRIMARY KEY NOT NULL,
                    "parked_sale_id" TEXT NOT NULL,
                    "product_id" TEXT NOT NULL,
                    "category_id" TEXT,
                    "name" TEXT NOT NULL,
                    "barcode" TEXT,
                    "sku" TEXT,
                    "unit" TEXT,
                    "quantity" INTEGER NOT NULL DEFAULT 1,
                    "unit_price" REAL NOT NULL DEFAULT 0,
                    "sell_price" REAL NOT NULL DEFAULT 0,
                    "purchase_price" REAL NOT NULL DEFAULT 0,
                    "discount" REAL NOT NULL DEFAULT 0,
                    "tax_amount" REAL NOT NULL DEFAULT 0,
                    "subtotal" REAL NOT NULL DEFAULT 0,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("parked_sale_id") REFERENCES "parked_sales"("parked_sale_id") ON DELETE CASCADE
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sale_items_parked_sale_id" ON "parked_sale_items" ("parked_sale_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sale_items_product_id" ON "parked_sale_items" ("product_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_parked_sale_items_category_id" ON "parked_sale_items" ("category_id")`,
            ],
            mysql: [
                // ParkedSale table
                `CREATE TABLE IF NOT EXISTS parked_sales (
                    parked_sale_id VARCHAR(255) PRIMARY KEY NOT NULL,
                    tenant_id VARCHAR(255) NOT NULL,
                    branch_id VARCHAR(255) NOT NULL,
                    user_id VARCHAR(255) NOT NULL,
                    terminal_id VARCHAR(255),
                    customer_id VARCHAR(255),
                    reference VARCHAR(255) NOT NULL UNIQUE,
                    subtotal DOUBLE NOT NULL DEFAULT 0,
                    tax_amount DOUBLE NOT NULL DEFAULT 0,
                    discount_amount DOUBLE NOT NULL DEFAULT 0,
                    total_amount DOUBLE NOT NULL DEFAULT 0,
                    total_items INT NOT NULL DEFAULT 0,
                    status VARCHAR(50) NOT NULL DEFAULT 'PARKED',
                    notes TEXT,
                    parked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    resumed_at DATETIME,
                    synced TINYINT NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_branch_id (branch_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_terminal_id (terminal_id),
                    INDEX idx_reference (reference),
                    INDEX idx_status (status),
                    INDEX idx_parked_at (parked_at),
                    INDEX idx_created_at (created_at)
                )`,
                // ParkedSaleItem table
                `CREATE TABLE IF NOT EXISTS parked_sale_items (
                    parked_sale_item_id VARCHAR(255) PRIMARY KEY NOT NULL,
                    parked_sale_id VARCHAR(255) NOT NULL,
                    product_id VARCHAR(255) NOT NULL,
                    category_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    barcode VARCHAR(255),
                    sku VARCHAR(255),
                    unit VARCHAR(50),
                    quantity INT NOT NULL DEFAULT 1,
                    unit_price DOUBLE NOT NULL DEFAULT 0,
                    sell_price DOUBLE NOT NULL DEFAULT 0,
                    purchase_price DOUBLE NOT NULL DEFAULT 0,
                    discount DOUBLE NOT NULL DEFAULT 0,
                    tax_amount DOUBLE NOT NULL DEFAULT 0,
                    subtotal DOUBLE NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parked_sale_id) REFERENCES parked_sales(parked_sale_id) ON DELETE CASCADE,
                    INDEX idx_parked_sale_id (parked_sale_id),
                    INDEX idx_product_id (product_id),
                    INDEX idx_category_id (category_id)
                )`,
            ],
        },
        down: {
            sqlite: [
                `DROP TABLE IF EXISTS "parked_sale_items"`,
                `DROP TABLE IF EXISTS "parked_sales"`,
            ],
            mysql: [
                `DROP TABLE IF EXISTS parked_sale_items`,
                `DROP TABLE IF EXISTS parked_sales`,
            ],
        },
    },
    {
        version: '20260121_01',
        description: 'Change saleNumber from global unique to per-tenant-branch unique (for offline support)',
        up: {
            sqlite: [
                // SQLite doesn't support DROP CONSTRAINT, so we need to:
                // 1. Create a new table with the correct constraint
                // 2. Copy data
                // 3. Drop old table
                // 4. Rename new table
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
                `INSERT INTO "sales_new" SELECT * FROM "sales"`,
                `DROP TABLE "sales"`,
                `ALTER TABLE "sales_new" RENAME TO "sales"`,
                // Recreate indexes
                `CREATE INDEX IF NOT EXISTS "idx_sales_branch_id" ON "sales" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sales_tenant_id" ON "sales" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sales_customer_id" ON "sales" ("customer_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sales_terminal_id" ON "sales" ("terminal_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sales_user_id" ON "sales" ("user_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_sales_sale_date" ON "sales" ("sale_date")`,
                `CREATE INDEX IF NOT EXISTS "idx_sales_sale_number" ON "sales" ("sale_number")`,
            ],
            mysql: [
                // MySQL: Add composite unique (the old unique constraint may not exist, or have different name)
                // Using a stored procedure approach to handle this safely:
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
            sqlite: [
                // Revert: This would require ensuring no duplicates exist first
                // For safety, we don't provide automatic rollback for this
            ],
            mysql: [
                `ALTER TABLE sales DROP INDEX unique_tenant_sale_number`,
                `ALTER TABLE sales ADD CONSTRAINT sales_sale_number_key UNIQUE (sale_number)`,
            ],
        },
    },
    {
        version: '20260208_01',
        description: 'Make product SKU nullable and remove unique constraint',
        up: {
            sqlite: [
                // SQLite: Create new table without the unique constraint, with nullable sku
                `CREATE TABLE IF NOT EXISTS "products_new" (
                    "product_id" TEXT PRIMARY KEY NOT NULL,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "category_id" TEXT,
                    "sku" TEXT,
                    "name" TEXT NOT NULL,
                    "primary_barcode" TEXT UNIQUE,
                    "description" TEXT,
                    "unit" TEXT NOT NULL DEFAULT 'piece',
                    "selling_price" REAL NOT NULL DEFAULT 0.00,
                    "brand" TEXT,
                    "color" TEXT,
                    "size" TEXT,
                    "dimensions" TEXT,
                    "weight" REAL,
                    "promo_price" REAL,
                    "promo_start" DATETIME,
                    "promo_end" DATETIME,
                    "is_taxable" INTEGER NOT NULL DEFAULT 1,
                    "expiration_date" DATETIME,
                    "manufacture_date" DATETIME,
                    "supplier_name" TEXT,
                    "supplier_code" TEXT,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `INSERT INTO "products_new" SELECT * FROM "products"`,
                `DROP TABLE "products"`,
                `ALTER TABLE "products_new" RENAME TO "products"`,
                // Recreate indexes (without the unique constraint on sku)
                `CREATE INDEX IF NOT EXISTS "idx_products_branch_id" ON "products" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_products_tenant_id" ON "products" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products" ("category_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_products_primary_barcode" ON "products" ("primary_barcode")`,
                `CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" ("sku")`,
            ],
            mysql: [
                // MySQL: Drop the unique constraints (if they exist) and make sku nullable
                `DROP PROCEDURE IF EXISTS migrate_sku_nullable`,
                `CREATE PROCEDURE migrate_sku_nullable()
                BEGIN
                    DECLARE index_exists INT DEFAULT 0;
                    
                    -- Check and drop 'sku' index if exists
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'products' 
                    AND index_name = 'sku';
                    
                    IF index_exists > 0 THEN
                        ALTER TABLE products DROP INDEX sku;
                    END IF;
                    
                    -- Check and drop 'unique_branch_sku' index if exists
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'products' 
                    AND index_name = 'unique_branch_sku';
                    
                    IF index_exists > 0 THEN
                        ALTER TABLE products DROP INDEX unique_branch_sku;
                    END IF;
                    
                    -- Check and drop 'products_sku_key' index if exists (Prisma naming)
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'products' 
                    AND index_name = 'products_sku_key';
                    
                    IF index_exists > 0 THEN
                        ALTER TABLE products DROP INDEX products_sku_key;
                    END IF;
                    
                    -- Check if idx_products_sku already exists before creating
                    SELECT COUNT(*) INTO index_exists 
                    FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'products' 
                    AND index_name = 'idx_products_sku';
                    
                    IF index_exists = 0 THEN
                        CREATE INDEX idx_products_sku ON products (sku);
                    END IF;
                END`,
                `CALL migrate_sku_nullable()`,
                `DROP PROCEDURE IF EXISTS migrate_sku_nullable`,
                `ALTER TABLE products MODIFY COLUMN sku VARCHAR(191) NULL`,
            ],
        },
        down: {
            sqlite: [
                // Rollback would require setting default values for NULL skus first
                // For safety, we don't provide automatic rollback
            ],
            mysql: [
                `DROP INDEX idx_products_sku ON products`,
                `ALTER TABLE products MODIFY COLUMN sku VARCHAR(191) NOT NULL`,
                `ALTER TABLE products ADD CONSTRAINT sku UNIQUE (sku)`,
                `ALTER TABLE products ADD CONSTRAINT unique_branch_sku UNIQUE (branch_id, sku)`,
            ],
        },
    },
    {
        version: '20260208_02',
        description: 'Add ProductVariant model and migrate existing products to variants (non-destructive)',
        up: {
            sqlite: [
                // Step 1: Create product_variants table
                `CREATE TABLE IF NOT EXISTS "product_variants" (
                    "variant_id" TEXT PRIMARY KEY NOT NULL,
                    "product_id" TEXT NOT NULL,
                    "tenant_id" TEXT NOT NULL,
                    "branch_id" TEXT NOT NULL,
                    "sku" TEXT,
                    "variant_name" TEXT NOT NULL,
                    "primary_barcode" TEXT UNIQUE,
                    "selling_price" REAL NOT NULL DEFAULT 0.00,
                    "cost_price" REAL NOT NULL DEFAULT 0.00,
                    "unit" TEXT NOT NULL DEFAULT 'piece',
                    "description" TEXT,
                    "brand" TEXT,
                    "image_url" TEXT,
                    "is_taxable" INTEGER,
                    "supplier_name" TEXT,
                    "supplier_code" TEXT,
                    "size" TEXT,
                    "weight" REAL,
                    "weight_unit" TEXT,
                    "volume" REAL,
                    "volume_unit" TEXT,
                    "dimensions" TEXT,
                    "custom_attributes" TEXT,
                    "promo_price" REAL,
                    "promo_start" DATETIME,
                    "promo_end" DATETIME,
                    "expiration_date" DATETIME,
                    "manufacture_date" DATETIME,
                    "is_default" INTEGER NOT NULL DEFAULT 1,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE
                )`,

                // Step 2: Create variant_barcodes table
                `CREATE TABLE IF NOT EXISTS "variant_barcodes" (
                    "variant_barcode_id" TEXT PRIMARY KEY NOT NULL,
                    "variant_id" TEXT NOT NULL,
                    "barcode" TEXT NOT NULL UNIQUE,
                    "barcode_type" TEXT NOT NULL DEFAULT 'EAN13',
                    "barcode_source" TEXT NOT NULL DEFAULT 'SUPPLIER',
                    "description" TEXT,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE CASCADE
                )`,

                // Step 3: Migrate existing products to variants (each product becomes a variant with name "Default")
                `INSERT INTO "product_variants" (
                    "variant_id", "product_id", "tenant_id", "branch_id", "sku", "variant_name",
                    "primary_barcode", "selling_price", "cost_price", "unit", "description", "brand",
                    "image_url", "is_taxable", "supplier_name", "supplier_code", "size", "weight",
                    "dimensions", "promo_price", "promo_start", "promo_end", "expiration_date",
                    "manufacture_date", "is_default", "is_active", "created_at", "updated_at"
                )
                SELECT 
                    lower(hex(randomblob(16))), "product_id", "tenant_id", "branch_id", "sku", 'Default',
                    "primary_barcode", "selling_price", 0.00, COALESCE("unit", 'piece'), "description", "brand",
                    NULL, "is_taxable", "supplier_name", "supplier_code", "size", "weight",
                    "dimensions", "promo_price", "promo_start", "promo_end", "expiration_date",
                    "manufacture_date", 1, "is_active", "created_at", "updated_at"
                FROM "products"
                WHERE NOT EXISTS (SELECT 1 FROM "product_variants" WHERE "product_variants"."product_id" = "products"."product_id")`,

                // Step 4: Migrate product_barcodes to variant_barcodes
                `INSERT OR IGNORE INTO "variant_barcodes" (
                    "variant_barcode_id", "variant_id", "barcode", "barcode_type", "barcode_source",
                    "description", "is_active", "created_at", "updated_at"
                )
                SELECT 
                    pb."product_barcode_id", pv."variant_id", pb."barcode", pb."barcode_type", pb."barcode_source",
                    pb."description", pb."is_active", pb."created_at", pb."updated_at"
                FROM "product_barcodes" pb
                INNER JOIN "product_variants" pv ON pb."product_id" = pv."product_id"`,

                // Step 5: Add variant_id column to inventory (keep product_id temporarily)
                `ALTER TABLE "inventory" ADD COLUMN "variant_id" TEXT`,

                // Step 6: Update inventory to reference variants
                `UPDATE "inventory" SET "variant_id" = (
                    SELECT pv."variant_id" FROM "product_variants" pv 
                    WHERE pv."product_id" = "inventory"."product_id" AND pv."is_default" = 1
                    LIMIT 1
                )`,

                // Step 7: Add variant_id to sale_items (keep product_id temporarily)
                `ALTER TABLE "sale_items" ADD COLUMN "variant_id" TEXT`,

                // Step 8: Update sale_items to reference variants
                `UPDATE "sale_items" SET "variant_id" = (
                    SELECT pv."variant_id" FROM "product_variants" pv 
                    WHERE pv."product_id" = "sale_items"."product_id" AND pv."is_default" = 1
                    LIMIT 1
                )`,

                // Step 9: Add variant_id to purchase_order_items (keep product_id temporarily)
                `ALTER TABLE "purchase_order_items" ADD COLUMN "variant_id" TEXT`,

                // Step 10: Update purchase_order_items to reference variants
                `UPDATE "purchase_order_items" SET "variant_id" = (
                    SELECT pv."variant_id" FROM "product_variants" pv 
                    WHERE pv."product_id" = "purchase_order_items"."product_id" AND pv."is_default" = 1
                    LIMIT 1
                )`,

                // Step 11: Create indexes for product_variants
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_product_id" ON "product_variants" ("product_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_branch_id" ON "product_variants" ("branch_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_tenant_id" ON "product_variants" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_sku" ON "product_variants" ("sku")`,
                `CREATE INDEX IF NOT EXISTS "idx_product_variants_variant_name" ON "product_variants" ("variant_name")`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_variants_unique" ON "product_variants" ("product_id", "variant_name")`,

                // Step 12: Create indexes for variant_barcodes
                `CREATE INDEX IF NOT EXISTS "idx_variant_barcodes_variant_id" ON "variant_barcodes" ("variant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_variant_barcodes_barcode" ON "variant_barcodes" ("barcode")`,

                // Step 13: Create index for inventory variant_id
                `CREATE INDEX IF NOT EXISTS "idx_inventory_variant_id" ON "inventory" ("variant_id")`,
            ],
            mysql: [
                // Step 0a: Add default_unit column to products table (idempotent using stored procedure)
                `DROP PROCEDURE IF EXISTS add_products_default_unit_col`,
                `CREATE PROCEDURE add_products_default_unit_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'default_unit'
                    ) THEN
                        ALTER TABLE products ADD COLUMN default_unit VARCHAR(50) DEFAULT NULL AFTER supplier_code;
                    END IF;
                END`,
                `CALL add_products_default_unit_col()`,
                `DROP PROCEDURE IF EXISTS add_products_default_unit_col`,

                // Step 0b: Copy unit values to default_unit (only if both columns exist)
                `UPDATE products SET default_unit = unit WHERE unit IS NOT NULL AND default_unit IS NULL`,

                // Step 0c: Add custom_attribute_schema column to products table (idempotent)
                `DROP PROCEDURE IF EXISTS add_products_custom_attr_col`,
                `CREATE PROCEDURE add_products_custom_attr_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'custom_attribute_schema'
                    ) THEN
                        ALTER TABLE products ADD COLUMN custom_attribute_schema TEXT DEFAULT NULL;
                    END IF;
                END`,
                `CALL add_products_custom_attr_col()`,
                `DROP PROCEDURE IF EXISTS add_products_custom_attr_col`,

                // Step 0d: Add image_url column to products table (idempotent)
                `DROP PROCEDURE IF EXISTS add_products_image_url_col`,
                `CREATE PROCEDURE add_products_image_url_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'image_url'
                    ) THEN
                        ALTER TABLE products ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;
                    END IF;
                END`,
                `CALL add_products_image_url_col()`,
                `DROP PROCEDURE IF EXISTS add_products_image_url_col`,

                // Step 1: Create product_variants table (must match products table charset/collation)
                `CREATE TABLE IF NOT EXISTS product_variants (
                    variant_id VARCHAR(191) NOT NULL,
                    product_id VARCHAR(191) NOT NULL,
                    tenant_id VARCHAR(191) NOT NULL,
                    branch_id VARCHAR(191) NOT NULL,
                    sku VARCHAR(191),
                    variant_name VARCHAR(191) NOT NULL,
                    primary_barcode VARCHAR(191),
                    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
                    description TEXT,
                    brand VARCHAR(191),
                    image_url VARCHAR(500),
                    is_taxable BOOLEAN,
                    supplier_name VARCHAR(191),
                    supplier_code VARCHAR(191),
                    size VARCHAR(50),
                    weight DECIMAL(10,3),
                    weight_unit VARCHAR(10),
                    volume DECIMAL(10,3),
                    volume_unit VARCHAR(10),
                    dimensions VARCHAR(100),
                    custom_attributes TEXT,
                    promo_price DECIMAL(10,2),
                    promo_start DATETIME,
                    promo_end DATETIME,
                    expiration_date DATETIME,
                    manufacture_date DATETIME,
                    is_default BOOLEAN NOT NULL DEFAULT TRUE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (variant_id),
                    UNIQUE KEY unique_primary_barcode (primary_barcode),
                    UNIQUE KEY unique_product_variant (product_id, variant_name),
                    INDEX idx_product_id (product_id),
                    INDEX idx_branch_id (branch_id),
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_sku (sku),
                    INDEX idx_variant_name (variant_name),
                    CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

                // Step 2: Create variant_barcodes table
                `CREATE TABLE IF NOT EXISTS variant_barcodes (
                    variant_barcode_id VARCHAR(191) NOT NULL,
                    variant_id VARCHAR(191) NOT NULL,
                    barcode VARCHAR(191) NOT NULL,
                    barcode_type ENUM('EAN13', 'EAN8', 'UPCA', 'UPCE', 'CODE39', 'CODE128', 'QR', 'CUSTOM') NOT NULL DEFAULT 'EAN13',
                    barcode_source ENUM('MANUFACTURER', 'SUPPLIER', 'STORE', 'BUNDLE', 'PACKAGING', 'CUSTOM') NOT NULL DEFAULT 'SUPPLIER',
                    description VARCHAR(500),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (variant_barcode_id),
                    UNIQUE KEY unique_barcode (barcode),
                    UNIQUE KEY unique_variant_barcode (variant_id, barcode),
                    INDEX idx_variant_id (variant_id),
                    INDEX idx_barcode (barcode),
                    CONSTRAINT variant_barcodes_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

                // Step 3: Migrate existing products to variants
                `INSERT INTO product_variants (
                    variant_id, product_id, tenant_id, branch_id, sku, variant_name,
                    primary_barcode, selling_price, cost_price, unit, description, brand,
                    image_url, is_taxable, supplier_name, supplier_code, size, weight,
                    dimensions, promo_price, promo_start, promo_end, expiration_date,
                    manufacture_date, is_default, is_active, created_at, updated_at
                )
                SELECT 
                    UUID(), product_id, tenant_id, branch_id, sku, 'Default',
                    primary_barcode, selling_price, 0.00, COALESCE(unit, 'piece'), description, brand,
                    NULL, is_taxable, supplier_name, supplier_code, size, weight,
                    dimensions, promo_price, promo_start, promo_end, expiration_date,
                    manufacture_date, TRUE, is_active, created_at, updated_at
                FROM products p
                WHERE NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.product_id)`,

                // Step 4: Migrate product_barcodes to variant_barcodes
                `INSERT IGNORE INTO variant_barcodes (
                    variant_barcode_id, variant_id, barcode, barcode_type, barcode_source,
                    description, is_active, created_at, updated_at
                )
                SELECT 
                    pb.product_barcode_id, pv.variant_id, pb.barcode, pb.barcode_type, pb.barcode_source,
                    pb.description, pb.is_active, pb.created_at, pb.updated_at
                FROM product_barcodes pb
                INNER JOIN product_variants pv ON pb.product_id = pv.product_id`,

                // Step 5: Add variant_id column to inventory (idempotent)
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_col`,
                `CREATE PROCEDURE add_inventory_variant_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'variant_id'
                    ) THEN
                        ALTER TABLE inventory ADD COLUMN variant_id VARCHAR(191) AFTER product_id;
                    END IF;
                END`,
                `CALL add_inventory_variant_id_col()`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_col`,

                // Step 6: Update inventory to reference variants
                `UPDATE inventory i 
                SET variant_id = (
                    SELECT pv.variant_id FROM product_variants pv 
                    WHERE pv.product_id = i.product_id AND pv.is_default = TRUE
                    LIMIT 1
                ) WHERE i.variant_id IS NULL`,

                // Step 7: Add variant_id to sale_items (idempotent)
                `DROP PROCEDURE IF EXISTS add_sale_items_variant_id_col`,
                `CREATE PROCEDURE add_sale_items_variant_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'variant_id'
                    ) THEN
                        ALTER TABLE sale_items ADD COLUMN variant_id VARCHAR(191) AFTER product_id;
                    END IF;
                END`,
                `CALL add_sale_items_variant_id_col()`,
                `DROP PROCEDURE IF EXISTS add_sale_items_variant_id_col`,

                // Step 8: Update sale_items to reference variants
                `UPDATE sale_items si 
                SET variant_id = (
                    SELECT pv.variant_id FROM product_variants pv 
                    WHERE pv.product_id = si.product_id AND pv.is_default = TRUE
                    LIMIT 1
                ) WHERE si.variant_id IS NULL`,

                // Step 9: Add variant_id to purchase_order_items (idempotent)
                `DROP PROCEDURE IF EXISTS add_purchase_order_items_variant_id_col`,
                `CREATE PROCEDURE add_purchase_order_items_variant_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'variant_id'
                    ) THEN
                        ALTER TABLE purchase_order_items ADD COLUMN variant_id VARCHAR(191) AFTER product_id;
                    END IF;
                END`,
                `CALL add_purchase_order_items_variant_id_col()`,
                `DROP PROCEDURE IF EXISTS add_purchase_order_items_variant_id_col`,

                // Step 10: Update purchase_order_items to reference variants
                `UPDATE purchase_order_items poi 
                SET variant_id = (
                    SELECT pv.variant_id FROM product_variants pv 
                    WHERE pv.product_id = poi.product_id AND pv.is_default = TRUE
                    LIMIT 1
                ) WHERE poi.variant_id IS NULL`,

                // Step 11: Add index for inventory variant_id (idempotent)
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_idx`,
                `CREATE PROCEDURE add_inventory_variant_id_idx()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_variant_id'
                    ) THEN
                        CREATE INDEX idx_inventory_variant_id ON inventory (variant_id);
                    END IF;
                END`,
                `CALL add_inventory_variant_id_idx()`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_idx`,
            ],
        },
        down: {
            sqlite: [
                // Rollback: Remove variant_id columns and drop new tables
                // Note: This would lose any new variants created after migration
                `DROP TABLE IF EXISTS "variant_barcodes"`,
                `DROP TABLE IF EXISTS "product_variants"`,
            ],
            mysql: [
                `ALTER TABLE inventory DROP COLUMN variant_id`,
                `ALTER TABLE sale_items DROP COLUMN variant_id`,
                `ALTER TABLE purchase_order_items DROP COLUMN variant_id`,
                `DROP TABLE IF EXISTS variant_barcodes`,
                `DROP TABLE IF EXISTS product_variants`,
            ],
        },
    },
    {
        version: '20260208_03',
        description: 'Fix inventory constraints for variant support - remove unique on product_id, add unique on variant_id',
        up: {
            sqlite: [
                // SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table
                // For now, just create indexes if not exist
                `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_variant_id_key" ON "inventory" ("variant_id")`,
            ],
            mysql: [
                // Step 1: Drop unique constraint on product_id (idempotent)
                `DROP PROCEDURE IF EXISTS fix_inventory_product_id_constraint`,
                `CREATE PROCEDURE fix_inventory_product_id_constraint()
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'inventory_product_id_key'
                    ) THEN
                        ALTER TABLE inventory DROP INDEX inventory_product_id_key;
                    END IF;
                END`,
                `CALL fix_inventory_product_id_constraint()`,
                `DROP PROCEDURE IF EXISTS fix_inventory_product_id_constraint`,

                // Step 2: Create non-unique index on product_id (idempotent)
                `DROP PROCEDURE IF EXISTS add_inventory_product_id_idx`,
                `CREATE PROCEDURE add_inventory_product_id_idx()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'idx_inventory_product_id'
                    ) THEN
                        CREATE INDEX idx_inventory_product_id ON inventory (product_id);
                    END IF;
                END`,
                `CALL add_inventory_product_id_idx()`,
                `DROP PROCEDURE IF EXISTS add_inventory_product_id_idx`,

                // Step 3: Create unique index on variant_id (idempotent)
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_unique`,
                `CREATE PROCEDURE add_inventory_variant_id_unique()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND INDEX_NAME = 'inventory_variant_id_key'
                    ) THEN
                        CREATE UNIQUE INDEX inventory_variant_id_key ON inventory (variant_id);
                    END IF;
                END`,
                `CALL add_inventory_variant_id_unique()`,
                `DROP PROCEDURE IF EXISTS add_inventory_variant_id_unique`,
            ],
        },
        down: {
            sqlite: [],
            mysql: [
                `DROP INDEX inventory_variant_id_key ON inventory`,
                `DROP INDEX idx_inventory_product_id ON inventory`,
                `CREATE UNIQUE INDEX inventory_product_id_key ON inventory (product_id)`,
            ],
        },
    },
    // Add future migrations here:
];

/**
 * Database Migration Manager
 */
export class MigrationManager {
    private db: any; // Prisma client
    private userDataPath: string;
    private dbType: DatabaseType;

    constructor(prismaClient: any, userDataPath: string, dbType?: DatabaseType) {
        this.db = prismaClient;
        this.userDataPath = userDataPath;
        this.dbType = dbType || getDatabaseType();
    }

    /**
     * Get current database version
     */
    async getCurrentVersion(): Promise<string | null> {
        try {
            let result;
            if (this.dbType === 'mysql') {
                result = await this.db.$queryRawUnsafe(
                    "SELECT `value` FROM db_meta WHERE `key` = 'schema_version'"
                );
            } else {
                result = await this.db.$queryRaw`
                    SELECT value FROM db_meta WHERE key = 'schema_version'
                `;
            }
            return result?.[0]?.value || null;
        } catch {
            // db_meta table doesn't exist yet
            return null;
        }
    }

    /**
     * Set database version
     */
    private async setVersion(version: string): Promise<void> {
        if (this.dbType === 'mysql') {
            await this.db.$executeRawUnsafe(
                "REPLACE INTO db_meta (`key`, `value`, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
                version
            );
        } else {
            await this.db.$executeRaw`
                INSERT OR REPLACE INTO db_meta (key, value, updated_at)
                VALUES ('schema_version', ${version}, CURRENT_TIMESTAMP)
            `;
        }
    }

    /**
     * Check if migrations are needed
     */
    async needsMigration(): Promise<boolean> {
        const currentVersion = await this.getCurrentVersion();

        if (!currentVersion) {
            // No version info - might be old DB or fresh install
            return true;
        }

        return currentVersion < CURRENT_DB_VERSION;
    }

    /**
     * Get pending migrations
     */
    async getPendingMigrations(): Promise<Migration[]> {
        const currentVersion = await this.getCurrentVersion();

        if (!currentVersion) {
            // Return all migrations
            return MIGRATIONS;
        }

        // Return migrations newer than current version
        return MIGRATIONS.filter(m => m.version > currentVersion);
    }

    /**
     * Create a backup of the database before migration
     */
    async createBackup(dbPath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.userDataPath, 'backups');
        const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

        await fs.mkdir(backupDir, { recursive: true });
        await fs.copyFile(dbPath, backupPath);

        console.log(`📦 Database backup created: ${backupPath}`);
        return backupPath;
    }

    /**
     * Restore database from backup
     */
    async restoreBackup(backupPath: string, dbPath: string): Promise<void> {
        await fs.copyFile(backupPath, dbPath);
        console.log(`✓ Database restored from backup`);
    }

    /**
     * Run all pending migrations
     * @param dbPath - Path to database file (required for SQLite backups, optional for MySQL)
     */
    async migrate(dbPath?: string): Promise<{
        success: boolean;
        migrationsApplied: string[];
        error?: string;
        backupPath?: string;
    }> {
        const pendingMigrations = await this.getPendingMigrations();

        if (pendingMigrations.length === 0) {
            return { success: true, migrationsApplied: [] };
        }

        console.log(`\n📊 Database Migration`);
        console.log(`   Current version: ${await this.getCurrentVersion() || 'unknown'}`);
        console.log(`   Target version: ${CURRENT_DB_VERSION}`);
        console.log(`   Pending migrations: ${pendingMigrations.length}\n`);

        // Create backup before migration (SQLite only)
        let backupPath: string | undefined;
        if (dbPath && this.dbType === 'sqlite') {
            try {
                backupPath = await this.createBackup(dbPath);
            } catch (backupError) {
                console.error('⚠️ Failed to create backup, proceeding anyway...');
            }
        }

        const migrationsApplied: string[] = [];

        for (const migration of pendingMigrations) {
            console.log(`🔄 Applying migration ${migration.version}: ${migration.description}`);

            try {
                // Get database-specific SQL statements
                const sqlStatements = getSqlStatements(migration.up, this.dbType);

                // Run each SQL statement in the migration
                for (const sql of sqlStatements) {
                    if (sql.trim()) {
                        await this.db.$executeRawUnsafe(sql);
                    }
                }

                // Update version after successful migration
                await this.setVersion(migration.version);
                migrationsApplied.push(migration.version);
                console.log(`   ✓ Migration ${migration.version} applied`);
            } catch (error) {
                const errorMessage = (error as Error).message;
                console.error(`   ❌ Migration ${migration.version} failed: ${errorMessage}`);

                // Attempt rollback to backup (SQLite only)
                if (backupPath && dbPath) {
                    console.log('🔙 Attempting rollback to backup...');
                    try {
                        await this.restoreBackup(backupPath, dbPath);
                        return {
                            success: false,
                            migrationsApplied,
                            error: `Migration ${migration.version} failed: ${errorMessage}. Database restored from backup.`,
                            backupPath,
                        };
                    } catch (rollbackError) {
                        return {
                            success: false,
                            migrationsApplied,
                            error: `Migration failed AND rollback failed! Backup at: ${backupPath}`,
                            backupPath,
                        };
                    }
                }

                return {
                    success: false,
                    migrationsApplied,
                    error: `Migration ${migration.version} failed: ${errorMessage}`,
                };
            }
        }

        console.log(`\n✓ All migrations applied successfully`);
        console.log(`   New version: ${CURRENT_DB_VERSION}\n`);

        return {
            success: true,
            migrationsApplied,
            backupPath,
        };
    }

    /**
     * Verify database integrity after migration
     */
    async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
        const issues: string[] = [];

        try {
            // Check database integrity (SQLite-specific, skip for MySQL)
            if (this.dbType === 'sqlite') {
                const integrityCheck = await this.db.$queryRaw`PRAGMA integrity_check`;
                if (integrityCheck?.[0]?.integrity_check !== 'ok') {
                    issues.push('SQLite integrity check failed');
                }
            }

            // Verify essential tables exist
            const essentialTables = ['app_setups', 'db_meta'];
            for (const table of essentialTables) {
                try {
                    if (this.dbType === 'mysql') {
                        await this.db.$queryRawUnsafe(`SELECT 1 FROM \`${table}\` LIMIT 1`);
                    } else {
                        await this.db.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
                    }
                } catch {
                    issues.push(`Essential table missing: ${table}`);
                }
            }

            // Verify version is current
            const version = await this.getCurrentVersion();
            if (version !== CURRENT_DB_VERSION) {
                issues.push(`Version mismatch: expected ${CURRENT_DB_VERSION}, got ${version}`);
            }
        } catch (error) {
            issues.push(`Verification error: ${(error as Error).message}`);
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    /**
     * Clean up old backups (keep last N)
     */
    async cleanupOldBackups(keepCount = 5): Promise<void> {
        const backupDir = path.join(this.userDataPath, 'backups');

        try {
            const files = await fs.readdir(backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
                .sort()
                .reverse(); // Newest first

            // Delete old backups
            const filesToDelete = backupFiles.slice(keepCount);
            for (const file of filesToDelete) {
                await fs.unlink(path.join(backupDir, file));
                console.log(`🗑️ Deleted old backup: ${file}`);
            }
        } catch {
            // Backup directory may not exist
        }
    }
}

/**
 * Ensure db_meta table exists (without setting version)
 * Call this BEFORE running migrations
 */
export async function ensureDbMetaTableExists(prismaClient: any, dbType?: DatabaseType): Promise<void> {
    const currentDbType = dbType || getDatabaseType();

    try {
        if (currentDbType === 'mysql') {
            // MySQL syntax
            await prismaClient.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
        } else {
            // SQLite syntax
            await prismaClient.$executeRaw`
                CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;
        }
    } catch (error) {
        console.error('Failed to ensure db_meta table exists:', error);
    }
}

/**
 * Ensure db_meta table exists and has version info
 * Call this after fresh template copy
 */
export async function initializeVersionTracking(prismaClient: any, dbType?: DatabaseType): Promise<void> {
    const currentDbType = dbType || getDatabaseType();

    try {
        if (currentDbType === 'mysql') {
            // MySQL syntax
            await prismaClient.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS db_meta (
                    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
                    \`value\` TEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Set initial version using REPLACE for MySQL
            await prismaClient.$executeRawUnsafe(
                "INSERT IGNORE INTO db_meta (`key`, `value`, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
                CURRENT_DB_VERSION
            );
        } else {
            // SQLite syntax
            await prismaClient.$executeRaw`
                CREATE TABLE IF NOT EXISTS "db_meta" (
                    "key" TEXT PRIMARY KEY NOT NULL,
                    "value" TEXT NOT NULL,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Set initial version
            await prismaClient.$executeRaw`
                INSERT OR IGNORE INTO "db_meta" ("key", "value", "updated_at")
                VALUES ('schema_version', ${CURRENT_DB_VERSION}, CURRENT_TIMESTAMP)
            `;
        }
    } catch (error) {
        console.error('Failed to initialize version tracking:', error);
    }
}
