/**
 * Migration: 20260215_01
 * Description: Add districts table with all Malawi districts and districtId to branches
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260215_01',
    description: 'Add districts table with all Malawi districts and districtId to branches',
    up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "districts" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "district_id" TEXT NOT NULL UNIQUE,
                    "name" TEXT NOT NULL,
                    "region" TEXT NOT NULL,
                    "code" TEXT NOT NULL UNIQUE,
                    "is_active" INTEGER NOT NULL DEFAULT 1,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_districts_region" ON "districts" ("region")`,
                `CREATE INDEX IF NOT EXISTS "idx_districts_is_active" ON "districts" ("is_active")`,
                `ALTER TABLE "branches" ADD COLUMN "district_id" TEXT`,
                `CREATE INDEX IF NOT EXISTS "idx_branches_district_id" ON "branches" ("district_id")`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Chitipa', 'Northern', 'CTP', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Karonga', 'Northern', 'KAR', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Likoma', 'Northern', 'LIK', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Mzimba', 'Northern', 'MZI', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Nkhata Bay', 'Northern', 'NKB', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Rumphi', 'Northern', 'RUM', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Dedza', 'Central', 'DED', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Dowa', 'Central', 'DOW', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Kasungu', 'Central', 'KAS', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Lilongwe', 'Central', 'LIL', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Mchinji', 'Central', 'MCH', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Nkhotakota', 'Central', 'NKH', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Ntcheu', 'Central', 'NTE', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Ntchisi', 'Central', 'NTS', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Salima', 'Central', 'SAL', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Balaka', 'Southern', 'BAL', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Blantyre', 'Southern', 'BLA', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Chikwawa', 'Southern', 'CKW', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Chiradzulu', 'Southern', 'CHI', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Machinga', 'Southern', 'MAC', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Mangochi', 'Southern', 'MAN', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Mulanje', 'Southern', 'MUL', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Mwanza', 'Southern', 'MWA', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Neno', 'Southern', 'NEN', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Nsanje', 'Southern', 'NSA', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Phalombe', 'Southern', 'PHA', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Thyolo', 'Southern', 'THY', 1)`,
                `INSERT OR IGNORE INTO "districts" ("district_id", "name", "region", "code", "is_active") VALUES (lower(hex(randomblob(16))), 'Zomba', 'Southern', 'ZOM', 1)`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS districts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    district_id VARCHAR(191) NOT NULL UNIQUE,
                    name VARCHAR(191) NOT NULL,
                    region VARCHAR(50) NOT NULL,
                    code VARCHAR(10) NOT NULL UNIQUE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                    INDEX idx_region (region),
                    INDEX idx_is_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                `DROP PROCEDURE IF EXISTS add_branches_district_id_col`,
                `CREATE PROCEDURE add_branches_district_id_col()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'district_id'
                    ) THEN
                        ALTER TABLE branches ADD COLUMN district_id VARCHAR(191) AFTER address_line_3;
                    END IF;
                END`,
                `CALL add_branches_district_id_col()`,
                `DROP PROCEDURE IF EXISTS add_branches_district_id_col`,
                `DROP PROCEDURE IF EXISTS add_branches_district_id_idx`,
                `CREATE PROCEDURE add_branches_district_id_idx()
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND INDEX_NAME = 'idx_branches_district_id'
                    ) THEN
                        CREATE INDEX idx_branches_district_id ON branches (district_id);
                    END IF;
                END`,
                `CALL add_branches_district_id_idx()`,
                `DROP PROCEDURE IF EXISTS add_branches_district_id_idx`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Chitipa', 'Northern', 'CTP', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Karonga', 'Northern', 'KAR', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Likoma', 'Northern', 'LIK', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Mzimba', 'Northern', 'MZI', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Nkhata Bay', 'Northern', 'NKB', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Rumphi', 'Northern', 'RUM', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Dedza', 'Central', 'DED', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Dowa', 'Central', 'DOW', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Kasungu', 'Central', 'KAS', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Lilongwe', 'Central', 'LIL', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Mchinji', 'Central', 'MCH', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Nkhotakota', 'Central', 'NKH', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Ntcheu', 'Central', 'NTE', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Ntchisi', 'Central', 'NTS', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Salima', 'Central', 'SAL', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Balaka', 'Southern', 'BAL', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Blantyre', 'Southern', 'BLA', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Chikwawa', 'Southern', 'CKW', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Chiradzulu', 'Southern', 'CHI', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Machinga', 'Southern', 'MAC', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Mangochi', 'Southern', 'MAN', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Mulanje', 'Southern', 'MUL', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Mwanza', 'Southern', 'MWA', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Neno', 'Southern', 'NEN', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Nsanje', 'Southern', 'NSA', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Phalombe', 'Southern', 'PHA', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Thyolo', 'Southern', 'THY', TRUE)`,
                `INSERT IGNORE INTO districts (district_id, name, region, code, is_active) VALUES (UUID(), 'Zomba', 'Southern', 'ZOM', TRUE)`,
            ],
        },
    down: {
            sqlite: [
                `DROP INDEX IF EXISTS "idx_branches_district_id"`,
                `DROP TABLE IF EXISTS "districts"`,
            ],
            mysql: [
                `ALTER TABLE branches DROP COLUMN district_id`,
                `DROP TABLE IF EXISTS districts`,
            ],
        },
};
