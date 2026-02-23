/*
  Warnings:

  - You are about to drop the `HoldOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HoldOrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `district` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `expiration_date` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `manufacture_date` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `primary_barcode` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `promo_end` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `promo_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `promo_start` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `selling_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `purchase_order_items` table. All the data in the column will be lost.
  - You are about to drop the column `auto_logout_minutes` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `backup_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `business_license` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `business_tax_id` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `configuration_date` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `customer_management_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `customer_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `date_format` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `display_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `hardware_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `integration_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `inventory_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `last_configured_by` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `localization_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `mra_compliance_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `performance_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `pin_length` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `reporting_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `server_url` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `session_timeout_minutes` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_address` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_email` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_name` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_phone` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `sync_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tax_fee_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tax_rate` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `time_format` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `workflow_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - Added the required column `variant_id` to the `purchase_order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variant_id` to the `sale_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HoldOrder_createdAt_idx";

-- DropIndex
DROP INDEX "HoldOrder_userId_idx";

-- DropIndex
DROP INDEX "HoldOrder_status_idx";

-- DropIndex
DROP INDEX "HoldOrder_date_idx";

-- DropIndex
DROP INDEX "HoldOrder_reference_idx";

-- DropIndex
DROP INDEX "HoldOrder_itemId_idx";

-- DropIndex
DROP INDEX "HoldOrder_reference_key";

-- DropIndex
DROP INDEX "HoldOrder_itemId_key";

-- DropIndex
DROP INDEX "HoldOrderItem_productId_idx";

-- DropIndex
DROP INDEX "HoldOrderItem_holdOrderId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HoldOrder";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HoldOrderItem";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "product_variants" (
    "variant_id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_variants_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "variant_barcodes" (
    "variant_barcode_id" TEXT NOT NULL PRIMARY KEY,
    "variant_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcode_type" TEXT NOT NULL DEFAULT 'EAN13',
    "barcode_source" TEXT NOT NULL DEFAULT 'SUPPLIER',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "variant_barcodes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "districts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "district_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parked_sales" (
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
    "synced" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parked_sale_items" (
    "parked_sale_item_id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "parked_sale_items_parked_sale_id_fkey" FOREIGN KEY ("parked_sale_id") REFERENCES "parked_sales" ("parked_sale_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staff_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "synced" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "synced" INTEGER DEFAULT 0,
    "mra_approval_status" TEXT DEFAULT 'PENDING',
    "mra_approval_date" DATETIME,
    "status" TEXT DEFAULT 'active',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "branches_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts" ("district_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_branches" ("address_line_1", "address_line_2", "address_line_3", "branch_code", "branch_id", "branch_name", "charge_tax", "city", "created_at", "currency_code", "currency_symbol", "description", "email", "id", "is_active", "is_virtual_warehouse", "logo_url", "mra_approval_date", "mra_approval_status", "phone_number", "postal_code", "receipt_footer", "site_id", "site_name", "state", "status", "synced", "tax_rate", "tenant_id", "updated_at") SELECT "address_line_1", "address_line_2", "address_line_3", "branch_code", "branch_id", "branch_name", "charge_tax", "city", "created_at", "currency_code", "currency_symbol", "description", "email", "id", "is_active", "is_virtual_warehouse", "logo_url", "mra_approval_date", "mra_approval_status", "phone_number", "postal_code", "receipt_footer", "site_id", "site_name", "state", "status", "synced", "tax_rate", "tenant_id", "updated_at" FROM "branches";
DROP TABLE "branches";
ALTER TABLE "new_branches" RENAME TO "branches";
CREATE UNIQUE INDEX "branches_branch_id_key" ON "branches"("branch_id");
CREATE INDEX "branches_branch_code_idx" ON "branches"("branch_code");
CREATE INDEX "branches_tenant_id_is_active_idx" ON "branches"("tenant_id", "is_active");
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");
CREATE UNIQUE INDEX "branches_tenant_id_branch_code_key" ON "branches"("tenant_id", "branch_code");
CREATE TABLE "new_inventory" (
    "inventory_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inventory" ("allow_negative_stock", "available_quantity", "average_cost", "branch_id", "created_at", "damaged_quantity", "inventory_id", "last_purchase_cost", "last_restocked_at", "last_sold_at", "max_stock", "product_id", "reorder_point", "reserved_quantity", "tenant_id", "track_inventory", "updated_at") SELECT "allow_negative_stock", "available_quantity", "average_cost", "branch_id", "created_at", "damaged_quantity", "inventory_id", "last_purchase_cost", "last_restocked_at", "last_sold_at", "max_stock", "product_id", "reorder_point", "reserved_quantity", "tenant_id", "track_inventory", "updated_at" FROM "inventory";
DROP TABLE "inventory";
ALTER TABLE "new_inventory" RENAME TO "inventory";
CREATE UNIQUE INDEX "inventory_variant_id_key" ON "inventory"("variant_id");
CREATE INDEX "inventory_branch_id_idx" ON "inventory"("branch_id");
CREATE INDEX "inventory_tenant_id_idx" ON "inventory"("tenant_id");
CREATE INDEX "inventory_variant_id_idx" ON "inventory"("variant_id");
CREATE INDEX "inventory_product_id_idx" ON "inventory"("product_id");
CREATE TABLE "new_product_barcodes" (
    "product_barcode_id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcode_type" TEXT NOT NULL DEFAULT 'EAN13',
    "barcode_source" TEXT NOT NULL DEFAULT 'SUPPLIER',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_product_barcodes" ("barcode", "barcode_source", "barcode_type", "created_at", "description", "is_active", "product_barcode_id", "product_id", "updated_at") SELECT "barcode", "barcode_source", "barcode_type", "created_at", "description", "is_active", "product_barcode_id", "product_id", "updated_at" FROM "product_barcodes";
DROP TABLE "product_barcodes";
ALTER TABLE "new_product_barcodes" RENAME TO "product_barcodes";
CREATE UNIQUE INDEX "product_barcodes_barcode_key" ON "product_barcodes"("barcode");
CREATE INDEX "product_barcodes_product_id_idx" ON "product_barcodes"("product_id");
CREATE INDEX "product_barcodes_barcode_idx" ON "product_barcodes"("barcode");
CREATE UNIQUE INDEX "product_barcodes_product_id_barcode_key" ON "product_barcodes"("product_id", "barcode");
CREATE TABLE "new_products" (
    "product_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("branch_id", "brand", "category_id", "created_at", "description", "is_active", "is_taxable", "name", "product_id", "supplier_code", "supplier_name", "tenant_id", "updated_at") SELECT "branch_id", "brand", "category_id", "created_at", "description", "is_active", "is_taxable", "name", "product_id", "supplier_code", "supplier_name", "tenant_id", "updated_at" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE INDEX "products_branch_id_idx" ON "products"("branch_id");
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_name_idx" ON "products"("name");
CREATE UNIQUE INDEX "products_branch_id_name_key" ON "products"("branch_id", "name");
CREATE TABLE "new_purchase_order_items" (
    "purchase_order_item_id" TEXT NOT NULL PRIMARY KEY,
    "purchase_order_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "ordered_quantity" INTEGER NOT NULL DEFAULT 0,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" REAL NOT NULL DEFAULT 0.00,
    "total_price" REAL NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("purchase_order_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_order_items" ("created_at", "damaged_quantity", "notes", "ordered_quantity", "purchase_order_id", "purchase_order_item_id", "received_quantity", "total_price", "unit_price", "updated_at") SELECT "created_at", "damaged_quantity", "notes", "ordered_quantity", "purchase_order_id", "purchase_order_item_id", "received_quantity", "total_price", "unit_price", "updated_at" FROM "purchase_order_items";
DROP TABLE "purchase_order_items";
ALTER TABLE "new_purchase_order_items" RENAME TO "purchase_order_items";
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX "purchase_order_items_variant_id_idx" ON "purchase_order_items"("variant_id");
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_variant_id_key" ON "purchase_order_items"("purchase_order_id", "variant_id");
CREATE TABLE "new_sale_items" (
    "sale_item_id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" REAL NOT NULL,
    "unit_cost" REAL NOT NULL DEFAULT 0.00,
    "subtotal" REAL NOT NULL,
    "tax_amount" REAL NOT NULL DEFAULT 0.00,
    "discount_amount" REAL NOT NULL DEFAULT 0.00,
    "total_amount" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_items" ("created_at", "discount_amount", "product_id", "quantity", "sale_id", "sale_item_id", "subtotal", "tax_amount", "total_amount", "unit_cost", "unit_price") SELECT "created_at", "discount_amount", "product_id", "quantity", "sale_id", "sale_item_id", "subtotal", "tax_amount", "total_amount", "unit_cost", "unit_price" FROM "sale_items";
DROP TABLE "sale_items";
ALTER TABLE "new_sale_items" RENAME TO "sale_items";
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX "sale_items_variant_id_idx" ON "sale_items"("variant_id");
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");
CREATE UNIQUE INDEX "sale_items_sale_id_variant_id_key" ON "sale_items"("sale_id", "variant_id");
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
INSERT INTO "new_sales" ("amount_paid", "branch_id", "change_amount", "created_at", "customer_id", "discount_amount", "is_voided", "notes", "payment_method_id", "sale_date", "sale_id", "sale_number", "status", "subtotal", "tax_amount", "tenant_id", "terminal_id", "total_amount", "updated_at", "user_id", "void_reason", "voided_at", "voided_by") SELECT "amount_paid", "branch_id", "change_amount", "created_at", "customer_id", "discount_amount", "is_voided", "notes", "payment_method_id", "sale_date", "sale_id", "sale_number", "status", "subtotal", "tax_amount", "tenant_id", "terminal_id", "total_amount", "updated_at", "user_id", "void_reason", "voided_at", "voided_by" FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE INDEX "sales_branch_id_idx" ON "sales"("branch_id");
CREATE INDEX "sales_tenant_id_idx" ON "sales"("tenant_id");
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");
CREATE INDEX "sales_terminal_id_idx" ON "sales"("terminal_id");
CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");
CREATE INDEX "sales_sale_number_idx" ON "sales"("sale_number");
CREATE UNIQUE INDEX "sales_tenant_id_branch_id_sale_number_key" ON "sales"("tenant_id", "branch_id", "sale_number");
CREATE TABLE "new_terminal_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "terminal_id" TEXT NOT NULL,
    "general_settings" JSONB,
    "receipt_settings" JSONB,
    "business_settings" JSONB,
    "security_settings" JSONB,
    "settings_version" TEXT NOT NULL DEFAULT '3.0.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "terminal_settings_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_terminal_settings" ("created_at", "id", "is_active", "receipt_settings", "security_settings", "settings_version", "terminal_id", "updated_at") SELECT "created_at", "id", "is_active", "receipt_settings", "security_settings", "settings_version", "terminal_id", "updated_at" FROM "terminal_settings";
DROP TABLE "terminal_settings";
ALTER TABLE "new_terminal_settings" RENAME TO "terminal_settings";
CREATE UNIQUE INDEX "terminal_settings_terminal_id_key" ON "terminal_settings"("terminal_id");
CREATE INDEX "terminal_settings_terminal_id_idx" ON "terminal_settings"("terminal_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_primary_barcode_key" ON "product_variants"("primary_barcode");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_variants_branch_id_idx" ON "product_variants"("branch_id");

-- CreateIndex
CREATE INDEX "product_variants_tenant_id_idx" ON "product_variants"("tenant_id");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_primary_barcode_idx" ON "product_variants"("primary_barcode");

-- CreateIndex
CREATE INDEX "product_variants_variant_name_idx" ON "product_variants"("variant_name");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_variant_name_key" ON "product_variants"("product_id", "variant_name");

-- CreateIndex
CREATE UNIQUE INDEX "variant_barcodes_barcode_key" ON "variant_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "variant_barcodes_variant_id_idx" ON "variant_barcodes"("variant_id");

-- CreateIndex
CREATE INDEX "variant_barcodes_barcode_idx" ON "variant_barcodes"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "variant_barcodes_variant_id_barcode_key" ON "variant_barcodes"("variant_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "districts_district_id_key" ON "districts"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE INDEX "districts_region_idx" ON "districts"("region");

-- CreateIndex
CREATE INDEX "districts_is_active_idx" ON "districts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "parked_sales_reference_key" ON "parked_sales"("reference");

-- CreateIndex
CREATE INDEX "parked_sales_tenant_id_idx" ON "parked_sales"("tenant_id");

-- CreateIndex
CREATE INDEX "parked_sales_branch_id_idx" ON "parked_sales"("branch_id");

-- CreateIndex
CREATE INDEX "parked_sales_user_id_idx" ON "parked_sales"("user_id");

-- CreateIndex
CREATE INDEX "parked_sales_terminal_id_idx" ON "parked_sales"("terminal_id");

-- CreateIndex
CREATE INDEX "parked_sales_reference_idx" ON "parked_sales"("reference");

-- CreateIndex
CREATE INDEX "parked_sales_status_idx" ON "parked_sales"("status");

-- CreateIndex
CREATE INDEX "parked_sales_parked_at_idx" ON "parked_sales"("parked_at");

-- CreateIndex
CREATE INDEX "parked_sales_created_at_idx" ON "parked_sales"("created_at");

-- CreateIndex
CREATE INDEX "parked_sale_items_parked_sale_id_idx" ON "parked_sale_items"("parked_sale_id");

-- CreateIndex
CREATE INDEX "parked_sale_items_product_id_idx" ON "parked_sale_items"("product_id");

-- CreateIndex
CREATE INDEX "parked_sale_items_category_id_idx" ON "parked_sale_items"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staff_id_key" ON "staff"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");

-- CreateIndex
CREATE INDEX "idx_staff_user_id" ON "staff"("user_id");

-- CreateIndex
CREATE INDEX "idx_staff_tenant_id" ON "staff"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_staff_branch_id" ON "staff"("branch_id");

-- CreateIndex
CREATE INDEX "idx_staff_employment_status" ON "staff"("employment_status");

-- CreateIndex
CREATE INDEX "idx_staff_joining_date" ON "staff"("joining_date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_tenant_id_employee_code_key" ON "staff"("tenant_id", "employee_code");
