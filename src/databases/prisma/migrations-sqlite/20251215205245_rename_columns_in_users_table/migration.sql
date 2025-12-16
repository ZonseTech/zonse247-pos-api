/*
  Warnings:

  - You are about to drop the column `accessible_shops` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `allowed_workstations` on the `users` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "max_discount_percent" DECIMAL DEFAULT 0.00,
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
    CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "users_current_branch_id_fkey" FOREIGN KEY ("current_branch_id") REFERENCES "branches" ("branch_id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_users" ("branch_id", "can_override_prices", "created_at", "current_branch_id", "email", "force_password_change", "fullname", "id", "last_login", "last_logout", "max_discount_percent", "password", "password_changed_at", "phone", "pin_code", "role_id", "status", "synced", "tenant_id", "updated_at", "user_id", "username") SELECT "branch_id", "can_override_prices", "created_at", "current_branch_id", "email", "force_password_change", "fullname", "id", "last_login", "last_logout", "max_discount_percent", "password", "password_changed_at", "phone", "pin_code", "role_id", "status", "synced", "tenant_id", "updated_at", "user_id", "username" FROM "users";
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
