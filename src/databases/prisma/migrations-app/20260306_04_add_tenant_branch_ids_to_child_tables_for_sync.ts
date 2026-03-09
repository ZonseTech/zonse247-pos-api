/**
 * Migration: 20260306_04
 * Description: Add tenantId and branchId to child tables for multi-terminal sync
 * 
 * Child records (SaleItem, SalePayment, PurchaseOrderItem, ParkedSaleItem, PaymentMethod)
 * need tenantId and branchId to support independent sync queries without JOINs.
 * 
 * Also adds updatedAt to ParkedSaleItem which was missing.
 * 
 * For MySQL: Simple ALTER TABLE ADD COLUMN
 * For SQLite: Table recreation required
 */

import { Migration } from '../migration.types';

// ============================================
// MySQL: Simple ADD COLUMN statements
// ============================================
const mysqlStatements = [
    // SaleItem - add tenantId and branchId
    `ALTER TABLE \`sale_items\` ADD COLUMN \`tenant_id\` VARCHAR(191) NULL AFTER \`sale_item_id\``,
    `ALTER TABLE \`sale_items\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL AFTER \`tenant_id\``,
    `CREATE INDEX \`sale_items_tenant_id_idx\` ON \`sale_items\`(\`tenant_id\`)`,
    `CREATE INDEX \`sale_items_branch_id_idx\` ON \`sale_items\`(\`branch_id\`)`,
    `CREATE INDEX \`sale_items_tenant_id_branch_id_updated_at_idx\` ON \`sale_items\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

    // Populate SaleItem tenantId and branchId from parent Sale
    `UPDATE \`sale_items\` si 
     JOIN \`sales\` s ON si.sale_id = s.sale_id 
     SET si.tenant_id = s.tenant_id, si.branch_id = s.branch_id`,

    // Make columns NOT NULL after population
    `ALTER TABLE \`sale_items\` MODIFY COLUMN \`tenant_id\` VARCHAR(191) NOT NULL`,
    `ALTER TABLE \`sale_items\` MODIFY COLUMN \`branch_id\` VARCHAR(191) NOT NULL`,

    // SalePayment - add tenantId and branchId
    `ALTER TABLE \`sale_payments\` ADD COLUMN \`tenant_id\` VARCHAR(191) NULL AFTER \`sale_payment_id\``,
    `ALTER TABLE \`sale_payments\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL AFTER \`tenant_id\``,
    `CREATE INDEX \`sale_payments_tenant_id_idx\` ON \`sale_payments\`(\`tenant_id\`)`,
    `CREATE INDEX \`sale_payments_branch_id_idx\` ON \`sale_payments\`(\`branch_id\`)`,
    `CREATE INDEX \`sale_payments_tenant_id_branch_id_updated_at_idx\` ON \`sale_payments\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

    // Populate SalePayment tenantId and branchId from parent Sale
    `UPDATE \`sale_payments\` sp 
     JOIN \`sales\` s ON sp.sale_id = s.sale_id 
     SET sp.tenant_id = s.tenant_id, sp.branch_id = s.branch_id`,

    // Make columns NOT NULL after population
    `ALTER TABLE \`sale_payments\` MODIFY COLUMN \`tenant_id\` VARCHAR(191) NOT NULL`,
    `ALTER TABLE \`sale_payments\` MODIFY COLUMN \`branch_id\` VARCHAR(191) NOT NULL`,

    // PurchaseOrderItem - add tenantId and branchId
    `ALTER TABLE \`purchase_order_items\` ADD COLUMN \`tenant_id\` VARCHAR(191) NULL AFTER \`purchase_order_item_id\``,
    `ALTER TABLE \`purchase_order_items\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL AFTER \`tenant_id\``,
    `CREATE INDEX \`purchase_order_items_tenant_id_idx\` ON \`purchase_order_items\`(\`tenant_id\`)`,
    `CREATE INDEX \`purchase_order_items_branch_id_idx\` ON \`purchase_order_items\`(\`branch_id\`)`,
    `CREATE INDEX \`purchase_order_items_tenant_id_branch_id_updated_at_idx\` ON \`purchase_order_items\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

    // Populate PurchaseOrderItem tenantId and branchId from parent PurchaseOrder
    `UPDATE \`purchase_order_items\` poi 
     JOIN \`purchase_orders\` po ON poi.purchase_order_id = po.purchase_order_id 
     SET poi.tenant_id = po.tenant_id, poi.branch_id = po.branch_id`,

    // Make columns NOT NULL after population
    `ALTER TABLE \`purchase_order_items\` MODIFY COLUMN \`tenant_id\` VARCHAR(191) NOT NULL`,
    `ALTER TABLE \`purchase_order_items\` MODIFY COLUMN \`branch_id\` VARCHAR(191) NOT NULL`,

    // ParkedSaleItem - add tenantId, branchId, and updatedAt
    `ALTER TABLE \`parked_sale_items\` ADD COLUMN \`tenant_id\` VARCHAR(191) NULL AFTER \`parked_sale_item_id\``,
    `ALTER TABLE \`parked_sale_items\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL AFTER \`tenant_id\``,
    `ALTER TABLE \`parked_sale_items\` ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER \`created_at\``,
    `CREATE INDEX \`parked_sale_items_tenant_id_idx\` ON \`parked_sale_items\`(\`tenant_id\`)`,
    `CREATE INDEX \`parked_sale_items_branch_id_idx\` ON \`parked_sale_items\`(\`branch_id\`)`,
    `CREATE INDEX \`parked_sale_items_updated_at_idx\` ON \`parked_sale_items\`(\`updated_at\`)`,
    `CREATE INDEX \`parked_sale_items_tenant_id_branch_id_updated_at_idx\` ON \`parked_sale_items\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

    // Populate ParkedSaleItem tenantId and branchId from parent ParkedSale
    `UPDATE \`parked_sale_items\` psi 
     JOIN \`parked_sales\` ps ON psi.parked_sale_id = ps.parked_sale_id 
     SET psi.tenant_id = ps.tenant_id, psi.branch_id = ps.branch_id`,

    // Make columns NOT NULL after population
    `ALTER TABLE \`parked_sale_items\` MODIFY COLUMN \`tenant_id\` VARCHAR(191) NOT NULL`,
    `ALTER TABLE \`parked_sale_items\` MODIFY COLUMN \`branch_id\` VARCHAR(191) NOT NULL`,

    // PaymentMethod - add tenantId and branchId
    // PaymentMethod is branch-scoped, so we need to handle existing data carefully
    // For existing data without branch context, we'll set a placeholder that must be updated
    `ALTER TABLE \`payment_methods\` ADD COLUMN \`tenant_id\` VARCHAR(191) NULL AFTER \`method_id\``,
    `ALTER TABLE \`payment_methods\` ADD COLUMN \`branch_id\` VARCHAR(191) NULL AFTER \`tenant_id\``,
    `CREATE INDEX \`payment_methods_tenant_id_idx\` ON \`payment_methods\`(\`tenant_id\`)`,
    `CREATE INDEX \`payment_methods_branch_id_idx\` ON \`payment_methods\`(\`branch_id\`)`,
    `CREATE INDEX \`payment_methods_tenant_id_branch_id_updated_at_idx\` ON \`payment_methods\`(\`tenant_id\`, \`branch_id\`, \`updated_at\`)`,

    // Note: PaymentMethod doesn't have a parent to copy from - existing records will have NULL
    // Application code should handle this by requiring tenantId/branchId for new records
];

// ============================================
// SQLite: Table recreation with new columns
// ============================================
const sqliteStatements: string[] = [
    `PRAGMA foreign_keys=OFF`,

    // ========== sale_items - add tenant_id and branch_id ==========
    `CREATE TABLE "sale_items_new" (
        "sale_item_id" TEXT NOT NULL PRIMARY KEY,
        "tenant_id" TEXT NOT NULL DEFAULT '',
        "branch_id" TEXT NOT NULL DEFAULT '',
        "sale_id" TEXT NOT NULL,
        "product_id" TEXT NOT NULL,
        "variant_id" TEXT NOT NULL,
        "terminal_id" TEXT,
        "quantity" INTEGER NOT NULL,
        "unit_price" REAL NOT NULL,
        "unit_cost" REAL NOT NULL DEFAULT 0.00,
        "subtotal" REAL NOT NULL,
        "tax_amount" REAL NOT NULL DEFAULT 0.00,
        "discount_amount" REAL NOT NULL DEFAULT 0.00,
        "total_amount" REAL NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "deleted_at" DATETIME,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `INSERT INTO "sale_items_new" (sale_item_id, tenant_id, branch_id, sale_id, product_id, variant_id, terminal_id, quantity, unit_price, unit_cost, subtotal, tax_amount, discount_amount, total_amount, version, deleted_at, created_at, updated_at)
     SELECT si.sale_item_id, COALESCE(s.tenant_id, ''), COALESCE(s.branch_id, ''), si.sale_id, si.product_id, si.variant_id, si.terminal_id, si.quantity, si.unit_price, si.unit_cost, si.subtotal, si.tax_amount, si.discount_amount, si.total_amount, si.version, si.deleted_at, si.created_at, si.updated_at
     FROM "sale_items" si
     LEFT JOIN "sales" s ON si.sale_id = s.sale_id`,
    `DROP TABLE "sale_items"`,
    `ALTER TABLE "sale_items_new" RENAME TO "sale_items"`,
    `CREATE UNIQUE INDEX "unique_sale_variant" ON "sale_items"("sale_id", "variant_id")`,
    `CREATE INDEX "sale_items_tenant_id_idx" ON "sale_items"("tenant_id")`,
    `CREATE INDEX "sale_items_branch_id_idx" ON "sale_items"("branch_id")`,
    `CREATE INDEX "sale_items_tenant_id_branch_id_updated_at_idx" ON "sale_items"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id")`,
    `CREATE INDEX "sale_items_variant_id_idx" ON "sale_items"("variant_id")`,
    `CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id")`,
    `CREATE INDEX "sale_items_updated_at_idx" ON "sale_items"("updated_at")`,
    `CREATE INDEX "sale_items_deleted_at_idx" ON "sale_items"("deleted_at")`,

    // ========== sale_payments - add tenant_id and branch_id ==========
    `CREATE TABLE "sale_payments_new" (
        "sale_payment_id" TEXT NOT NULL PRIMARY KEY,
        "tenant_id" TEXT NOT NULL DEFAULT '',
        "branch_id" TEXT NOT NULL DEFAULT '',
        "sale_id" TEXT NOT NULL,
        "payment_method_id" TEXT NOT NULL,
        "terminal_id" TEXT,
        "amount" REAL NOT NULL,
        "reference" TEXT,
        "provider_id" TEXT,
        "provider_ref" TEXT,
        "status" TEXT NOT NULL DEFAULT 'COMPLETED',
        "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        "last_synced_at" DATETIME,
        "version" INTEGER NOT NULL DEFAULT 1,
        "deleted_at" DATETIME,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "sale_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("method_id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `INSERT INTO "sale_payments_new" (sale_payment_id, tenant_id, branch_id, sale_id, payment_method_id, terminal_id, amount, reference, provider_id, provider_ref, status, processed_at, notes, last_synced_at, version, deleted_at, created_at, updated_at)
     SELECT sp.sale_payment_id, COALESCE(s.tenant_id, ''), COALESCE(s.branch_id, ''), sp.sale_id, sp.payment_method_id, sp.terminal_id, sp.amount, sp.reference, sp.provider_id, sp.provider_ref, sp.status, sp.processed_at, sp.notes, sp.last_synced_at, sp.version, sp.deleted_at, sp.created_at, sp.updated_at
     FROM "sale_payments" sp
     LEFT JOIN "sales" s ON sp.sale_id = s.sale_id`,
    `DROP TABLE "sale_payments"`,
    `ALTER TABLE "sale_payments_new" RENAME TO "sale_payments"`,
    `CREATE INDEX "sale_payments_tenant_id_idx" ON "sale_payments"("tenant_id")`,
    `CREATE INDEX "sale_payments_branch_id_idx" ON "sale_payments"("branch_id")`,
    `CREATE INDEX "sale_payments_tenant_id_branch_id_updated_at_idx" ON "sale_payments"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id")`,
    `CREATE INDEX "sale_payments_payment_method_id_idx" ON "sale_payments"("payment_method_id")`,
    `CREATE INDEX "sale_payments_status_idx" ON "sale_payments"("status")`,
    `CREATE INDEX "sale_payments_processed_at_idx" ON "sale_payments"("processed_at")`,
    `CREATE INDEX "sale_payments_updated_at_idx" ON "sale_payments"("updated_at")`,
    `CREATE INDEX "sale_payments_deleted_at_idx" ON "sale_payments"("deleted_at")`,

    // ========== purchase_order_items - add tenant_id and branch_id ==========
    `CREATE TABLE "purchase_order_items_new" (
        "purchase_order_item_id" TEXT NOT NULL PRIMARY KEY,
        "tenant_id" TEXT NOT NULL DEFAULT '',
        "branch_id" TEXT NOT NULL DEFAULT '',
        "purchase_order_id" TEXT NOT NULL,
        "variant_id" TEXT NOT NULL,
        "terminal_id" TEXT,
        "ordered_quantity" INTEGER NOT NULL DEFAULT 0,
        "received_quantity" INTEGER NOT NULL DEFAULT 0,
        "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
        "unit_price" REAL NOT NULL DEFAULT 0.00,
        "total_price" REAL NOT NULL DEFAULT 0.00,
        "notes" TEXT,
        "version" INTEGER NOT NULL DEFAULT 1,
        "deleted_at" DATETIME,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("purchase_order_id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `INSERT INTO "purchase_order_items_new" (purchase_order_item_id, tenant_id, branch_id, purchase_order_id, variant_id, terminal_id, ordered_quantity, received_quantity, damaged_quantity, unit_price, total_price, notes, version, deleted_at, created_at, updated_at)
     SELECT poi.purchase_order_item_id, COALESCE(po.tenant_id, ''), COALESCE(po.branch_id, ''), poi.purchase_order_id, poi.variant_id, poi.terminal_id, poi.ordered_quantity, poi.received_quantity, poi.damaged_quantity, poi.unit_price, poi.total_price, poi.notes, poi.version, poi.deleted_at, poi.created_at, poi.updated_at
     FROM "purchase_order_items" poi
     LEFT JOIN "purchase_orders" po ON poi.purchase_order_id = po.purchase_order_id`,
    `DROP TABLE "purchase_order_items"`,
    `ALTER TABLE "purchase_order_items_new" RENAME TO "purchase_order_items"`,
    `CREATE UNIQUE INDEX "unique_po_variant" ON "purchase_order_items"("purchase_order_id", "variant_id")`,
    `CREATE INDEX "purchase_order_items_tenant_id_idx" ON "purchase_order_items"("tenant_id")`,
    `CREATE INDEX "purchase_order_items_branch_id_idx" ON "purchase_order_items"("branch_id")`,
    `CREATE INDEX "purchase_order_items_tenant_id_branch_id_updated_at_idx" ON "purchase_order_items"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id")`,
    `CREATE INDEX "purchase_order_items_variant_id_idx" ON "purchase_order_items"("variant_id")`,
    `CREATE INDEX "purchase_order_items_updated_at_idx" ON "purchase_order_items"("updated_at")`,
    `CREATE INDEX "purchase_order_items_deleted_at_idx" ON "purchase_order_items"("deleted_at")`,

    // ========== parked_sale_items - add tenant_id, branch_id, and updated_at ==========
    `CREATE TABLE "parked_sale_items_new" (
        "parked_sale_item_id" TEXT NOT NULL PRIMARY KEY,
        "tenant_id" TEXT NOT NULL DEFAULT '',
        "branch_id" TEXT NOT NULL DEFAULT '',
        "parked_sale_id" TEXT NOT NULL,
        "product_id" TEXT NOT NULL,
        "category_id" TEXT,
        "terminal_id" TEXT,
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
        "version" INTEGER NOT NULL DEFAULT 1,
        "deleted_at" DATETIME,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "parked_sale_items_parked_sale_id_fkey" FOREIGN KEY ("parked_sale_id") REFERENCES "parked_sales" ("parked_sale_id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `INSERT INTO "parked_sale_items_new" (parked_sale_item_id, tenant_id, branch_id, parked_sale_id, product_id, category_id, terminal_id, name, barcode, sku, unit, quantity, unit_price, sell_price, purchase_price, discount, tax_amount, subtotal, version, deleted_at, created_at, updated_at)
     SELECT psi.parked_sale_item_id, COALESCE(ps.tenant_id, ''), COALESCE(ps.branch_id, ''), psi.parked_sale_id, psi.product_id, psi.category_id, psi.terminal_id, psi.name, psi.barcode, psi.sku, psi.unit, psi.quantity, psi.unit_price, psi.sell_price, psi.purchase_price, psi.discount, psi.tax_amount, psi.subtotal, psi.version, psi.deleted_at, psi.created_at, psi.created_at
     FROM "parked_sale_items" psi
     LEFT JOIN "parked_sales" ps ON psi.parked_sale_id = ps.parked_sale_id`,
    `DROP TABLE "parked_sale_items"`,
    `ALTER TABLE "parked_sale_items_new" RENAME TO "parked_sale_items"`,
    `CREATE INDEX "parked_sale_items_tenant_id_idx" ON "parked_sale_items"("tenant_id")`,
    `CREATE INDEX "parked_sale_items_branch_id_idx" ON "parked_sale_items"("branch_id")`,
    `CREATE INDEX "parked_sale_items_tenant_id_branch_id_updated_at_idx" ON "parked_sale_items"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "parked_sale_items_parked_sale_id_idx" ON "parked_sale_items"("parked_sale_id")`,
    `CREATE INDEX "parked_sale_items_product_id_idx" ON "parked_sale_items"("product_id")`,
    `CREATE INDEX "parked_sale_items_category_id_idx" ON "parked_sale_items"("category_id")`,
    `CREATE INDEX "parked_sale_items_updated_at_idx" ON "parked_sale_items"("updated_at")`,
    `CREATE INDEX "parked_sale_items_deleted_at_idx" ON "parked_sale_items"("deleted_at")`,

    // ========== payment_methods - add tenant_id and branch_id ==========
    `CREATE TABLE "payment_methods_new" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "method_id" TEXT NOT NULL,
        "tenant_id" TEXT NOT NULL DEFAULT '',
        "branch_id" TEXT NOT NULL DEFAULT '',
        "terminal_id" TEXT,
        "name" TEXT NOT NULL,
        "is_active" INTEGER DEFAULT 1,
        "icon" TEXT,
        "sort_order" INTEGER DEFAULT 0,
        "last_synced_at" DATETIME,
        "version" INTEGER NOT NULL DEFAULT 1,
        "deleted_at" DATETIME,
        "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `INSERT INTO "payment_methods_new" (id, method_id, tenant_id, branch_id, terminal_id, name, is_active, icon, sort_order, last_synced_at, version, deleted_at, created_at, updated_at)
     SELECT id, method_id, '', '', terminal_id, name, is_active, icon, sort_order, last_synced_at, version, deleted_at, created_at, updated_at
     FROM "payment_methods"`,
    `DROP TABLE "payment_methods"`,
    `ALTER TABLE "payment_methods_new" RENAME TO "payment_methods"`,
    `CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id")`,
    `CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id")`,
    `CREATE INDEX "payment_methods_branch_id_idx" ON "payment_methods"("branch_id")`,
    `CREATE INDEX "payment_methods_tenant_id_branch_id_updated_at_idx" ON "payment_methods"("tenant_id", "branch_id", "updated_at")`,
    `CREATE INDEX "payment_methods_updated_at_idx" ON "payment_methods"("updated_at")`,
    `CREATE INDEX "payment_methods_deleted_at_idx" ON "payment_methods"("deleted_at")`,

    `PRAGMA foreign_keys=ON`,
];

export const migration: Migration = {
    version: '20260306_04',
    description: 'Add tenantId and branchId to child tables (SaleItem, SalePayment, PurchaseOrderItem, ParkedSaleItem, PaymentMethod) for multi-terminal sync',
    up: {
        sqlite: sqliteStatements,
        mysql: mysqlStatements,
    },
    down: {
        sqlite: [
            // Reverting in SQLite would require table recreation without the columns - complex
            // For simplicity, just dropping indexes and leaving columns (they'll be ignored)
            `DROP INDEX IF EXISTS "sale_items_tenant_id_idx"`,
            `DROP INDEX IF EXISTS "sale_items_branch_id_idx"`,
            `DROP INDEX IF EXISTS "sale_items_tenant_id_branch_id_updated_at_idx"`,
            `DROP INDEX IF EXISTS "sale_payments_tenant_id_idx"`,
            `DROP INDEX IF EXISTS "sale_payments_branch_id_idx"`,
            `DROP INDEX IF EXISTS "sale_payments_tenant_id_branch_id_updated_at_idx"`,
            `DROP INDEX IF EXISTS "purchase_order_items_tenant_id_idx"`,
            `DROP INDEX IF EXISTS "purchase_order_items_branch_id_idx"`,
            `DROP INDEX IF EXISTS "purchase_order_items_tenant_id_branch_id_updated_at_idx"`,
            `DROP INDEX IF EXISTS "parked_sale_items_tenant_id_idx"`,
            `DROP INDEX IF EXISTS "parked_sale_items_branch_id_idx"`,
            `DROP INDEX IF EXISTS "parked_sale_items_tenant_id_branch_id_updated_at_idx"`,
            `DROP INDEX IF EXISTS "parked_sale_items_updated_at_idx"`,
            `DROP INDEX IF EXISTS "payment_methods_tenant_id_idx"`,
            `DROP INDEX IF EXISTS "payment_methods_branch_id_idx"`,
            `DROP INDEX IF EXISTS "payment_methods_tenant_id_branch_id_updated_at_idx"`,
        ],
        mysql: [
            `DROP INDEX \`sale_items_tenant_id_idx\` ON \`sale_items\``,
            `DROP INDEX \`sale_items_branch_id_idx\` ON \`sale_items\``,
            `DROP INDEX \`sale_items_tenant_id_branch_id_updated_at_idx\` ON \`sale_items\``,
            `ALTER TABLE \`sale_items\` DROP COLUMN \`tenant_id\``,
            `ALTER TABLE \`sale_items\` DROP COLUMN \`branch_id\``,

            `DROP INDEX \`sale_payments_tenant_id_idx\` ON \`sale_payments\``,
            `DROP INDEX \`sale_payments_branch_id_idx\` ON \`sale_payments\``,
            `DROP INDEX \`sale_payments_tenant_id_branch_id_updated_at_idx\` ON \`sale_payments\``,
            `ALTER TABLE \`sale_payments\` DROP COLUMN \`tenant_id\``,
            `ALTER TABLE \`sale_payments\` DROP COLUMN \`branch_id\``,

            `DROP INDEX \`purchase_order_items_tenant_id_idx\` ON \`purchase_order_items\``,
            `DROP INDEX \`purchase_order_items_branch_id_idx\` ON \`purchase_order_items\``,
            `DROP INDEX \`purchase_order_items_tenant_id_branch_id_updated_at_idx\` ON \`purchase_order_items\``,
            `ALTER TABLE \`purchase_order_items\` DROP COLUMN \`tenant_id\``,
            `ALTER TABLE \`purchase_order_items\` DROP COLUMN \`branch_id\``,

            `DROP INDEX \`parked_sale_items_tenant_id_idx\` ON \`parked_sale_items\``,
            `DROP INDEX \`parked_sale_items_branch_id_idx\` ON \`parked_sale_items\``,
            `DROP INDEX \`parked_sale_items_tenant_id_branch_id_updated_at_idx\` ON \`parked_sale_items\``,
            `DROP INDEX \`parked_sale_items_updated_at_idx\` ON \`parked_sale_items\``,
            `ALTER TABLE \`parked_sale_items\` DROP COLUMN \`tenant_id\``,
            `ALTER TABLE \`parked_sale_items\` DROP COLUMN \`branch_id\``,
            `ALTER TABLE \`parked_sale_items\` DROP COLUMN \`updated_at\``,

            `DROP INDEX \`payment_methods_tenant_id_idx\` ON \`payment_methods\``,
            `DROP INDEX \`payment_methods_branch_id_idx\` ON \`payment_methods\``,
            `DROP INDEX \`payment_methods_tenant_id_branch_id_updated_at_idx\` ON \`payment_methods\``,
            `ALTER TABLE \`payment_methods\` DROP COLUMN \`tenant_id\``,
            `ALTER TABLE \`payment_methods\` DROP COLUMN \`branch_id\``,
        ],
    },
};
