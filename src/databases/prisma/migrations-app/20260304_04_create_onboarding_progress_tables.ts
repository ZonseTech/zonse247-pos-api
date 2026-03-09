/**
 * Migration: 20260304_04
 * Description: Create OnboardingProgress and OnboardingStep tables for tracking terminal onboarding
 * 
 * Creates tables to track onboarding progress for terminals:
 * - onboarding_progress: Main progress tracker per terminal
 * - onboarding_steps: Individual step statuses
 * 
 * Step types include:
 * - TERMINAL_ACTIVATION, TERMINAL_DETAILS_SAVE
 * - MRA_SETUP, CUSTOMERS_SYNC, CATEGORIES_SYNC
 * - SUBSCRIPTION_PLANS_SYNC, PAYMENT_METHODS_SYNC, PAYMENT_PROVIDERS_SYNC
 * - PRODUCTS_SYNC, INVENTORY_SYNC, USERS_SYNC, SETTINGS_SYNC
 * 
 * This is SQLite only as it tracks local terminal onboarding state.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260304_04',
    description: 'Create OnboardingProgress and OnboardingStep tables for terminal onboarding tracking',
    up: {
        sqlite: [
            // Create onboarding_progress table
            `CREATE TABLE IF NOT EXISTS "onboarding_progress" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "progress_id" TEXT NOT NULL,
                "terminal_id" TEXT NOT NULL,
                "tenant_id" TEXT,
                "branch_id" TEXT,
                "current_step" TEXT NOT NULL DEFAULT 'TERMINAL_ACTIVATION',
                "overall_status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
                "completed_steps" INTEGER NOT NULL DEFAULT 0,
                "total_steps" INTEGER NOT NULL DEFAULT 8,
                "last_updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`,
            // Create unique indexes for onboarding_progress
            `CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_progress_id_key" ON "onboarding_progress"("progress_id")`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_terminal_id_key" ON "onboarding_progress"("terminal_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_onboarding_progress_terminal_id" ON "onboarding_progress"("terminal_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_onboarding_progress_overall_status" ON "onboarding_progress"("overall_status")`,

            // Create onboarding_steps table
            `CREATE TABLE IF NOT EXISTS "onboarding_steps" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "step_id" TEXT NOT NULL,
                "progress_id" TEXT NOT NULL,
                "step_type" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
                "step_order" INTEGER NOT NULL,
                "started_at" DATETIME,
                "completed_at" DATETIME,
                "error_message" TEXT,
                "retry_count" INTEGER NOT NULL DEFAULT 0,
                "metadata" TEXT,
                "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "onboarding_steps_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "onboarding_progress" ("progress_id") ON DELETE CASCADE ON UPDATE CASCADE
            )`,
            // Create unique indexes for onboarding_steps
            `CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_steps_step_id_key" ON "onboarding_steps"("step_id")`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "unique_progress_step" ON "onboarding_steps"("progress_id", "step_type")`,
            `CREATE INDEX IF NOT EXISTS "idx_onboarding_steps_progress_id" ON "onboarding_steps"("progress_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_onboarding_steps_status" ON "onboarding_steps"("status")`,
        ],
        mysql: [
            // Create onboarding_progress table for MySQL (if needed on central server)
            `CREATE TABLE IF NOT EXISTS \`onboarding_progress\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`progress_id\` VARCHAR(191) NOT NULL,
                \`terminal_id\` VARCHAR(191) NOT NULL,
                \`tenant_id\` VARCHAR(191) NULL,
                \`branch_id\` VARCHAR(191) NULL,
                \`current_step\` ENUM('TERMINAL_ACTIVATION', 'TERMINAL_DETAILS_SAVE', 'MRA_SETUP', 'CUSTOMERS_SYNC', 'CATEGORIES_SYNC', 'SUBSCRIPTION_PLANS_SYNC', 'PAYMENT_METHODS_SYNC', 'PAYMENT_PROVIDERS_SYNC', 'PRODUCTS_SYNC', 'INVENTORY_SYNC', 'USERS_SYNC', 'SETTINGS_SYNC') NOT NULL DEFAULT 'TERMINAL_ACTIVATION',
                \`overall_status\` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'NOT_STARTED',
                \`completed_steps\` INT NOT NULL DEFAULT 0,
                \`total_steps\` INT NOT NULL DEFAULT 8,
                \`last_updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`onboarding_progress_progress_id_key\` (\`progress_id\`),
                UNIQUE INDEX \`onboarding_progress_terminal_id_key\` (\`terminal_id\`),
                INDEX \`idx_onboarding_progress_terminal_id\` (\`terminal_id\`),
                INDEX \`idx_onboarding_progress_overall_status\` (\`overall_status\`)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

            // Create onboarding_steps table for MySQL
            `CREATE TABLE IF NOT EXISTS \`onboarding_steps\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`step_id\` VARCHAR(191) NOT NULL,
                \`progress_id\` VARCHAR(191) NOT NULL,
                \`step_type\` ENUM('TERMINAL_ACTIVATION', 'TERMINAL_DETAILS_SAVE', 'MRA_SETUP', 'CUSTOMERS_SYNC', 'CATEGORIES_SYNC', 'SUBSCRIPTION_PLANS_SYNC', 'PAYMENT_METHODS_SYNC', 'PAYMENT_PROVIDERS_SYNC', 'PRODUCTS_SYNC', 'INVENTORY_SYNC', 'USERS_SYNC', 'SETTINGS_SYNC') NOT NULL,
                \`status\` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'NOT_STARTED',
                \`step_order\` INT NOT NULL,
                \`started_at\` DATETIME(3) NULL,
                \`completed_at\` DATETIME(3) NULL,
                \`error_message\` TEXT NULL,
                \`retry_count\` INT NOT NULL DEFAULT 0,
                \`metadata\` TEXT NULL,
                \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updated_at\` DATETIME(3) NOT NULL,
                
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`onboarding_steps_step_id_key\` (\`step_id\`),
                UNIQUE INDEX \`unique_progress_step\` (\`progress_id\`, \`step_type\`),
                INDEX \`idx_onboarding_steps_progress_id\` (\`progress_id\`),
                INDEX \`idx_onboarding_steps_status\` (\`status\`),
                
                CONSTRAINT \`onboarding_steps_progress_id_fkey\` FOREIGN KEY (\`progress_id\`) REFERENCES \`onboarding_progress\` (\`progress_id\`) ON DELETE CASCADE ON UPDATE NO ACTION
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "onboarding_steps"`,
            `DROP TABLE IF EXISTS "onboarding_progress"`,
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`onboarding_steps\``,
            `DROP TABLE IF EXISTS \`onboarding_progress\``,
        ],
    },
};
