-- CreateTable
CREATE TABLE "app_setups" (
    "setup_id" TEXT NOT NULL PRIMARY KEY DEFAULT '-1',
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "encrypted_verification_token" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "data_signature" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "app_setups_tenant_id_idx" ON "app_setups"("tenant_id");

-- CreateIndex
CREATE INDEX "app_setups_branch_id_idx" ON "app_setups"("branch_id");

-- CreateIndex
CREATE INDEX "app_setups_terminal_id_idx" ON "app_setups"("terminal_id");

-- CreateIndex
CREATE INDEX "app_setups_created_at_idx" ON "app_setups"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "app_setups_tenant_id_branch_id_terminal_id_key" ON "app_setups"("tenant_id", "branch_id", "terminal_id");
