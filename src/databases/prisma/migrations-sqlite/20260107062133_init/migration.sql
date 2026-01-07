-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
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
    "brand" TEXT,
    "color" TEXT,
    "size" TEXT,
    "dimensions" TEXT,
    "weight" REAL,
    "promo_price" REAL,
    "promo_start" DATETIME,
    "promo_end" DATETIME,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "expiration_date" DATETIME,
    "manufacture_date" DATETIME,
    "supplier_name" TEXT,
    "supplier_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("branch_id", "category_id", "created_at", "description", "is_active", "name", "primary_barcode", "product_id", "selling_price", "sku", "tenant_id", "unit", "updated_at") SELECT "branch_id", "category_id", "created_at", "description", "is_active", "name", "primary_barcode", "product_id", "selling_price", "sku", "tenant_id", "unit", "updated_at" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX "products_primary_barcode_key" ON "products"("primary_barcode");
CREATE INDEX "products_branch_id_idx" ON "products"("branch_id");
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_primary_barcode_idx" ON "products"("primary_barcode");
CREATE UNIQUE INDEX "products_branch_id_sku_key" ON "products"("branch_id", "sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
