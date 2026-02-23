/**
 * Migration: 20260212_01
 * Description: Add other_charges column to sales and parked_sales tables
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260212_01',
    description: 'Add other_charges column to sales and parked_sales tables',
    up: {
            sqlite: [
                `ALTER TABLE "sales" ADD COLUMN "other_charges" REAL DEFAULT 0.00`,
                `ALTER TABLE "parked_sales" ADD COLUMN "other_charges" REAL DEFAULT 0.00`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS add_sales_other_charges_col`,
                `CREATE PROCEDURE add_sales_other_charges_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'other_charges'
                    ) THEN
                        ALTER TABLE sales ADD COLUMN other_charges DECIMAL(12, 2) DEFAULT 0.00 AFTER discount_amount;
                    END IF;
                END`,
                `CALL add_sales_other_charges_col()`,
                `DROP PROCEDURE IF EXISTS add_sales_other_charges_col`,
                `DROP PROCEDURE IF EXISTS add_parked_sales_other_charges_col`,
                `CREATE PROCEDURE add_parked_sales_other_charges_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parked_sales' AND COLUMN_NAME = 'other_charges'
                    ) THEN
                        ALTER TABLE parked_sales ADD COLUMN other_charges DECIMAL(12, 2) DEFAULT 0.00 AFTER discount_amount;
                    END IF;
                END`,
                `CALL add_parked_sales_other_charges_col()`,
                `DROP PROCEDURE IF EXISTS add_parked_sales_other_charges_col`,
            ],
        },
    down: {
            sqlite: [],
            mysql: [
                `ALTER TABLE sales DROP COLUMN other_charges`,
                `ALTER TABLE parked_sales DROP COLUMN other_charges`,
            ],
        },
};
