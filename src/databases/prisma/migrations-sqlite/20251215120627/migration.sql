/*
  Warnings:

  - You are about to drop the column `max_shops` on the `tenant_subscriptions` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "tenant_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans" ("subscription_plan_id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
INSERT INTO "new_tenant_subscriptions" ("auto_renew", "created_at", "ends_at", "last_payment_date", "next_payment_date", "payment_method", "starts_at", "status", "subscription_plan_id", "synced", "tenant_id", "tenant_subscription_id", "updated_at") SELECT "auto_renew", "created_at", "ends_at", "last_payment_date", "next_payment_date", "payment_method", "starts_at", "status", "subscription_plan_id", "synced", "tenant_id", "tenant_subscription_id", "updated_at" FROM "tenant_subscriptions";
DROP TABLE "tenant_subscriptions";
ALTER TABLE "new_tenant_subscriptions" RENAME TO "tenant_subscriptions";
CREATE INDEX "tenant_subscriptions_subscription_plan_id_idx" ON "tenant_subscriptions"("subscription_plan_id");
CREATE INDEX "tenant_subscriptions_tenant_id_idx" ON "tenant_subscriptions"("tenant_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
