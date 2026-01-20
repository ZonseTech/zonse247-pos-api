/*
  Warnings:

  - You are about to drop the `HoldOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HoldOrderItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `HoldOrderItem` DROP FOREIGN KEY `HoldOrderItem_holdOrderId_fkey`;

-- DropTable
DROP TABLE `HoldOrder`;

-- DropTable
DROP TABLE `HoldOrderItem`;

-- CreateTable
CREATE TABLE `parked_sales` (
    `parked_sale_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NULL,
    `customer_id` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_items` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PARKED', 'RESUMED', 'CANCELLED', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'PARKED',
    `notes` VARCHAR(191) NULL,
    `parked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `resumed_at` DATETIME(3) NULL,
    `synced` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parked_sales_reference_key`(`reference`),
    INDEX `parked_sales_tenant_id_idx`(`tenant_id`),
    INDEX `parked_sales_branch_id_idx`(`branch_id`),
    INDEX `parked_sales_user_id_idx`(`user_id`),
    INDEX `parked_sales_terminal_id_idx`(`terminal_id`),
    INDEX `parked_sales_reference_idx`(`reference`),
    INDEX `parked_sales_status_idx`(`status`),
    INDEX `parked_sales_parked_at_idx`(`parked_at`),
    INDEX `parked_sales_created_at_idx`(`created_at`),
    PRIMARY KEY (`parked_sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parked_sale_items` (
    `parked_sale_item_id` VARCHAR(191) NOT NULL,
    `parked_sale_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `sell_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `purchase_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `parked_sale_items_parked_sale_id_idx`(`parked_sale_id`),
    INDEX `parked_sale_items_product_id_idx`(`product_id`),
    INDEX `parked_sale_items_category_id_idx`(`category_id`),
    PRIMARY KEY (`parked_sale_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parked_sale_items` ADD CONSTRAINT `parked_sale_items_parked_sale_id_fkey` FOREIGN KEY (`parked_sale_id`) REFERENCES `parked_sales`(`parked_sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;
