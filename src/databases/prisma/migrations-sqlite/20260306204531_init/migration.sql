/*
  Warnings:

  - You are about to drop the `tenant_subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `synced` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `branch_settings` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `inventory_old` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `parked_sales` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `payment_service_providers` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `printers` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `return_items` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `sale_payments` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `service_provider` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `staff` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_plan` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_status` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `trial_ends_at` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `terminals` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `user_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `user_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `users` table. All the data in the column will be lost.
  - Added the required column `branch_id` to the `parked_sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `parked_sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `parked_sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch_id` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch_id` to the `purchase_order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `purchase_order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch_id` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch_id` to the `sale_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `sale_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch_id` to the `variant_barcodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `variant_barcodes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tenant_subscriptions_tenant_id_idx";

-- DropIndex
DROP INDEX "tenant_subscriptions_subscription_plan_id_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "tenant_subscriptions";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "branch_subscriptions" (
    "branch_subscription_id" TEXT NOT NULL PRIMARY KEY,
    "subscription_plan_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME,
    "auto_renew" BOOLEAN DEFAULT true,
    "payment_method" TEXT,
    "last_payment_date" DATETIME,
    "next_payment_date" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branch_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans" ("subscription_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "progress_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "current_step" TEXT NOT NULL DEFAULT 'TERMINAL_ACTIVATION',
    "overall_status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 8,
    "last_updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "onboarding_steps" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "step_id" TEXT NOT NULL,
    "progress_id" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step_order" INTEGER NOT NULL,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "onboarding_steps_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "onboarding_progress" ("progress_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "severity" TEXT DEFAULT 'low',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action_type", "branch_id", "changes_summary", "created_at", "description", "entity_id", "entity_name", "entity_type", "id", "ip_address", "log_id", "new_values", "old_values", "request_method", "request_url", "severity", "tenant_id", "terminal_id", "user_agent", "user_id") SELECT "action_type", "branch_id", "changes_summary", "created_at", "description", "entity_id", "entity_name", "entity_type", "id", "ip_address", "log_id", "new_values", "old_values", "request_method", "request_url", "severity", "tenant_id", "terminal_id", "user_agent", "user_id" FROM "audit_logs";
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
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branch_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_branch_settings" ("address_line1", "address_line2", "app", "branch_id", "branch_setting_id", "city", "contact", "country", "created_at", "footer", "id", "status", "store", "symbol", "tax", "tenant_id", "terminal_id", "updated_at") SELECT "address_line1", "address_line2", "app", "branch_id", "branch_setting_id", "city", "contact", "country", "created_at", "footer", "id", "status", "store", "symbol", "tax", "tenant_id", "terminal_id", "updated_at" FROM "branch_settings";
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
    "district_id" TEXT,
    "location" TEXT,
    "business_type" TEXT DEFAULT 'PRODUCT_BASED',
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
    "mra_approval_status" TEXT DEFAULT 'PENDING',
    "mra_approval_date" DATETIME,
    "branch_subscription_id" TEXT,
    "status" TEXT DEFAULT 'active',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "branches_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts" ("district_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "branches_branch_subscription_id_fkey" FOREIGN KEY ("branch_subscription_id") REFERENCES "branch_subscriptions" ("branch_subscription_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_branches" ("address_line_1", "address_line_2", "address_line_3", "branch_code", "branch_id", "branch_name", "business_type", "charge_tax", "city", "created_at", "currency_code", "currency_symbol", "description", "district_id", "email", "id", "is_active", "is_virtual_warehouse", "location", "logo_url", "mra_approval_date", "mra_approval_status", "phone_number", "postal_code", "receipt_footer", "site_id", "site_name", "state", "status", "tax_rate", "tenant_id", "updated_at") SELECT "address_line_1", "address_line_2", "address_line_3", "branch_code", "branch_id", "branch_name", "business_type", "charge_tax", "city", "created_at", "currency_code", "currency_symbol", "description", "district_id", "email", "id", "is_active", "is_virtual_warehouse", "location", "logo_url", "mra_approval_date", "mra_approval_status", "phone_number", "postal_code", "receipt_footer", "site_id", "site_name", "state", "status", "tax_rate", "tenant_id", "updated_at" FROM "branches";
DROP TABLE "branches";
ALTER TABLE "new_branches" RENAME TO "branches";
CREATE UNIQUE INDEX "branches_branch_id_key" ON "branches"("branch_id");
CREATE UNIQUE INDEX "branches_branch_subscription_id_key" ON "branches"("branch_subscription_id");
CREATE INDEX "branches_branch_code_idx" ON "branches"("branch_code");
CREATE INDEX "branches_tenant_id_is_active_idx" ON "branches"("tenant_id", "is_active");
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");
CREATE INDEX "idx_branches_deleted_at" ON "branches"("deleted_at");
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
    "is_default" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,
    "item_count" INTEGER,
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "categories_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "is_default", "item_count", "name", "sort_order", "tenant_id", "terminal_id", "updated_at", "user_id") SELECT "branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "is_default", "item_count", "name", "sort_order", "tenant_id", "terminal_id", "updated_at", "user_id" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_category_id_key" ON "categories"("category_id");
CREATE INDEX "categories_branch_id_idx" ON "categories"("branch_id");
CREATE INDEX "categories_terminal_id_idx" ON "categories"("terminal_id");
CREATE INDEX "categories_is_default_idx" ON "categories"("is_default");
CREATE INDEX "categories_tenant_id_branch_id_updated_at_idx" ON "categories"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "categories_updated_at_idx" ON "categories"("updated_at");
CREATE INDEX "categories_deleted_at_idx" ON "categories"("deleted_at");
CREATE UNIQUE INDEX "categories_branch_id_name_key" ON "categories"("branch_id", "name");
CREATE TABLE "new_customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "is_default" BOOLEAN DEFAULT false,
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_customers" ("address", "branch_id", "created_at", "customer_id", "email", "id", "is_default", "name", "phone", "tenant_id", "updated_at", "user_id") SELECT "address", "branch_id", "created_at", "customer_id", "email", "id", "is_default", "name", "phone", "tenant_id", "updated_at", "user_id" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_customer_id_key" ON "customers"("customer_id");
CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id");
CREATE INDEX "customers_is_default_idx" ON "customers"("is_default");
CREATE INDEX "customers_tenant_id_branch_id_updated_at_idx" ON "customers"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "customers_updated_at_idx" ON "customers"("updated_at");
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");
CREATE TABLE "new_inventory" (
    "inventory_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inventory" ("allow_negative_stock", "available_quantity", "average_cost", "branch_id", "created_at", "damaged_quantity", "inventory_id", "last_purchase_cost", "last_restocked_at", "last_sold_at", "max_stock", "product_id", "reorder_point", "reserved_quantity", "tenant_id", "track_inventory", "updated_at", "variant_id") SELECT "allow_negative_stock", "available_quantity", "average_cost", "branch_id", "created_at", "damaged_quantity", "inventory_id", "last_purchase_cost", "last_restocked_at", "last_sold_at", "max_stock", "product_id", "reorder_point", "reserved_quantity", "tenant_id", "track_inventory", "updated_at", "variant_id" FROM "inventory";
DROP TABLE "inventory";
ALTER TABLE "new_inventory" RENAME TO "inventory";
CREATE INDEX "inventory_branch_id_idx" ON "inventory"("branch_id");
CREATE INDEX "inventory_tenant_id_idx" ON "inventory"("tenant_id");
CREATE INDEX "inventory_variant_id_idx" ON "inventory"("variant_id");
CREATE INDEX "inventory_product_id_idx" ON "inventory"("product_id");
CREATE INDEX "inventory_tenant_id_branch_id_updated_at_idx" ON "inventory"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "inventory_updated_at_idx" ON "inventory"("updated_at");
CREATE INDEX "inventory_deleted_at_idx" ON "inventory"("deleted_at");
CREATE UNIQUE INDEX "inventory_branch_id_variant_id_key" ON "inventory"("branch_id", "variant_id");
CREATE TABLE "new_inventory_old" (
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
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_old_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_old_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_old_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_old_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_inventory_old" ("allow_negative_stock", "barcode", "branch_id", "brand", "category_id", "color", "cost_price", "created_at", "created_by", "description", "dimensions", "expiration_date", "id", "image_urls", "is_taxable", "last_updated_by", "manufacture_date", "max_stock", "min_stock", "name", "original_quantity", "product_id", "promo_end", "promo_price", "promo_start", "properties", "quantity", "reorder_level", "reserved_quantity", "sell_price", "size", "sku", "status", "stock", "supplier_code", "supplier_name", "tenant_id", "track_inventory", "unit", "updated_at", "user_id", "weight") SELECT "allow_negative_stock", "barcode", "branch_id", "brand", "category_id", "color", "cost_price", "created_at", "created_by", "description", "dimensions", "expiration_date", "id", "image_urls", "is_taxable", "last_updated_by", "manufacture_date", "max_stock", "min_stock", "name", "original_quantity", "product_id", "promo_end", "promo_price", "promo_start", "properties", "quantity", "reorder_level", "reserved_quantity", "sell_price", "size", "sku", "status", "stock", "supplier_code", "supplier_name", "tenant_id", "track_inventory", "unit", "updated_at", "user_id", "weight" FROM "inventory_old";
DROP TABLE "inventory_old";
ALTER TABLE "new_inventory_old" RENAME TO "inventory_old";
CREATE UNIQUE INDEX "inventory_old_product_id_key" ON "inventory_old"("product_id");
CREATE INDEX "inventory_old_created_by_idx" ON "inventory_old"("created_by");
CREATE INDEX "inventory_old_barcode_idx" ON "inventory_old"("barcode");
CREATE INDEX "inventory_old_branch_id_idx" ON "inventory_old"("branch_id");
CREATE INDEX "inventory_old_category_id_idx" ON "inventory_old"("category_id");
CREATE INDEX "inventory_old_name_idx" ON "inventory_old"("name");
CREATE INDEX "inventory_old_status_idx" ON "inventory_old"("status");
CREATE INDEX "inventory_old_last_updated_by_idx" ON "inventory_old"("last_updated_by");
CREATE TABLE "new_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" TEXT NOT NULL,
    "ref_number" TEXT NOT NULL,
    "transaction_id" TEXT DEFAULT '1',
    "product_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1.000,
    "purchase_price" REAL NOT NULL DEFAULT 0.00,
    "sell_price" REAL NOT NULL DEFAULT 0.00,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_orders" ("created_at", "id", "order_id", "product_id", "purchase_price", "quantity", "ref_number", "sell_price", "transaction_id", "updated_at") SELECT "created_at", "id", "order_id", "product_id", "purchase_price", "quantity", "ref_number", "sell_price", "transaction_id", "updated_at" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id");
CREATE INDEX "orders_transaction_id_idx" ON "orders"("transaction_id");
CREATE TABLE "new_parked_sale_items" (
    "parked_sale_item_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "parked_sale_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parked_sale_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parked_sale_items_parked_sale_id_fkey" FOREIGN KEY ("parked_sale_id") REFERENCES "parked_sales" ("parked_sale_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_parked_sale_items" ("barcode", "category_id", "created_at", "discount", "name", "parked_sale_id", "parked_sale_item_id", "product_id", "purchase_price", "quantity", "sell_price", "sku", "subtotal", "tax_amount", "unit", "unit_price") SELECT "barcode", "category_id", "created_at", "discount", "name", "parked_sale_id", "parked_sale_item_id", "product_id", "purchase_price", "quantity", "sell_price", "sku", "subtotal", "tax_amount", "unit", "unit_price" FROM "parked_sale_items";
DROP TABLE "parked_sale_items";
ALTER TABLE "new_parked_sale_items" RENAME TO "parked_sale_items";
CREATE INDEX "parked_sale_items_tenant_id_idx" ON "parked_sale_items"("tenant_id");
CREATE INDEX "parked_sale_items_branch_id_idx" ON "parked_sale_items"("branch_id");
CREATE INDEX "parked_sale_items_tenant_id_branch_id_updated_at_idx" ON "parked_sale_items"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "parked_sale_items_parked_sale_id_idx" ON "parked_sale_items"("parked_sale_id");
CREATE INDEX "parked_sale_items_product_id_idx" ON "parked_sale_items"("product_id");
CREATE INDEX "parked_sale_items_category_id_idx" ON "parked_sale_items"("category_id");
CREATE INDEX "parked_sale_items_updated_at_idx" ON "parked_sale_items"("updated_at");
CREATE INDEX "parked_sale_items_deleted_at_idx" ON "parked_sale_items"("deleted_at");
CREATE TABLE "new_parked_sales" (
    "parked_sale_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "customer_id" TEXT,
    "reference" TEXT NOT NULL,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "tax_amount" REAL NOT NULL DEFAULT 0,
    "discount_amount" REAL NOT NULL DEFAULT 0,
    "other_charges" REAL NOT NULL DEFAULT 0,
    "total_amount" REAL NOT NULL DEFAULT 0,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PARKED',
    "notes" TEXT,
    "parked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "resumed_at" DATETIME,
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_parked_sales" ("branch_id", "created_at", "customer_id", "discount_amount", "expires_at", "notes", "other_charges", "parked_at", "parked_sale_id", "reference", "resumed_at", "status", "subtotal", "tax_amount", "tenant_id", "terminal_id", "total_amount", "total_items", "updated_at", "user_id") SELECT "branch_id", "created_at", "customer_id", "discount_amount", "expires_at", "notes", "other_charges", "parked_at", "parked_sale_id", "reference", "resumed_at", "status", "subtotal", "tax_amount", "tenant_id", "terminal_id", "total_amount", "total_items", "updated_at", "user_id" FROM "parked_sales";
DROP TABLE "parked_sales";
ALTER TABLE "new_parked_sales" RENAME TO "parked_sales";
CREATE UNIQUE INDEX "parked_sales_reference_key" ON "parked_sales"("reference");
CREATE INDEX "parked_sales_tenant_id_idx" ON "parked_sales"("tenant_id");
CREATE INDEX "parked_sales_branch_id_idx" ON "parked_sales"("branch_id");
CREATE INDEX "parked_sales_user_id_idx" ON "parked_sales"("user_id");
CREATE INDEX "parked_sales_terminal_id_idx" ON "parked_sales"("terminal_id");
CREATE INDEX "parked_sales_reference_idx" ON "parked_sales"("reference");
CREATE INDEX "parked_sales_status_idx" ON "parked_sales"("status");
CREATE INDEX "parked_sales_parked_at_idx" ON "parked_sales"("parked_at");
CREATE INDEX "parked_sales_created_at_idx" ON "parked_sales"("created_at");
CREATE INDEX "parked_sales_tenant_id_branch_id_updated_at_idx" ON "parked_sales"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "parked_sales_updated_at_idx" ON "parked_sales"("updated_at");
CREATE INDEX "parked_sales_deleted_at_idx" ON "parked_sales"("deleted_at");
CREATE TABLE "new_payment_methods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "method_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_methods_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payment_methods" ("created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "updated_at") SELECT "created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "updated_at" FROM "payment_methods";
DROP TABLE "payment_methods";
ALTER TABLE "new_payment_methods" RENAME TO "payment_methods";
CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id");
CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");
CREATE INDEX "payment_methods_branch_id_idx" ON "payment_methods"("branch_id");
CREATE INDEX "payment_methods_tenant_id_branch_id_updated_at_idx" ON "payment_methods"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "payment_methods_updated_at_idx" ON "payment_methods"("updated_at");
CREATE INDEX "payment_methods_deleted_at_idx" ON "payment_methods"("deleted_at");
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
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME
);
INSERT INTO "new_payment_service_providers" ("createdAt", "description", "id", "isActive", "logoUrl", "name", "providerId", "sortOrder", "type", "updatedAt", "userId") SELECT "createdAt", "description", "id", "isActive", "logoUrl", "name", "providerId", "sortOrder", "type", "updatedAt", "userId" FROM "payment_service_providers";
DROP TABLE "payment_service_providers";
ALTER TABLE "new_payment_service_providers" RENAME TO "payment_service_providers";
CREATE UNIQUE INDEX "payment_service_providers_providerId_key" ON "payment_service_providers"("providerId");
CREATE TABLE "new_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "permission_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "scope" TEXT DEFAULT 'branch',
    "is_system_permission" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME
);
INSERT INTO "new_permissions" ("category", "created_at", "description", "display_name", "id", "is_system_permission", "name", "permission_id", "scope", "updated_at") SELECT "category", "created_at", "description", "display_name", "id", "is_system_permission", "name", "permission_id", "scope", "updated_at" FROM "permissions";
DROP TABLE "permissions";
ALTER TABLE "new_permissions" RENAME TO "permissions";
CREATE UNIQUE INDEX "permissions_permission_id_key" ON "permissions"("permission_id");
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");
CREATE INDEX "permissions_category_idx" ON "permissions"("category");
CREATE INDEX "permissions_name_idx" ON "permissions"("name");
CREATE INDEX "permissions_scope_idx" ON "permissions"("scope");
CREATE INDEX "idx_permissions_deleted_at" ON "permissions"("deleted_at");
CREATE TABLE "new_print_jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "print_job_id" TEXT NOT NULL,
    "printer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "user_id" TEXT,
    "job_type" TEXT NOT NULL DEFAULT 'RECEIPT',
    "job_title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "content_type" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "error_message" TEXT,
    "printed_at" DATETIME,
    "scheduled_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "print_jobs_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "printers" ("printer_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_print_jobs" ("branch_id", "content", "content_type", "copies", "created_at", "error_message", "id", "job_title", "job_type", "print_job_id", "printed_at", "printer_id", "priority", "reference_id", "reference_type", "scheduled_at", "status", "tenant_id", "terminal_id", "updated_at", "user_id") SELECT "branch_id", "content", "content_type", "copies", "created_at", "error_message", "id", "job_title", "job_type", "print_job_id", "printed_at", "printer_id", "priority", "reference_id", "reference_type", "scheduled_at", "status", "tenant_id", "terminal_id", "updated_at", "user_id" FROM "print_jobs";
DROP TABLE "print_jobs";
ALTER TABLE "new_print_jobs" RENAME TO "print_jobs";
CREATE UNIQUE INDEX "print_jobs_print_job_id_key" ON "print_jobs"("print_job_id");
CREATE INDEX "print_jobs_printer_id_idx" ON "print_jobs"("printer_id");
CREATE INDEX "print_jobs_tenant_id_idx" ON "print_jobs"("tenant_id");
CREATE INDEX "print_jobs_branch_id_idx" ON "print_jobs"("branch_id");
CREATE INDEX "print_jobs_status_idx" ON "print_jobs"("status");
CREATE INDEX "print_jobs_job_type_idx" ON "print_jobs"("job_type");
CREATE INDEX "print_jobs_priority_idx" ON "print_jobs"("priority");
CREATE INDEX "print_jobs_created_at_idx" ON "print_jobs"("created_at");
CREATE INDEX "print_jobs_tenant_id_branch_id_updated_at_idx" ON "print_jobs"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "print_jobs_updated_at_idx" ON "print_jobs"("updated_at");
CREATE INDEX "print_jobs_deleted_at_idx" ON "print_jobs"("deleted_at");
CREATE TABLE "new_printers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "printer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "printer_name" TEXT NOT NULL,
    "printer_model" TEXT,
    "printer_type" TEXT NOT NULL DEFAULT 'THERMAL',
    "connection_type" TEXT NOT NULL DEFAULT 'USB',
    "connection_address" TEXT,
    "port" INTEGER,
    "vendor_id" TEXT,
    "product_id" TEXT,
    "serial_number" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_receipt_printer" BOOLEAN NOT NULL DEFAULT true,
    "is_label_printer" BOOLEAN NOT NULL DEFAULT false,
    "is_kitchen_printer" BOOLEAN NOT NULL DEFAULT false,
    "is_report_printer" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "configuration" TEXT,
    "last_connected" DATETIME,
    "last_print_job" DATETIME,
    "print_job_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "printers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "printers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_printers" ("branch_id", "configuration", "connection_address", "connection_type", "created_at", "error_count", "id", "is_active", "is_default", "is_kitchen_printer", "is_label_printer", "is_receipt_printer", "is_report_printer", "last_connected", "last_error", "last_print_job", "port", "print_job_count", "printer_id", "printer_model", "printer_name", "printer_type", "product_id", "serial_number", "status", "tenant_id", "terminal_id", "updated_at", "vendor_id") SELECT "branch_id", "configuration", "connection_address", "connection_type", "created_at", "error_count", "id", "is_active", "is_default", "is_kitchen_printer", "is_label_printer", "is_receipt_printer", "is_report_printer", "last_connected", "last_error", "last_print_job", "port", "print_job_count", "printer_id", "printer_model", "printer_name", "printer_type", "product_id", "serial_number", "status", "tenant_id", "terminal_id", "updated_at", "vendor_id" FROM "printers";
DROP TABLE "printers";
ALTER TABLE "new_printers" RENAME TO "printers";
CREATE UNIQUE INDEX "printers_printer_id_key" ON "printers"("printer_id");
CREATE INDEX "printers_tenant_id_idx" ON "printers"("tenant_id");
CREATE INDEX "printers_branch_id_idx" ON "printers"("branch_id");
CREATE INDEX "printers_terminal_id_idx" ON "printers"("terminal_id");
CREATE INDEX "printers_is_default_idx" ON "printers"("is_default");
CREATE INDEX "printers_status_idx" ON "printers"("status");
CREATE INDEX "printers_tenant_id_branch_id_updated_at_idx" ON "printers"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "printers_updated_at_idx" ON "printers"("updated_at");
CREATE INDEX "printers_deleted_at_idx" ON "printers"("deleted_at");
CREATE TABLE "new_product_variants" (
    "variant_id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "sku" TEXT,
    "variant_name" TEXT NOT NULL,
    "primary_barcode" TEXT,
    "selling_price" REAL NOT NULL DEFAULT 0.00,
    "cost_price" REAL NOT NULL DEFAULT 0.00,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "description" TEXT,
    "brand" TEXT,
    "image_url" TEXT,
    "is_taxable" BOOLEAN,
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
    "expiry_date_alert" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_variants_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_product_variants" ("branch_id", "brand", "cost_price", "created_at", "custom_attributes", "description", "dimensions", "expiration_date", "expiry_date_alert", "image_url", "is_active", "is_default", "is_taxable", "manufacture_date", "primary_barcode", "product_id", "promo_end", "promo_price", "promo_start", "selling_price", "size", "sku", "supplier_code", "supplier_name", "tenant_id", "unit", "updated_at", "variant_id", "variant_name", "volume", "volume_unit", "weight", "weight_unit") SELECT "branch_id", "brand", "cost_price", "created_at", "custom_attributes", "description", "dimensions", "expiration_date", "expiry_date_alert", "image_url", "is_active", "is_default", "is_taxable", "manufacture_date", "primary_barcode", "product_id", "promo_end", "promo_price", "promo_start", "selling_price", "size", "sku", "supplier_code", "supplier_name", "tenant_id", "unit", "updated_at", "variant_id", "variant_name", "volume", "volume_unit", "weight", "weight_unit" FROM "product_variants";
DROP TABLE "product_variants";
ALTER TABLE "new_product_variants" RENAME TO "product_variants";
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");
CREATE INDEX "product_variants_branch_id_idx" ON "product_variants"("branch_id");
CREATE INDEX "product_variants_tenant_id_idx" ON "product_variants"("tenant_id");
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");
CREATE INDEX "product_variants_primary_barcode_idx" ON "product_variants"("primary_barcode");
CREATE INDEX "product_variants_variant_name_idx" ON "product_variants"("variant_name");
CREATE INDEX "product_variants_tenant_id_branch_id_updated_at_idx" ON "product_variants"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "product_variants_updated_at_idx" ON "product_variants"("updated_at");
CREATE INDEX "product_variants_deleted_at_idx" ON "product_variants"("deleted_at");
CREATE UNIQUE INDEX "product_variants_product_id_variant_name_key" ON "product_variants"("product_id", "variant_name");
CREATE UNIQUE INDEX "product_variants_tenant_id_branch_id_primary_barcode_key" ON "product_variants"("tenant_id", "branch_id", "primary_barcode");
CREATE TABLE "new_products" (
    "product_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "is_taxable" BOOLEAN,
    "supplier_name" TEXT,
    "supplier_code" TEXT,
    "default_unit" TEXT,
    "custom_attribute_schema" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("branch_id", "brand", "category_id", "created_at", "custom_attribute_schema", "default_unit", "description", "image_url", "is_active", "is_taxable", "name", "product_id", "supplier_code", "supplier_name", "tenant_id", "updated_at") SELECT "branch_id", "brand", "category_id", "created_at", "custom_attribute_schema", "default_unit", "description", "image_url", "is_active", "is_taxable", "name", "product_id", "supplier_code", "supplier_name", "tenant_id", "updated_at" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE INDEX "products_branch_id_idx" ON "products"("branch_id");
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_name_idx" ON "products"("name");
CREATE INDEX "products_tenant_id_branch_id_updated_at_idx" ON "products"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "products_updated_at_idx" ON "products"("updated_at");
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");
CREATE UNIQUE INDEX "products_branch_id_name_key" ON "products"("branch_id", "name");
CREATE TABLE "new_purchase_order_items" (
    "purchase_order_item_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchase_order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("purchase_order_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_order_items" ("created_at", "damaged_quantity", "notes", "ordered_quantity", "purchase_order_id", "purchase_order_item_id", "received_quantity", "total_price", "unit_price", "updated_at", "variant_id") SELECT "created_at", "damaged_quantity", "notes", "ordered_quantity", "purchase_order_id", "purchase_order_item_id", "received_quantity", "total_price", "unit_price", "updated_at", "variant_id" FROM "purchase_order_items";
DROP TABLE "purchase_order_items";
ALTER TABLE "new_purchase_order_items" RENAME TO "purchase_order_items";
CREATE INDEX "purchase_order_items_tenant_id_idx" ON "purchase_order_items"("tenant_id");
CREATE INDEX "purchase_order_items_branch_id_idx" ON "purchase_order_items"("branch_id");
CREATE INDEX "purchase_order_items_tenant_id_branch_id_updated_at_idx" ON "purchase_order_items"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX "purchase_order_items_variant_id_idx" ON "purchase_order_items"("variant_id");
CREATE INDEX "purchase_order_items_updated_at_idx" ON "purchase_order_items"("updated_at");
CREATE INDEX "purchase_order_items_deleted_at_idx" ON "purchase_order_items"("deleted_at");
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_variant_id_key" ON "purchase_order_items"("purchase_order_id", "variant_id");
CREATE TABLE "new_purchase_orders" (
    "purchase_order_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_purchase_orders" ("branch_id", "created_at", "created_by", "expected_delivery_date", "is_locked", "notes", "order_date", "po_number", "purchase_order_id", "received_at", "received_by", "status", "supplier_id", "tenant_id", "updated_at") SELECT "branch_id", "created_at", "created_by", "expected_delivery_date", "is_locked", "notes", "order_date", "po_number", "purchase_order_id", "received_at", "received_by", "status", "supplier_id", "tenant_id", "updated_at" FROM "purchase_orders";
DROP TABLE "purchase_orders";
ALTER TABLE "new_purchase_orders" RENAME TO "purchase_orders";
CREATE INDEX "purchase_orders_branch_id_idx" ON "purchase_orders"("branch_id");
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_tenant_id_branch_id_updated_at_idx" ON "purchase_orders"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "purchase_orders_updated_at_idx" ON "purchase_orders"("updated_at");
CREATE INDEX "purchase_orders_deleted_at_idx" ON "purchase_orders"("deleted_at");
CREATE UNIQUE INDEX "purchase_orders_tenant_id_po_number_key" ON "purchase_orders"("tenant_id", "po_number");
CREATE TABLE "new_return_items" (
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
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_return_items" ("condition", "created_at", "id", "notes", "original_order_id", "original_quantity", "product_id", "restock_status", "restocked_at", "restocked_quantity", "return_item_id", "return_price", "return_reason", "return_transaction_id", "returned_quantity", "updated_at") SELECT "condition", "created_at", "id", "notes", "original_order_id", "original_quantity", "product_id", "restock_status", "restocked_at", "restocked_quantity", "return_item_id", "return_price", "return_reason", "return_transaction_id", "returned_quantity", "updated_at" FROM "return_items";
DROP TABLE "return_items";
ALTER TABLE "new_return_items" RENAME TO "return_items";
CREATE UNIQUE INDEX "return_items_return_item_id_key" ON "return_items"("return_item_id");
CREATE INDEX "return_items_return_transaction_id_idx" ON "return_items"("return_transaction_id");
CREATE INDEX "return_items_original_order_id_idx" ON "return_items"("original_order_id");
CREATE INDEX "return_items_product_id_idx" ON "return_items"("product_id");
CREATE TABLE "new_role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_permission_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_role_permissions" ("created_at", "id", "permission_id", "role_id", "role_permission_id", "updated_at") SELECT "created_at", "id", "permission_id", "role_id", "role_permission_id", "updated_at" FROM "role_permissions";
DROP TABLE "role_permissions";
ALTER TABLE "new_role_permissions" RENAME TO "role_permissions";
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role_permission_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");
CREATE INDEX "idx_role_permissions_deleted_at" ON "role_permissions"("deleted_at");
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
CREATE TABLE "new_roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME
);
INSERT INTO "new_roles" ("created_at", "description", "display_name", "id", "is_active", "is_system_role", "name", "role_id", "updated_at") SELECT "created_at", "description", "display_name", "id", "is_active", "is_system_role", "name", "role_id", "updated_at" FROM "roles";
DROP TABLE "roles";
ALTER TABLE "new_roles" RENAME TO "roles";
CREATE UNIQUE INDEX "roles_role_id_key" ON "roles"("role_id");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE INDEX "idx_active_role" ON "roles"("is_active");
CREATE INDEX "idx_role_name" ON "roles"("name");
CREATE INDEX "idx_system_role" ON "roles"("is_system_role");
CREATE INDEX "idx_roles_deleted_at" ON "roles"("deleted_at");
CREATE TABLE "new_sale_items" (
    "sale_item_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sale_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_items" ("created_at", "discount_amount", "product_id", "quantity", "sale_id", "sale_item_id", "subtotal", "tax_amount", "total_amount", "unit_cost", "unit_price", "variant_id") SELECT "created_at", "discount_amount", "product_id", "quantity", "sale_id", "sale_item_id", "subtotal", "tax_amount", "total_amount", "unit_cost", "unit_price", "variant_id" FROM "sale_items";
DROP TABLE "sale_items";
ALTER TABLE "new_sale_items" RENAME TO "sale_items";
CREATE INDEX "sale_items_tenant_id_idx" ON "sale_items"("tenant_id");
CREATE INDEX "sale_items_branch_id_idx" ON "sale_items"("branch_id");
CREATE INDEX "sale_items_tenant_id_branch_id_updated_at_idx" ON "sale_items"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX "sale_items_variant_id_idx" ON "sale_items"("variant_id");
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");
CREATE INDEX "sale_items_updated_at_idx" ON "sale_items"("updated_at");
CREATE INDEX "sale_items_deleted_at_idx" ON "sale_items"("deleted_at");
CREATE UNIQUE INDEX "sale_items_sale_id_variant_id_key" ON "sale_items"("sale_id", "variant_id");
CREATE TABLE "new_sale_payments" (
    "sale_payment_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sale_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("method_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_payments" ("amount", "created_at", "notes", "payment_method_id", "processed_at", "provider_id", "provider_ref", "reference", "sale_id", "sale_payment_id", "status", "updated_at") SELECT "amount", "created_at", "notes", "payment_method_id", "processed_at", "provider_id", "provider_ref", "reference", "sale_id", "sale_payment_id", "status", "updated_at" FROM "sale_payments";
DROP TABLE "sale_payments";
ALTER TABLE "new_sale_payments" RENAME TO "sale_payments";
CREATE INDEX "sale_payments_tenant_id_idx" ON "sale_payments"("tenant_id");
CREATE INDEX "sale_payments_branch_id_idx" ON "sale_payments"("branch_id");
CREATE INDEX "sale_payments_tenant_id_branch_id_updated_at_idx" ON "sale_payments"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");
CREATE INDEX "sale_payments_payment_method_id_idx" ON "sale_payments"("payment_method_id");
CREATE INDEX "sale_payments_status_idx" ON "sale_payments"("status");
CREATE INDEX "sale_payments_processed_at_idx" ON "sale_payments"("processed_at");
CREATE INDEX "sale_payments_updated_at_idx" ON "sale_payments"("updated_at");
CREATE INDEX "sale_payments_deleted_at_idx" ON "sale_payments"("deleted_at");
CREATE TABLE "new_sales" (
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
    "other_charges" REAL NOT NULL DEFAULT 0.00,
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
    "mra_submission_id" TEXT,
    "mra_response_code" TEXT,
    "mra_response_desc" TEXT,
    "mra_qr_code" TEXT,
    "mra_verification_url" TEXT,
    "mra_status" TEXT DEFAULT 'NONE',
    "mra_last_sync_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
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
INSERT INTO "new_sales" ("amount_paid", "branch_id", "change_amount", "created_at", "customer_id", "discount_amount", "is_voided", "notes", "other_charges", "payment_method_id", "sale_date", "sale_id", "sale_number", "status", "subtotal", "tax_amount", "tenant_id", "terminal_id", "total_amount", "updated_at", "user_id", "void_reason", "voided_at", "voided_by") SELECT "amount_paid", "branch_id", "change_amount", "created_at", "customer_id", "discount_amount", "is_voided", "notes", "other_charges", "payment_method_id", "sale_date", "sale_id", "sale_number", "status", "subtotal", "tax_amount", "tenant_id", "terminal_id", "total_amount", "updated_at", "user_id", "void_reason", "voided_at", "voided_by" FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE INDEX "sales_branch_id_idx" ON "sales"("branch_id");
CREATE INDEX "sales_tenant_id_idx" ON "sales"("tenant_id");
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");
CREATE INDEX "sales_terminal_id_idx" ON "sales"("terminal_id");
CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");
CREATE INDEX "sales_sale_number_idx" ON "sales"("sale_number");
CREATE INDEX "sales_tenant_id_branch_id_updated_at_idx" ON "sales"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "sales_updated_at_idx" ON "sales"("updated_at");
CREATE INDEX "sales_deleted_at_idx" ON "sales"("deleted_at");
CREATE INDEX "sales_mra_status_idx" ON "sales"("mra_status");
CREATE UNIQUE INDEX "sales_tenant_id_branch_id_sale_number_key" ON "sales"("tenant_id", "branch_id", "sale_number");
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
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_provider_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_service_provider" ("branch_id", "created_at", "description", "id", "is_active", "logoUrl", "name", "provider_id", "sort_order", "tenant_id", "updated_at", "user_id") SELECT "branch_id", "created_at", "description", "id", "is_active", "logoUrl", "name", "provider_id", "sort_order", "tenant_id", "updated_at", "user_id" FROM "service_provider";
DROP TABLE "service_provider";
ALTER TABLE "new_service_provider" RENAME TO "service_provider";
CREATE UNIQUE INDEX "service_provider_provider_id_key" ON "service_provider"("provider_id");
CREATE INDEX "service_provider_branch_id_idx" ON "service_provider"("branch_id");
CREATE UNIQUE INDEX "service_provider_branch_id_name_key" ON "service_provider"("branch_id", "name");
CREATE TABLE "new_staff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staff_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "employee_code" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "joining_date" DATETIME,
    "termination_date" DATETIME,
    "calculate_as" TEXT NOT NULL DEFAULT 'DAILY',
    "staff_salary" REAL NOT NULL DEFAULT 0.00,
    "salary_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "track_attendance" BOOLEAN NOT NULL DEFAULT false,
    "allow_self_attendance" BOOLEAN NOT NULL DEFAULT false,
    "attendance_type" TEXT NOT NULL DEFAULT 'PUNCH',
    "avg_shift_hours" REAL NOT NULL DEFAULT 8.00,
    "allow_app_access" BOOLEAN NOT NULL DEFAULT false,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relation" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "national_id" TEXT,
    "date_of_birth" DATETIME,
    "gender" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_branch_code" TEXT,
    "employment_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_staff" ("address", "allow_app_access", "allow_self_attendance", "attendance_type", "avg_shift_hours", "bank_account_number", "bank_branch_code", "bank_name", "branch_id", "calculate_as", "city", "country", "created_at", "date_of_birth", "department", "designation", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation", "employee_code", "employment_status", "gender", "id", "joining_date", "national_id", "notes", "postal_code", "salary_frequency", "staff_id", "staff_salary", "state", "tenant_id", "termination_date", "track_attendance", "updated_at", "user_id") SELECT "address", "allow_app_access", "allow_self_attendance", "attendance_type", "avg_shift_hours", "bank_account_number", "bank_branch_code", "bank_name", "branch_id", "calculate_as", "city", "country", "created_at", "date_of_birth", "department", "designation", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation", "employee_code", "employment_status", "gender", "id", "joining_date", "national_id", "notes", "postal_code", "salary_frequency", "staff_id", "staff_salary", "state", "tenant_id", "termination_date", "track_attendance", "updated_at", "user_id" FROM "staff";
DROP TABLE "staff";
ALTER TABLE "new_staff" RENAME TO "staff";
CREATE UNIQUE INDEX "staff_staff_id_key" ON "staff"("staff_id");
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");
CREATE INDEX "idx_staff_user_id" ON "staff"("user_id");
CREATE INDEX "idx_staff_tenant_id" ON "staff"("tenant_id");
CREATE INDEX "idx_staff_branch_id" ON "staff"("branch_id");
CREATE INDEX "idx_staff_employment_status" ON "staff"("employment_status");
CREATE INDEX "idx_staff_joining_date" ON "staff"("joining_date");
CREATE INDEX "staff_tenant_id_branch_id_updated_at_idx" ON "staff"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "staff_updated_at_idx" ON "staff"("updated_at");
CREATE INDEX "staff_deleted_at_idx" ON "staff"("deleted_at");
CREATE UNIQUE INDEX "staff_tenant_id_employee_code_key" ON "staff"("tenant_id", "employee_code");
CREATE TABLE "new_stock_movements" (
    "stock_movement_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_moved_by_fkey" FOREIGN KEY ("moved_by") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_stock_movements" ("branch_id", "created_at", "inventory_id", "moved_by", "movement_date", "movement_type", "new_quantity", "notes", "previous_quantity", "quantity", "reference_id", "reference_type", "stock_movement_id", "tenant_id", "total_cost", "unit_cost") SELECT "branch_id", "created_at", "inventory_id", "moved_by", "movement_date", "movement_type", "new_quantity", "notes", "previous_quantity", "quantity", "reference_id", "reference_type", "stock_movement_id", "tenant_id", "total_cost", "unit_cost" FROM "stock_movements";
DROP TABLE "stock_movements";
ALTER TABLE "new_stock_movements" RENAME TO "stock_movements";
CREATE INDEX "stock_movements_branch_id_idx" ON "stock_movements"("branch_id");
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");
CREATE INDEX "stock_movements_inventory_id_idx" ON "stock_movements"("inventory_id");
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");
CREATE INDEX "stock_movements_movement_date_idx" ON "stock_movements"("movement_date");
CREATE INDEX "stock_movements_tenant_id_branch_id_movement_date_idx" ON "stock_movements"("tenant_id", "branch_id", "movement_date");
CREATE INDEX "stock_movements_updated_at_idx" ON "stock_movements"("updated_at");
CREATE INDEX "stock_movements_deleted_at_idx" ON "stock_movements"("deleted_at");
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
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_subscription_plans" ("color", "created_at", "description", "features", "is_active", "is_popular", "limits", "monthly_price", "name", "notes", "plan_code", "subscription_plan_id", "updated_at", "yearly_price") SELECT "color", "created_at", "description", "features", "is_active", "is_popular", "limits", "monthly_price", "name", "notes", "plan_code", "subscription_plan_id", "updated_at", "yearly_price" FROM "subscription_plans";
DROP TABLE "subscription_plans";
ALTER TABLE "new_subscription_plans" RENAME TO "subscription_plans";
CREATE UNIQUE INDEX "subscription_plans_plan_code_key" ON "subscription_plans"("plan_code");
CREATE TABLE "new_suppliers" (
    "supplier_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "suppliers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_suppliers" ("address", "branch_id", "contact_person", "created_at", "credit_limit", "email", "is_active", "name", "payment_terms", "phone", "status", "supplier_id", "tax_id", "tenant_id", "updated_at") SELECT "address", "branch_id", "contact_person", "created_at", "credit_limit", "email", "is_active", "name", "payment_terms", "phone", "status", "supplier_id", "tax_id", "tenant_id", "updated_at" FROM "suppliers";
DROP TABLE "suppliers";
ALTER TABLE "new_suppliers" RENAME TO "suppliers";
CREATE INDEX "suppliers_branch_id_idx" ON "suppliers"("branch_id");
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");
CREATE INDEX "suppliers_tenant_id_branch_id_updated_at_idx" ON "suppliers"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "suppliers_updated_at_idx" ON "suppliers"("updated_at");
CREATE INDEX "suppliers_deleted_at_idx" ON "suppliers"("deleted_at");
CREATE TABLE "new_tenants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenant_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "tin" TEXT NOT NULL,
    "tenant_code" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mra_portal_username" TEXT,
    "trading_name" TEXT,
    "is_vat_registered" BOOLEAN DEFAULT false,
    "tax_office_code" TEXT,
    "msonkho_online_status" TEXT DEFAULT 'PENDING',
    "verification_token" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "address" TEXT,
    "country" TEXT,
    "status" TEXT DEFAULT 'pending',
    "registered_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "activated_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME
);
INSERT INTO "new_tenants" ("activated_at", "address", "business_name", "business_type", "country", "created_at", "email", "id", "is_vat_registered", "mra_portal_username", "msonkho_online_status", "owner_name", "phone_number", "registered_at", "status", "tax_office_code", "tenant_code", "tenant_id", "tin", "trading_name", "updated_at", "verification_token") SELECT "activated_at", "address", "business_name", "business_type", "country", "created_at", "email", "id", "is_vat_registered", "mra_portal_username", "msonkho_online_status", "owner_name", "phone_number", "registered_at", "status", "tax_office_code", "tenant_code", "tenant_id", "tin", "trading_name", "updated_at", "verification_token" FROM "tenants";
DROP TABLE "tenants";
ALTER TABLE "new_tenants" RENAME TO "tenants";
CREATE UNIQUE INDEX "tenants_tenant_id_key" ON "tenants"("tenant_id");
CREATE UNIQUE INDEX "tenants_tin_key" ON "tenants"("tin");
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");
CREATE INDEX "tenants_email_idx" ON "tenants"("email");
CREATE INDEX "tenants_tenant_code_idx" ON "tenants"("tenant_code");
CREATE INDEX "tenants_tin_idx" ON "tenants"("tin");
CREATE INDEX "idx_tenants_deleted_at" ON "tenants"("deleted_at");
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
    "last_sync_at" DATETIME,
    "last_seen_at" DATETIME,
    "last_synced_at" DATETIME,
    "registered_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terminals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "terminals_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_terminals" ("activation_code", "activation_date", "activation_status", "blocked_at", "blocking_reason", "branch_id", "created_at", "device_id", "id", "is_blocked", "is_primary", "last_activity", "last_sync", "last_sync_timestamp", "mac_address", "mra_application_status", "mra_approval_date", "mra_terminal_id", "offline_max_cumulative_amount", "offline_max_transaction_age_hours", "os_build", "os_name", "os_version", "pos_product_id", "pos_product_version", "registered_at", "tenant_id", "terminal_code", "terminal_config_version", "terminal_id", "terminal_label", "terminal_position", "updated_at") SELECT "activation_code", "activation_date", "activation_status", "blocked_at", "blocking_reason", "branch_id", "created_at", "device_id", "id", "is_blocked", "is_primary", "last_activity", "last_sync", "last_sync_timestamp", "mac_address", "mra_application_status", "mra_approval_date", "mra_terminal_id", "offline_max_cumulative_amount", "offline_max_transaction_age_hours", "os_build", "os_name", "os_version", "pos_product_id", "pos_product_version", "registered_at", "tenant_id", "terminal_code", "terminal_config_version", "terminal_id", "terminal_label", "terminal_position", "updated_at" FROM "terminals";
DROP TABLE "terminals";
ALTER TABLE "new_terminals" RENAME TO "terminals";
CREATE UNIQUE INDEX "terminals_terminal_id_key" ON "terminals"("terminal_id");
CREATE UNIQUE INDEX "terminals_mra_terminal_id_key" ON "terminals"("mra_terminal_id");
CREATE INDEX "terminals_activation_status_idx" ON "terminals"("activation_status");
CREATE INDEX "terminals_branch_id_idx" ON "terminals"("branch_id");
CREATE INDEX "terminals_tenant_id_branch_id_idx" ON "terminals"("tenant_id", "branch_id");
CREATE INDEX "terminals_tenant_id_idx" ON "terminals"("tenant_id");
CREATE INDEX "terminals_tenant_id_branch_id_updated_at_idx" ON "terminals"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "terminals_updated_at_idx" ON "terminals"("updated_at");
CREATE INDEX "terminals_deleted_at_idx" ON "terminals"("deleted_at");
CREATE UNIQUE INDEX "terminals_tenant_id_terminal_code_key" ON "terminals"("tenant_id", "terminal_code");
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
INSERT INTO "new_transactions" ("branch_id", "change_amount", "created_at", "customer_id", "date", "discount", "external_transaction_ref", "id", "is_refund", "original_transaction_id", "paid", "payment_method_id", "payment_service_provider_id", "phone_number", "ref_number", "refund_reason", "refunded_amount", "refunded_at", "sale_id", "status", "subtotal", "tax", "tenant_id", "terminal_id", "total", "transaction_id", "updated_at", "user_id") SELECT "branch_id", "change_amount", "created_at", "customer_id", "date", "discount", "external_transaction_ref", "id", "is_refund", "original_transaction_id", "paid", "payment_method_id", "payment_service_provider_id", "phone_number", "ref_number", "refund_reason", "refunded_amount", "refunded_at", "sale_id", "status", "subtotal", "tax", "tenant_id", "terminal_id", "total", "transaction_id", "updated_at", "user_id" FROM "transactions";
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
    CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("permission_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_permissions" ("branch_id", "created_at", "created_by", "granted", "id", "permission_id", "user_id", "user_permission_id") SELECT "branch_id", "created_at", "created_by", "granted", "id", "permission_id", "user_id", "user_permission_id" FROM "user_permissions";
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
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_sessions_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_sessions" ("created_at", "ended_at", "id", "ip_address", "is_active", "last_activity", "session_token", "started_at", "terminal_id", "updated_at", "user_agent", "user_id", "user_session_id") SELECT "created_at", "ended_at", "id", "ip_address", "is_active", "last_activity", "session_token", "started_at", "terminal_id", "updated_at", "user_agent", "user_id", "user_session_id" FROM "user_sessions";
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
    "last_synced_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_current_branch_id_fkey" FOREIGN KEY ("current_branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("accessible_branches", "allowed_terminals", "branch_id", "can_override_prices", "created_at", "current_branch_id", "email", "force_password_change", "fullname", "id", "last_login", "last_logout", "max_discount_percent", "password", "password_changed_at", "phone", "pin_code", "role_id", "status", "tenant_id", "updated_at", "user_id", "username") SELECT "accessible_branches", "allowed_terminals", "branch_id", "can_override_prices", "created_at", "current_branch_id", "email", "force_password_change", "fullname", "id", "last_login", "last_logout", "max_discount_percent", "password", "password_changed_at", "phone", "pin_code", "role_id", "status", "tenant_id", "updated_at", "user_id", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");
CREATE INDEX "users_current_branch_id_idx" ON "users"("current_branch_id");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE INDEX "users_tenant_id_branch_id_updated_at_idx" ON "users"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");
CREATE TABLE "new_variant_barcodes" (
    "variant_barcode_id" TEXT NOT NULL PRIMARY KEY,
    "variant_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "barcode" TEXT NOT NULL,
    "barcode_type" TEXT NOT NULL DEFAULT 'EAN13',
    "barcode_source" TEXT NOT NULL DEFAULT 'SUPPLIER',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "variant_barcodes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "variant_barcodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "variant_barcodes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_variant_barcodes" ("barcode", "barcode_source", "barcode_type", "created_at", "description", "is_active", "updated_at", "variant_barcode_id", "variant_id") SELECT "barcode", "barcode_source", "barcode_type", "created_at", "description", "is_active", "updated_at", "variant_barcode_id", "variant_id" FROM "variant_barcodes";
DROP TABLE "variant_barcodes";
ALTER TABLE "new_variant_barcodes" RENAME TO "variant_barcodes";
CREATE INDEX "variant_barcodes_variant_id_idx" ON "variant_barcodes"("variant_id");
CREATE INDEX "variant_barcodes_tenant_id_idx" ON "variant_barcodes"("tenant_id");
CREATE INDEX "variant_barcodes_branch_id_idx" ON "variant_barcodes"("branch_id");
CREATE INDEX "variant_barcodes_barcode_idx" ON "variant_barcodes"("barcode");
CREATE INDEX "variant_barcodes_tenant_id_branch_id_updated_at_idx" ON "variant_barcodes"("tenant_id", "branch_id", "updated_at");
CREATE INDEX "variant_barcodes_updated_at_idx" ON "variant_barcodes"("updated_at");
CREATE INDEX "variant_barcodes_deleted_at_idx" ON "variant_barcodes"("deleted_at");
CREATE UNIQUE INDEX "variant_barcodes_tenant_id_branch_id_barcode_key" ON "variant_barcodes"("tenant_id", "branch_id", "barcode");
CREATE UNIQUE INDEX "variant_barcodes_variant_id_barcode_key" ON "variant_barcodes"("variant_id", "barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "branch_subscriptions_subscription_plan_id_idx" ON "branch_subscriptions"("subscription_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_progress_id_key" ON "onboarding_progress"("progress_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_terminal_id_key" ON "onboarding_progress"("terminal_id");

-- CreateIndex
CREATE INDEX "onboarding_progress_terminal_id_idx" ON "onboarding_progress"("terminal_id");

-- CreateIndex
CREATE INDEX "onboarding_progress_overall_status_idx" ON "onboarding_progress"("overall_status");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_steps_step_id_key" ON "onboarding_steps"("step_id");

-- CreateIndex
CREATE INDEX "onboarding_steps_progress_id_idx" ON "onboarding_steps"("progress_id");

-- CreateIndex
CREATE INDEX "onboarding_steps_status_idx" ON "onboarding_steps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_steps_progress_id_step_type_key" ON "onboarding_steps"("progress_id", "step_type");
