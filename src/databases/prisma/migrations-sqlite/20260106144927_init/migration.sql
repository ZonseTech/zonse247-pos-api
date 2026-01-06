-- AlterTable
ALTER TABLE "customers" ADD COLUMN "is_default" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE INDEX "customers_is_default_idx" ON "customers"("is_default");
