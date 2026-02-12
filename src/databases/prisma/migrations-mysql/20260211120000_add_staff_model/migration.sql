-- CreateTable
CREATE TABLE `staff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `employee_code` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `joining_date` DATETIME(3) NULL,
    `termination_date` DATETIME(3) NULL,
    `calculate_as` ENUM('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED') NOT NULL DEFAULT 'DAILY',
    `staff_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `salary_frequency` ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SEMIMONTHLY') NOT NULL DEFAULT 'MONTHLY',
    `track_attendance` BOOLEAN NOT NULL DEFAULT false,
    `allow_self_attendance` BOOLEAN NOT NULL DEFAULT false,
    `attendance_type` ENUM('PUNCH', 'SHIFT', 'FLEXIBLE', 'REMOTE') NOT NULL DEFAULT 'PUNCH',
    `avg_shift_hours` DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
    `allow_app_access` BOOLEAN NOT NULL DEFAULT false,
    `emergency_contact_name` VARCHAR(191) NULL,
    `emergency_contact_phone` VARCHAR(191) NULL,
    `emergency_contact_relation` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postal_code` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(191) NULL,
    `bank_branch_code` VARCHAR(191) NULL,
    `employment_status` ENUM('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `synced` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_staff_id_key`(`staff_id`),
    UNIQUE INDEX `staff_user_id_key`(`user_id`),
    UNIQUE INDEX `unique_tenant_employee_code`(`tenant_id`, `employee_code`),
    INDEX `staff_user_id_idx`(`user_id`),
    INDEX `staff_tenant_id_idx`(`tenant_id`),
    INDEX `staff_branch_id_idx`(`branch_id`),
    INDEX `staff_employment_status_idx`(`employment_status`),
    INDEX `staff_joining_date_idx`(`joining_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;
