-- CreateTable
CREATE TABLE "printers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "printer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "printer_name" TEXT NOT NULL,
    "printer_model" TEXT,
    "printer_type" TEXT NOT NULL DEFAULT 'THERMAL',
    "connection_type" TEXT NOT NULL DEFAULT 'USB',
    "connection_address" TEXT,
    "port" INTEGER,
    "vendor_id" TEXT,
    "product_id" TEXT,
    "serial_number" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_receipt_printer" BOOLEAN NOT NULL DEFAULT true,
    "is_label_printer" BOOLEAN NOT NULL DEFAULT false,
    "is_kitchen_printer" BOOLEAN NOT NULL DEFAULT false,
    "is_report_printer" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "configuration" TEXT,
    "last_connected" DATETIME,
    "last_print_job" DATETIME,
    "print_job_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "printers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "printers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("branch_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "print_job_id" TEXT NOT NULL,
    "printer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "user_id" TEXT,
    "job_type" TEXT NOT NULL DEFAULT 'RECEIPT',
    "job_title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "content_type" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "error_message" TEXT,
    "printed_at" DATETIME,
    "scheduled_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "print_jobs_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "printers" ("printer_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "printers_printer_id_key" ON "printers"("printer_id");

-- CreateIndex
CREATE INDEX "printers_tenant_id_idx" ON "printers"("tenant_id");

-- CreateIndex
CREATE INDEX "printers_branch_id_idx" ON "printers"("branch_id");

-- CreateIndex
CREATE INDEX "printers_terminal_id_idx" ON "printers"("terminal_id");

-- CreateIndex
CREATE INDEX "printers_is_default_idx" ON "printers"("is_default");

-- CreateIndex
CREATE INDEX "printers_status_idx" ON "printers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_print_job_id_key" ON "print_jobs"("print_job_id");

-- CreateIndex
CREATE INDEX "print_jobs_printer_id_idx" ON "print_jobs"("printer_id");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_idx" ON "print_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "print_jobs_branch_id_idx" ON "print_jobs"("branch_id");

-- CreateIndex
CREATE INDEX "print_jobs_status_idx" ON "print_jobs"("status");

-- CreateIndex
CREATE INDEX "print_jobs_job_type_idx" ON "print_jobs"("job_type");

-- CreateIndex
CREATE INDEX "print_jobs_priority_idx" ON "print_jobs"("priority");

-- CreateIndex
CREATE INDEX "print_jobs_created_at_idx" ON "print_jobs"("created_at");
