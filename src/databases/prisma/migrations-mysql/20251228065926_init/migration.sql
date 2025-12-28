/*
  Warnings:

  - You are about to alter the column `scope` on the `permissions` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `Enum(EnumId(8))`.
  - You are about to drop the column `max_shops` on the `tenant_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `auth_key` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `address_line1` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `address_line2` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `app` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `branch_id` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `charge_tax` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `footer` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `img` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `setting_id` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `symbol` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `synced` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tax_string` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_signature` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `till_name` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `accessible_shops` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `allowed_workstations` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[terminal_id]` on the table `terminal_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_branch_id_fkey`;

-- DropForeignKey
ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_user_id_fkey`;

-- DropIndex
DROP INDEX `payment_methods_branch_id_name_key` ON `payment_methods`;

-- DropIndex
DROP INDEX `payment_methods_tenant_id_name_key` ON `payment_methods`;

-- DropIndex
DROP INDEX `payment_methods_user_id_name_key` ON `payment_methods`;

-- DropIndex
DROP INDEX `tenants_auth_key_idx` ON `tenants`;

-- DropIndex
DROP INDEX `tenants_auth_key_key` ON `tenants`;

-- DropIndex
DROP INDEX `terminal_settings_branch_id_idx` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_created_at_idx` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_setting_id_idx` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_setting_id_key` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_status_idx` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_synced_idx` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_tenant_id_branch_id_terminal_id_key` ON `terminal_settings`;

-- DropIndex
DROP INDEX `terminal_settings_tenant_id_idx` ON `terminal_settings`;

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `terminal_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `inventory` ADD COLUMN `properties` JSON NULL;

-- AlterTable
ALTER TABLE `payment_methods` MODIFY `branch_id` VARCHAR(191) NULL,
    MODIFY `tenant_id` VARCHAR(191) NULL,
    MODIFY `user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `permissions` MODIFY `scope` ENUM('global', 'terminal', 'self', 'system', 'tenant', 'branch') NULL DEFAULT 'branch';

-- AlterTable
ALTER TABLE `tenant_subscriptions` DROP COLUMN `max_shops`,
    ADD COLUMN `max_branches` INTEGER NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `tenants` DROP COLUMN `auth_key`;

-- AlterTable
ALTER TABLE `terminal_settings` DROP COLUMN `address_line1`,
    DROP COLUMN `address_line2`,
    DROP COLUMN `app`,
    DROP COLUMN `branch_id`,
    DROP COLUMN `charge_tax`,
    DROP COLUMN `city`,
    DROP COLUMN `contact`,
    DROP COLUMN `country`,
    DROP COLUMN `footer`,
    DROP COLUMN `img`,
    DROP COLUMN `setting_id`,
    DROP COLUMN `status`,
    DROP COLUMN `store`,
    DROP COLUMN `symbol`,
    DROP COLUMN `synced`,
    DROP COLUMN `tax`,
    DROP COLUMN `tax_string`,
    DROP COLUMN `tenant_id`,
    DROP COLUMN `tenant_signature`,
    DROP COLUMN `till_name`,
    DROP COLUMN `verification_token`,
    ADD COLUMN `auto_logout_minutes` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `backup_settings` JSON NULL,
    ADD COLUMN `business_license` VARCHAR(191) NULL,
    ADD COLUMN `business_tax_id` VARCHAR(191) NULL,
    ADD COLUMN `configuration_date` DATETIME(3) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'MKW',
    ADD COLUMN `customer_management_settings` JSON NULL,
    ADD COLUMN `customer_settings` JSON NULL,
    ADD COLUMN `date_format` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    ADD COLUMN `display_settings` JSON NULL,
    ADD COLUMN `hardware_settings` JSON NULL,
    ADD COLUMN `integration_settings` JSON NULL,
    ADD COLUMN `inventory_settings` JSON NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en_US',
    ADD COLUMN `last_configured_by` VARCHAR(191) NULL,
    ADD COLUMN `localization_settings` JSON NULL,
    ADD COLUMN `mra_compliance_settings` JSON NULL,
    ADD COLUMN `payment_settings` JSON NULL,
    ADD COLUMN `performance_settings` JSON NULL,
    ADD COLUMN `pin_length` INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN `receipt_settings` JSON NULL,
    ADD COLUMN `reporting_settings` JSON NULL,
    ADD COLUMN `security_settings` JSON NULL,
    ADD COLUMN `server_url` VARCHAR(191) NULL,
    ADD COLUMN `session_timeout_minutes` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `settings_version` VARCHAR(191) NOT NULL DEFAULT '2.0.0',
    ADD COLUMN `store_address` VARCHAR(191) NULL,
    ADD COLUMN `store_email` VARCHAR(191) NULL,
    ADD COLUMN `store_name` VARCHAR(191) NULL,
    ADD COLUMN `store_phone` VARCHAR(191) NULL,
    ADD COLUMN `sync_settings` JSON NULL,
    ADD COLUMN `tax_fee_settings` JSON NULL,
    ADD COLUMN `tax_rate` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    ADD COLUMN `time_format` VARCHAR(191) NOT NULL DEFAULT '24h',
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'Africa/Blantyre',
    ADD COLUMN `transaction_settings` JSON NULL,
    ADD COLUMN `workflow_settings` JSON NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `accessible_shops`,
    DROP COLUMN `allowed_workstations`,
    ADD COLUMN `accessible_branches` JSON NULL,
    ADD COLUMN `allowed_terminals` JSON NULL;

-- CreateTable
CREATE TABLE `terminal_settings_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NOT NULL,
    `setting_value` JSON NOT NULL,
    `override_level` VARCHAR(191) NOT NULL,
    `override_source_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `terminal_settings_overrides_override_level_override_source_i_idx`(`override_level`, `override_source_id`),
    INDEX `terminal_settings_overrides_setting_key_idx`(`setting_key`),
    UNIQUE INDEX `terminal_settings_overrides_override_level_override_source_i_key`(`override_level`, `override_source_id`, `setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `categories_terminal_id_idx` ON `categories`(`terminal_id`);

-- CreateIndex
CREATE UNIQUE INDEX `terminal_settings_terminal_id_key` ON `terminal_settings`(`terminal_id`);

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terminal_settings` ADD CONSTRAINT `terminal_settings_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE CASCADE ON UPDATE CASCADE;
