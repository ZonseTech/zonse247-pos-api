import { mysqlPool } from '../../config/db';
import {
    CLIENTS_DB,
    SHOPS_DB,
    WORKSTATIONS_DB,
    USERS_DB,
    USER_SESSIONS_DB,
    CATEGORIES_DB,
    CUSTOMERS_DB,
    INVENTORY_DB,
    TRANSACTIONS_DB,
    ORDERS_DB,
    PAYMENT_METHODS_DB,
    SHOP_SETTINGS_DB,
    SUBSCRIPTION_PLANS_DB,
    CLIENT_SUBSCRIPTIONS_DB,
    AUDIT_LOGS_DB,
    ROLES_DB,
    PERMISSIONS_DB,
    ROLE_PERMISSIONS_DB,
    USER_PERMISSIONS_DB,
} from '../local/tables';

const testConnection = async () => {
    try {
        const connection = await mysqlPool.getConnection();
        console.log('Database connection established successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('Error connecting to the database:', error);
        return false;
    }
};

const initDatabase = async () => {
    try {
        const connection = await mysqlPool.getConnection();

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${CLIENTS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                client_id VARCHAR(50) NOT NULL UNIQUE,
                company_name VARCHAR(200) NOT NULL,
                owner_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(20) NOT NULL,
                address TEXT,
                country VARCHAR(50),
                timezone VARCHAR(50) DEFAULT 'UTC',
                subscription_status ENUM('active', 'inactive', 'suspended', 'trial') DEFAULT 'trial',
                trial_ends_at TIMESTAMP(3) NULL,
                auth_key VARCHAR(255) NOT NULL UNIQUE,
                status ENUM('pending', 'active', 'suspended', 'cancelled') DEFAULT 'pending',
                registered_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                activated_at TIMESTAMP(3) NULL,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                INDEX idx_client_id (client_id),
                INDEX idx_auth_key (auth_key),
                INDEX idx_email (email)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${SUBSCRIPTION_PLANS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                billing_cycle ENUM('monthly', 'yearly', 'lifetime') NOT NULL,
                max_shops INT DEFAULT 1,
                max_users_per_shop INT DEFAULT 5,
                max_products INT DEFAULT 1000,
                max_transactions_per_month INT DEFAULT 10000,
                features JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${CLIENT_SUBSCRIPTIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                client_id VARCHAR(100) NOT NULL,
                plan_id VARCHAR(100) NOT NULL,
                status ENUM('active', 'cancelled', 'expired', 'past_due') DEFAULT 'active',
                starts_at TIMESTAMP(3) NOT NULL,
                ends_at TIMESTAMP(3) NULL,
                auto_renew BOOLEAN DEFAULT TRUE,
                payment_method VARCHAR(50),
                last_payment_date TIMESTAMP(3) NULL,
                next_payment_date TIMESTAMP(3) NULL,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (client_id) REFERENCES ${CLIENTS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES ${SUBSCRIPTION_PLANS_DB}(uuid) ON DELETE RESTRICT
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${SHOPS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                client_id VARCHAR(100) NOT NULL,
                shop_code VARCHAR(50) NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                address_line1 VARCHAR(255),
                address_line2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                country VARCHAR(50),
                phone VARCHAR(20),
                email VARCHAR(100),
                tax_number VARCHAR(50),
                currency_code VARCHAR(3) DEFAULT 'MKW',
                currency_symbol VARCHAR(10) DEFAULT 'K',
                tax_rate DECIMAL(5, 2) DEFAULT 0.00,
                charge_tax BOOLEAN DEFAULT FALSE,
                receipt_footer TEXT,
                logo_url VARCHAR(500),
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (client_id) REFERENCES ${CLIENTS_DB}(uuid) ON DELETE CASCADE,
                UNIQUE KEY unique_client_shop (client_id, shop_code),
                INDEX idx_client_id (client_id),
                INDEX idx_shop_code (shop_code)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${WORKSTATIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                client_id VARCHAR(100) NOT NULL,
                till_name VARCHAR(100) NOT NULL,
                till_number VARCHAR(50) NOT NULL,
                device_id VARCHAR(255),
                device_type ENUM('desktop', 'tablet', 'mobile', 'web') DEFAULT 'desktop',
                ip_address VARCHAR(45),
                last_sync TIMESTAMP(3) NULL,
                status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
                is_primary BOOLEAN DEFAULT FALSE,
                registered_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                last_activity TIMESTAMP(3) NULL,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (client_id) REFERENCES ${CLIENTS_DB}(uuid) ON DELETE CASCADE,
                UNIQUE KEY unique_shop_till (shop_id, till_number),
                INDEX idx_shop_id (shop_id),
                INDEX idx_client_id (client_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${ROLES_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                client_id VARCHAR(100) NOT NULL,
                shop_id VARCHAR(100),
                name VARCHAR(50) NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                is_system_role BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                
                FOREIGN KEY (client_id) REFERENCES ${CLIENTS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                
                UNIQUE KEY unique_client_shop_role (client_id, shop_id, name),
                INDEX idx_client_id (client_id),
                INDEX idx_shop_id (shop_id),
                INDEX idx_name (name)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${PERMISSIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(50) NOT NULL UNIQUE,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL, 
                scope ENUM('system', 'client', 'shop') DEFAULT 'shop',
                is_system_permission BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                
                INDEX idx_name (name),
                INDEX idx_category (category),
                INDEX idx_scope (scope)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${ROLE_PERMISSIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                role_uuid VARCHAR(100) NOT NULL,
                permission_uuid VARCHAR(100) NOT NULL,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                
                FOREIGN KEY (role_uuid) REFERENCES ${ROLES_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (permission_uuid) REFERENCES ${PERMISSIONS_DB}(uuid) ON DELETE CASCADE,
                
                UNIQUE KEY unique_role_permission (role_uuid, permission_uuid),
                INDEX idx_role_uuid (role_uuid),
                INDEX idx_permission_uuid (permission_uuid)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${USERS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                client_id VARCHAR(100) NOT NULL,
                shop_id VARCHAR(100) NOT NULL,
                username VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                fullname VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                role_uuid VARCHAR(100) NOT NULL,
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                accessible_shops JSON,
                allowed_workstations JSON,
                max_discount_percent DECIMAL(5, 2) DEFAULT 0.00,
                can_override_prices BOOLEAN DEFAULT FALSE,
                pin_code VARCHAR(10),
                current_shop_id VARCHAR(100),
                last_login TIMESTAMP(3) NULL,
                last_logout TIMESTAMP(3) NULL,
                password_changed_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                force_password_change BOOLEAN DEFAULT FALSE,

                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                FOREIGN KEY (client_id) REFERENCES ${CLIENTS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (role_uuid) REFERENCES ${ROLES_DB}(uuid) ON DELETE RESTRICT,
                FOREIGN KEY (current_shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE SET NULL,

                UNIQUE KEY unique_client_username (client_id, username),
                INDEX idx_client_id (client_id),
                INDEX idx_shop_id (shop_id),
                INDEX idx_username (username),
                INDEX idx_role_uuid (role_uuid)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${USER_PERMISSIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_uuid VARCHAR(100) NOT NULL,
                permission_uuid VARCHAR(100) NOT NULL,
                shop_id VARCHAR(100),
                granted BOOLEAN NOT NULL,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                created_by VARCHAR(100),
                
                FOREIGN KEY (user_uuid) REFERENCES ${USERS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (permission_uuid) REFERENCES ${PERMISSIONS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES ${USERS_DB}(uuid) ON DELETE SET NULL,
                
                UNIQUE KEY unique_user_permission_shop (user_uuid, permission_uuid, shop_id),
                INDEX idx_user_uuid (user_uuid),
                INDEX idx_permission_uuid (permission_uuid),
                INDEX idx_shop_id (shop_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${USER_SESSIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                user_id VARCHAR(100) NOT NULL,
                workstation_id VARCHAR(100) NOT NULL,
                session_token VARCHAR(255) NOT NULL UNIQUE,
                ip_address VARCHAR(45),
                user_agent TEXT,
                started_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                last_activity TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                ended_at TIMESTAMP(3) NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (user_id) REFERENCES ${USERS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (workstation_id) REFERENCES ${WORKSTATIONS_DB}(uuid) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_session_token (session_token),
                INDEX idx_workstation_id (workstation_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${CATEGORIES_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                color_code VARCHAR(7),
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                UNIQUE KEY unique_shop_category (shop_id, name),
                INDEX idx_shop_id (shop_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${CUSTOMERS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                customer_code VARCHAR(50),
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                email VARCHAR(100),
                address_line1 TEXT,
                address_line2 TEXT,
                city VARCHAR(100),
                postal_code VARCHAR(20),
                date_of_birth DATE,
                gender ENUM('male', 'female', 'other'),
                loyalty_points INT DEFAULT 0,
                total_spent DECIMAL(10, 2) DEFAULT 0.00,
                visit_count INT DEFAULT 0,
                last_visit TIMESTAMP(3) NULL,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                INDEX idx_shop_id (shop_id),
                INDEX idx_phone (phone),
                INDEX idx_email (email),
                UNIQUE KEY unique_shop_customer_code (shop_id, customer_code)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${PAYMENT_METHODS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                name VARCHAR(50) NOT NULL,
                type ENUM('cash', 'card', 'mobile_money', 'bank_transfer', 'crypto', 'other') DEFAULT 'cash',
                is_active BOOLEAN DEFAULT TRUE,
                requires_reference BOOLEAN DEFAULT FALSE,
                icon_url VARCHAR(500),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                UNIQUE KEY unique_shop_payment_method (shop_id, name),
                INDEX idx_shop_id (shop_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${INVENTORY_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                category_id VARCHAR(100),
                barcode VARCHAR(100) NOT NULL,
                sku VARCHAR(50),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                brand VARCHAR(100),
                unit VARCHAR(20) DEFAULT 'piece',
                cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                sell_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                promo_price DECIMAL(10, 2),
                promo_start DATE,
                promo_end DATE,
                quantity INT DEFAULT 0,
                reserved_quantity INT DEFAULT 0,
                min_stock INT DEFAULT 0,
                max_stock INT,
                reorder_level INT,
                weight DECIMAL(8, 3),
                dimensions VARCHAR(50),
                color VARCHAR(50),
                size VARCHAR(50),
                status ENUM('active', 'inactive', 'discontinued', 'out_of_stock') DEFAULT 'active',
                track_inventory BOOLEAN DEFAULT TRUE,
                allow_negative_stock BOOLEAN DEFAULT FALSE,
                is_taxable BOOLEAN DEFAULT TRUE,
                expiration_date DATE,
                manufacture_date DATE,
                image_urls JSON,
                supplier_name VARCHAR(100),
                supplier_code VARCHAR(50),
                created_by VARCHAR(100),
                last_updated_by VARCHAR(100),
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES ${CATEGORIES_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES ${USERS_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (last_updated_by) REFERENCES ${USERS_DB}(uuid) ON DELETE SET NULL,
                
                UNIQUE KEY unique_shop_barcode (shop_id, barcode),
                UNIQUE KEY unique_shop_sku (shop_id, sku),
                INDEX idx_shop_id (shop_id),
                INDEX idx_category_id (category_id),
                INDEX idx_barcode (barcode),
                INDEX idx_name (name),
                INDEX idx_status (status)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                workstation_id VARCHAR(100) NOT NULL,
                ref_number VARCHAR(50) NOT NULL,
                customer_id VARCHAR(100),
                user_id VARCHAR(100) NOT NULL,
                payment_method_id VARCHAR(100) NOT NULL,
                payment_reference VARCHAR(100),
                transaction_type ENUM('sale', 'refund', 'exchange', 'void') DEFAULT 'sale',
                status ENUM('pending', 'completed', 'cancelled', 'refunded', 'voided') DEFAULT 'completed',
                subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(10, 2) DEFAULT 0.00,
                discount_amount DECIMAL(10, 2) DEFAULT 0.00,
                total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                change_amount DECIMAL(10, 2) DEFAULT 0.00,
                discount_type ENUM('percentage', 'fixed', 'coupon') NULL,
                discount_value DECIMAL(10, 2),
                coupon_code VARCHAR(50),
                notes TEXT,
                receipt_printed BOOLEAN DEFAULT FALSE,
                receipt_email_sent BOOLEAN DEFAULT FALSE,
                points_earned INT DEFAULT 0,
                points_redeemed INT DEFAULT 0,
                parent_transaction_id VARCHAR(100),
                transaction_date TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                completed_at TIMESTAMP(3) NULL,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (workstation_id) REFERENCES ${WORKSTATIONS_DB}(uuid) ON DELETE RESTRICT,
                FOREIGN KEY (customer_id) REFERENCES ${CUSTOMERS_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES ${USERS_DB}(uuid) ON DELETE RESTRICT,
                FOREIGN KEY (payment_method_id) REFERENCES ${PAYMENT_METHODS_DB}(uuid) ON DELETE RESTRICT,
                FOREIGN KEY (parent_transaction_id) REFERENCES ${TRANSACTIONS_DB}(uuid) ON DELETE SET NULL,
                
                UNIQUE KEY unique_shop_ref_number (shop_id, ref_number),
                INDEX idx_shop_id (shop_id),
                INDEX idx_workstation_id (workstation_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_user_id (user_id),
                INDEX idx_transaction_date (transaction_date),
                INDEX idx_status (status),
                INDEX idx_ref_number (ref_number)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${ORDERS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                transaction_id VARCHAR(100) NOT NULL,
                product_id VARCHAR(100) NOT NULL,
                product_name VARCHAR(200) NOT NULL,
                product_sku VARCHAR(50),
                product_barcode VARCHAR(100),
                quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
                unit_cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                unit_sell_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                unit_discount DECIMAL(10, 2) DEFAULT 0.00,
                line_subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                line_discount DECIMAL(10, 2) DEFAULT 0.00,
                line_tax DECIMAL(10, 2) DEFAULT 0.00,
                line_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                discount_type ENUM('percentage', 'fixed') NULL,
                discount_value DECIMAL(10, 2),
                discount_reason VARCHAR(100),
                tax_rate DECIMAL(5, 2) DEFAULT 0.00,
                is_taxable BOOLEAN DEFAULT TRUE,
                notes TEXT,
                is_refunded BOOLEAN DEFAULT FALSE,
                refunded_quantity DECIMAL(10, 3) DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                
                FOREIGN KEY (transaction_id) REFERENCES ${TRANSACTIONS_DB}(uuid) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES ${INVENTORY_DB}(uuid) ON DELETE RESTRICT,
                
                INDEX idx_transaction_id (transaction_id),
                INDEX idx_product_id (product_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${SHOP_SETTINGS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                shop_id VARCHAR(100) NOT NULL,
                receipt_header TEXT,
                receipt_footer TEXT,
                receipt_logo_url VARCHAR(500),
                auto_print_receipts BOOLEAN DEFAULT TRUE,
                receipt_copies INT DEFAULT 1,
                default_tax_rate DECIMAL(5, 2) DEFAULT 0.00,
                tax_inclusive_pricing BOOLEAN DEFAULT FALSE,
                tax_number VARCHAR(50),
                track_inventory BOOLEAN DEFAULT TRUE,
                allow_negative_stock BOOLEAN DEFAULT FALSE,
                low_stock_alert BOOLEAN DEFAULT TRUE,
                auto_reorder BOOLEAN DEFAULT FALSE,
                allow_price_override BOOLEAN DEFAULT FALSE,
                max_discount_percent DECIMAL(5, 2) DEFAULT 100.00,
                require_discount_reason BOOLEAN DEFAULT FALSE,
                require_customer_info BOOLEAN DEFAULT FALSE,
                loyalty_program_enabled BOOLEAN DEFAULT FALSE,
                points_per_currency DECIMAL(10, 2) DEFAULT 1.00,
                require_manager_override BOOLEAN DEFAULT FALSE,
                session_timeout_minutes INT DEFAULT 480,
                require_pin_for_void BOOLEAN DEFAULT TRUE,
                business_hours JSON,
                timezone VARCHAR(50) DEFAULT 'UTC',
                auto_backup BOOLEAN DEFAULT TRUE,
                backup_frequency ENUM('hourly', 'daily', 'weekly') DEFAULT 'daily',
                cloud_sync_enabled BOOLEAN DEFAULT TRUE,
                email_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                notification_email VARCHAR(100),
                notification_phone VARCHAR(20),
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE CASCADE,
                UNIQUE KEY unique_shop_settings (shop_id),
                INDEX idx_shop_id (shop_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ${AUDIT_LOGS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                client_id VARCHAR(100),
                shop_id VARCHAR(100),
                user_id VARCHAR(100),
                workstation_id VARCHAR(100),
                action_type ENUM('create', 'update', 'delete', 'login', 'logout', 'access', 'export', 'import', 'backup', 'sync') NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(100),
                entity_name VARCHAR(200),
                old_values JSON,
                new_values JSON,
                changes_summary TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                request_method VARCHAR(10),
                request_url VARCHAR(500),
                description TEXT,
                severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                
                FOREIGN KEY (client_id) REFERENCES ${CLIENTS_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (shop_id) REFERENCES ${SHOPS_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES ${USERS_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (workstation_id) REFERENCES ${WORKSTATIONS_DB}(uuid) ON DELETE SET NULL,
                
                INDEX idx_client_id (client_id),
                INDEX idx_shop_id (shop_id),
                INDEX idx_user_id (user_id),
                INDEX idx_action_type (action_type),
                INDEX idx_entity_type (entity_type),
                INDEX idx_created_at (created_at)
            )
        `);

        connection.release();
        console.log('Enhanced multi-tenant database initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        return false;
    }
};

const seedDefaultData = async () => {
    try {
        const connection = await mysqlPool.getConnection();

        await connection.query(`
            INSERT IGNORE INTO ${SUBSCRIPTION_PLANS_DB} (uuid, name, description, price, billing_cycle, max_shops, max_users_per_shop, max_products, max_transactions_per_month, features) VALUES
            ('plan-basic-001', 'Basic Plan', 'Perfect for small businesses', 9.99, 'monthly', 1, 3, 500, 1000, '["basic_pos", "inventory_management", "basic_reports"]'),
            ('plan-pro-001', 'Professional Plan', 'Great for growing businesses', 29.99, 'monthly', 3, 10, 5000, 10000, '["advanced_pos", "inventory_management", "advanced_reports", "customer_management", "loyalty_program"]'),
            ('plan-enterprise-001', 'Enterprise Plan', 'For large businesses', 99.99, 'monthly', 10, 50, 50000, 100000, '["full_pos", "advanced_inventory", "comprehensive_reports", "multi_location", "api_access", "custom_integrations"]'),
            ('plan-trial-001', 'Trial Plan', '30-day free trial', 0.00, 'monthly', 1, 2, 100, 500, '["basic_pos", "basic_inventory", "basic_reports"]')
        `);

        connection.release();
        console.log('Default data seeded successfully');
        return true;
    } catch (error) {
        console.error('Error seeding default data:', error);
        return false;
    }
};

export { testConnection, initDatabase, seedDefaultData };