-- CreateTable
CREATE TABLE `app_setups` (
    `setup_id` VARCHAR(191) NOT NULL DEFAULT '-1',
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NOT NULL,
    `encrypted_verification_token` VARCHAR(191) NOT NULL,
    `iv` VARCHAR(191) NOT NULL,
    `data_signature` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `app_setups_tenant_id_idx`(`tenant_id`),
    INDEX `app_setups_branch_id_idx`(`branch_id`),
    INDEX `app_setups_terminal_id_idx`(`terminal_id`),
    INDEX `app_setups_created_at_idx`(`created_at`),
    UNIQUE INDEX `app_setups_tenant_id_branch_id_terminal_id_key`(`tenant_id`, `branch_id`, `terminal_id`),
    PRIMARY KEY (`setup_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terminal_settings` (
    `id` VARCHAR(191) NOT NULL,
    `setting_id` VARCHAR(191) NOT NULL,
    `app` VARCHAR(191) NOT NULL,
    `store` VARCHAR(191) NOT NULL,
    `verification_token` VARCHAR(191) NOT NULL,
    `address_line1` VARCHAR(191) NULL,
    `address_line2` VARCHAR(191) NULL,
    `tenant_signature` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NOT NULL,
    `tax` DECIMAL(65, 30) NULL,
    `tax_string` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `charge_tax` BOOLEAN NOT NULL DEFAULT false,
    `footer` VARCHAR(191) NOT NULL,
    `img` VARCHAR(191) NULL,
    `till_name` VARCHAR(191) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `synced` BOOLEAN NOT NULL DEFAULT false,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `terminal_settings_setting_id_key`(`setting_id`),
    INDEX `terminal_settings_setting_id_idx`(`setting_id`),
    INDEX `terminal_settings_tenant_id_idx`(`tenant_id`),
    INDEX `terminal_settings_branch_id_idx`(`branch_id`),
    INDEX `terminal_settings_terminal_id_idx`(`terminal_id`),
    INDEX `terminal_settings_status_idx`(`status`),
    INDEX `terminal_settings_synced_idx`(`synced`),
    INDEX `terminal_settings_created_at_idx`(`created_at`),
    UNIQUE INDEX `terminal_settings_tenant_id_branch_id_terminal_id_key`(`tenant_id`, `branch_id`, `terminal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HoldOrder` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `total` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalItems` INTEGER NOT NULL DEFAULT 0,
    `date` DATETIME(3) NOT NULL,
    `status` ENUM('hold', 'resumed', 'cancelled', 'completed', 'expired') NOT NULL DEFAULT 'hold',
    `userId` VARCHAR(191) NULL,
    `till` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,

    UNIQUE INDEX `HoldOrder_itemId_key`(`itemId`),
    UNIQUE INDEX `HoldOrder_reference_key`(`reference`),
    INDEX `HoldOrder_itemId_idx`(`itemId`),
    INDEX `HoldOrder_reference_idx`(`reference`),
    INDEX `HoldOrder_date_idx`(`date`),
    INDEX `HoldOrder_status_idx`(`status`),
    INDEX `HoldOrder_userId_idx`(`userId`),
    INDEX `HoldOrder_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HoldOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `holdOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `sku` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `discount` DECIMAL(65, 30) NULL DEFAULT 0,
    `tax` DECIMAL(65, 30) NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HoldOrderItem_holdOrderId_idx`(`holdOrderId`),
    INDEX `HoldOrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HoldOrderItem` ADD CONSTRAINT `HoldOrderItem_holdOrderId_fkey` FOREIGN KEY (`holdOrderId`) REFERENCES `HoldOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
