/*
  Warnings:

  - Added the required column `terminal_id` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
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
INSERT INTO "new_categories" ("branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "item_count", "name", "sort_order", "synced", "tenant_id", "updated_at", "user_id") SELECT "branch_id", "category_id", "color", "created_at", "description", "id", "is_active", "item_count", "name", "sort_order", "synced", "tenant_id", "updated_at", "user_id" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_category_id_key" ON "categories"("category_id");
CREATE INDEX "categories_branch_id_idx" ON "categories"("branch_id");
CREATE INDEX "categories_terminal_id_idx" ON "categories"("terminal_id");
CREATE UNIQUE INDEX "categories_branch_id_name_key" ON "categories"("branch_id", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
