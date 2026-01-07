/*
  Warnings:

  - The primary key for the `inventory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `barcode` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `expiration_date` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `image_urls` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `is_taxable` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated_by` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `manufacture_date` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `min_stock` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `original_quantity` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `promo_end` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `promo_price` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `promo_start` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `properties` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `reorder_level` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `sell_price` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_code` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_name` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `inventory` table. All the data in the column will be lost.
  - The required column `inventory_id` was added to the `inventory` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Made the column `reserved_quantity` on table `inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `track_inventory` on table `inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `allow_negative_stock` on table `inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `inventory` required. This step will fail if there are existing NULL values in that column.

*/
-- Rename existing inventory table to inventory_old to preserve data
RENAME TABLE `inventory` TO `inventory_old`;

-- Drop foreign keys from the old inventory table (now inventory_old) to avoid naming conflicts
ALTER TABLE `inventory_old` DROP FOREIGN KEY `inventory_branch_id_fkey`;
ALTER TABLE `inventory_old` DROP FOREIGN KEY `inventory_category_id_fkey`;
ALTER TABLE `inventory_old` DROP FOREIGN KEY `inventory_created_by_fkey`;
ALTER TABLE `inventory_old` DROP FOREIGN KEY `inventory_last_updated_by_fkey`;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `sale_id` VARCHAR(191) NULL;

-- Clean up invalid foreign key references in transactions table
UPDATE `transactions` SET `payment_method_id` = NULL WHERE `payment_method_id` NOT IN (SELECT `method_id` FROM `payment_methods`);
UPDATE `transactions` SET `payment_service_provider_id` = NULL WHERE `payment_service_provider_id` IS NOT NULL AND `payment_service_provider_id` NOT IN (SELECT `providerId` FROM `payment_service_providers`);
UPDATE `transactions` SET `terminal_id` = NULL WHERE `terminal_id` IS NOT NULL AND `terminal_id` NOT IN (SELECT `terminal_id` FROM `terminals`);

-- CreateTable: New inventory table with new structure
CREATE TABLE `inventory` (
    `inventory_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `available_quantity` INTEGER NOT NULL DEFAULT 0,
    `reserved_quantity` INTEGER NOT NULL DEFAULT 0,
    `damaged_quantity` INTEGER NOT NULL DEFAULT 0,
    `average_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `last_purchase_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `reorder_point` INTEGER NULL,
    `max_stock` INTEGER NULL,
    `track_inventory` BOOLEAN NOT NULL DEFAULT true,
    `allow_negative_stock` BOOLEAN NOT NULL DEFAULT false,
    `last_restocked_at` DATETIME(3) NULL,
    `last_sold_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_product_id_key`(`product_id`),
    INDEX `inventory_branch_id_idx`(`branch_id`),
    INDEX `inventory_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_product_id_idx`(`product_id`),
    PRIMARY KEY (`inventory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `product_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `primary_barcode` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'piece',
    `selling_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    UNIQUE INDEX `products_primary_barcode_key`(`primary_barcode`),
    INDEX `products_branch_id_idx`(`branch_id`),
    INDEX `products_tenant_id_idx`(`tenant_id`),
    INDEX `products_primary_barcode_idx`(`primary_barcode`),
    UNIQUE INDEX `products_branch_id_sku_key`(`branch_id`, `sku`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_barcodes` (
    `product_barcode_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NOT NULL,
    `barcode_type` ENUM('EAN13', 'EAN8', 'UPCA', 'UPCE', 'CODE39', 'CODE128', 'QR', 'CUSTOM') NOT NULL DEFAULT 'EAN13',
    `barcode_source` ENUM('MANUFACTURER', 'SUPPLIER', 'STORE', 'BUNDLE', 'PACKAGING', 'CUSTOM') NOT NULL DEFAULT 'SUPPLIER',
    `description` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_barcodes_barcode_key`(`barcode`),
    INDEX `product_barcodes_product_id_idx`(`product_id`),
    INDEX `product_barcodes_barcode_idx`(`barcode`),
    UNIQUE INDEX `product_barcodes_product_id_barcode_key`(`product_id`, `barcode`),
    PRIMARY KEY (`product_barcode_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `supplier_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `contact_person` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_code_key`(`code`),
    INDEX `suppliers_branch_id_idx`(`branch_id`),
    INDEX `suppliers_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`supplier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `purchase_order_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `supplier_id` VARCHAR(191) NOT NULL,
    `po_number` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SHIPPED', 'RECEIVED', 'CANCELLED', 'PARTIALLY_RECEIVED') NOT NULL DEFAULT 'PENDING',
    `order_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expected_delivery_date` DATETIME(3) NULL,
    `received_at` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `received_by` VARCHAR(191) NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_orders_po_number_key`(`po_number`),
    INDEX `purchase_orders_branch_id_idx`(`branch_id`),
    INDEX `purchase_orders_tenant_id_idx`(`tenant_id`),
    INDEX `purchase_orders_supplier_id_idx`(`supplier_id`),
    INDEX `purchase_orders_status_idx`(`status`),
    INDEX `purchase_orders_po_number_idx`(`po_number`),
    PRIMARY KEY (`purchase_order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `purchase_order_item_id` VARCHAR(191) NOT NULL,
    `purchase_order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `ordered_quantity` INTEGER NOT NULL DEFAULT 0,
    `received_quantity` INTEGER NOT NULL DEFAULT 0,
    `damaged_quantity` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_order_items_purchase_order_id_idx`(`purchase_order_id`),
    INDEX `purchase_order_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `purchase_order_items_purchase_order_id_product_id_key`(`purchase_order_id`, `product_id`),
    PRIMARY KEY (`purchase_order_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `stock_movement_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `inventory_id` VARCHAR(191) NOT NULL,
    `movement_type` ENUM('PURCHASE_RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `previous_quantity` INTEGER NOT NULL,
    `new_quantity` INTEGER NOT NULL,
    `reference_type` ENUM('PURCHASE_ORDER', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER') NULL,
    `reference_id` VARCHAR(191) NULL,
    `unit_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(191) NULL,
    `moved_by` VARCHAR(191) NOT NULL,
    `movement_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_branch_id_idx`(`branch_id`),
    INDEX `stock_movements_tenant_id_idx`(`tenant_id`),
    INDEX `stock_movements_inventory_id_idx`(`inventory_id`),
    INDEX `stock_movements_movement_type_idx`(`movement_type`),
    INDEX `stock_movements_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `stock_movements_movement_date_idx`(`movement_date`),
    PRIMARY KEY (`stock_movement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `sale_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `sale_number` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `terminal_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `change_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `payment_method_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `sale_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `is_voided` BOOLEAN NOT NULL DEFAULT false,
    `voided_at` DATETIME(3) NULL,
    `voided_by` VARCHAR(191) NULL,
    `void_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sales_sale_number_key`(`sale_number`),
    INDEX `sales_branch_id_idx`(`branch_id`),
    INDEX `sales_tenant_id_idx`(`tenant_id`),
    INDEX `sales_customer_id_idx`(`customer_id`),
    INDEX `sales_terminal_id_idx`(`terminal_id`),
    INDEX `sales_user_id_idx`(`user_id`),
    INDEX `sales_sale_date_idx`(`sale_date`),
    INDEX `sales_sale_number_idx`(`sale_number`),
    PRIMARY KEY (`sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_items` (
    `sale_item_id` VARCHAR(191) NOT NULL,
    `sale_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(65, 30) NOT NULL,
    `unit_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(65, 30) NOT NULL,
    `tax_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sale_items_sale_id_idx`(`sale_id`),
    INDEX `sale_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `sale_items_sale_id_product_id_key`(`sale_id`, `product_id`),
    PRIMARY KEY (`sale_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `transactions_customer_id_idx` ON `transactions`(`customer_id`);

-- CreateIndex
CREATE INDEX `transactions_user_id_idx` ON `transactions`(`user_id`);

-- CreateIndex
CREATE INDEX `transactions_payment_method_id_idx` ON `transactions`(`payment_method_id`);

-- CreateIndex
CREATE INDEX `transactions_payment_service_provider_id_idx` ON `transactions`(`payment_service_provider_id`);

-- CreateIndex
CREATE INDEX `transactions_terminal_id_idx` ON `transactions`(`terminal_id`);

-- CreateIndex
CREATE INDEX `transactions_sale_id_idx` ON `transactions`(`sale_id`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_barcodes` ADD CONSTRAINT `product_barcodes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_received_by_fkey` FOREIGN KEY (`received_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`inventory_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_moved_by_fkey` FOREIGN KEY (`moved_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`method_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_voided_by_fkey` FOREIGN KEY (`voided_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`method_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_payment_service_provider_id_fkey` FOREIGN KEY (`payment_service_provider_id`) REFERENCES `payment_service_providers`(`providerId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE SET NULL ON UPDATE CASCADE;
