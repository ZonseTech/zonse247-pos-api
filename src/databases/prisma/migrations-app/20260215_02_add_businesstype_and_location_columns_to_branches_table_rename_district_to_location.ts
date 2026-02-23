/**
 * Migration: 20260215_02
 * Description: Add businessType and location columns to branches table, rename district to location
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260215_02',
    description: 'Add businessType and location columns to branches table, rename district to location',
    up: {
            sqlite: [
                `ALTER TABLE "branches" ADD COLUMN "location" TEXT`,
                `ALTER TABLE "branches" ADD COLUMN "business_type" TEXT DEFAULT 'PRODUCT_BASED'`,
                `UPDATE "branches" SET "location" = "district" WHERE "district" IS NOT NULL AND "location" IS NULL`,
                `CREATE INDEX IF NOT EXISTS "idx_branches_location" ON "branches" ("location")`,
                `CREATE INDEX IF NOT EXISTS "idx_branches_business_type" ON "branches" ("business_type")`,
            ],
            mysql: [
                `DROP PROCEDURE IF EXISTS add_branches_location_col`,
                `CREATE PROCEDURE add_branches_location_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'location'
                    ) THEN
                        ALTER TABLE branches ADD COLUMN location VARCHAR(255) AFTER district_id;
                    END IF;
                END`,
                `CALL add_branches_location_col()`,
                `DROP PROCEDURE IF EXISTS add_branches_location_col`,
                `DROP PROCEDURE IF EXISTS add_branches_business_type_col`,
                `CREATE PROCEDURE add_branches_business_type_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'business_type'
                    ) THEN
                        ALTER TABLE branches ADD COLUMN business_type ENUM('PRODUCT_BASED', 'SERVICE_BASED', 'HYBRID') DEFAULT 'PRODUCT_BASED' AFTER location;
                    END IF;
                END`,
                `CALL add_branches_business_type_col()`,
                `DROP PROCEDURE IF EXISTS add_branches_business_type_col`,
                `DROP PROCEDURE IF EXISTS migrate_district_to_location`,
                `CREATE PROCEDURE migrate_district_to_location()
                BEGIN
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'district'
                    ) THEN
                        UPDATE branches SET location = district WHERE district IS NOT NULL AND location IS NULL;
                    END IF;
                END`,
                `CALL migrate_district_to_location()`,
                `DROP PROCEDURE IF EXISTS migrate_district_to_location`,
            ],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "idx_branches_location"`,
                `DROP INDEX IF EXISTS "idx_branches_business_type"`,
            ],
            mysql: [
                `ALTER TABLE branches DROP COLUMN business_type`,
                `ALTER TABLE branches DROP COLUMN location`,
            ],
        },
};
