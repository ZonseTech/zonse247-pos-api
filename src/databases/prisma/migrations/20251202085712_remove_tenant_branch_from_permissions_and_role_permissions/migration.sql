-- CreateTable
CREATE TABLE `MRA_API_CONFIG_TABLE` (
    `config_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `environment` ENUM('SANDBOX', 'PRODUCTION') NULL DEFAULT 'SANDBOX',
    `api_base_url` VARCHAR(255) NOT NULL,
    `api_key` VARCHAR(255) NULL,
    `api_secret` VARCHAR(255) NULL,
    `last_sync_timestamp` TIMESTAMP(0) NULL,
    `sync_status` ENUM('SUCCESS', 'FAILED', 'IN_PROGRESS') NULL DEFAULT 'SUCCESS',
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unique_tenant_env`(`tenant_id`, `environment`),
    PRIMARY KEY (`config_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `log_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NULL,
    `branch_id` VARCHAR(100) NULL,
    `user_id` VARCHAR(100) NULL,
    `terminal_id` VARCHAR(100) NULL,
    `action_type` ENUM('create', 'update', 'delete', 'login', 'logout', 'access', 'export', 'import', 'backup', 'sync') NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(100) NULL,
    `entity_name` VARCHAR(200) NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `changes_summary` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `request_method` VARCHAR(10) NULL,
    `request_url` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `severity` ENUM('low', 'medium', 'high', 'critical') NULL DEFAULT 'low',
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `log_id`(`log_id`),
    INDEX `idx_action_type`(`action_type`),
    INDEX `idx_branch_id`(`branch_id`),
    INDEX `idx_tenant_branch`(`tenant_id`, `branch_id`),
    INDEX `idx_tenant_id`(`tenant_id`),
    INDEX `terminal_id`(`terminal_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branch_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_setting_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `terminal_id` VARCHAR(100) NOT NULL,
    `app` VARCHAR(100) NULL,
    `store` VARCHAR(255) NULL,
    `address_line1` VARCHAR(255) NULL,
    `address_line2` VARCHAR(255) NULL,
    `country` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `contact` VARCHAR(100) NULL,
    `tax` VARCHAR(50) NULL,
    `symbol` VARCHAR(10) NULL,
    `footer` TEXT NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'inactive',
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `branch_setting_id`(`branch_setting_id`),
    UNIQUE INDEX `unique_branch_settings`(`branch_id`),
    INDEX `idx_branch_id`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `branch_name` VARCHAR(255) NOT NULL,
    `branch_code` VARCHAR(50) NOT NULL,
    `site_id` VARCHAR(100) NULL,
    `site_name` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `address_line_3` VARCHAR(255) NULL,
    `district` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `phone_number` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `currency_code` VARCHAR(3) NULL DEFAULT 'MKW',
    `currency_symbol` VARCHAR(10) NULL DEFAULT 'K',
    `tax_rate` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `charge_tax` BOOLEAN NULL DEFAULT false,
    `receipt_footer` TEXT NULL,
    `logo_url` VARCHAR(500) NULL,
    `is_virtual_warehouse` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `synced` TINYINT NULL DEFAULT 0,
    `mra_approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NULL DEFAULT 'PENDING',
    `mra_approval_date` TIMESTAMP(0) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'active',
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `branch_id`(`branch_id`),
    INDEX `idx_branch_code`(`branch_code`),
    INDEX `idx_tenant_active`(`tenant_id`, `is_active`),
    INDEX `idx_tenant_id`(`tenant_id`),
    UNIQUE INDEX `unique_tenant_branch_code`(`tenant_id`, `branch_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(7) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `sort_order` INTEGER NULL DEFAULT 0,
    `item_count` INTEGER NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `category_id`(`category_id`),
    INDEX `idx_branch_id`(`branch_id`),
    UNIQUE INDEX `unique_branch_category`(`branch_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NULL,
    `name` VARCHAR(100) NOT NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customer_id`(`customer_id`),
    INDEX `idx_branch_id`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `category_id` VARCHAR(100) NULL,
    `barcode` VARCHAR(100) NOT NULL,
    `sku` VARCHAR(50) NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `brand` VARCHAR(100) NULL,
    `unit` VARCHAR(20) NULL DEFAULT 'piece',
    `cost_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `sell_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `promo_price` DECIMAL(10, 2) NULL,
    `promo_start` DATE NULL,
    `promo_end` DATE NULL,
    `quantity` VARCHAR(100) NULL DEFAULT '0',
    `reserved_quantity` INTEGER NULL DEFAULT 0,
    `min_stock` INTEGER NULL DEFAULT 0,
    `original_quantity` VARCHAR(20) NULL DEFAULT '0',
    `max_stock` INTEGER NULL,
    `stock` INTEGER NULL,
    `reorder_level` INTEGER NULL,
    `weight` DECIMAL(8, 3) NULL,
    `dimensions` VARCHAR(50) NULL,
    `color` VARCHAR(50) NULL,
    `size` VARCHAR(50) NULL,
    `status` ENUM('active', 'inactive', 'discontinued', 'out_of_stock') NULL DEFAULT 'active',
    `track_inventory` BOOLEAN NULL DEFAULT true,
    `allow_negative_stock` BOOLEAN NULL DEFAULT false,
    `is_taxable` BOOLEAN NULL DEFAULT true,
    `expiration_date` DATE NULL,
    `manufacture_date` DATE NULL,
    `image_urls` JSON NULL,
    `supplier_name` VARCHAR(100) NULL,
    `supplier_code` VARCHAR(50) NULL,
    `created_by` VARCHAR(100) NULL,
    `last_updated_by` VARCHAR(100) NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_id`(`product_id`),
    INDEX `created_by`(`created_by`),
    INDEX `idx_barcode`(`barcode`),
    INDEX `idx_branch_id`(`branch_id`),
    INDEX `idx_category_id`(`category_id`),
    INDEX `idx_name`(`name`),
    INDEX `idx_status`(`status`),
    INDEX `last_updated_by`(`last_updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` VARCHAR(100) NOT NULL,
    `ref_number` VARCHAR(100) NOT NULL,
    `transaction_id` VARCHAR(100) NULL DEFAULT '1',
    `product_id` VARCHAR(100) NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL DEFAULT 1.000,
    `purchase_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `sell_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `order_id`(`order_id`),
    INDEX `idx_transaction_id`(`transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `icon` VARCHAR(500) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `method_id`(`method_id`),
    INDEX `idx_branch_id`(`branch_id`),
    INDEX `idx_tenant_id`(`tenant_id`),
    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `unique_branch_payment_method`(`branch_id`, `name`),
    UNIQUE INDEX `unique_tenant_payment_method`(`tenant_id`, `name`),
    UNIQUE INDEX `unique_user_payment_method`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `permission_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(255) NOT NULL,
    `scope` ENUM('global', 'workstation', 'self', 'system', 'client', 'shop') NULL DEFAULT 'shop',
    `synced` TINYINT NULL DEFAULT 0,
    `is_system_permission` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permission_id`(`permission_id`),
    UNIQUE INDEX `name`(`name`),
    INDEX `idx_category`(`category`),
    INDEX `idx_name`(`name`),
    INDEX `idx_scope`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_features` (
    `feature_category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `features` JSON NOT NULL,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`feature_category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_permission_id` VARCHAR(100) NOT NULL,
    `role_id` VARCHAR(100) NOT NULL,
    `permission_id` VARCHAR(100) NOT NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_permission_id`(`role_permission_id`),
    INDEX `idx_permission_id`(`permission_id`),
    INDEX `idx_role_id`(`role_id`),
    UNIQUE INDEX `unique_role_permission`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `is_system_role` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_id`(`role_id`),
    UNIQUE INDEX `roles_name_key`(`name`),
    INDEX `idx_active_role`(`is_active`),
    INDEX `idx_role_name`(`name`),
    INDEX `idx_system_role`(`is_system_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_provider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `logoUrl` TEXT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `sort_order` INTEGER NULL DEFAULT 0,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `provider_id`(`provider_id`),
    INDEX `idx_branch_id`(`branch_id`),
    UNIQUE INDEX `unique_branch_service_provider`(`branch_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `subscription_plan_id` VARCHAR(100) NOT NULL,
    `plan_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `monthly_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `yearly_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `color` VARCHAR(20) NOT NULL DEFAULT 'gray',
    `is_popular` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `features` JSON NOT NULL,
    `limits` JSON NOT NULL,
    `notes` TEXT NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `plan_code`(`plan_code`),
    PRIMARY KEY (`subscription_plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_subscriptions` (
    `tenant_subscription_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `subscription_plan_id` VARCHAR(100) NOT NULL,
    `status` ENUM('active', 'cancelled', 'expired', 'past_due') NULL DEFAULT 'active',
    `starts_at` TIMESTAMP(3) NOT NULL,
    `ends_at` TIMESTAMP(3) NULL,
    `auto_renew` BOOLEAN NULL DEFAULT true,
    `payment_method` VARCHAR(50) NULL,
    `max_shops` INTEGER NULL DEFAULT 1,
    `synced` TINYINT NULL DEFAULT 0,
    `last_payment_date` TIMESTAMP(3) NULL,
    `next_payment_date` TIMESTAMP(3) NULL,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscription_plan_id`(`subscription_plan_id`),
    INDEX `tenant_id`(`tenant_id`),
    PRIMARY KEY (`tenant_subscription_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` VARCHAR(100) NOT NULL,
    `business_name` VARCHAR(255) NOT NULL,
    `tin` VARCHAR(50) NOT NULL,
    `tenant_code` VARCHAR(50) NOT NULL,
    `business_type` ENUM('PRODUCT_BASED', 'SERVICE_BASED') NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `mra_portal_username` VARCHAR(100) NULL,
    `trading_name` VARCHAR(255) NULL,
    `is_vat_registered` BOOLEAN NULL DEFAULT false,
    `tax_office_code` VARCHAR(50) NULL,
    `msonkho_online_status` ENUM('VERIFIED', 'PENDING', 'FAILED') NULL DEFAULT 'PENDING',
    `subscription_plan` VARCHAR(50) NULL,
    `subscription_status` ENUM('ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL') NULL DEFAULT 'TRIAL',
    `owner_name` VARCHAR(100) NOT NULL,
    `address` TEXT NULL,
    `country` VARCHAR(50) NULL,
    `trial_ends_at` TIMESTAMP(3) NULL,
    `auth_key` VARCHAR(255) NOT NULL,
    `status` ENUM('pending', 'active', 'suspended', 'cancelled') NULL DEFAULT 'pending',
    `registered_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activated_at` TIMESTAMP(3) NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tenant_id`(`tenant_id`),
    UNIQUE INDEX `tin`(`tin`),
    UNIQUE INDEX `tenant_code`(`tenant_code`),
    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `auth_key`(`auth_key`),
    INDEX `idx_auth_key`(`auth_key`),
    INDEX `idx_email`(`email`),
    INDEX `idx_subscription_status`(`subscription_status`),
    INDEX `idx_tenant_code`(`tenant_code`),
    INDEX `idx_tin`(`tin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terminals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `terminal_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `mra_terminal_id` VARCHAR(100) NULL,
    `terminal_code` VARCHAR(100) NOT NULL,
    `terminal_label` VARCHAR(255) NOT NULL,
    `terminal_position` INTEGER NULL,
    `device_id` VARCHAR(100) NULL,
    `os_name` VARCHAR(100) NULL,
    `os_version` VARCHAR(100) NULL,
    `os_build` VARCHAR(100) NULL,
    `mac_address` VARCHAR(50) NULL,
    `pos_product_id` VARCHAR(100) NULL,
    `pos_product_version` VARCHAR(50) NULL,
    `terminal_config_version` DECIMAL(10, 2) NULL,
    `offline_max_transaction_age_hours` DECIMAL(10, 2) NULL,
    `offline_max_cumulative_amount` DECIMAL(15, 2) NULL,
    `activation_code` VARCHAR(255) NULL,
    `activation_status` ENUM('PENDING', 'ACTIVATED', 'DEACTIVATED', 'SUSPENDED', 'BLOCKED') NULL DEFAULT 'PENDING',
    `activation_date` TIMESTAMP(0) NULL,
    `is_primary` BOOLEAN NULL DEFAULT false,
    `is_blocked` BOOLEAN NULL DEFAULT false,
    `blocking_reason` TEXT NULL,
    `blocked_at` TIMESTAMP(0) NULL,
    `mra_application_status` ENUM('APPLIED', 'APPROVED', 'REJECTED') NULL DEFAULT 'APPLIED',
    `mra_approval_date` TIMESTAMP(0) NULL,
    `last_activity` TIMESTAMP(3) NULL,
    `last_sync` TIMESTAMP(3) NULL,
    `last_sync_timestamp` TIMESTAMP(0) NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `registered_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `terminal_id`(`terminal_id`),
    UNIQUE INDEX `mra_terminal_id`(`mra_terminal_id`),
    UNIQUE INDEX `terminal_code`(`terminal_code`),
    INDEX `idx_activation_status`(`activation_status`),
    INDEX `idx_branch_id`(`branch_id`),
    INDEX `idx_tenant_branch`(`tenant_id`, `branch_id`),
    INDEX `idx_tenant_id`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` VARCHAR(100) NOT NULL,
    `ref_number` VARCHAR(50) NOT NULL,
    `discount` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `customer_id` VARCHAR(100) NULL,
    `subtotal` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `tax` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `date` TIMESTAMP(3) NULL,
    `payment_method_id` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NULL,
    `payment_service_provider_id` VARCHAR(100) NULL,
    `total` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `paid` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `change_amount` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `terminal_id` VARCHAR(100) NULL,
    `user_id` VARCHAR(100) NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transaction_id`(`transaction_id`),
    INDEX `idx_branch_id`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_permission_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `permission_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NULL,
    `granted` BOOLEAN NOT NULL,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(100) NULL,
    `synced` TINYINT NULL DEFAULT 0,

    UNIQUE INDEX `user_permission_id`(`user_permission_id`),
    INDEX `created_by`(`created_by`),
    INDEX `idx_branch_id`(`branch_id`),
    INDEX `idx_permission_id`(`permission_id`),
    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `unique_user_permission_branch`(`user_id`, `permission_id`, `branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_session_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `terminal_id` VARCHAR(100) NOT NULL,
    `session_token` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `started_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` TIMESTAMP(3) NULL,
    `synced` TINYINT NULL DEFAULT 0,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_session_id`(`user_session_id`),
    UNIQUE INDEX `session_token`(`session_token`),
    INDEX `idx_session_token`(`session_token`),
    INDEX `idx_terminal_id`(`terminal_id`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(100) NOT NULL,
    `tenant_id` VARCHAR(100) NOT NULL,
    `branch_id` VARCHAR(100) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `fullname` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `role_id` VARCHAR(100) NOT NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'active',
    `accessible_shops` JSON NULL,
    `allowed_workstations` JSON NULL,
    `max_discount_percent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `can_override_prices` BOOLEAN NULL DEFAULT false,
    `pin_code` VARCHAR(10) NULL,
    `current_branch_id` VARCHAR(100) NULL,
    `last_login` TIMESTAMP(3) NULL,
    `last_logout` TIMESTAMP(3) NULL,
    `password_changed_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `force_password_change` BOOLEAN NULL DEFAULT false,
    `synced` TINYINT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_id`(`user_id`),
    INDEX `branch_id`(`branch_id`),
    INDEX `current_branch_id`(`current_branch_id`),
    INDEX `idx_role_id`(`role_id`),
    INDEX `idx_tenant_id`(`tenant_id`),
    INDEX `idx_username`(`username`),
    UNIQUE INDEX `unique_tenant_username`(`tenant_id`, `username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MRA_API_CONFIG_TABLE` ADD CONSTRAINT `MRA_API_CONFIG_TABLE_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_ibfk_4` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `branch_settings` ADD CONSTRAINT `branch_settings_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_ibfk_4` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `service_provider` ADD CONSTRAINT `service_provider_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_ibfk_2` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`subscription_plan_id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terminals` ADD CONSTRAINT `terminals_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terminals` ADD CONSTRAINT `terminals_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_ibfk_2` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_4` FOREIGN KEY (`current_branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE SET NULL ON UPDATE NO ACTION;
