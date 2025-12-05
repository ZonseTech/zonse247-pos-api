-- CreateTable
CREATE TABLE `MRA_API_CONFIG_TABLE` (
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

    UNIQUE INDEX `MRA_API_CONFIG_TABLE_tenant_id_environment_key`(`tenant_id`, `environment`),
    PRIMARY KEY (`config_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `log_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NULL,
    `branch_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `terminal_id` VARCHAR(191) NULL,
    `action_type` ENUM('create', 'update', 'delete', 'login', 'logout', 'access', 'export', 'import', 'backup', 'sync') NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `entity_name` VARCHAR(191) NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `changes_summary` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `request_method` VARCHAR(191) NULL,
    `request_url` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `severity` ENUM('low', 'medium', 'high', 'critical') NULL DEFAULT 'low',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `audit_logs_log_id_key`(`log_id`),
    INDEX `audit_logs_action_type_idx`(`action_type`),
    INDEX `audit_logs_branch_id_idx`(`branch_id`),
    INDEX `audit_logs_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`),
    INDEX `audit_logs_tenant_id_idx`(`tenant_id`),
    INDEX `audit_logs_terminal_id_idx`(`terminal_id`),
    INDEX `audit_logs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branch_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_setting_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NOT NULL,
    `app` VARCHAR(191) NULL,
    `store` VARCHAR(191) NULL,
    `address_line1` VARCHAR(191) NULL,
    `address_line2` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `tax` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NULL,
    `footer` VARCHAR(191) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'inactive',
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `branch_settings_branch_setting_id_key`(`branch_setting_id`),
    UNIQUE INDEX `branch_settings_branch_id_key`(`branch_id`),
    INDEX `branch_settings_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_name` VARCHAR(191) NOT NULL,
    `branch_code` VARCHAR(191) NOT NULL,
    `site_id` VARCHAR(191) NULL,
    `site_name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `address_line_1` VARCHAR(191) NULL,
    `address_line_2` VARCHAR(191) NULL,
    `address_line_3` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postal_code` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `currency_code` VARCHAR(191) NULL DEFAULT 'MKW',
    `currency_symbol` VARCHAR(191) NULL DEFAULT 'K',
    `tax_rate` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `charge_tax` BOOLEAN NULL DEFAULT false,
    `receipt_footer` VARCHAR(191) NULL,
    `logo_url` VARCHAR(191) NULL,
    `is_virtual_warehouse` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `synced` INTEGER NULL DEFAULT 0,
    `mra_approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NULL DEFAULT 'PENDING',
    `mra_approval_date` DATETIME(3) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'active',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `branches_branch_id_key`(`branch_id`),
    INDEX `branches_branch_code_idx`(`branch_code`),
    INDEX `branches_tenant_id_is_active_idx`(`tenant_id`, `is_active`),
    INDEX `branches_tenant_id_idx`(`tenant_id`),
    UNIQUE INDEX `branches_tenant_id_branch_code_key`(`tenant_id`, `branch_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `sort_order` INTEGER NULL DEFAULT 0,
    `item_count` INTEGER NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categories_category_id_key`(`category_id`),
    INDEX `categories_branch_id_idx`(`branch_id`),
    UNIQUE INDEX `categories_branch_id_name_key`(`branch_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customers_customer_id_key`(`customer_id`),
    INDEX `customers_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL DEFAULT 'piece',
    `cost_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `sell_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `promo_price` DECIMAL(65, 30) NULL,
    `promo_start` DATETIME(3) NULL,
    `promo_end` DATETIME(3) NULL,
    `quantity` VARCHAR(191) NULL DEFAULT '0',
    `reserved_quantity` INTEGER NULL DEFAULT 0,
    `min_stock` INTEGER NULL DEFAULT 0,
    `original_quantity` VARCHAR(191) NULL DEFAULT '0',
    `max_stock` INTEGER NULL,
    `stock` INTEGER NULL,
    `reorder_level` INTEGER NULL,
    `weight` DECIMAL(65, 30) NULL,
    `dimensions` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `status` ENUM('active', 'inactive', 'discontinued', 'out_of_stock') NULL DEFAULT 'active',
    `track_inventory` BOOLEAN NULL DEFAULT true,
    `allow_negative_stock` BOOLEAN NULL DEFAULT false,
    `is_taxable` BOOLEAN NULL DEFAULT true,
    `expiration_date` DATETIME(3) NULL,
    `manufacture_date` DATETIME(3) NULL,
    `image_urls` JSON NULL,
    `supplier_name` VARCHAR(191) NULL,
    `supplier_code` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `last_updated_by` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inventory_product_id_key`(`product_id`),
    INDEX `inventory_created_by_idx`(`created_by`),
    INDEX `inventory_barcode_idx`(`barcode`),
    INDEX `inventory_branch_id_idx`(`branch_id`),
    INDEX `inventory_category_id_idx`(`category_id`),
    INDEX `inventory_name_idx`(`name`),
    INDEX `inventory_status_idx`(`status`),
    INDEX `inventory_last_updated_by_idx`(`last_updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` VARCHAR(191) NOT NULL,
    `ref_number` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NULL DEFAULT '1',
    `product_id` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(65, 30) NOT NULL DEFAULT 1.000,
    `purchase_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `sell_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `orders_order_id_key`(`order_id`),
    INDEX `orders_transaction_id_idx`(`transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `icon` VARCHAR(191) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_methods_method_id_key`(`method_id`),
    INDEX `payment_methods_branch_id_idx`(`branch_id`),
    INDEX `payment_methods_tenant_id_idx`(`tenant_id`),
    INDEX `payment_methods_user_id_idx`(`user_id`),
    UNIQUE INDEX `payment_methods_branch_id_name_key`(`branch_id`, `name`),
    UNIQUE INDEX `payment_methods_tenant_id_name_key`(`tenant_id`, `name`),
    UNIQUE INDEX `payment_methods_user_id_name_key`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `permission_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `scope` ENUM('global', 'workstation', 'self', 'system', 'client', 'shop') NULL DEFAULT 'shop',
    `synced` INTEGER NULL DEFAULT 0,
    `is_system_permission` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_permission_id_key`(`permission_id`),
    UNIQUE INDEX `permissions_name_key`(`name`),
    INDEX `permissions_category_idx`(`category`),
    INDEX `permissions_name_idx`(`name`),
    INDEX `permissions_scope_idx`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_features` (
    `feature_category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `features` JSON NOT NULL,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`feature_category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_permission_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_permissions_role_permission_id_key`(`role_permission_id`),
    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    INDEX `role_permissions_role_id_idx`(`role_id`),
    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `is_system_role` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_role_id_key`(`role_id`),
    UNIQUE INDEX `roles_name_key`(`name`),
    INDEX `idx_active_role`(`is_active`),
    INDEX `idx_role_name`(`name`),
    INDEX `idx_system_role`(`is_system_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_provider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `sort_order` INTEGER NULL DEFAULT 0,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `service_provider_provider_id_key`(`provider_id`),
    INDEX `service_provider_branch_id_idx`(`branch_id`),
    UNIQUE INDEX `service_provider_branch_id_name_key`(`branch_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `subscription_plan_id` VARCHAR(191) NOT NULL,
    `plan_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `monthly_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `yearly_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `color` VARCHAR(191) NOT NULL DEFAULT 'gray',
    `is_popular` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `features` JSON NOT NULL,
    `limits` JSON NOT NULL,
    `notes` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscription_plans_plan_code_key`(`plan_code`),
    PRIMARY KEY (`subscription_plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_subscriptions` (
    `tenant_subscription_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `subscription_plan_id` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'cancelled', 'expired', 'past_due') NULL DEFAULT 'active',
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NULL,
    `auto_renew` BOOLEAN NULL DEFAULT true,
    `payment_method` VARCHAR(191) NULL,
    `max_shops` INTEGER NULL DEFAULT 1,
    `synced` INTEGER NULL DEFAULT 0,
    `last_payment_date` DATETIME(3) NULL,
    `next_payment_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tenant_subscriptions_subscription_plan_id_idx`(`subscription_plan_id`),
    INDEX `tenant_subscriptions_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`tenant_subscription_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` VARCHAR(191) NOT NULL,
    `business_name` VARCHAR(191) NOT NULL,
    `tin` VARCHAR(191) NOT NULL,
    `tenant_code` VARCHAR(191) NOT NULL,
    `business_type` ENUM('PRODUCT_BASED', 'SERVICE_BASED') NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mra_portal_username` VARCHAR(191) NULL,
    `trading_name` VARCHAR(191) NULL,
    `is_vat_registered` BOOLEAN NULL DEFAULT false,
    `tax_office_code` VARCHAR(191) NULL,
    `msonkho_online_status` ENUM('VERIFIED', 'PENDING', 'FAILED') NULL DEFAULT 'PENDING',
    `subscription_plan` VARCHAR(191) NULL,
    `subscription_status` ENUM('ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL') NULL DEFAULT 'TRIAL',
    `owner_name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `trial_ends_at` DATETIME(3) NULL,
    `auth_key` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'active', 'suspended', 'cancelled') NULL DEFAULT 'pending',
    `registered_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activated_at` DATETIME(3) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tenants_tenant_id_key`(`tenant_id`),
    UNIQUE INDEX `tenants_tin_key`(`tin`),
    UNIQUE INDEX `tenants_tenant_code_key`(`tenant_code`),
    UNIQUE INDEX `tenants_email_key`(`email`),
    UNIQUE INDEX `tenants_auth_key_key`(`auth_key`),
    INDEX `tenants_auth_key_idx`(`auth_key`),
    INDEX `tenants_email_idx`(`email`),
    INDEX `tenants_subscription_status_idx`(`subscription_status`),
    INDEX `tenants_tenant_code_idx`(`tenant_code`),
    INDEX `tenants_tin_idx`(`tin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terminals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `terminal_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `mra_terminal_id` VARCHAR(191) NULL,
    `terminal_code` VARCHAR(191) NOT NULL,
    `terminal_label` VARCHAR(191) NOT NULL,
    `terminal_position` INTEGER NULL,
    `device_id` VARCHAR(191) NULL,
    `os_name` VARCHAR(191) NULL,
    `os_version` VARCHAR(191) NULL,
    `os_build` VARCHAR(191) NULL,
    `mac_address` VARCHAR(191) NULL,
    `pos_product_id` VARCHAR(191) NULL,
    `pos_product_version` VARCHAR(191) NULL,
    `terminal_config_version` DECIMAL(65, 30) NULL,
    `offline_max_transaction_age_hours` DECIMAL(65, 30) NULL,
    `offline_max_cumulative_amount` DECIMAL(65, 30) NULL,
    `activation_code` VARCHAR(191) NULL,
    `activation_status` ENUM('PENDING', 'ACTIVATED', 'DEACTIVATED', 'SUSPENDED', 'BLOCKED') NULL DEFAULT 'PENDING',
    `activation_date` DATETIME(3) NULL,
    `is_primary` BOOLEAN NULL DEFAULT false,
    `is_blocked` BOOLEAN NULL DEFAULT false,
    `blocking_reason` VARCHAR(191) NULL,
    `blocked_at` DATETIME(3) NULL,
    `mra_application_status` ENUM('APPLIED', 'APPROVED', 'REJECTED') NULL DEFAULT 'APPLIED',
    `mra_approval_date` DATETIME(3) NULL,
    `last_activity` DATETIME(3) NULL,
    `last_sync` DATETIME(3) NULL,
    `last_sync_timestamp` DATETIME(3) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `registered_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `terminals_terminal_id_key`(`terminal_id`),
    UNIQUE INDEX `terminals_mra_terminal_id_key`(`mra_terminal_id`),
    UNIQUE INDEX `terminals_terminal_code_key`(`terminal_code`),
    INDEX `terminals_activation_status_idx`(`activation_status`),
    INDEX `terminals_branch_id_idx`(`branch_id`),
    INDEX `terminals_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`),
    INDEX `terminals_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` VARCHAR(191) NOT NULL,
    `ref_number` VARCHAR(191) NOT NULL,
    `discount` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `customer_id` VARCHAR(191) NULL,
    `subtotal` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `tax` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `date` DATETIME(3) NULL,
    `payment_method_id` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `payment_service_provider_id` VARCHAR(191) NULL,
    `total` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `paid` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `change_amount` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `terminal_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transactions_transaction_id_key`(`transaction_id`),
    INDEX `transactions_branch_id_idx`(`branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_permission_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NULL,
    `granted` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,

    UNIQUE INDEX `user_permissions_user_permission_id_key`(`user_permission_id`),
    INDEX `user_permissions_created_by_idx`(`created_by`),
    INDEX `user_permissions_branch_id_idx`(`branch_id`),
    INDEX `user_permissions_permission_id_idx`(`permission_id`),
    INDEX `user_permissions_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_permissions_user_id_permission_id_branch_id_key`(`user_id`, `permission_id`, `branch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_session_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NOT NULL,
    `session_token` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_user_session_id_key`(`user_session_id`),
    UNIQUE INDEX `user_sessions_session_token_key`(`session_token`),
    INDEX `user_sessions_session_token_idx`(`session_token`),
    INDEX `user_sessions_terminal_id_idx`(`terminal_id`),
    INDEX `user_sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `fullname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'inactive', 'suspended') NULL DEFAULT 'active',
    `accessible_shops` JSON NULL,
    `allowed_workstations` JSON NULL,
    `max_discount_percent` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `can_override_prices` BOOLEAN NULL DEFAULT false,
    `pin_code` VARCHAR(191) NULL,
    `current_branch_id` VARCHAR(191) NULL,
    `last_login` DATETIME(3) NULL,
    `last_logout` DATETIME(3) NULL,
    `password_changed_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `force_password_change` BOOLEAN NULL DEFAULT false,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_user_id_key`(`user_id`),
    INDEX `users_branch_id_idx`(`branch_id`),
    INDEX `users_current_branch_id_idx`(`current_branch_id`),
    INDEX `users_role_id_idx`(`role_id`),
    INDEX `users_tenant_id_idx`(`tenant_id`),
    INDEX `users_username_idx`(`username`),
    UNIQUE INDEX `users_tenant_id_username_key`(`tenant_id`, `username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `payment_service_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `synced` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `payment_service_providers_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MRA_API_CONFIG_TABLE` ADD CONSTRAINT `MRA_API_CONFIG_TABLE_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `branch_settings` ADD CONSTRAINT `branch_settings_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `service_provider` ADD CONSTRAINT `service_provider_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_subscription_plan_id_fkey` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`subscription_plan_id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terminals` ADD CONSTRAINT `terminals_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `terminals` ADD CONSTRAINT `terminals_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_current_branch_id_fkey` FOREIGN KEY (`current_branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE SET NULL ON UPDATE NO ACTION;
