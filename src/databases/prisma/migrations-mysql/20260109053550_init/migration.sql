/*
  Warnings:

  - You are about to drop the `MRA_API_CONFIG_TABLE` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `MRA_API_CONFIG_TABLE` DROP FOREIGN KEY `MRA_API_CONFIG_TABLE_tenant_id_fkey`;

-- DropTable
DROP TABLE `MRA_API_CONFIG_TABLE`;

-- CreateTable
CREATE TABLE `mra_api_config_table` (
    `config_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `environment` ENUM('SANDBOX', 'PRODUCTION') NULL DEFAULT 'SANDBOX',
    `api_base_url` VARCHAR(191) NOT NULL,
    `api_key` VARCHAR(191) NULL,
    `api_secret` VARCHAR(191) NULL,
    `last_sync_timestamp` DATETIME(3) NULL,
    `sync_status` ENUM('SUCCESS', 'FAILED', 'IN_PROGRESS') NULL DEFAULT 'SUCCESS',
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mra_api_config_table_tenant_id_environment_key`(`tenant_id`, `environment`),
    PRIMARY KEY (`config_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mra_api_config_table` ADD CONSTRAINT `mra_api_config_table_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;
