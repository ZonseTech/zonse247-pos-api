-- CreateTable
CREATE TABLE "terminal_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setting_id" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "tenant_signature" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "contact" TEXT NOT NULL,
    "tax" DECIMAL,
    "tax_string" TEXT,
    "symbol" TEXT NOT NULL,
    "charge_tax" BOOLEAN NOT NULL DEFAULT false,
    "footer" TEXT NOT NULL,
    "img" TEXT,
    "till_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "terminal_settings_setting_id_key" ON "terminal_settings"("setting_id");

-- CreateIndex
CREATE INDEX "terminal_settings_setting_id_idx" ON "terminal_settings"("setting_id");

-- CreateIndex
CREATE INDEX "terminal_settings_tenant_id_idx" ON "terminal_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "terminal_settings_branch_id_idx" ON "terminal_settings"("branch_id");

-- CreateIndex
CREATE INDEX "terminal_settings_terminal_id_idx" ON "terminal_settings"("terminal_id");

-- CreateIndex
CREATE INDEX "terminal_settings_status_idx" ON "terminal_settings"("status");

-- CreateIndex
CREATE INDEX "terminal_settings_synced_idx" ON "terminal_settings"("synced");

-- CreateIndex
CREATE INDEX "terminal_settings_created_at_idx" ON "terminal_settings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "terminal_settings_tenant_id_branch_id_terminal_id_key" ON "terminal_settings"("tenant_id", "branch_id", "terminal_id");
