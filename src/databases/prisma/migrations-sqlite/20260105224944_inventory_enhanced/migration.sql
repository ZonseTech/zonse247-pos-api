/*
  Warnings:

  - You are about to alter the column `total` on the `HoldOrder` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `discount` on the `HoldOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `price` on the `HoldOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `subtotal` on the `HoldOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `tax` on the `HoldOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `tax_rate` on the `branches` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - The primary key for the `inventory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `barcode` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `expiration_date` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `image_urls` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `is_taxable` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated_by` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `manufacture_date` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `min_stock` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `original_quantity` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `promo_end` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `promo_price` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `promo_start` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `properties` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `reorder_level` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `sell_price` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_code` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_name` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `inventory` table. All the data in the column will be lost.
  - You are about to alter the column `purchase_price` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `quantity` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `sell_price` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `monthly_price` on the `subscription_plans` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `yearly_price` on the `subscription_plans` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `tax_rate` on the `terminal_settings` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `offline_max_cumulative_amount` on the `terminals` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `offline_max_transaction_age_hours` on the `terminals` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `terminal_config_version` on the `terminals` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `change_amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `discount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `paid` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `subtotal` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `tax` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `total` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `max_discount_percent` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - The required column `inventory_id` was added to the `inventory` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Made the column `updated_at` on table `inventory` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `type` to the `payment_service_providers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "products" (
    "product_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "category_id" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary_barcode" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "selling_price" REAL NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_barcodes" (
    "product_barcode_id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcode_type" TEXT NOT NULL DEFAULT 'EAN13',
    "barcode_source" TEXT NOT NULL DEFAULT 'SUPPLIER',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "payment_terms" TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    "credit_limit" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "suppliers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "purchase_order_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "order_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_date" DATETIME,
    "received_at" DATETIME,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "received_by" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "purchase_order_item_id" TEXT NOT NULL PRIMARY KEY,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ordered_quantity" INTEGER NOT NULL DEFAULT 0,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" REAL NOT NULL DEFAULT 0.00,
    "total_price" REAL NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("purchase_order_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "stock_movement_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "movement_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "new_quantity" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "unit_cost" REAL NOT NULL DEFAULT 0.00,
    "total_cost" REAL NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "moved_by" TEXT NOT NULL,
    "movement_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_moved_by_fkey" FOREIGN KEY ("moved_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales" (
    "sale_id" TEXT NOT NULL PRIMARY KEY,
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
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "voided_at" DATETIME,
    "voided_by" TEXT,
    "void_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("method_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sale_items" (
    "sale_item_id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" REAL NOT NULL,
    "unit_cost" REAL NOT NULL DEFAULT 0.00,
    "subtotal" REAL NOT NULL,
    "tax_amount" REAL NOT NULL DEFAULT 0.00,
    "discount_amount" REAL NOT NULL DEFAULT 0.00,
    "total_amount" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_old" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT,
    "barcode" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "unit" TEXT DEFAULT 'piece',
    "cost_price" REAL NOT NULL DEFAULT 0.00,
    "sell_price" REAL NOT NULL DEFAULT 0.00,
    "promo_price" REAL,
    "promo_start" DATETIME,
    "promo_end" DATETIME,
    "quantity" TEXT DEFAULT '0',
    "reserved_quantity" INTEGER DEFAULT 0,
    "min_stock" INTEGER DEFAULT 0,
    "original_quantity" TEXT DEFAULT '0',
    "max_stock" INTEGER,
    "stock" INTEGER,
    "reorder_level" INTEGER,
    "weight" REAL,
    "dimensions" TEXT,
    "color" TEXT,
    "size" TEXT,
    "properties" JSONB,
    "status" TEXT DEFAULT 'active',
    "track_inventory" BOOLEAN DEFAULT true,
    "allow_negative_stock" BOOLEAN DEFAULT false,
    "is_taxable" BOOLEAN DEFAULT true,
    "expiration_date" DATETIME,
    "manufacture_date" DATETIME,
    "image_urls" JSONB,
    "supplier_name" TEXT,
    "supplier_code" TEXT,
    "created_by" TEXT,
    "last_updated_by" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_old_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_old_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_old_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_old_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "return_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "return_item_id" TEXT NOT NULL,
    "return_transaction_id" TEXT NOT NULL,
    "original_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "returned_quantity" REAL NOT NULL,
    "original_quantity" REAL NOT NULL,
    "return_price" REAL NOT NULL,
    "return_reason" TEXT,
    "restock_status" TEXT DEFAULT 'pending',
    "restocked_quantity" REAL DEFAULT 0.00,
    "restocked_at" DATETIME,
    "condition" TEXT,
    "notes" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HoldOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "total" REAL NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hold',
    "userId" TEXT,
    "till" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tenantId" TEXT,
    "branchId" TEXT
);
INSERT INTO "new_HoldOrder" ("branchId", "createdAt", "date", "id", "itemId", "reference", "status", "tenantId", "till", "total", "totalItems", "updatedAt", "userId") SELECT "branchId", "createdAt", "date", "id", "itemId", "reference", "status", "tenantId", "till", "total", "totalItems", "updatedAt", "userId" FROM "HoldOrder";
DROP TABLE "HoldOrder";
ALTER TABLE "new_HoldOrder" RENAME TO "HoldOrder";
CREATE UNIQUE INDEX "HoldOrder_itemId_key" ON "HoldOrder"("itemId");
CREATE UNIQUE INDEX "HoldOrder_reference_key" ON "HoldOrder"("reference");
CREATE INDEX "HoldOrder_itemId_idx" ON "HoldOrder"("itemId");
CREATE INDEX "HoldOrder_reference_idx" ON "HoldOrder"("reference");
CREATE INDEX "HoldOrder_date_idx" ON "HoldOrder"("date");
CREATE INDEX "HoldOrder_status_idx" ON "HoldOrder"("status");
CREATE INDEX "HoldOrder_userId_idx" ON "HoldOrder"("userId");
CREATE INDEX "HoldOrder_createdAt_idx" ON "HoldOrder"("createdAt");
CREATE TABLE "new_HoldOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holdOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" REAL NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "sku" TEXT,
    "barcode" TEXT,
    "unit" TEXT,
    "discount" REAL DEFAULT 0,
    "tax" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HoldOrderItem_holdOrderId_fkey" FOREIGN KEY ("holdOrderId") REFERENCES "HoldOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HoldOrderItem" ("barcode", "createdAt", "discount", "holdOrderId", "id", "price", "productId", "productName", "quantity", "sku", "subtotal", "tax", "unit") SELECT "barcode", "createdAt", "discount", "holdOrderId", "id", "price", "productId", "productName", "quantity", "sku", "subtotal", "tax", "unit" FROM "HoldOrderItem";
DROP TABLE "HoldOrderItem";
ALTER TABLE "new_HoldOrderItem" RENAME TO "HoldOrderItem";
CREATE INDEX "HoldOrderItem_holdOrderId_idx" ON "HoldOrderItem"("holdOrderId");
CREATE INDEX "HoldOrderItem_productId_idx" ON "HoldOrderItem"("productId");
CREATE TABLE "new_MRA_API_CONFIG_TABLE" (
    "config_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "environment" TEXT DEFAULT 'SANDBOX',
    "api_base_url" TEXT NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,
    "last_sync_timestamp" DATETIME,
    "sync_status" TEXT DEFAULT 'SUCCESS',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MRA_API_CONFIG_TABLE_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MRA_API_CONFIG_TABLE" ("api_base_url", "api_key", "api_secret", "config_id", "created_at", "environment", "is_active", "last_sync_timestamp", "sync_status", "tenant_id", "updated_at") SELECT "api_base_url", "api_key", "api_secret", "config_id", "created_at", "environment", "is_active", "last_sync_timestamp", "sync_status", "tenant_id", "updated_at" FROM "MRA_API_CONFIG_TABLE";
DROP TABLE "MRA_API_CONFIG_TABLE";
ALTER TABLE "new_MRA_API_CONFIG_TABLE" RENAME TO "MRA_API_CONFIG_TABLE";
CREATE UNIQUE INDEX "MRA_API_CONFIG_TABLE_tenant_id_environment_key" ON "MRA_API_CONFIG_TABLE"("tenant_id", "environment");
CREATE TABLE "new_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "log_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "user_id" TEXT,
    "terminal_id" TEXT,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changes_summary" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_method" TEXT,
    "request_url" TEXT,
    "description" TEXT,
    "synced" INTEGER DEFAULT 0,
    "severity" TEXT DEFAULT 'low',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action_type", "branch_id", "changes_summary", "created_at", "description", "entity_id", "entity_name", "entity_type", "id", "ip_address", "log_id", "new_values", "old_values", "request_method", "request_url", "severity", "synced", "tenant_id", "terminal_id", "user_agent", "user_id") SELECT "action_type", "branch_id", "changes_summary", "created_at", "description", "entity_id", "entity_name", "entity_type", "id", "ip_address", "log_id", "new_values", "old_values", "request_method", "request_url", "severity", "synced", "tenant_id", "terminal_id", "user_agent", "user_id" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE UNIQUE INDEX "audit_logs_log_id_key" ON "audit_logs"("log_id");
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");
CREATE INDEX "audit_logs_branch_id_idx" ON "audit_logs"("branch_id");
CREATE INDEX "audit_logs_tenant_id_branch_id_idx" ON "audit_logs"("tenant_id", "branch_id");
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");
CREATE INDEX "audit_logs_terminal_id_idx" ON "audit_logs"("terminal_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE TABLE "new_branch_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch_setting_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "app" TEXT,
    "store" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "country" TEXT,
    "city" TEXT,
    "contact" TEXT,
    "tax" TEXT,
    "symbol" TEXT,
    "footer" TEXT,
    "status" TEXT DEFAULT 'inactive',
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branch_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_branch_settings" ("address_line1", "address_line2", "app", "branch_id", "branch_setting_id", "city", "contact", "country", "created_at", "footer", "id", "status", "store", "symbol", "synced", "tax", "tenant_id", "terminal_id", "updated_at") SELECT "address_line1", "address_line2", "app", "branch_id", "branch_setting_id", "city", "contact", "country", "created_at", "footer", "id", "status", "store", "symbol", "synced", "tax", "tenant_id", "terminal_id", "updated_at" FROM "branch_settings";
DROP TABLE "branch_settings";
ALTER TABLE "new_branch_settings" RENAME TO "branch_settings";
CREATE UNIQUE INDEX "branch_settings_branch_setting_id_key" ON "branch_settings"("branch_setting_id");
CREATE UNIQUE INDEX "branch_settings_branch_id_key" ON "branch_settings"("branch_id");
CREATE INDEX "branch_settings_branch_id_idx" ON "branch_settings"("branch_id");
CREATE TABLE "new_branches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "site_id" TEXT,
    "site_name" TEXT,
    "description" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "address_line_3" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "currency_code" TEXT DEFAULT 'MKW',
    "currency_symbol" TEXT DEFAULT 'K',
    "tax_rate" REAL DEFAULT 0.00,
    "charge_tax" BOOLEAN DEFAULT false,
    "receipt_footer" TEXT,
    "logo_url" TEXT,
    "is_virtual_warehouse" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "synced" INTEGER DEFAULT 0,
    "mra_approval_status" TEXT DEFAULT 'PENDING',
    "mra_approval_date" DATETIME,
    "status" TEXT DEFAULT 'active',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_branches" ("address_line_1", "address_line_2", "address_line_3", "branch_code", "branch_id", "branch_name", "charge_tax", "city", "created_at", "currency_code", "currency_symbol", "description", "district", "email", "id", "is_active", "is_virtual_warehouse", "logo_url", "mra_approval_date", "mra_approval_status", "phone_number", "postal_code", "receipt_footer", "site_id", "site_name", "state", "status", "synced", "tax_rate", "tenant_id", "updated_at") SELECT "address_line_1", "address_line_2", "address_line_3", "branch_code", "branch_id", "branch_name", "charge_tax", "city", "created_at", "currency_code", "currency_symbol", "description", "district", "email", "id", "is_active", "is_virtual_warehouse", "logo_url", "mra_approval_date", "mra_approval_status", "phone_number", "postal_code", "receipt_footer", "site_id", "site_name", "state", "status", "synced", "tax_rate", "tenant_id", "updated_at" FROM "branches";
DROP TABLE "branches";
ALTER TABLE "new_branches" RENAME TO "branches";
CREATE UNIQUE INDEX "branches_branch_id_key" ON "branches"("branch_id");
CREATE INDEX "branches_branch_code_idx" ON "branches"("branch_code");
CREATE INDEX "branches_tenant_id_is_active_idx" ON "branches"("tenant_id", "is_active");
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");
CREATE UNIQUE INDEX "branches_tenant_id_branch_code_key" ON "branches"("tenant_id", "branch_code");
CREATE TABLE "new_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "item_count" INTEGER,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "categories_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "item_count", "name", "sort_order", "synced", "tenant_id", "terminal_id", "updated_at", "user_id") SELECT "branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "item_count", "name", "sort_order", "synced", "tenant_id", "terminal_id", "updated_at", "user_id" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_category_id_key" ON "categories"("category_id");
CREATE INDEX "categories_branch_id_idx" ON "categories"("branch_id");
CREATE INDEX "categories_terminal_id_idx" ON "categories"("terminal_id");
CREATE UNIQUE INDEX "categories_branch_id_name_key" ON "categories"("branch_id", "name");
CREATE TABLE "new_customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_customers" ("branch_id", "created_at", "customer_id", "id", "name", "synced", "tenant_id", "updated_at", "user_id") SELECT "branch_id", "created_at", "customer_id", "id", "name", "synced", "tenant_id", "updated_at", "user_id" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_customer_id_key" ON "customers"("customer_id");
CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id");
CREATE TABLE "new_inventory" (
    "inventory_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "average_cost" REAL NOT NULL DEFAULT 0.00,
    "last_purchase_cost" REAL NOT NULL DEFAULT 0.00,
    "reorder_point" INTEGER,
    "max_stock" INTEGER,
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
    "last_restocked_at" DATETIME,
    "last_sold_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inventory" ("allow_negative_stock", "branch_id", "created_at", "max_stock", "product_id", "reserved_quantity", "tenant_id", "track_inventory", "updated_at") SELECT coalesce("allow_negative_stock", false) AS "allow_negative_stock", "branch_id", coalesce("created_at", CURRENT_TIMESTAMP) AS "created_at", "max_stock", "product_id", coalesce("reserved_quantity", 0) AS "reserved_quantity", "tenant_id", coalesce("track_inventory", true) AS "track_inventory", "updated_at" FROM "inventory";
DROP TABLE "inventory";
ALTER TABLE "new_inventory" RENAME TO "inventory";
CREATE UNIQUE INDEX "inventory_product_id_key" ON "inventory"("product_id");
CREATE INDEX "inventory_branch_id_idx" ON "inventory"("branch_id");
CREATE INDEX "inventory_tenant_id_idx" ON "inventory"("tenant_id");
CREATE INDEX "inventory_product_id_idx" ON "inventory"("product_id");
CREATE TABLE "new_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" TEXT NOT NULL,
    "ref_number" TEXT NOT NULL,
    "transaction_id" TEXT DEFAULT '1',
    "product_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1.000,
    "purchase_price" REAL NOT NULL DEFAULT 0.00,
    "sell_price" REAL NOT NULL DEFAULT 0.00,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_orders" ("created_at", "id", "order_id", "product_id", "purchase_price", "quantity", "ref_number", "sell_price", "synced", "transaction_id", "updated_at") SELECT "created_at", "id", "order_id", "product_id", "purchase_price", "quantity", "ref_number", "sell_price", "synced", "transaction_id", "updated_at" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id");
CREATE INDEX "orders_transaction_id_idx" ON "orders"("transaction_id");
CREATE TABLE "new_payment_methods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "method_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_methods_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payment_methods" ("branch_id", "created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "synced", "tenant_id", "updated_at", "user_id") SELECT "branch_id", "created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "synced", "tenant_id", "updated_at", "user_id" FROM "payment_methods";
DROP TABLE "payment_methods";
ALTER TABLE "new_payment_methods" RENAME TO "payment_methods";
CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id");
CREATE INDEX "payment_methods_branch_id_idx" ON "payment_methods"("branch_id");
CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");
CREATE TABLE "new_payment_service_providers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "synced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME
);
INSERT INTO "new_payment_service_providers" ("createdAt", "description", "id", "isActive", "logoUrl", "name", "providerId", "sortOrder", "synced", "updatedAt", "userId") SELECT "createdAt", "description", "id", "isActive", "logoUrl", "name", "providerId", "sortOrder", "synced", "updatedAt", "userId" FROM "payment_service_providers";
DROP TABLE "payment_service_providers";
ALTER TABLE "new_payment_service_providers" RENAME TO "payment_service_providers";
CREATE UNIQUE INDEX "payment_service_providers_providerId_key" ON "payment_service_providers"("providerId");
CREATE TABLE "new_role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_permission_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_role_permissions" ("created_at", "id", "permission_id", "role_id", "role_permission_id", "synced", "updated_at") SELECT "created_at", "id", "permission_id", "role_id", "role_permission_id", "synced", "updated_at" FROM "role_permissions";
DROP TABLE "role_permissions";
ALTER TABLE "new_role_permissions" RENAME TO "role_permissions";
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role_permission_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
CREATE TABLE "new_service_provider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_provider_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_service_provider" ("branch_id", "created_at", "description", "id", "is_active", "logoUrl", "name", "provider_id", "sort_order", "synced", "tenant_id", "updated_at", "user_id") SELECT "branch_id", "created_at", "description", "id", "is_active", "logoUrl", "name", "provider_id", "sort_order", "synced", "tenant_id", "updated_at", "user_id" FROM "service_provider";
DROP TABLE "service_provider";
ALTER TABLE "new_service_provider" RENAME TO "service_provider";
CREATE UNIQUE INDEX "service_provider_provider_id_key" ON "service_provider"("provider_id");
CREATE INDEX "service_provider_branch_id_idx" ON "service_provider"("branch_id");
CREATE UNIQUE INDEX "service_provider_branch_id_name_key" ON "service_provider"("branch_id", "name");
CREATE TABLE "new_subscription_plans" (
    "subscription_plan_id" TEXT NOT NULL PRIMARY KEY,
    "plan_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthly_price" REAL NOT NULL DEFAULT 0.00,
    "yearly_price" REAL NOT NULL DEFAULT 0.00,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "is_popular" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "notes" TEXT,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_subscription_plans" ("color", "created_at", "description", "features", "is_active", "is_popular", "limits", "monthly_price", "name", "notes", "plan_code", "subscription_plan_id", "synced", "updated_at", "yearly_price") SELECT "color", "created_at", "description", "features", "is_active", "is_popular", "limits", "monthly_price", "name", "notes", "plan_code", "subscription_plan_id", "synced", "updated_at", "yearly_price" FROM "subscription_plans";
DROP TABLE "subscription_plans";
ALTER TABLE "new_subscription_plans" RENAME TO "subscription_plans";
CREATE UNIQUE INDEX "subscription_plans_plan_code_key" ON "subscription_plans"("plan_code");
CREATE TABLE "new_tenant_subscriptions" (
    "tenant_subscription_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "subscription_plan_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME,
    "auto_renew" BOOLEAN DEFAULT true,
    "payment_method" TEXT,
    "max_branches" INTEGER DEFAULT 1,
    "synced" INTEGER DEFAULT 0,
    "last_payment_date" DATETIME,
    "next_payment_date" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans" ("subscription_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tenant_subscriptions" ("auto_renew", "created_at", "ends_at", "last_payment_date", "max_branches", "next_payment_date", "payment_method", "starts_at", "status", "subscription_plan_id", "synced", "tenant_id", "tenant_subscription_id", "updated_at") SELECT "auto_renew", "created_at", "ends_at", "last_payment_date", "max_branches", "next_payment_date", "payment_method", "starts_at", "status", "subscription_plan_id", "synced", "tenant_id", "tenant_subscription_id", "updated_at" FROM "tenant_subscriptions";
DROP TABLE "tenant_subscriptions";
ALTER TABLE "new_tenant_subscriptions" RENAME TO "tenant_subscriptions";
CREATE INDEX "tenant_subscriptions_subscription_plan_id_idx" ON "tenant_subscriptions"("subscription_plan_id");
CREATE INDEX "tenant_subscriptions_tenant_id_idx" ON "tenant_subscriptions"("tenant_id");
CREATE TABLE "new_terminal_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "terminal_id" TEXT NOT NULL,
    "store_name" TEXT,
    "store_address" TEXT,
    "store_phone" TEXT,
    "store_email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MKW',
    "tax_rate" REAL NOT NULL DEFAULT 0.00,
    "business_license" TEXT,
    "business_tax_id" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en_US',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Blantyre',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "time_format" TEXT NOT NULL DEFAULT '24h',
    "pin_length" INTEGER NOT NULL DEFAULT 4,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 15,
    "auto_logout_minutes" INTEGER NOT NULL DEFAULT 30,
    "server_url" TEXT,
    "localization_settings" JSONB,
    "transaction_settings" JSONB,
    "customer_settings" JSONB,
    "receipt_settings" JSONB,
    "payment_settings" JSONB,
    "mra_compliance_settings" JSONB,
    "inventory_settings" JSONB,
    "sync_settings" JSONB,
    "security_settings" JSONB,
    "performance_settings" JSONB,
    "hardware_settings" JSONB,
    "integration_settings" JSONB,
    "workflow_settings" JSONB,
    "backup_settings" JSONB,
    "display_settings" JSONB,
    "tax_fee_settings" JSONB,
    "customer_management_settings" JSONB,
    "reporting_settings" JSONB,
    "settings_version" TEXT NOT NULL DEFAULT '2.0.0',
    "last_configured_by" TEXT,
    "configuration_date" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "terminal_settings_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_terminal_settings" ("auto_logout_minutes", "backup_settings", "business_license", "business_tax_id", "configuration_date", "created_at", "currency", "customer_management_settings", "customer_settings", "date_format", "display_settings", "hardware_settings", "id", "integration_settings", "inventory_settings", "is_active", "language", "last_configured_by", "localization_settings", "mra_compliance_settings", "payment_settings", "performance_settings", "pin_length", "receipt_settings", "reporting_settings", "security_settings", "server_url", "session_timeout_minutes", "settings_version", "store_address", "store_email", "store_name", "store_phone", "sync_settings", "tax_fee_settings", "tax_rate", "terminal_id", "time_format", "timezone", "transaction_settings", "updated_at", "workflow_settings") SELECT "auto_logout_minutes", "backup_settings", "business_license", "business_tax_id", "configuration_date", "created_at", "currency", "customer_management_settings", "customer_settings", "date_format", "display_settings", "hardware_settings", "id", "integration_settings", "inventory_settings", "is_active", "language", "last_configured_by", "localization_settings", "mra_compliance_settings", "payment_settings", "performance_settings", "pin_length", "receipt_settings", "reporting_settings", "security_settings", "server_url", "session_timeout_minutes", "settings_version", "store_address", "store_email", "store_name", "store_phone", "sync_settings", "tax_fee_settings", "tax_rate", "terminal_id", "time_format", "timezone", "transaction_settings", "updated_at", "workflow_settings" FROM "terminal_settings";
DROP TABLE "terminal_settings";
ALTER TABLE "new_terminal_settings" RENAME TO "terminal_settings";
CREATE UNIQUE INDEX "terminal_settings_terminal_id_key" ON "terminal_settings"("terminal_id");
CREATE INDEX "terminal_settings_terminal_id_idx" ON "terminal_settings"("terminal_id");
CREATE TABLE "new_terminals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "terminal_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "mra_terminal_id" TEXT,
    "terminal_code" TEXT NOT NULL,
    "terminal_label" TEXT NOT NULL,
    "terminal_position" INTEGER,
    "device_id" TEXT,
    "os_name" TEXT,
    "os_version" TEXT,
    "os_build" TEXT,
    "mac_address" TEXT,
    "pos_product_id" TEXT,
    "pos_product_version" TEXT,
    "terminal_config_version" REAL,
    "offline_max_transaction_age_hours" REAL,
    "offline_max_cumulative_amount" REAL,
    "activation_code" TEXT,
    "activation_status" TEXT DEFAULT 'PENDING',
    "activation_date" DATETIME,
    "is_primary" BOOLEAN DEFAULT false,
    "is_blocked" BOOLEAN DEFAULT false,
    "blocking_reason" TEXT,
    "blocked_at" DATETIME,
    "mra_application_status" TEXT DEFAULT 'APPLIED',
    "mra_approval_date" DATETIME,
    "last_activity" DATETIME,
    "last_sync" DATETIME,
    "last_sync_timestamp" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "registered_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terminals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "terminals_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_terminals" ("activation_code", "activation_date", "activation_status", "blocked_at", "blocking_reason", "branch_id", "created_at", "device_id", "id", "is_blocked", "is_primary", "last_activity", "last_sync", "last_sync_timestamp", "mac_address", "mra_application_status", "mra_approval_date", "mra_terminal_id", "offline_max_cumulative_amount", "offline_max_transaction_age_hours", "os_build", "os_name", "os_version", "pos_product_id", "pos_product_version", "registered_at", "synced", "tenant_id", "terminal_code", "terminal_config_version", "terminal_id", "terminal_label", "terminal_position", "updated_at") SELECT "activation_code", "activation_date", "activation_status", "blocked_at", "blocking_reason", "branch_id", "created_at", "device_id", "id", "is_blocked", "is_primary", "last_activity", "last_sync", "last_sync_timestamp", "mac_address", "mra_application_status", "mra_approval_date", "mra_terminal_id", "offline_max_cumulative_amount", "offline_max_transaction_age_hours", "os_build", "os_name", "os_version", "pos_product_id", "pos_product_version", "registered_at", "synced", "tenant_id", "terminal_code", "terminal_config_version", "terminal_id", "terminal_label", "terminal_position", "updated_at" FROM "terminals";
DROP TABLE "terminals";
ALTER TABLE "new_terminals" RENAME TO "terminals";
CREATE UNIQUE INDEX "terminals_terminal_id_key" ON "terminals"("terminal_id");
CREATE UNIQUE INDEX "terminals_mra_terminal_id_key" ON "terminals"("mra_terminal_id");
CREATE UNIQUE INDEX "terminals_terminal_code_key" ON "terminals"("terminal_code");
CREATE INDEX "terminals_activation_status_idx" ON "terminals"("activation_status");
CREATE INDEX "terminals_branch_id_idx" ON "terminals"("branch_id");
CREATE INDEX "terminals_tenant_id_branch_id_idx" ON "terminals"("tenant_id", "branch_id");
CREATE INDEX "terminals_tenant_id_idx" ON "terminals"("tenant_id");
CREATE TABLE "new_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" TEXT NOT NULL,
    "external_transaction_ref" TEXT,
    "ref_number" TEXT NOT NULL,
    "discount" REAL DEFAULT 0.00,
    "customer_id" TEXT,
    "subtotal" REAL DEFAULT 0.00,
    "tax" REAL DEFAULT 0.00,
    "date" DATETIME,
    "payment_method_id" TEXT,
    "phone_number" TEXT,
    "payment_service_provider_id" TEXT,
    "total" REAL DEFAULT 0.00,
    "paid" REAL DEFAULT 0.00,
    "change_amount" REAL DEFAULT 0.00,
    "terminal_id" TEXT,
    "user_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "status" TEXT,
    "is_refund" BOOLEAN DEFAULT false,
    "original_transaction_id" TEXT,
    "refund_reason" TEXT,
    "refunded_amount" REAL DEFAULT 0.00,
    "refunded_at" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT,
    CONSTRAINT "transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("method_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_payment_service_provider_id_fkey" FOREIGN KEY ("payment_service_provider_id") REFERENCES "payment_service_providers" ("providerId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_original_transaction_id_fkey" FOREIGN KEY ("original_transaction_id") REFERENCES "transactions" ("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("branch_id", "change_amount", "created_at", "customer_id", "date", "discount", "id", "paid", "payment_method_id", "payment_service_provider_id", "phone_number", "ref_number", "status", "subtotal", "synced", "tax", "tenant_id", "terminal_id", "total", "transaction_id", "updated_at", "user_id") SELECT "branch_id", "change_amount", "created_at", "customer_id", "date", "discount", "id", "paid", "payment_method_id", "payment_service_provider_id", "phone_number", "ref_number", "status", "subtotal", "synced", "tax", "tenant_id", "terminal_id", "total", "transaction_id", "updated_at", "user_id" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE UNIQUE INDEX "transactions_transaction_id_key" ON "transactions"("transaction_id");
CREATE INDEX "transactions_branch_id_idx" ON "transactions"("branch_id");
CREATE INDEX "transactions_customer_id_idx" ON "transactions"("customer_id");
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX "transactions_payment_method_id_idx" ON "transactions"("payment_method_id");
CREATE INDEX "transactions_payment_service_provider_id_idx" ON "transactions"("payment_service_provider_id");
CREATE INDEX "transactions_terminal_id_idx" ON "transactions"("terminal_id");
CREATE INDEX "transactions_original_transaction_id_idx" ON "transactions"("original_transaction_id");
CREATE INDEX "transactions_sale_id_idx" ON "transactions"("sale_id");
CREATE TABLE "new_user_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_permission_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "granted" BOOLEAN NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "synced" INTEGER DEFAULT 0,
    CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_permissions" ("branch_id", "created_at", "created_by", "granted", "id", "permission_id", "synced", "user_id", "user_permission_id") SELECT "branch_id", "created_at", "created_by", "granted", "id", "permission_id", "synced", "user_id", "user_permission_id" FROM "user_permissions";
DROP TABLE "user_permissions";
ALTER TABLE "new_user_permissions" RENAME TO "user_permissions";
CREATE UNIQUE INDEX "user_permissions_user_permission_id_key" ON "user_permissions"("user_permission_id");
CREATE INDEX "user_permissions_created_by_idx" ON "user_permissions"("created_by");
CREATE INDEX "user_permissions_branch_id_idx" ON "user_permissions"("branch_id");
CREATE INDEX "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_branch_id_key" ON "user_permissions"("user_id", "permission_id", "branch_id");
CREATE TABLE "new_user_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "started_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "last_activity" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "ended_at" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_sessions_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_sessions" ("created_at", "ended_at", "id", "ip_address", "is_active", "last_activity", "session_token", "started_at", "synced", "terminal_id", "updated_at", "user_agent", "user_id", "user_session_id") SELECT "created_at", "ended_at", "id", "ip_address", "is_active", "last_activity", "session_token", "started_at", "synced", "terminal_id", "updated_at", "user_agent", "user_id", "user_session_id" FROM "user_sessions";
DROP TABLE "user_sessions";
ALTER TABLE "new_user_sessions" RENAME TO "user_sessions";
CREATE UNIQUE INDEX "user_sessions_user_session_id_key" ON "user_sessions"("user_session_id");
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions"("session_token");
CREATE INDEX "user_sessions_terminal_id_idx" ON "user_sessions"("terminal_id");
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "accessible_branches" JSONB,
    "allowed_terminals" JSONB,
    "max_discount_percent" REAL DEFAULT 0.00,
    "can_override_prices" BOOLEAN DEFAULT false,
    "pin_code" TEXT,
    "current_branch_id" TEXT,
    "last_login" DATETIME,
    "last_logout" DATETIME,
    "password_changed_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "force_password_change" BOOLEAN DEFAULT false,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_current_branch_id_fkey" FOREIGN KEY ("current_branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("accessible_branches", "allowed_terminals", "branch_id", "can_override_prices", "created_at", "current_branch_id", "email", "force_password_change", "fullname", "id", "last_login", "last_logout", "max_discount_percent", "password", "password_changed_at", "phone", "pin_code", "role_id", "status", "synced", "tenant_id", "updated_at", "user_id", "username") SELECT "accessible_branches", "allowed_terminals", "branch_id", "can_override_prices", "created_at", "current_branch_id", "email", "force_password_change", "fullname", "id", "last_login", "last_logout", "max_discount_percent", "password", "password_changed_at", "phone", "pin_code", "role_id", "status", "synced", "tenant_id", "updated_at", "user_id", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");
CREATE INDEX "users_current_branch_id_idx" ON "users"("current_branch_id");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_primary_barcode_key" ON "products"("primary_barcode");

-- CreateIndex
CREATE INDEX "products_branch_id_idx" ON "products"("branch_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_primary_barcode_idx" ON "products"("primary_barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_branch_id_sku_key" ON "products"("branch_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_barcode_key" ON "product_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "product_barcodes_product_id_idx" ON "product_barcodes"("product_id");

-- CreateIndex
CREATE INDEX "product_barcodes_barcode_idx" ON "product_barcodes"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_product_id_barcode_key" ON "product_barcodes"("product_id", "barcode");

-- CreateIndex
CREATE INDEX "suppliers_branch_id_idx" ON "suppliers"("branch_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_branch_id_idx" ON "purchase_orders"("branch_id");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_product_id_key" ON "purchase_order_items"("purchase_order_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_movements_branch_id_idx" ON "stock_movements"("branch_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_movements_inventory_id_idx" ON "stock_movements"("inventory_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_date_idx" ON "stock_movements"("movement_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"("sale_number");

-- CreateIndex
CREATE INDEX "sales_branch_id_idx" ON "sales"("branch_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_idx" ON "sales"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_terminal_id_idx" ON "sales"("terminal_id");

-- CreateIndex
CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");

-- CreateIndex
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");

-- CreateIndex
CREATE INDEX "sales_sale_number_idx" ON "sales"("sale_number");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_items_sale_id_product_id_key" ON "sale_items"("sale_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_old_product_id_key" ON "inventory_old"("product_id");

-- CreateIndex
CREATE INDEX "inventory_old_created_by_idx" ON "inventory_old"("created_by");

-- CreateIndex
CREATE INDEX "inventory_old_barcode_idx" ON "inventory_old"("barcode");

-- CreateIndex
CREATE INDEX "inventory_old_branch_id_idx" ON "inventory_old"("branch_id");

-- CreateIndex
CREATE INDEX "inventory_old_category_id_idx" ON "inventory_old"("category_id");

-- CreateIndex
CREATE INDEX "inventory_old_name_idx" ON "inventory_old"("name");

-- CreateIndex
CREATE INDEX "inventory_old_status_idx" ON "inventory_old"("status");

-- CreateIndex
CREATE INDEX "inventory_old_last_updated_by_idx" ON "inventory_old"("last_updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "return_items_return_item_id_key" ON "return_items"("return_item_id");

-- CreateIndex
CREATE INDEX "return_items_return_transaction_id_idx" ON "return_items"("return_transaction_id");

-- CreateIndex
CREATE INDEX "return_items_original_order_id_idx" ON "return_items"("original_order_id");

-- CreateIndex
CREATE INDEX "return_items_product_id_idx" ON "return_items"("product_id");
