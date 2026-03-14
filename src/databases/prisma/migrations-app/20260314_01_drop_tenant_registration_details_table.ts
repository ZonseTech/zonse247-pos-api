/**
 * Migration: 20260314_01
 * Description: Drop tenant_registration_details table - module removed
 * 
 * The tenant registration details module has been completely removed.
 * This migration drops the tenant_registration_details table from the database.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260314_01',
    description: 'Drop tenant_registration_details table - module removed',
    up: {
        sqlite: [
            `DROP TABLE IF EXISTS "tenant_registration_details"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`tenant_registration_details\``,
        ],
    },
    down: {
        sqlite: [
            // Recreate the table if needed (for rollback)
            `CREATE TABLE IF NOT EXISTS "tenant_registration_details" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "detail_id" TEXT NOT NULL,
                "tenant_id" TEXT NOT NULL,
                "business_name" TEXT NOT NULL,
                "owner_name" TEXT NOT NULL,
                "email" TEXT NOT NULL,
                "tenant_code" TEXT NOT NULL,
                "verification_token" TEXT NOT NULL,
                "username" TEXT NOT NULL,
                "password" TEXT NOT NULL,
                "is_processed" BOOLEAN NOT NULL DEFAULT false,
                "processed_at" DATETIME,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL
            )`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "tenant_registration_details_detail_id_key" ON "tenant_registration_details"("detail_id")`,
            `CREATE INDEX IF NOT EXISTS "tenant_registration_details_tenant_id_idx" ON "tenant_registration_details"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "tenant_registration_details_email_idx" ON "tenant_registration_details"("email")`,
            `CREATE INDEX IF NOT EXISTS "tenant_registration_details_is_processed_idx" ON "tenant_registration_details"("is_processed")`,
        ],
        mysql: [
            // Recreate the table if needed (for rollback)
            `CREATE TABLE IF NOT EXISTS \`tenant_registration_details\` (
                \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`detail_id\` VARCHAR(255) NOT NULL,
                \`tenant_id\` VARCHAR(255) NOT NULL,
                \`business_name\` VARCHAR(255) NOT NULL,
                \`owner_name\` VARCHAR(255) NOT NULL,
                \`email\` VARCHAR(255) NOT NULL,
                \`tenant_code\` VARCHAR(255) NOT NULL,
                \`verification_token\` TEXT NOT NULL,
                \`username\` VARCHAR(255) NOT NULL,
                \`password\` VARCHAR(255) NOT NULL,
                \`is_processed\` BOOLEAN NOT NULL DEFAULT false,
                \`processed_at\` DATETIME,
                \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` DATETIME NOT NULL,
                UNIQUE INDEX \`tenant_registration_details_detail_id_key\` (\`detail_id\`),
                INDEX \`tenant_registration_details_tenant_id_idx\` (\`tenant_id\`),
                INDEX \`tenant_registration_details_email_idx\` (\`email\`),
                INDEX \`tenant_registration_details_is_processed_idx\` (\`is_processed\`)
            )`,
        ],
    },
};

export default migration;
