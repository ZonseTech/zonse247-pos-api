-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_branch_id_fkey`;

-- DropIndex
DROP INDEX `products_branch_id_sku_key` ON `products`;

-- DropIndex
DROP INDEX `products_sku_key` ON `products`;

-- AlterTable
ALTER TABLE `products` MODIFY `sku` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `products_sku_idx` ON `products`(`sku`);

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE;
