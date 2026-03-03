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
            // 1. Add tenantId and branchId to variant_barcodes
            `ALTER TABLE \`variant_barcodes\` ADD COLUMN \`tenant_id\` VARCHAR(191) NULL`,
            `ALTER TABLE \`variant_barcodes\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL`,

            // 2. Populate tenant_id and branch_id from the related variant
            `UPDATE \`variant_barcodes\` vb 
             INNER JOIN \`product_variants\` pv ON vb.variant_id = pv.variant_id
             SET vb.tenant_id = pv.tenant_id, vb.branch_id = pv.branch_id`,

            // 3. Drop existing global unique constraints
            // ProductVariant: drop unique on primary_barcode
            `ALTER TABLE \`product_variants\` DROP INDEX \`product_variants_primary_barcode_key\``,

            // VariantBarcode: drop unique on barcode
            `ALTER TABLE \`variant_barcodes\` DROP INDEX \`variant_barcodes_barcode_key\``,

            // Inventory: drop unique on variant_id
            `ALTER TABLE \`inventory\` DROP INDEX \`inventory_variant_id_key\``,

            // PurchaseOrder: drop unique on po_number
            `ALTER TABLE \`purchase_orders\` DROP INDEX \`purchase_orders_po_number_key\``,

            // Terminal: drop unique on terminal_code
            `ALTER TABLE \`terminals\` DROP INDEX \`terminals_terminal_code_key\``,

            // 4. Create new tenant-scoped unique indexes
            // ProductVariant: @@unique([tenantId, branchId, primaryBarcode])
            `CREATE UNIQUE INDEX \`product_variants_tenant_branch_barcode_key\` 
             ON \`product_variants\` (\`tenant_id\`, \`branch_id\`, \`primary_barcode\`)`,

            // VariantBarcode: @@unique([tenantId, branchId, barcode])
            `CREATE UNIQUE INDEX \`variant_barcodes_tenant_branch_barcode_key\` 
             ON \`variant_barcodes\` (\`tenant_id\`, \`branch_id\`, \`barcode\`)`,

            // Inventory: @@unique([branchId, variantId])
            `CREATE UNIQUE INDEX \`inventory_branch_variant_key\` 
             ON \`inventory\` (\`branch_id\`, \`variant_id\`)`,

            // PurchaseOrder: @@unique([tenantId, poNumber])
            `CREATE UNIQUE INDEX \`purchase_orders_tenant_po_number_key\` 
             ON \`purchase_orders\` (\`tenant_id\`, \`po_number\`)`,

            // Terminal: @@unique([tenantId, terminalCode])
            `CREATE UNIQUE INDEX \`terminals_tenant_terminal_code_key\` 
             ON \`terminals\` (\`tenant_id\`, \`terminal_code\`)`,

            // 5. Add indexes for the new foreign key columns
            `CREATE INDEX \`idx_variant_barcodes_tenant_id\` ON \`variant_barcodes\` (\`tenant_id\`)`,
            `CREATE INDEX \`idx_variant_barcodes_branch_id\` ON \`variant_barcodes\` (\`branch_id\`)`,

            // 6. Add foreign key constraints for tenant and branch
            `ALTER TABLE \`variant_barcodes\` 
             ADD CONSTRAINT \`fk_variant_barcodes_tenant\` 
             FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE`,
            `ALTER TABLE \`variant_barcodes\` 
             ADD CONSTRAINT \`fk_variant_barcodes_branch\` 
             FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE`,
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
            // Drop tenant-scoped indexes
            `ALTER TABLE \`product_variants\` DROP INDEX \`product_variants_tenant_branch_barcode_key\``,
            `ALTER TABLE \`variant_barcodes\` DROP INDEX \`variant_barcodes_tenant_branch_barcode_key\``,
            `ALTER TABLE \`inventory\` DROP INDEX \`inventory_branch_variant_key\``,
            `ALTER TABLE \`purchase_orders\` DROP INDEX \`purchase_orders_tenant_po_number_key\``,
            `ALTER TABLE \`terminals\` DROP INDEX \`terminals_tenant_terminal_code_key\``,

            // Drop foreign keys and indexes for tenant/branch on variant_barcodes
            `ALTER TABLE \`variant_barcodes\` DROP FOREIGN KEY \`fk_variant_barcodes_tenant\``,
            `ALTER TABLE \`variant_barcodes\` DROP FOREIGN KEY \`fk_variant_barcodes_branch\``,
            `ALTER TABLE \`variant_barcodes\` DROP INDEX \`idx_variant_barcodes_tenant_id\``,
            `ALTER TABLE \`variant_barcodes\` DROP INDEX \`idx_variant_barcodes_branch_id\``,

            // Drop added columns
            `ALTER TABLE \`variant_barcodes\` DROP COLUMN \`tenant_id\``,
            `ALTER TABLE \`variant_barcodes\` DROP COLUMN \`branch_id\``,

            // Recreate original global unique indexes
            `CREATE UNIQUE INDEX \`product_variants_primary_barcode_key\` ON \`product_variants\` (\`primary_barcode\`)`,
            `CREATE UNIQUE INDEX \`variant_barcodes_barcode_key\` ON \`variant_barcodes\` (\`barcode\`)`,
            `CREATE UNIQUE INDEX \`inventory_variant_id_key\` ON \`inventory\` (\`variant_id\`)`,
            `CREATE UNIQUE INDEX \`purchase_orders_po_number_key\` ON \`purchase_orders\` (\`po_number\`)`,
            `CREATE UNIQUE INDEX \`terminals_terminal_code_key\` ON \`terminals\` (\`terminal_code\`)`,
        ],
    },
};
