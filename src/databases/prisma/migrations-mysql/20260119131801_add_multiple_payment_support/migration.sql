-- CreateTable
CREATE TABLE `sale_payments` (
    `sale_payment_id` VARCHAR(191) NOT NULL,
    `sale_id` VARCHAR(191) NOT NULL,
    `payment_method_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `provider_id` VARCHAR(191) NULL,
    `provider_ref` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `synced` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sale_payments_sale_id_idx`(`sale_id`),
    INDEX `sale_payments_payment_method_id_idx`(`payment_method_id`),
    INDEX `sale_payments_status_idx`(`status`),
    INDEX `sale_payments_processed_at_idx`(`processed_at`),
    PRIMARY KEY (`sale_payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sale_payments` ADD CONSTRAINT `sale_payments_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_payments` ADD CONSTRAINT `sale_payments_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`method_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
