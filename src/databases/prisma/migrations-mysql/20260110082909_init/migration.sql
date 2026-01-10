-- CreateTable
CREATE TABLE `products` (
    `product_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `primary_barcode` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'piece',
    `selling_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `brand` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `dimensions` VARCHAR(191) NULL,
    `weight` DECIMAL(65, 30) NULL,
    `promo_price` DECIMAL(65, 30) NULL,
    `promo_start` DATETIME(3) NULL,
    `promo_end` DATETIME(3) NULL,
    `is_taxable` BOOLEAN NOT NULL DEFAULT true,
    `expiration_date` DATETIME(3) NULL,
    `manufacture_date` DATETIME(3) NULL,
    `supplier_name` VARCHAR(191) NULL,
    `supplier_code` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    UNIQUE INDEX `products_primary_barcode_key`(`primary_barcode`),
    INDEX `products_branch_id_idx`(`branch_id`),
    INDEX `products_tenant_id_idx`(`tenant_id`),
    INDEX `products_category_id_idx`(`category_id`),
    INDEX `products_primary_barcode_idx`(`primary_barcode`),
    UNIQUE INDEX `products_branch_id_sku_key`(`branch_id`, `sku`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_barcodes` (
    `product_barcode_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NOT NULL,
    `barcode_type` ENUM('EAN13', 'EAN8', 'UPCA', 'UPCE', 'CODE39', 'CODE128', 'QR', 'CUSTOM') NOT NULL DEFAULT 'EAN13',
    `barcode_source` ENUM('MANUFACTURER', 'SUPPLIER', 'STORE', 'BUNDLE', 'PACKAGING', 'CUSTOM') NOT NULL DEFAULT 'SUPPLIER',
    `description` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_barcodes_barcode_key`(`barcode`),
    INDEX `product_barcodes_product_id_idx`(`product_id`),
    INDEX `product_barcodes_barcode_idx`(`barcode`),
    UNIQUE INDEX `product_barcodes_product_id_barcode_key`(`product_id`, `barcode`),
    PRIMARY KEY (`product_barcode_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `supplier_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `payment_terms` ENUM('CASH_ON_DELIVERY', 'NET_15', 'NET_30', 'NET_60', 'NET_90') NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    `credit_limit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `suppliers_branch_id_idx`(`branch_id`),
    INDEX `suppliers_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`supplier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `purchase_order_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `supplier_id` VARCHAR(191) NOT NULL,
    `po_number` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SHIPPED', 'RECEIVED', 'CANCELLED', 'PARTIALLY_RECEIVED') NOT NULL DEFAULT 'PENDING',
    `order_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expected_delivery_date` DATETIME(3) NULL,
    `received_at` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `received_by` VARCHAR(191) NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_orders_po_number_key`(`po_number`),
    INDEX `purchase_orders_branch_id_idx`(`branch_id`),
    INDEX `purchase_orders_tenant_id_idx`(`tenant_id`),
    INDEX `purchase_orders_supplier_id_idx`(`supplier_id`),
    INDEX `purchase_orders_status_idx`(`status`),
    INDEX `purchase_orders_po_number_idx`(`po_number`),
    PRIMARY KEY (`purchase_order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `purchase_order_item_id` VARCHAR(191) NOT NULL,
    `purchase_order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `ordered_quantity` INTEGER NOT NULL DEFAULT 0,
    `received_quantity` INTEGER NOT NULL DEFAULT 0,
    `damaged_quantity` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_order_items_purchase_order_id_idx`(`purchase_order_id`),
    INDEX `purchase_order_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `purchase_order_items_purchase_order_id_product_id_key`(`purchase_order_id`, `product_id`),
    PRIMARY KEY (`purchase_order_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `inventory_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `available_quantity` INTEGER NOT NULL DEFAULT 0,
    `reserved_quantity` INTEGER NOT NULL DEFAULT 0,
    `damaged_quantity` INTEGER NOT NULL DEFAULT 0,
    `average_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `last_purchase_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `reorder_point` INTEGER NULL,
    `max_stock` INTEGER NULL,
    `track_inventory` BOOLEAN NOT NULL DEFAULT true,
    `allow_negative_stock` BOOLEAN NOT NULL DEFAULT false,
    `last_restocked_at` DATETIME(3) NULL,
    `last_sold_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_product_id_key`(`product_id`),
    INDEX `inventory_branch_id_idx`(`branch_id`),
    INDEX `inventory_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_product_id_idx`(`product_id`),
    PRIMARY KEY (`inventory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `stock_movement_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `inventory_id` VARCHAR(191) NOT NULL,
    `movement_type` ENUM('PURCHASE_RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `previous_quantity` INTEGER NOT NULL,
    `new_quantity` INTEGER NOT NULL,
    `reference_type` ENUM('PURCHASE_ORDER', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER') NULL,
    `reference_id` VARCHAR(191) NULL,
    `unit_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(191) NULL,
    `moved_by` VARCHAR(191) NOT NULL,
    `movement_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_branch_id_idx`(`branch_id`),
    INDEX `stock_movements_tenant_id_idx`(`tenant_id`),
    INDEX `stock_movements_inventory_id_idx`(`inventory_id`),
    INDEX `stock_movements_movement_type_idx`(`movement_type`),
    INDEX `stock_movements_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `stock_movements_movement_date_idx`(`movement_date`),
    PRIMARY KEY (`stock_movement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `sale_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `sale_number` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `terminal_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `change_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `payment_method_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `sale_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `is_voided` BOOLEAN NOT NULL DEFAULT false,
    `voided_at` DATETIME(3) NULL,
    `voided_by` VARCHAR(191) NULL,
    `void_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sales_sale_number_key`(`sale_number`),
    INDEX `sales_branch_id_idx`(`branch_id`),
    INDEX `sales_tenant_id_idx`(`tenant_id`),
    INDEX `sales_customer_id_idx`(`customer_id`),
    INDEX `sales_terminal_id_idx`(`terminal_id`),
    INDEX `sales_user_id_idx`(`user_id`),
    INDEX `sales_sale_date_idx`(`sale_date`),
    INDEX `sales_sale_number_idx`(`sale_number`),
    PRIMARY KEY (`sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_items` (
    `sale_item_id` VARCHAR(191) NOT NULL,
    `sale_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(65, 30) NOT NULL,
    `unit_cost` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(65, 30) NOT NULL,
    `tax_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(65, 30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sale_items_sale_id_idx`(`sale_id`),
    INDEX `sale_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `sale_items_sale_id_product_id_key`(`sale_id`, `product_id`),
    PRIMARY KEY (`sale_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `terminal_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `is_default` BOOLEAN NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `item_count` INTEGER NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categories_category_id_key`(`category_id`),
    INDEX `categories_branch_id_idx`(`branch_id`),
    INDEX `categories_terminal_id_idx`(`terminal_id`),
    INDEX `categories_is_default_idx`(`is_default`),
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
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `is_default` BOOLEAN NULL DEFAULT false,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customers_customer_id_key`(`customer_id`),
    INDEX `customers_branch_id_idx`(`branch_id`),
    INDEX `customers_is_default_idx`(`is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_old` (
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
    `properties` JSON NULL,
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

    UNIQUE INDEX `inventory_old_product_id_key`(`product_id`),
    INDEX `inventory_old_created_by_idx`(`created_by`),
    INDEX `inventory_old_barcode_idx`(`barcode`),
    INDEX `inventory_old_branch_id_idx`(`branch_id`),
    INDEX `inventory_old_category_id_idx`(`category_id`),
    INDEX `inventory_old_name_idx`(`name`),
    INDEX `inventory_old_status_idx`(`status`),
    INDEX `inventory_old_last_updated_by_idx`(`last_updated_by`),
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
CREATE TABLE `return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_item_id` VARCHAR(191) NOT NULL,
    `return_transaction_id` VARCHAR(191) NOT NULL,
    `original_order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `returned_quantity` DECIMAL(65, 30) NOT NULL,
    `original_quantity` DECIMAL(65, 30) NOT NULL,
    `return_price` DECIMAL(65, 30) NOT NULL,
    `return_reason` VARCHAR(191) NULL,
    `restock_status` VARCHAR(191) NULL DEFAULT 'pending',
    `restocked_quantity` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `restocked_at` DATETIME(3) NULL,
    `condition` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `return_items_return_item_id_key`(`return_item_id`),
    INDEX `return_items_return_transaction_id_idx`(`return_transaction_id`),
    INDEX `return_items_original_order_id_idx`(`original_order_id`),
    INDEX `return_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `icon` VARCHAR(191) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_methods_method_id_key`(`method_id`),
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
    `scope` ENUM('global', 'terminal', 'self', 'system', 'tenant', 'branch') NULL DEFAULT 'branch',
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
    `featureCategoryId` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `features` JSON NOT NULL,
    `display_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`featureCategoryId`)
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
    `max_branches` INTEGER NULL DEFAULT 1,
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
    `verification_token` VARCHAR(191) NOT NULL,
    `owner_name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `trial_ends_at` DATETIME(3) NULL,
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
    `registered_at` DATETIME(3) NULL,
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
    `external_transaction_ref` VARCHAR(191) NULL,
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
    `is_refund` BOOLEAN NULL DEFAULT false,
    `original_transaction_id` VARCHAR(191) NULL,
    `refund_reason` VARCHAR(191) NULL,
    `refunded_amount` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `refunded_at` DATETIME(3) NULL,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sale_id` VARCHAR(191) NULL,

    UNIQUE INDEX `transactions_transaction_id_key`(`transaction_id`),
    INDEX `transactions_branch_id_idx`(`branch_id`),
    INDEX `transactions_customer_id_idx`(`customer_id`),
    INDEX `transactions_user_id_idx`(`user_id`),
    INDEX `transactions_payment_method_id_idx`(`payment_method_id`),
    INDEX `transactions_payment_service_provider_id_idx`(`payment_service_provider_id`),
    INDEX `transactions_terminal_id_idx`(`terminal_id`),
    INDEX `transactions_original_transaction_id_idx`(`original_transaction_id`),
    INDEX `transactions_sale_id_idx`(`sale_id`),
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
    `accessible_branches` JSON NULL,
    `allowed_terminals` JSON NULL,
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
    `type` VARCHAR(191) NOT NULL,
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

-- CreateTable
CREATE TABLE `app_setups` (
    `setup_id` VARCHAR(191) NOT NULL DEFAULT '-1',
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NOT NULL,
    `encrypted_verification_token` VARCHAR(191) NOT NULL,
    `iv` VARCHAR(191) NOT NULL,
    `data_signature` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `app_setups_tenant_id_idx`(`tenant_id`),
    INDEX `app_setups_branch_id_idx`(`branch_id`),
    INDEX `app_setups_terminal_id_idx`(`terminal_id`),
    INDEX `app_setups_created_at_idx`(`created_at`),
    UNIQUE INDEX `app_setups_tenant_id_branch_id_terminal_id_key`(`tenant_id`, `branch_id`, `terminal_id`),
    PRIMARY KEY (`setup_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terminal_settings` (
    `id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NOT NULL,
    `store_name` VARCHAR(191) NULL,
    `store_address` VARCHAR(191) NULL,
    `store_phone` VARCHAR(191) NULL,
    `store_email` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MKW',
    `tax_rate` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `business_license` VARCHAR(191) NULL,
    `business_tax_id` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en_US',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Africa/Blantyre',
    `date_format` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    `time_format` VARCHAR(191) NOT NULL DEFAULT '24h',
    `pin_length` INTEGER NOT NULL DEFAULT 4,
    `session_timeout_minutes` INTEGER NOT NULL DEFAULT 15,
    `auto_logout_minutes` INTEGER NOT NULL DEFAULT 30,
    `server_url` VARCHAR(191) NULL,
    `localization_settings` JSON NULL,
    `transaction_settings` JSON NULL,
    `customer_settings` JSON NULL,
    `receipt_settings` JSON NULL,
    `payment_settings` JSON NULL,
    `mra_compliance_settings` JSON NULL,
    `inventory_settings` JSON NULL,
    `sync_settings` JSON NULL,
    `security_settings` JSON NULL,
    `performance_settings` JSON NULL,
    `hardware_settings` JSON NULL,
    `integration_settings` JSON NULL,
    `workflow_settings` JSON NULL,
    `backup_settings` JSON NULL,
    `display_settings` JSON NULL,
    `tax_fee_settings` JSON NULL,
    `customer_management_settings` JSON NULL,
    `reporting_settings` JSON NULL,
    `settings_version` VARCHAR(191) NOT NULL DEFAULT '2.0.0',
    `last_configured_by` VARCHAR(191) NULL,
    `configuration_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `terminal_settings_terminal_id_key`(`terminal_id`),
    INDEX `terminal_settings_terminal_id_idx`(`terminal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terminal_settings_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NOT NULL,
    `setting_value` JSON NOT NULL,
    `override_level` VARCHAR(191) NOT NULL,
    `override_source_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `terminal_settings_overrides_override_level_override_source_i_idx`(`override_level`, `override_source_id`),
    INDEX `terminal_settings_overrides_setting_key_idx`(`setting_key`),
    UNIQUE INDEX `terminal_settings_overrides_override_level_override_source_i_key`(`override_level`, `override_source_id`, `setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HoldOrder` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `total` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalItems` INTEGER NOT NULL DEFAULT 0,
    `date` DATETIME(3) NOT NULL,
    `status` ENUM('hold', 'resumed', 'cancelled', 'completed', 'expired') NOT NULL DEFAULT 'hold',
    `userId` VARCHAR(191) NULL,
    `till` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,

    UNIQUE INDEX `HoldOrder_itemId_key`(`itemId`),
    UNIQUE INDEX `HoldOrder_reference_key`(`reference`),
    INDEX `HoldOrder_itemId_idx`(`itemId`),
    INDEX `HoldOrder_reference_idx`(`reference`),
    INDEX `HoldOrder_date_idx`(`date`),
    INDEX `HoldOrder_status_idx`(`status`),
    INDEX `HoldOrder_userId_idx`(`userId`),
    INDEX `HoldOrder_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HoldOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `holdOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `sku` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `discount` DECIMAL(65, 30) NULL DEFAULT 0,
    `tax` DECIMAL(65, 30) NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HoldOrderItem_holdOrderId_idx`(`holdOrderId`),
    INDEX `HoldOrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `printer_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NULL,
    `printer_name` VARCHAR(191) NOT NULL,
    `printer_model` VARCHAR(191) NULL,
    `printer_type` ENUM('THERMAL', 'INKJET', 'LASER', 'DOT_MATRIX', 'LABEL') NOT NULL DEFAULT 'THERMAL',
    `connection_type` ENUM('USB', 'NETWORK', 'BLUETOOTH', 'SERIAL', 'WIFI') NOT NULL DEFAULT 'USB',
    `connection_address` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `vendor_id` VARCHAR(191) NULL,
    `product_id` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_receipt_printer` BOOLEAN NOT NULL DEFAULT true,
    `is_label_printer` BOOLEAN NOT NULL DEFAULT false,
    `is_kitchen_printer` BOOLEAN NOT NULL DEFAULT false,
    `is_report_printer` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ONLINE', 'OFFLINE', 'BUSY', 'ERROR', 'PAPER_OUT', 'COVER_OPEN') NOT NULL DEFAULT 'OFFLINE',
    `configuration` JSON NULL,
    `last_connected` DATETIME(3) NULL,
    `last_print_job` DATETIME(3) NULL,
    `print_job_count` INTEGER NOT NULL DEFAULT 0,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `last_error` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `synced` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `printers_printer_id_key`(`printer_id`),
    INDEX `printers_tenant_id_idx`(`tenant_id`),
    INDEX `printers_branch_id_idx`(`branch_id`),
    INDEX `printers_terminal_id_idx`(`terminal_id`),
    INDEX `printers_is_default_idx`(`is_default`),
    INDEX `printers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `print_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `print_job_id` VARCHAR(191) NOT NULL,
    `printer_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `branch_id` VARCHAR(191) NOT NULL,
    `terminal_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `job_type` ENUM('RECEIPT', 'INVOICE', 'REPORT', 'LABEL', 'BARCODE', 'KITCHEN_ORDER', 'TEST_PAGE') NOT NULL DEFAULT 'RECEIPT',
    `job_title` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `content` TEXT NOT NULL,
    `content_type` VARCHAR(191) NULL,
    `copies` INTEGER NOT NULL DEFAULT 1,
    `priority` INTEGER NOT NULL DEFAULT 5,
    `reference_id` VARCHAR(191) NULL,
    `reference_type` VARCHAR(191) NULL,
    `error_message` VARCHAR(191) NULL,
    `printed_at` DATETIME(3) NULL,
    `scheduled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `print_jobs_print_job_id_key`(`print_job_id`),
    INDEX `print_jobs_printer_id_idx`(`printer_id`),
    INDEX `print_jobs_tenant_id_idx`(`tenant_id`),
    INDEX `print_jobs_branch_id_idx`(`branch_id`),
    INDEX `print_jobs_status_idx`(`status`),
    INDEX `print_jobs_job_type_idx`(`job_type`),
    INDEX `print_jobs_priority_idx`(`priority`),
    INDEX `print_jobs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_barcodes` ADD CONSTRAINT `product_barcodes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_received_by_fkey` FOREIGN KEY (`received_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`inventory_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_moved_by_fkey` FOREIGN KEY (`moved_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`method_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_voided_by_fkey` FOREIGN KEY (`voided_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mra_api_config_table` ADD CONSTRAINT `mra_api_config_table_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

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
ALTER TABLE `categories` ADD CONSTRAINT `categories_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_old` ADD CONSTRAINT `inventory_old_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

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
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`method_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_payment_service_provider_id_fkey` FOREIGN KEY (`payment_service_provider_id`) REFERENCES `payment_service_providers`(`providerId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_original_transaction_id_fkey` FOREIGN KEY (`original_transaction_id`) REFERENCES `transactions`(`transaction_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `terminal_settings` ADD CONSTRAINT `terminal_settings_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminals`(`terminal_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HoldOrderItem` ADD CONSTRAINT `HoldOrderItem_holdOrderId_fkey` FOREIGN KEY (`holdOrderId`) REFERENCES `HoldOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printers` ADD CONSTRAINT `printers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `printers` ADD CONSTRAINT `printers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `print_jobs` ADD CONSTRAINT `print_jobs_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`printer_id`) ON DELETE CASCADE ON UPDATE NO ACTION;
