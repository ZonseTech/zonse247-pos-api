/*
  Warnings:

  - You are about to drop the column `code` on the `suppliers` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `suppliers_code_key` ON `suppliers`;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `category_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `suppliers` DROP COLUMN `code`,
    ADD COLUMN `credit_limit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `payment_terms` ENUM('CASH_ON_DELIVERY', 'NET_15', 'NET_30', 'NET_60', 'NET_90') NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `tax_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `products_category_id_idx` ON `products`(`category_id`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_barcode_idx` TO `inventory_old_barcode_idx`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_branch_id_idx` TO `inventory_old_branch_id_idx`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_category_id_idx` TO `inventory_old_category_id_idx`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_created_by_idx` TO `inventory_old_created_by_idx`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_last_updated_by_idx` TO `inventory_old_last_updated_by_idx`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_name_idx` TO `inventory_old_name_idx`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_product_id_key` TO `inventory_old_product_id_key`;

-- RenameIndex
ALTER TABLE `inventory_old` RENAME INDEX `inventory_status_idx` TO `inventory_old_status_idx`;
