-- CreateTable
CREATE TABLE "HoldOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hold',
    "userId" TEXT,
    "till" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tenantId" TEXT,
    "branchId" TEXT
);

-- CreateTable
CREATE TABLE "HoldOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holdOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "sku" TEXT,
    "barcode" TEXT,
    "unit" TEXT,
    "discount" DECIMAL DEFAULT 0,
    "tax" DECIMAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HoldOrderItem_holdOrderId_fkey" FOREIGN KEY ("holdOrderId") REFERENCES "HoldOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HoldOrder_itemId_key" ON "HoldOrder"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "HoldOrder_reference_key" ON "HoldOrder"("reference");

-- CreateIndex
CREATE INDEX "HoldOrder_itemId_idx" ON "HoldOrder"("itemId");

-- CreateIndex
CREATE INDEX "HoldOrder_reference_idx" ON "HoldOrder"("reference");

-- CreateIndex
CREATE INDEX "HoldOrder_date_idx" ON "HoldOrder"("date");

-- CreateIndex
CREATE INDEX "HoldOrder_status_idx" ON "HoldOrder"("status");

-- CreateIndex
CREATE INDEX "HoldOrder_userId_idx" ON "HoldOrder"("userId");

-- CreateIndex
CREATE INDEX "HoldOrder_createdAt_idx" ON "HoldOrder"("createdAt");

-- CreateIndex
CREATE INDEX "HoldOrderItem_holdOrderId_idx" ON "HoldOrderItem"("holdOrderId");

-- CreateIndex
CREATE INDEX "HoldOrderItem_productId_idx" ON "HoldOrderItem"("productId");
