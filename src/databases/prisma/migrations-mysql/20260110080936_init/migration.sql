/*
  Warnings:

  - You are about to drop the column `branch_id` on the `payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `payment_methods` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_branch_id_fkey`;

-- DropForeignKey
ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_tenant_id_fkey`;

-- DropForeignKey
ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_user_id_fkey`;

-- DropIndex
DROP INDEX `payment_methods_branch_id_idx` ON `payment_methods`;

-- DropIndex
DROP INDEX `payment_methods_tenant_id_idx` ON `payment_methods`;

-- DropIndex
DROP INDEX `payment_methods_user_id_idx` ON `payment_methods`;

-- AlterTable
ALTER TABLE `payment_methods` DROP COLUMN `branch_id`,
    DROP COLUMN `tenant_id`,
    DROP COLUMN `user_id`;

-- CreateTable
CREATE TABLE `tenant_registration_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `detail_id` VARCHAR(255) NOT NULL,
    `tenant_id` VARCHAR(255) NOT NULL,
    `business_name` VARCHAR(255) NOT NULL,
    `owner_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `tenant_code` VARCHAR(255) NOT NULL,
    `verification_token` TEXT NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_processed` BOOLEAN NOT NULL DEFAULT false,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_registration_details_detail_id_key`(`detail_id`),
    INDEX `tenant_registration_details_tenant_id_idx`(`tenant_id`),
    INDEX `tenant_registration_details_email_idx`(`email`),
    INDEX `tenant_registration_details_is_processed_idx`(`is_processed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
