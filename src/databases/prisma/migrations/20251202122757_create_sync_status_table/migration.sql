-- CreateTable
CREATE TABLE `SyncStatus` (
    `tableName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `lastSyncAt` DATETIME(3) NOT NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`tableName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
