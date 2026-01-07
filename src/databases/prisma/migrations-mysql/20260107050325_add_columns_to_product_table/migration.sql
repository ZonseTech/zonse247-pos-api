-- AlterTable
ALTER TABLE `products` ADD COLUMN `brand` VARCHAR(191) NULL,
    ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `dimensions` VARCHAR(191) NULL,
    ADD COLUMN `expiration_date` DATETIME(3) NULL,
    ADD COLUMN `is_taxable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `manufacture_date` DATETIME(3) NULL,
    ADD COLUMN `promo_end` DATETIME(3) NULL,
    ADD COLUMN `promo_price` DECIMAL(65, 30) NULL,
    ADD COLUMN `promo_start` DATETIME(3) NULL,
    ADD COLUMN `size` VARCHAR(191) NULL,
    ADD COLUMN `supplier_code` VARCHAR(191) NULL,
    ADD COLUMN `supplier_name` VARCHAR(191) NULL,
    ADD COLUMN `weight` DECIMAL(65, 30) NULL;
