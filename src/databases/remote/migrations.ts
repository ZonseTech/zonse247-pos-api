import { mysqlPool } from '../../config/db';
import {
	CATEGORY_DB,
	CUSTOMER_DB,
	INVENTORY_DB,
	SETTINGS_DB,
	TRANSACTIONS_DB,
	PAYMENT_METHODS_DB,
	USERS_DB,
	ORDERS_DB,
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
            CREATE TABLE IF NOT EXISTS ${USERS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                fullname VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                perm_products TINYINT DEFAULT 0,
                perm_categories TINYINT DEFAULT 0,
                perm_transactions TINYINT DEFAULT 0,
                perm_users TINYINT DEFAULT 0,
                perm_settings TINYINT DEFAULT 0,
                synced TINYINT DEFAULT 0,
                last_login TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                last_logged_out TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${CATEGORY_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL UNIQUE,
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${CUSTOMER_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${SETTINGS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                app VARCHAR(100) NOT NULL,
                store VARCHAR(100) NOT NULL,
                address_one VARCHAR(255),
                address_two VARCHAR(255),
                contact VARCHAR(100),
                tax VARCHAR(20),
                symbol VARCHAR(10),
                percentage DECIMAL(5, 2),
                charge_tax BOOLEAN DEFAULT FALSE,
                footer TEXT,
                img VARCHAR(255),
                till_name VARCHAR(100),
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${PAYMENT_METHODS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(50) NOT NULL,
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${INVENTORY_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                barcode VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                category_id VARCHAR(50),
                cost_price DECIMAL(10, 2),
                sell_price DECIMAL(10, 2),
                promo_price DECIMAL(10, 2),
                quantity INT DEFAULT 0,
                original_quantity INT DEFAULT 0,
                stock INT DEFAULT 0,
                min_stock INT,
                status VARCHAR(20) DEFAULT 'active',
                expiration_date DATE,
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                INDEX idx_category_id (category_id),
                FOREIGN KEY (category_id) REFERENCES ${CATEGORY_DB}(uuid) ON DELETE SET NULL
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                ref_number VARCHAR(50) NOT NULL UNIQUE,
                customer_id VARCHAR(50),
                payment_id VARCHAR(50),
                transaction_id VARCHAR(100),
                status VARCHAR(20) DEFAULT 'completed',
                subtotal DECIMAL(10, 2) NOT NULL,
                tax DECIMAL(10, 2) DEFAULT 0,
                discount DECIMAL(10, 2) DEFAULT 0,
                total DECIMAL(10, 2) NOT NULL,
                paid DECIMAL(10, 2) NOT NULL,
                change_amount DECIMAL(10, 2) DEFAULT 0,
                date DATE,
                phone_number VARCHAR(20),
                service_provider_id INT,
                till VARCHAR(100),
                user_id VARCHAR(50),
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                INDEX idx_customer_id (customer_id),
                INDEX idx_user_id (user_id),
                INDEX idx_payment_id (payment_id),
                INDEX idx_ref_number (ref_number),
                FOREIGN KEY (customer_id) REFERENCES ${CUSTOMER_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES ${USERS_DB}(uuid) ON DELETE SET NULL,
                FOREIGN KEY (payment_id) REFERENCES ${PAYMENT_METHODS_DB}(uuid) ON DELETE SET NULL
            )
        `);

		await connection.query(`
            CREATE TABLE IF NOT EXISTS ${ORDERS_DB} (
                id INT PRIMARY KEY AUTO_INCREMENT,
                uuid VARCHAR(100) NOT NULL UNIQUE,
                ref_number VARCHAR(50),
                product_id VARCHAR(50),
                quantity INT NOT NULL,
                purchase_price DECIMAL(10, 2) NOT NULL,
                sell_price DECIMAL(10, 2) NOT NULL,
                synced TINYINT DEFAULT 0,
                created_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                INDEX idx_ref_number (ref_number),
                INDEX idx_product_id (product_id),
                FOREIGN KEY (ref_number) REFERENCES ${TRANSACTIONS_DB}(ref_number) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES ${INVENTORY_DB}(uuid) ON DELETE CASCADE
            )
        `);

		connection.release();
		console.log('Database initialized successfully');
		return true;
	} catch (error) {
		console.error('Error initializing database:', error);
		return false;
	}
};

export { testConnection, initDatabase };
