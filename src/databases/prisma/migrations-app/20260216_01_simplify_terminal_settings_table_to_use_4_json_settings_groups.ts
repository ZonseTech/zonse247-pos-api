/**
 * Migration: 20260216_01
 * Description: Simplify terminal_settings table to use 4 JSON settings groups
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260216_01',
    description: 'Simplify terminal_settings table to use 4 JSON settings groups',
    up: {
        sqlite: [
            `ALTER TABLE "terminal_settings" ADD COLUMN "general_settings" TEXT`,
            `ALTER TABLE "terminal_settings" ADD COLUMN "business_settings" TEXT`,
            `UPDATE "terminal_settings" SET 
                    "general_settings" = json_object(
                        'dateFormat', 'DD/MM/YYYY',
                        'showProductImages', 1,
                        'productDisplayMode', 'GRID',
                        'barcodeScanMode', 'AUTO',
                        'enableStockAlerts', 1,
                        'enableVirtualKeyboard', 0,
                        'virtualKeyboardLayout', 'qwerty',
                        'virtualKeyboardTheme', 'default',
                        'virtualKeyboardSound', 0,
                        'virtualKeyboardHaptic', 0
                    )
                WHERE "general_settings" IS NULL`,
            `UPDATE "terminal_settings" SET 
                    "receipt_settings" = json_object(
                        'storeName', 'My Store',
                        'storePhone', '',
                        'storeAddress', '',
                        'storeWebsite', '',
                        'taxTitle', 'VAT',
                        'businessTaxId', '',
                        'logoUrl', '',
                        'receiptHeader', '',
                        'showPhoneOnReceipt', 1,
                        'showAddressOnReceipt', 1,
                        'showTaxOnReceipt', 1,
                        'showWebsiteOnReceipt', 0,
                        'showStoreLogo', 0,
                        'showListPrice', 1,
                        'showRateInReceipt', 1,
                        'showTotalMoneySaved', 0,
                        'showCashierName', 1,
                        'showCustomerPhone', 0,
                        'showCustomerAddress', 0,
                        'thankYouNote', 'Thank you for your purchase!',
                        'useAppLanguage', 1,
                        'showTotalItemCount', 1,
                        'showChangeReturn', 1,
                        'showPaymentDetails', 1,
                        'showPoweredBy', 1,
                        'orderItemsBy', 'orderAdded',
                        'messageTemplate', 'Total Bill Amount is #total',
                        'whatsappShareApp', 'whatsapp'
                    )
                WHERE "receipt_settings" IS NULL`,
            `UPDATE "terminal_settings" SET 
                    "business_settings" = json_object(
                        'receiptNumberPrefix', 'RCP',
                        'autoApplyTax', 1,
                        'taxInclusivePricing', 0,
                        'taxRate', 16.5,
                        'enableDiscounts', 1,
                        'requirePinForDiscount', 1,
                        'maxDiscountPercentage', 20,
                        'roundingEnabled', 1,
                        'tableManagementEnabled', 0,
                        'inventoryHealthScoreEnabled', 1
                    )
                WHERE "business_settings" IS NULL`,
            `UPDATE "terminal_settings" SET 
                    "security_settings" = json_object(
                        'autoSyncOnReconnect', 1,
                        'requirePinForVoid', 1,
                        'requirePinForReturn', 1,
                        'enableNotifications', 1,
                        'apiBaseUrl', 'http://127.0.0.1:3000/v1'
                    )
                WHERE "security_settings" IS NULL`,
            `UPDATE "terminal_settings" SET "settings_version" = '3.0.0' WHERE "settings_version" IS NULL OR "settings_version" = ''`,
            `CREATE INDEX IF NOT EXISTS "idx_terminal_settings_terminal_id" ON "terminal_settings" ("terminal_id")`,
        ],
        mysql: [
            `DROP PROCEDURE IF EXISTS add_terminal_settings_cols`,
            `CREATE PROCEDURE add_terminal_settings_cols()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'general_settings'
                    ) THEN
                        ALTER TABLE terminal_settings ADD COLUMN general_settings JSON AFTER terminal_id;
                    END IF;
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'business_settings'
                    ) THEN
                        ALTER TABLE terminal_settings ADD COLUMN business_settings JSON AFTER receipt_settings;
                    END IF;
                END`,
            `CALL add_terminal_settings_cols()`,
            `DROP PROCEDURE IF EXISTS add_terminal_settings_cols`,
            `UPDATE terminal_settings SET 
                    general_settings = JSON_OBJECT(
                        'dateFormat', 'DD/MM/YYYY',
                        'showProductImages', true,
                        'productDisplayMode', 'GRID',
                        'barcodeScanMode', 'AUTO',
                        'enableStockAlerts', true,
                        'enableVirtualKeyboard', false,
                        'virtualKeyboardLayout', 'qwerty',
                        'virtualKeyboardTheme', 'default',
                        'virtualKeyboardSound', false,
                        'virtualKeyboardHaptic', false
                    ),
                    receipt_settings = JSON_OBJECT(
                        'storeName', 'My Store',
                        'storePhone', '',
                        'storeAddress', '',
                        'storeWebsite', '',
                        'taxTitle', 'VAT',
                        'businessTaxId', '',
                        'logoUrl', '',
                        'receiptHeader', '',
                        'showPhoneOnReceipt', true,
                        'showAddressOnReceipt', true,
                        'showTaxOnReceipt', true,
                        'showWebsiteOnReceipt', false,
                        'showStoreLogo', false,
                        'showListPrice', true,
                        'showRateInReceipt', true,
                        'showTotalMoneySaved', false,
                        'showCashierName', true,
                        'showCustomerPhone', false,
                        'showCustomerAddress', false,
                        'thankYouNote', 'Thank you for your purchase!',
                        'useAppLanguage', true,
                        'showTotalItemCount', true,
                        'showChangeReturn', true,
                        'showPaymentDetails', true,
                        'showPoweredBy', true,
                        'orderItemsBy', 'orderAdded',
                        'messageTemplate', 'Total Bill Amount is #total',
                        'whatsappShareApp', 'whatsapp'
                    ),
                    business_settings = JSON_OBJECT(
                        'receiptNumberPrefix', 'RCP',
                        'autoApplyTax', true,
                        'taxInclusivePricing', false,
                        'taxRate', 16.5,
                        'enableDiscounts', true,
                        'requirePinForDiscount', true,
                        'maxDiscountPercentage', 20,
                        'roundingEnabled', true,
                        'tableManagementEnabled', false,
                        'inventoryHealthScoreEnabled', true
                    ),
                    security_settings = JSON_OBJECT(
                        'autoSyncOnReconnect', true,
                        'requirePinForVoid', true,
                        'requirePinForReturn', true,
                        'enableNotifications', true,
                        'apiBaseUrl', 'http://127.0.0.1:3001/v1'
                    ),
                    settings_version = '3.0.0'
                WHERE general_settings IS NULL`,
            `DROP PROCEDURE IF EXISTS drop_terminal_settings_old_cols`,
            `CREATE PROCEDURE drop_terminal_settings_old_cols()
                BEGIN
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'store_name') THEN
                        ALTER TABLE terminal_settings DROP COLUMN store_name;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'store_address') THEN
                        ALTER TABLE terminal_settings DROP COLUMN store_address;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'store_phone') THEN
                        ALTER TABLE terminal_settings DROP COLUMN store_phone;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'store_email') THEN
                        ALTER TABLE terminal_settings DROP COLUMN store_email;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'currency') THEN
                        ALTER TABLE terminal_settings DROP COLUMN currency;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'tax_rate') THEN
                        ALTER TABLE terminal_settings DROP COLUMN tax_rate;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'business_license') THEN
                        ALTER TABLE terminal_settings DROP COLUMN business_license;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'business_tax_id') THEN
                        ALTER TABLE terminal_settings DROP COLUMN business_tax_id;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'language') THEN
                        ALTER TABLE terminal_settings DROP COLUMN language;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'timezone') THEN
                        ALTER TABLE terminal_settings DROP COLUMN timezone;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'date_format') THEN
                        ALTER TABLE terminal_settings DROP COLUMN date_format;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'time_format') THEN
                        ALTER TABLE terminal_settings DROP COLUMN time_format;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'pin_length') THEN
                        ALTER TABLE terminal_settings DROP COLUMN pin_length;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'session_timeout_minutes') THEN
                        ALTER TABLE terminal_settings DROP COLUMN session_timeout_minutes;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'auto_logout_minutes') THEN
                        ALTER TABLE terminal_settings DROP COLUMN auto_logout_minutes;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'server_url') THEN
                        ALTER TABLE terminal_settings DROP COLUMN server_url;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'localization_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN localization_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'transaction_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN transaction_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'customer_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN customer_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'payment_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN payment_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'mra_compliance_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN mra_compliance_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'inventory_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN inventory_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'sync_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN sync_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'performance_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN performance_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'hardware_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN hardware_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'integration_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN integration_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'workflow_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN workflow_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'backup_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN backup_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'display_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN display_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'tax_fee_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN tax_fee_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'customer_management_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN customer_management_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'reporting_settings') THEN
                        ALTER TABLE terminal_settings DROP COLUMN reporting_settings;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'last_configured_by') THEN
                        ALTER TABLE terminal_settings DROP COLUMN last_configured_by;
                    END IF;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terminal_settings' AND COLUMN_NAME = 'configuration_date') THEN
                        ALTER TABLE terminal_settings DROP COLUMN configuration_date;
                    END IF;
                END`,
            `CALL drop_terminal_settings_old_cols()`,
            `DROP PROCEDURE IF EXISTS drop_terminal_settings_old_cols`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [],
    },
};
