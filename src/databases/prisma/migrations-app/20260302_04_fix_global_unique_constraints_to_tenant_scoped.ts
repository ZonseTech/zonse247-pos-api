/**
 * Migration: 20260302_04
 * Description: Fix global unique constraints to be tenant-scoped for multi-tenant support
 * 
 * This migration changes global @unique constraints to @@unique with tenant/branch scoping
 * to ensure uniqueness is enforced within a tenant (or branch) rather than globally.
 * 
 * Changes:
 * 1. ProductVariant: primaryBarcode @unique → @@unique([tenantId, branchId, primaryBarcode])
 * 2. VariantBarcode: 
 *    - Add tenantId and branchId columns
 *    - barcode @unique → @@unique([tenantId, branchId, barcode])
 * 3. Inventory: variantId @unique → @@unique([branchId, variantId])
 * 4. PurchaseOrder: poNumber @unique → @@unique([tenantId, poNumber])
 * 5. Terminal: terminalCode @unique → @@unique([tenantId, terminalCode])
 * 
 * Already correctly scoped (no changes needed):
 * - User: @@unique([tenantId, username]) ✓
 * - Branch: @@unique([tenantId, branchCode]) ✓
 * - Sale: @@unique([tenantId, branchId, saleNumber]) ✓
 * - Product: @@unique([branchId, name]) ✓
 * - Category: @@unique([branchId, name]) ✓
 * - MRA_API_CONFIG_TABLE: @@unique([tenantId, environment]) ✓
 * - Tenant: Global uniqueness for tin, tenantCode, email is correct (national identifiers)
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260302_04',
    description: 'Fix global unique constraints to be tenant-scoped for multi-tenant support',
    up: {
        sqlite: [
            // 1. Add tenantId and branchId to variant_barcodes
            `ALTER TABLE "variant_barcodes" ADD COLUMN "tenant_id" TEXT`,
            `ALTER TABLE "variant_barcodes" ADD COLUMN "branch_id" TEXT`,

            // 2. Populate tenant_id and branch_id from the related variant
            `UPDATE "variant_barcodes" SET 
                "tenant_id" = (SELECT "tenant_id" FROM "product_variants" WHERE "product_variants"."variant_id" = "variant_barcodes"."variant_id"),
                "branch_id" = (SELECT "branch_id" FROM "product_variants" WHERE "product_variants"."variant_id" = "variant_barcodes"."variant_id")`,

            // 3. Drop existing global unique indexes/constraints (SQLite: drop and recreate)
            // Note: SQLite doesn't support DROP CONSTRAINT, so we drop the index
            `DROP INDEX IF EXISTS "variant_barcodes_barcode_key"`,
            `DROP INDEX IF EXISTS "product_variants_primary_barcode_key"`,
            `DROP INDEX IF EXISTS "inventory_variant_id_key"`,
            `DROP INDEX IF EXISTS "purchase_orders_po_number_key"`,
            `DROP INDEX IF EXISTS "terminals_terminal_code_key"`,

            // 4. Create new tenant-scoped unique indexes
            // ProductVariant: @@unique([tenantId, branchId, primaryBarcode])
            `CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_tenant_branch_barcode_key" 
             ON "product_variants" ("tenant_id", "branch_id", "primary_barcode") 
             WHERE "primary_barcode" IS NOT NULL`,

            // VariantBarcode: @@unique([tenantId, branchId, barcode])
            `CREATE UNIQUE INDEX IF NOT EXISTS "variant_barcodes_tenant_branch_barcode_key" 
             ON "variant_barcodes" ("tenant_id", "branch_id", "barcode")`,

            // Inventory: @@unique([branchId, variantId])
            `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_branch_variant_key" 
             ON "inventory" ("branch_id", "variant_id") 
             WHERE "variant_id" IS NOT NULL`,

            // PurchaseOrder: @@unique([tenantId, poNumber])
            `CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_tenant_po_number_key" 
             ON "purchase_orders" ("tenant_id", "po_number")`,

            // Terminal: @@unique([tenantId, terminalCode])
            `CREATE UNIQUE INDEX IF NOT EXISTS "terminals_tenant_terminal_code_key" 
             ON "terminals" ("tenant_id", "terminal_code")`,

            // 5. Add indexes for the new foreign key columns
            `CREATE INDEX IF NOT EXISTS "idx_variant_barcodes_tenant_id" ON "variant_barcodes" ("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_variant_barcodes_branch_id" ON "variant_barcodes" ("branch_id")`,
        ],
        mysql: [
            // Helper procedure to drop index if it exists (MySQL doesn't have DROP INDEX IF EXISTS)
            `DROP PROCEDURE IF EXISTS drop_index_if_exists`,
            `CREATE PROCEDURE drop_index_if_exists(IN tbl VARCHAR(255), IN idx VARCHAR(255))
             BEGIN
                 IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP INDEX \`', idx, '\`');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            // Helper procedure to add column if it doesn't exist
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            `CREATE PROCEDURE add_column_if_not_exists(IN tbl VARCHAR(255), IN col VARCHAR(255), IN col_def VARCHAR(255))
             BEGIN
                 IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` ADD COLUMN \`', col, '\` ', col_def);
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            // Helper procedure to create index if it doesn't exist
            `DROP PROCEDURE IF EXISTS create_index_if_not_exists`,
            `CREATE PROCEDURE create_index_if_not_exists(IN idx VARCHAR(255), IN tbl VARCHAR(255), IN cols VARCHAR(500), IN is_unique BOOLEAN)
             BEGIN
                 IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
                     IF is_unique THEN
                         SET @sql = CONCAT('CREATE UNIQUE INDEX \`', idx, '\` ON \`', tbl, '\` (', cols, ')');
                     ELSE
                         SET @sql = CONCAT('CREATE INDEX \`', idx, '\` ON \`', tbl, '\` (', cols, ')');
                     END IF;
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            // 1. Add tenantId and branchId to variant_barcodes (if not exists)
            `CALL add_column_if_not_exists('variant_barcodes', 'tenant_id', 'VARCHAR(191) NULL')`,
            `CALL add_column_if_not_exists('variant_barcodes', 'branch_id', 'VARCHAR(191) NULL')`,

            // 2. Populate tenant_id and branch_id from the related variant
            `UPDATE \`variant_barcodes\` vb 
             INNER JOIN \`product_variants\` pv ON vb.variant_id = pv.variant_id
             SET vb.tenant_id = pv.tenant_id, vb.branch_id = pv.branch_id
             WHERE vb.tenant_id IS NULL OR vb.branch_id IS NULL`,

            // 3. Drop existing global unique constraints (if they exist)
            `CALL drop_index_if_exists('product_variants', 'product_variants_primary_barcode_key')`,
            `CALL drop_index_if_exists('variant_barcodes', 'variant_barcodes_barcode_key')`,
            `CALL drop_index_if_exists('inventory', 'inventory_variant_id_key')`,
            `CALL drop_index_if_exists('purchase_orders', 'purchase_orders_po_number_key')`,
            `CALL drop_index_if_exists('terminals', 'terminals_terminal_code_key')`,

            // 4. Create new tenant-scoped unique indexes (if not exists)
            `CALL create_index_if_not_exists('product_variants_tenant_branch_barcode_key', 'product_variants', '\`tenant_id\`, \`branch_id\`, \`primary_barcode\`', TRUE)`,
            `CALL create_index_if_not_exists('variant_barcodes_tenant_branch_barcode_key', 'variant_barcodes', '\`tenant_id\`, \`branch_id\`, \`barcode\`', TRUE)`,
            `CALL create_index_if_not_exists('inventory_branch_variant_key', 'inventory', '\`branch_id\`, \`variant_id\`', TRUE)`,
            `CALL create_index_if_not_exists('purchase_orders_tenant_po_number_key', 'purchase_orders', '\`tenant_id\`, \`po_number\`', TRUE)`,
            `CALL create_index_if_not_exists('terminals_tenant_terminal_code_key', 'terminals', '\`tenant_id\`, \`terminal_code\`', TRUE)`,

            // 5. Add indexes for the new foreign key columns (if not exists)
            `CALL create_index_if_not_exists('idx_variant_barcodes_tenant_id', 'variant_barcodes', '\`tenant_id\`', FALSE)`,
            `CALL create_index_if_not_exists('idx_variant_barcodes_branch_id', 'variant_barcodes', '\`branch_id\`', FALSE)`,

            // 6. Add foreign key constraints for tenant and branch (using procedure for idempotence)
            `DROP PROCEDURE IF EXISTS add_fk_if_not_exists`,
            `CREATE PROCEDURE add_fk_if_not_exists(IN tbl VARCHAR(255), IN fk_name VARCHAR(255), IN col VARCHAR(255), IN ref_tbl VARCHAR(255), IN ref_col VARCHAR(255))
             BEGIN
                 IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND CONSTRAINT_NAME = fk_name AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` ADD CONSTRAINT \`', fk_name, '\` FOREIGN KEY (\`', col, '\`) REFERENCES \`', ref_tbl, '\`(\`', ref_col, '\`) ON DELETE CASCADE');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,
            `CALL add_fk_if_not_exists('variant_barcodes', 'fk_variant_barcodes_tenant', 'tenant_id', 'tenants', 'tenant_id')`,
            `CALL add_fk_if_not_exists('variant_barcodes', 'fk_variant_barcodes_branch', 'branch_id', 'branches', 'branch_id')`,

            // 7. Cleanup helper procedures
            `DROP PROCEDURE IF EXISTS drop_index_if_exists`,
            `DROP PROCEDURE IF EXISTS add_column_if_not_exists`,
            `DROP PROCEDURE IF EXISTS create_index_if_not_exists`,
            `DROP PROCEDURE IF EXISTS add_fk_if_not_exists`,
        ],
    },
    down: {
        sqlite: [
            // Reverse: drop tenant-scoped indexes, recreate global unique indexes
            `DROP INDEX IF EXISTS "product_variants_tenant_branch_barcode_key"`,
            `DROP INDEX IF EXISTS "variant_barcodes_tenant_branch_barcode_key"`,
            `DROP INDEX IF EXISTS "inventory_branch_variant_key"`,
            `DROP INDEX IF EXISTS "purchase_orders_tenant_po_number_key"`,
            `DROP INDEX IF EXISTS "terminals_tenant_terminal_code_key"`,
            `DROP INDEX IF EXISTS "idx_variant_barcodes_tenant_id"`,
            `DROP INDEX IF EXISTS "idx_variant_barcodes_branch_id"`,

            // Recreate original global unique indexes
            `CREATE UNIQUE INDEX "product_variants_primary_barcode_key" ON "product_variants" ("primary_barcode") WHERE "primary_barcode" IS NOT NULL`,
            `CREATE UNIQUE INDEX "variant_barcodes_barcode_key" ON "variant_barcodes" ("barcode")`,
            `CREATE UNIQUE INDEX "inventory_variant_id_key" ON "inventory" ("variant_id") WHERE "variant_id" IS NOT NULL`,
            `CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders" ("po_number")`,
            `CREATE UNIQUE INDEX "terminals_terminal_code_key" ON "terminals" ("terminal_code")`,

            // Note: Dropping columns in SQLite requires recreating the table, which is complex
            // We'll leave tenant_id and branch_id columns in place for the down migration
        ],
        mysql: [
            // Helper procedures for idempotent down migration
            `DROP PROCEDURE IF EXISTS drop_index_if_exists`,
            `CREATE PROCEDURE drop_index_if_exists(IN tbl VARCHAR(255), IN idx VARCHAR(255))
             BEGIN
                 IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP INDEX \`', idx, '\`');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            `DROP PROCEDURE IF EXISTS drop_fk_if_exists`,
            `CREATE PROCEDURE drop_fk_if_exists(IN tbl VARCHAR(255), IN fk_name VARCHAR(255))
             BEGIN
                 IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND CONSTRAINT_NAME = fk_name AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP FOREIGN KEY \`', fk_name, '\`');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            `DROP PROCEDURE IF EXISTS drop_column_if_exists`,
            `CREATE PROCEDURE drop_column_if_exists(IN tbl VARCHAR(255), IN col VARCHAR(255))
             BEGIN
                 IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
                     SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP COLUMN \`', col, '\`');
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            `DROP PROCEDURE IF EXISTS create_index_if_not_exists`,
            `CREATE PROCEDURE create_index_if_not_exists(IN idx VARCHAR(255), IN tbl VARCHAR(255), IN cols VARCHAR(500), IN is_unique BOOLEAN)
             BEGIN
                 IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
                     IF is_unique THEN
                         SET @sql = CONCAT('CREATE UNIQUE INDEX \`', idx, '\` ON \`', tbl, '\` (', cols, ')');
                     ELSE
                         SET @sql = CONCAT('CREATE INDEX \`', idx, '\` ON \`', tbl, '\` (', cols, ')');
                     END IF;
                     PREPARE stmt FROM @sql;
                     EXECUTE stmt;
                     DEALLOCATE PREPARE stmt;
                 END IF;
             END`,

            // Drop tenant-scoped indexes
            `CALL drop_index_if_exists('product_variants', 'product_variants_tenant_branch_barcode_key')`,
            `CALL drop_index_if_exists('variant_barcodes', 'variant_barcodes_tenant_branch_barcode_key')`,
            `CALL drop_index_if_exists('inventory', 'inventory_branch_variant_key')`,
            `CALL drop_index_if_exists('purchase_orders', 'purchase_orders_tenant_po_number_key')`,
            `CALL drop_index_if_exists('terminals', 'terminals_tenant_terminal_code_key')`,

            // Drop foreign keys and indexes for tenant/branch on variant_barcodes
            `CALL drop_fk_if_exists('variant_barcodes', 'fk_variant_barcodes_tenant')`,
            `CALL drop_fk_if_exists('variant_barcodes', 'fk_variant_barcodes_branch')`,
            `CALL drop_index_if_exists('variant_barcodes', 'idx_variant_barcodes_tenant_id')`,
            `CALL drop_index_if_exists('variant_barcodes', 'idx_variant_barcodes_branch_id')`,

            // Drop added columns
            `CALL drop_column_if_exists('variant_barcodes', 'tenant_id')`,
            `CALL drop_column_if_exists('variant_barcodes', 'branch_id')`,

            // Recreate original global unique indexes
            `CALL create_index_if_not_exists('product_variants_primary_barcode_key', 'product_variants', '\`primary_barcode\`', TRUE)`,
            `CALL create_index_if_not_exists('variant_barcodes_barcode_key', 'variant_barcodes', '\`barcode\`', TRUE)`,
            `CALL create_index_if_not_exists('inventory_variant_id_key', 'inventory', '\`variant_id\`', TRUE)`,
            `CALL create_index_if_not_exists('purchase_orders_po_number_key', 'purchase_orders', '\`po_number\`', TRUE)`,
            `CALL create_index_if_not_exists('terminals_terminal_code_key', 'terminals', '\`terminal_code\`', TRUE)`,

            // Cleanup helper procedures
            `DROP PROCEDURE IF EXISTS drop_index_if_exists`,
            `DROP PROCEDURE IF EXISTS drop_fk_if_exists`,
            `DROP PROCEDURE IF EXISTS drop_column_if_exists`,
            `DROP PROCEDURE IF EXISTS create_index_if_not_exists`,
        ],
    },
};
