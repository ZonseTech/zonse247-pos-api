-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `is_refund` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `original_transaction_id` VARCHAR(191) NULL,
    ADD COLUMN `refund_reason` VARCHAR(191) NULL,
    ADD COLUMN `refunded_amount` DECIMAL(65, 30) NULL DEFAULT 0.00,
    ADD COLUMN `refunded_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_item_id` VARCHAR(191) NOT NULL,
    `return_transaction_id` VARCHAR(191) NOT NULL,
    `original_order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `returned_quantity` DECIMAL(65, 30) NOT NULL,
    `original_quantity` DECIMAL(65, 30) NOT NULL,
    `return_price` DECIMAL(65, 30) NOT NULL,
    `return_reason` VARCHAR(191) NULL,
    `restock_status` VARCHAR(191) NULL DEFAULT 'pending',
    `restocked_quantity` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `restocked_at` DATETIME(3) NULL,
    `condition` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `return_items_return_item_id_key`(`return_item_id`),
    INDEX `return_items_return_transaction_id_idx`(`return_transaction_id`),
    INDEX `return_items_original_order_id_idx`(`original_order_id`),
    INDEX `return_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `transactions_original_transaction_id_idx` ON `transactions`(`original_transaction_id`);

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_original_transaction_id_fkey` FOREIGN KEY (`original_transaction_id`) REFERENCES `transactions`(`transaction_id`) ON DELETE SET NULL ON UPDATE NO ACTION;
