/**
 * Migration: 20260210_01
 * Description: Add expiry_date_alert column to product_variants table for expiration alerts
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260210_01',
    description: 'Add expiry_date_alert column to product_variants table for expiration alerts',
    up: {
            sqlite: [
                `ALTER TABLE "product_variants" ADD COLUMN "expiry_date_alert" INTEGER`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS add_expiry_date_alert_col`,
                `CREATE PROCEDURE add_expiry_date_alert_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_variants' AND COLUMN_NAME = 'expiry_date_alert'
                    ) THEN
                        ALTER TABLE product_variants ADD COLUMN expiry_date_alert INT NULL;
                    END IF;
                END`,
                `CALL add_expiry_date_alert_col()`,
                `DROP PROCEDURE IF EXISTS add_expiry_date_alert_col`,
            ],
        },
    down: {
            sqlite: [],
            mysql: [
                `ALTER TABLE product_variants DROP COLUMN expiry_date_alert`,
            ],
        },
};
