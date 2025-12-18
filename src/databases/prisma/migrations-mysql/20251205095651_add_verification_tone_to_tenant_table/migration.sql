/*
  Warnings:

  - Added the required column `verification_token` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `verification_token` VARCHAR(191) NOT NULL;
