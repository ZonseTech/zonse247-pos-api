-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "categories_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals" ("terminal_id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_categories" ("branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "item_count", "name", "sort_order", "synced", "tenant_id", "terminal_id", "updated_at", "user_id") SELECT "branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "item_count", "name", "sort_order", "synced", "tenant_id", "terminal_id", "updated_at", "user_id" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_category_id_key" ON "categories"("category_id");
CREATE INDEX "categories_branch_id_idx" ON "categories"("branch_id");
CREATE INDEX "categories_terminal_id_idx" ON "categories"("terminal_id");
CREATE UNIQUE INDEX "categories_branch_id_name_key" ON "categories"("branch_id", "name");
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
    CONSTRAINT "payment_methods_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_payment_methods" ("branch_id", "created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "synced", "tenant_id", "updated_at", "user_id") SELECT "branch_id", "created_at", "icon", "id", "is_active", "method_id", "name", "sort_order", "synced", "tenant_id", "updated_at", "user_id" FROM "payment_methods";
DROP TABLE "payment_methods";
ALTER TABLE "new_payment_methods" RENAME TO "payment_methods";
CREATE UNIQUE INDEX "payment_methods_method_id_key" ON "payment_methods"("method_id");
CREATE INDEX "payment_methods_branch_id_idx" ON "payment_methods"("branch_id");
CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");
CREATE TABLE "new_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "permission_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "scope" TEXT DEFAULT 'branch',
    "synced" INTEGER DEFAULT 0,
    "is_system_permission" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_permissions" ("category", "created_at", "description", "display_name", "id", "is_system_permission", "name", "permission_id", "scope", "synced", "updated_at") SELECT "category", "created_at", "description", "display_name", "id", "is_system_permission", "name", "permission_id", "scope", "synced", "updated_at" FROM "permissions";
DROP TABLE "permissions";
ALTER TABLE "new_permissions" RENAME TO "permissions";
CREATE UNIQUE INDEX "permissions_permission_id_key" ON "permissions"("permission_id");
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");
CREATE INDEX "permissions_category_idx" ON "permissions"("category");
CREATE INDEX "permissions_name_idx" ON "permissions"("name");
CREATE INDEX "permissions_scope_idx" ON "permissions"("scope");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
