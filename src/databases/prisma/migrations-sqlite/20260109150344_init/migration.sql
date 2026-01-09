/*
  Warnings:

  - You are about to drop the `MRA_API_CONFIG_TABLE` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `branch_id` on the `payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `payment_methods` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MRA_API_CONFIG_TABLE_tenant_id_environment_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MRA_API_CONFIG_TABLE";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "mra_api_config_table" (
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
    CONSTRAINT "mra_api_config_table_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payment_methods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "method_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_payment_methods" ("created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "synced", "updated_at") SELECT "created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "synced", "updated_at" FROM "payment_methods";
DROP TABLE "payment_methods";
ALTER TABLE "new_payment_methods" RENAME TO "payment_methods";
CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "mra_api_config_table_tenant_id_environment_key" ON "mra_api_config_table"("tenant_id", "environment");
