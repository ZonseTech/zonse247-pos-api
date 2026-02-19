/*
  Warnings:

  - You are about to drop the column `auto_logout_minutes` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `backup_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `business_license` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `business_tax_id` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `configuration_date` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `customer_management_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `customer_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `date_format` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `display_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `hardware_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `integration_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `inventory_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `last_configured_by` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `localization_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `mra_compliance_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `performance_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `pin_length` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `reporting_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `server_url` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `session_timeout_minutes` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_address` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_email` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_name` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `store_phone` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `sync_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tax_fee_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `tax_rate` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `time_format` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_settings` on the `terminal_settings` table. All the data in the column will be lost.
  - You are about to drop the column `workflow_settings` on the `terminal_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `terminal_settings` DROP COLUMN `auto_logout_minutes`,
    DROP COLUMN `backup_settings`,
    DROP COLUMN `business_license`,
    DROP COLUMN `business_tax_id`,
    DROP COLUMN `configuration_date`,
    DROP COLUMN `currency`,
    DROP COLUMN `customer_management_settings`,
    DROP COLUMN `customer_settings`,
    DROP COLUMN `date_format`,
    DROP COLUMN `display_settings`,
    DROP COLUMN `hardware_settings`,
    DROP COLUMN `integration_settings`,
    DROP COLUMN `inventory_settings`,
    DROP COLUMN `language`,
    DROP COLUMN `last_configured_by`,
    DROP COLUMN `localization_settings`,
    DROP COLUMN `mra_compliance_settings`,
    DROP COLUMN `payment_settings`,
    DROP COLUMN `performance_settings`,
    DROP COLUMN `pin_length`,
    DROP COLUMN `reporting_settings`,
    DROP COLUMN `server_url`,
    DROP COLUMN `session_timeout_minutes`,
    DROP COLUMN `store_address`,
    DROP COLUMN `store_email`,
    DROP COLUMN `store_name`,
    DROP COLUMN `store_phone`,
    DROP COLUMN `sync_settings`,
    DROP COLUMN `tax_fee_settings`,
    DROP COLUMN `tax_rate`,
    DROP COLUMN `time_format`,
    DROP COLUMN `timezone`,
    DROP COLUMN `transaction_settings`,
    DROP COLUMN `workflow_settings`,
    ADD COLUMN `business_settings` JSON NULL,
    ADD COLUMN `general_settings` JSON NULL,
    MODIFY `settings_version` VARCHAR(191) NOT NULL DEFAULT '3.0.0';
