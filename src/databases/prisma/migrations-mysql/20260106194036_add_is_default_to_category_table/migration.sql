-- AlterTable
ALTER TABLE `categories` ADD COLUMN `is_default` BOOLEAN NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `categories_is_default_idx` ON `categories`(`is_default`);
