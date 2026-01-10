-- CreateTable
CREATE TABLE "tenant_registration_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "detail_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenant_code" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_registration_details_detail_id_key" ON "tenant_registration_details"("detail_id");

-- CreateIndex
CREATE INDEX "tenant_registration_details_tenant_id_idx" ON "tenant_registration_details"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_registration_details_email_idx" ON "tenant_registration_details"("email");

-- CreateIndex
CREATE INDEX "tenant_registration_details_is_processed_idx" ON "tenant_registration_details"("is_processed");
