/*
  Warnings:

  - The primary key for the `plan_features` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `feature_category_id` on the `plan_features` table. All the data in the column will be lost.
  - Added the required column `featureCategoryId` to the `plan_features` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `plan_features` DROP PRIMARY KEY,
    DROP COLUMN `feature_category_id`,
    ADD COLUMN `featureCategoryId` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`featureCategoryId`);

-- AlterTable
ALTER TABLE `terminals` ALTER COLUMN `registered_at` DROP DEFAULT;
