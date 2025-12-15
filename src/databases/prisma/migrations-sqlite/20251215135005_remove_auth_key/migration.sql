/*
  Warnings:

  - You are about to drop the column `auth_key` on the `tenants` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "subscription_plan" TEXT,
    "subscription_status" TEXT DEFAULT 'TRIAL',
    "owner_name" TEXT NOT NULL,
    "address" TEXT,
    "country" TEXT,
    "verification_token" TEXT NOT NULL,
    "trial_ends_at" DATETIME,
    "status" TEXT DEFAULT 'pending',
    "registered_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "activated_at" DATETIME,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_tenants" ("activated_at", "address", "business_name", "business_type", "country", "created_at", "email", "id", "is_vat_registered", "mra_portal_username", "msonkho_online_status", "owner_name", "phone_number", "registered_at", "status", "subscription_plan", "subscription_status", "synced", "tax_office_code", "tenant_code", "tenant_id", "tin", "trading_name", "trial_ends_at", "updated_at", "verification_token") SELECT "activated_at", "address", "business_name", "business_type", "country", "created_at", "email", "id", "is_vat_registered", "mra_portal_username", "msonkho_online_status", "owner_name", "phone_number", "registered_at", "status", "subscription_plan", "subscription_status", "synced", "tax_office_code", "tenant_code", "tenant_id", "tin", "trading_name", "trial_ends_at", "updated_at", "verification_token" FROM "tenants";
DROP TABLE "tenants";
ALTER TABLE "new_tenants" RENAME TO "tenants";
CREATE UNIQUE INDEX "tenants_tenant_id_key" ON "tenants"("tenant_id");
CREATE UNIQUE INDEX "tenants_tin_key" ON "tenants"("tin");
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");
CREATE INDEX "tenants_email_idx" ON "tenants"("email");
CREATE INDEX "tenants_subscription_status_idx" ON "tenants"("subscription_status");
CREATE INDEX "tenants_tenant_code_idx" ON "tenants"("tenant_code");
CREATE INDEX "tenants_tin_idx" ON "tenants"("tin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
