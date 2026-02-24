/**
 * Migration: 20260110_01
 * Description: Add tenant_registration_details table for storing temporary registration info
 * 
 * Auto-extracted from inline migrations
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260110_01',
    description: 'Add tenant_registration_details table for storing temporary registration info',
    up: {
            sqlite: [
                `CREATE TABLE IF NOT EXISTS "tenant_registration_details" (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "detail_id" TEXT NOT NULL UNIQUE,
                    "tenant_id" TEXT NOT NULL,
                    "business_name" TEXT NOT NULL,
                    "owner_name" TEXT NOT NULL,
                    "email" TEXT NOT NULL,
                    "tenant_code" TEXT NOT NULL,
                    "verification_token" TEXT NOT NULL,
                    "username" TEXT NOT NULL,
                    "password" TEXT NOT NULL,
                    "is_processed" INTEGER NOT NULL DEFAULT 0,
                    "processed_at" DATETIME,
                    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_tenant_id" ON "tenant_registration_details" ("tenant_id")`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_email" ON "tenant_registration_details" ("email")`,
                `CREATE INDEX IF NOT EXISTS "idx_tenant_registration_details_is_processed" ON "tenant_registration_details" ("is_processed")`,
            ],
            mysql: [
                `CREATE TABLE IF NOT EXISTS tenant_registration_details (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    detail_id VARCHAR(255) NOT NULL UNIQUE,
                    tenant_id VARCHAR(255) NOT NULL,
                    business_name VARCHAR(255) NOT NULL,
                    owner_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    tenant_code VARCHAR(255) NOT NULL,
                    verification_token TEXT NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
                    processed_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_tenant_id (tenant_id),
                    INDEX idx_email (email),
                    INDEX idx_is_processed (is_processed)
                )`,
            ],
        },
    down: {
            sqlite: [
                `DROP TABLE IF EXISTS "tenant_registration_details"`,
            ],
            mysql: [
                `DROP TABLE IF EXISTS tenant_registration_details`,
            ],
        },
};
