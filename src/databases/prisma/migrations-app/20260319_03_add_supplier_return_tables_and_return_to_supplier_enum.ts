/**
 * Migration: 20260319_03
 * Description: Add supplier return tables and RETURN_TO_SUPPLIER movement type
 *
 * Changes:
 * 1. Add `RETURN_TO_SUPPLIER` to StockMovementType enum
 * 2. Add `SUPPLIER_RETURN` to StockReferenceType enum
 * 3. Create `supplier_returns` table (header)
 * 4. Create `supplier_return_items` table (line items)
 * 5. Create `supplier_credit_notes` table (credit notes / payables adjustment)
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260319_03',
    description: 'Add supplier return tables and RETURN_TO_SUPPLIER movement type',
    up: {
        sqlite: [
            // 1. Create supplier_returns table
            `CREATE TABLE IF NOT EXISTS "supplier_returns" (
                "supplier_return_id" TEXT PRIMARY KEY,
                "tenant_id"          TEXT NOT NULL,
                "branch_id"          TEXT NOT NULL,
                "supplier_id"        TEXT NOT NULL,
                "purchase_order_id"  TEXT,
                "goods_receipt_id"   TEXT,
                "return_number"      TEXT NOT NULL,
                "status"             TEXT NOT NULL DEFAULT 'DRAFT',
                "return_date"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "returned_by"        TEXT NOT NULL,
                "reason"             TEXT,
                "notes"              TEXT,
                "total_amount"       REAL NOT NULL DEFAULT 0.00,
                "version"            INTEGER NOT NULL DEFAULT 1,
                "deleted_at"         DATETIME,
                "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT,
                FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("purchase_order_id") ON DELETE SET NULL,
                FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("goods_receipt_id") ON DELETE SET NULL
            )`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "uq_supplier_returns_number" ON "supplier_returns"("tenant_id", "branch_id", "return_number")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_tenant" ON "supplier_returns"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_branch" ON "supplier_returns"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_supplier" ON "supplier_returns"("supplier_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_po" ON "supplier_returns"("purchase_order_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_grn" ON "supplier_returns"("goods_receipt_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_status" ON "supplier_returns"("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_deleted" ON "supplier_returns"("deleted_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_returns_updated" ON "supplier_returns"("updated_at")`,

            // 2. Create supplier_return_items table
            `CREATE TABLE IF NOT EXISTS "supplier_return_items" (
                "supplier_return_item_id" TEXT PRIMARY KEY,
                "supplier_return_id"      TEXT NOT NULL,
                "goods_receipt_item_id"   TEXT,
                "variant_id"              TEXT NOT NULL,
                "tenant_id"               TEXT NOT NULL,
                "branch_id"               TEXT NOT NULL,
                "return_quantity"         INTEGER NOT NULL,
                "unit_cost"               REAL NOT NULL DEFAULT 0.00,
                "total_cost"              REAL NOT NULL DEFAULT 0.00,
                "reason"                  TEXT,
                "notes"                   TEXT,
                "version"                 INTEGER NOT NULL DEFAULT 1,
                "deleted_at"              DATETIME,
                "created_at"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("supplier_return_id") REFERENCES "supplier_returns"("supplier_return_id") ON DELETE CASCADE,
                FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE RESTRICT,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_return_items_return" ON "supplier_return_items"("supplier_return_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_return_items_variant" ON "supplier_return_items"("variant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_supplier_return_items_deleted" ON "supplier_return_items"("deleted_at")`,

            // 3. Create supplier_credit_notes table
            `CREATE TABLE IF NOT EXISTS "supplier_credit_notes" (
                "supplier_credit_note_id" TEXT PRIMARY KEY,
                "supplier_return_id"      TEXT NOT NULL,
                "tenant_id"               TEXT NOT NULL,
                "branch_id"               TEXT NOT NULL,
                "supplier_id"             TEXT NOT NULL,
                "credit_note_number"      TEXT NOT NULL,
                "credit_note_date"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "amount"                  REAL NOT NULL DEFAULT 0.00,
                "status"                  TEXT NOT NULL DEFAULT 'PENDING',
                "applied_to_invoice_id"   TEXT,
                "notes"                   TEXT,
                "version"                 INTEGER NOT NULL DEFAULT 1,
                "deleted_at"              DATETIME,
                "created_at"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("supplier_return_id") REFERENCES "supplier_returns"("supplier_return_id") ON DELETE CASCADE,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT,
                FOREIGN KEY ("applied_to_invoice_id") REFERENCES "supplier_invoices"("supplier_invoice_id") ON DELETE SET NULL
            )`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "uq_credit_notes_number" ON "supplier_credit_notes"("tenant_id", "branch_id", "credit_note_number")`,
            `CREATE INDEX IF NOT EXISTS "idx_credit_notes_return" ON "supplier_credit_notes"("supplier_return_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_credit_notes_supplier" ON "supplier_credit_notes"("supplier_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_credit_notes_invoice" ON "supplier_credit_notes"("applied_to_invoice_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_credit_notes_status" ON "supplier_credit_notes"("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_credit_notes_deleted" ON "supplier_credit_notes"("deleted_at")`,
        ],
        mysql: [
            // 1. Add RETURN_TO_SUPPLIER to StockMovementType enum
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`movement_type\` ENUM('PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DAMAGE','EXPIRY','OPENING_BALANCE','RETURN_TO_SUPPLIER') NOT NULL`,

            // 2. Add SUPPLIER_RETURN to StockReferenceType enum
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER','GOODS_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER','OPENING_BALANCE','SUPPLIER_RETURN') NULL`,

            // 3. Create supplier_returns table
            `CREATE TABLE IF NOT EXISTS \`supplier_returns\` (
                \`supplier_return_id\`  VARCHAR(36) NOT NULL,
                \`tenant_id\`           VARCHAR(36) NOT NULL,
                \`branch_id\`           VARCHAR(36) NOT NULL,
                \`supplier_id\`         VARCHAR(36) NOT NULL,
                \`purchase_order_id\`   VARCHAR(36) NULL,
                \`goods_receipt_id\`    VARCHAR(36) NULL,
                \`return_number\`       VARCHAR(50) NOT NULL,
                \`status\`              ENUM('DRAFT','APPROVED','SHIPPED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                \`return_date\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`returned_by\`         VARCHAR(36) NOT NULL,
                \`reason\`              TEXT NULL,
                \`notes\`               TEXT NULL,
                \`total_amount\`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`version\`             INT NOT NULL DEFAULT 1,
                \`deleted_at\`          DATETIME NULL,
                \`created_at\`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`supplier_return_id\`),
                CONSTRAINT \`fk_supplier_returns_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_supplier_returns_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_supplier_returns_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`supplier_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_supplier_returns_po\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\`(\`purchase_order_id\`) ON DELETE SET NULL,
                CONSTRAINT \`fk_supplier_returns_grn\` FOREIGN KEY (\`goods_receipt_id\`) REFERENCES \`goods_receipts\`(\`goods_receipt_id\`) ON DELETE SET NULL,
                UNIQUE KEY \`uq_supplier_returns_number\` (\`tenant_id\`, \`branch_id\`, \`return_number\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            `CREATE INDEX \`idx_supplier_returns_tenant\` ON \`supplier_returns\`(\`tenant_id\`)`,
            `CREATE INDEX \`idx_supplier_returns_branch\` ON \`supplier_returns\`(\`branch_id\`)`,
            `CREATE INDEX \`idx_supplier_returns_supplier\` ON \`supplier_returns\`(\`supplier_id\`)`,
            `CREATE INDEX \`idx_supplier_returns_po\` ON \`supplier_returns\`(\`purchase_order_id\`)`,
            `CREATE INDEX \`idx_supplier_returns_grn\` ON \`supplier_returns\`(\`goods_receipt_id\`)`,
            `CREATE INDEX \`idx_supplier_returns_status\` ON \`supplier_returns\`(\`status\`)`,
            `CREATE INDEX \`idx_supplier_returns_deleted\` ON \`supplier_returns\`(\`deleted_at\`)`,
            `CREATE INDEX \`idx_supplier_returns_updated\` ON \`supplier_returns\`(\`updated_at\`)`,
            `CREATE INDEX \`idx_supplier_returns_sync\` ON \`supplier_returns\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

            // 4. Create supplier_return_items table
            `CREATE TABLE IF NOT EXISTS \`supplier_return_items\` (
                \`supplier_return_item_id\`  VARCHAR(36) NOT NULL,
                \`supplier_return_id\`       VARCHAR(36) NOT NULL,
                \`goods_receipt_item_id\`    VARCHAR(36) NULL,
                \`variant_id\`               VARCHAR(36) NOT NULL,
                \`tenant_id\`                VARCHAR(36) NOT NULL,
                \`branch_id\`                VARCHAR(36) NOT NULL,
                \`return_quantity\`           INT NOT NULL,
                \`unit_cost\`                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`total_cost\`               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`reason\`                   TEXT NULL,
                \`notes\`                    TEXT NULL,
                \`version\`                  INT NOT NULL DEFAULT 1,
                \`deleted_at\`               DATETIME NULL,
                \`created_at\`               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`supplier_return_item_id\`),
                CONSTRAINT \`fk_sr_items_return\` FOREIGN KEY (\`supplier_return_id\`) REFERENCES \`supplier_returns\`(\`supplier_return_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_sr_items_variant\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`variant_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_sr_items_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_sr_items_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            `CREATE INDEX \`idx_sr_items_return\` ON \`supplier_return_items\`(\`supplier_return_id\`)`,
            `CREATE INDEX \`idx_sr_items_variant\` ON \`supplier_return_items\`(\`variant_id\`)`,
            `CREATE INDEX \`idx_sr_items_tenant\` ON \`supplier_return_items\`(\`tenant_id\`)`,
            `CREATE INDEX \`idx_sr_items_branch\` ON \`supplier_return_items\`(\`branch_id\`)`,
            `CREATE INDEX \`idx_sr_items_deleted\` ON \`supplier_return_items\`(\`deleted_at\`)`,
            `CREATE INDEX \`idx_sr_items_sync\` ON \`supplier_return_items\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

            // 5. Create supplier_credit_notes table
            `CREATE TABLE IF NOT EXISTS \`supplier_credit_notes\` (
                \`supplier_credit_note_id\`  VARCHAR(36) NOT NULL,
                \`supplier_return_id\`       VARCHAR(36) NOT NULL,
                \`tenant_id\`                VARCHAR(36) NOT NULL,
                \`branch_id\`                VARCHAR(36) NOT NULL,
                \`supplier_id\`              VARCHAR(36) NOT NULL,
                \`credit_note_number\`       VARCHAR(50) NOT NULL,
                \`credit_note_date\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`amount\`                   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`status\`                   ENUM('PENDING','APPLIED','CANCELLED') NOT NULL DEFAULT 'PENDING',
                \`applied_to_invoice_id\`    VARCHAR(36) NULL,
                \`notes\`                    TEXT NULL,
                \`version\`                  INT NOT NULL DEFAULT 1,
                \`deleted_at\`               DATETIME NULL,
                \`created_at\`               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`supplier_credit_note_id\`),
                CONSTRAINT \`fk_credit_notes_return\` FOREIGN KEY (\`supplier_return_id\`) REFERENCES \`supplier_returns\`(\`supplier_return_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_credit_notes_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_credit_notes_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_credit_notes_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`supplier_id\`) ON DELETE RESTRICT,
                CONSTRAINT \`fk_credit_notes_invoice\` FOREIGN KEY (\`applied_to_invoice_id\`) REFERENCES \`supplier_invoices\`(\`supplier_invoice_id\`) ON DELETE SET NULL,
                UNIQUE KEY \`uq_credit_notes_number\` (\`tenant_id\`, \`branch_id\`, \`credit_note_number\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            `CREATE INDEX \`idx_credit_notes_return\` ON \`supplier_credit_notes\`(\`supplier_return_id\`)`,
            `CREATE INDEX \`idx_credit_notes_tenant\` ON \`supplier_credit_notes\`(\`tenant_id\`)`,
            `CREATE INDEX \`idx_credit_notes_branch\` ON \`supplier_credit_notes\`(\`branch_id\`)`,
            `CREATE INDEX \`idx_credit_notes_supplier\` ON \`supplier_credit_notes\`(\`supplier_id\`)`,
            `CREATE INDEX \`idx_credit_notes_invoice\` ON \`supplier_credit_notes\`(\`applied_to_invoice_id\`)`,
            `CREATE INDEX \`idx_credit_notes_status\` ON \`supplier_credit_notes\`(\`status\`)`,
            `CREATE INDEX \`idx_credit_notes_deleted\` ON \`supplier_credit_notes\`(\`deleted_at\`)`,
            `CREATE INDEX \`idx_credit_notes_sync\` ON \`supplier_credit_notes\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,
        ],
    },
};
