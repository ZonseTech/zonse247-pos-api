/*
  Warnings:

  - Added the required column `type` to the `payment_service_providers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `customers` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payment_service_providers` ADD COLUMN `type` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `printers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `printer_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NULL,
    `printer_name` VARCHAR(191) NOT NULL,
    `printer_model` VARCHAR(191) NULL,
    `printer_type` ENUM('THERMAL', 'INKJET', 'LASER', 'DOT_MATRIX', 'LABEL') NOT NULL DEFAULT 'THERMAL',
    `connection_type` ENUM('USB', 'NETWORK', 'BLUETOOTH', 'SERIAL', 'WIFI') NOT NULL DEFAULT 'USB',
    `connection_address` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `vendor_id` VARCHAR(191) NULL,
    `product_id` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_receipt_printer` BOOLEAN NOT NULL DEFAULT true,
    `is_label_printer` BOOLEAN NOT NULL DEFAULT false,
    `is_kitchen_printer` BOOLEAN NOT NULL DEFAULT false,
    `is_report_printer` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ONLINE', 'OFFLINE', 'BUSY', 'ERROR', 'PAPER_OUT', 'COVER_OPEN') NOT NULL DEFAULT 'OFFLINE',
    `configuration` JSON NULL,
    `last_connected` DATETIME(3) NULL,
    `last_print_job` DATETIME(3) NULL,
    `print_job_count` INTEGER NOT NULL DEFAULT 0,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `last_error` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `printers_printer_id_key`(`printer_id`),
    INDEX `printers_tenant_id_idx`(`tenant_id`),
    INDEX `printers_branch_id_idx`(`branch_id`),
    INDEX `printers_terminal_id_idx`(`terminal_id`),
    INDEX `printers_is_default_idx`(`is_default`),
    INDEX `printers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `print_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `print_job_id` VARCHAR(191) NOT NULL,
    `printer_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `job_type` ENUM('RECEIPT', 'INVOICE', 'REPORT', 'LABEL', 'BARCODE', 'KITCHEN_ORDER', 'TEST_PAGE') NOT NULL DEFAULT 'RECEIPT',
    `job_title` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `content` TEXT NOT NULL,
    `content_type` VARCHAR(191) NULL,
    `copies` INTEGER NOT NULL DEFAULT 1,
    `priority` INTEGER NOT NULL DEFAULT 5,
    `reference_id` VARCHAR(191) NULL,
    `reference_type` VARCHAR(191) NULL,
    `error_message` VARCHAR(191) NULL,
    `printed_at` DATETIME(3) NULL,
    `scheduled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `print_jobs_print_job_id_key`(`print_job_id`),
    INDEX `print_jobs_printer_id_idx`(`printer_id`),
    INDEX `print_jobs_tenant_id_idx`(`tenant_id`),
    INDEX `print_jobs_branch_id_idx`(`branch_id`),
    INDEX `print_jobs_status_idx`(`status`),
    INDEX `print_jobs_job_type_idx`(`job_type`),
    INDEX `print_jobs_priority_idx`(`priority`),
    INDEX `print_jobs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `printers` ADD CONSTRAINT `printers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `printers` ADD CONSTRAINT `printers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `print_jobs` ADD CONSTRAINT `print_jobs_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`printer_id`) ON DELETE CASCADE ON UPDATE NO ACTION;
