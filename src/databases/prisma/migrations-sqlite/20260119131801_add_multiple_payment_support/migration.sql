-- CreateTable
CREATE TABLE "sale_payments" (
    "sale_payment_id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reference" TEXT,
    "provider_id" TEXT,
    "provider_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "synced" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("sale_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("method_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");

-- CreateIndex
CREATE INDEX "sale_payments_payment_method_id_idx" ON "sale_payments"("payment_method_id");

-- CreateIndex
CREATE INDEX "sale_payments_status_idx" ON "sale_payments"("status");

-- CreateIndex
CREATE INDEX "sale_payments_processed_at_idx" ON "sale_payments"("processed_at");
