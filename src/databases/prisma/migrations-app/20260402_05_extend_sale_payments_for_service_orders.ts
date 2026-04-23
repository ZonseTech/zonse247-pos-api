/**
 * Migration: 20260402_05
 * Description: Extend SalePayment to support service orders (polymorphic payments)
 *
 * Changes:
 * 1. Make `sale_id` nullable on `sale_payments` (was required)
 * 2. Add `service_order_id` nullable column
 * 3. Add `payment_entity` discriminator column (SALE or SERVICE_ORDER)
 * 4. Add index on `service_order_id`
 * 5. Update foreign key constraint on `sale_id` from CASCADE to SET NULL
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_05',
    description: 'Extend SalePayment to support service orders with polymorphic payment_entity',
    up: {
        sqlite: [
            // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
            // But for pragmatism, we can add new columns and handle nullability at app level
            // 1. Add service_order_id column
            `ALTER TABLE "sale_payments" ADD COLUMN "service_order_id" TEXT`,
            // 2. Add payment_entity discriminator
            `ALTER TABLE "sale_payments" ADD COLUMN "payment_entity" TEXT NOT NULL DEFAULT 'SALE'`,
            // 3. Add index on service_order_id
            `CREATE INDEX IF NOT EXISTS "idx_sale_payments_service_order" ON "sale_payments"("service_order_id")`,
        ],
        mysql: [
            // Helper: create a reusable procedure to drop FK if it exists
            `DROP PROCEDURE IF EXISTS drop_fk_if_exists`,
            `CREATE PROCEDURE drop_fk_if_exists(IN tbl VARCHAR(255), IN fk_name VARCHAR(255))
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = tbl
                      AND CONSTRAINT_NAME = fk_name
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                ) THEN
                    SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP FOREIGN KEY \`', fk_name, '\`');
                    PREPARE stmt FROM @sql;
                    EXECUTE stmt;
                    DEALLOCATE PREPARE stmt;
                END IF;
            END`,
            // 1. Make sale_id nullable
            `ALTER TABLE \`sale_payments\` MODIFY COLUMN \`sale_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
            // 2. Drop existing foreign key on sale_id (CASCADE) and re-add as SET NULL
            `CALL drop_fk_if_exists('sale_payments', 'sale_payments_sale_id_fkey')`,
            `CALL drop_fk_if_exists('sale_payments', 'fk_sale_payments_sale')`,
            `ALTER TABLE \`sale_payments\` ADD CONSTRAINT \`fk_sale_payments_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\`(\`sale_id\`) ON DELETE SET NULL`,
            // 3. Add service_order_id column
            `ALTER TABLE \`sale_payments\` ADD COLUMN \`service_order_id\` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
            // 4. Add foreign key for service_order_id
            `ALTER TABLE \`sale_payments\` ADD CONSTRAINT \`fk_sale_payments_service_order\` FOREIGN KEY (\`service_order_id\`) REFERENCES \`service_orders\`(\`service_order_id\`) ON DELETE SET NULL`,
            // 5. Add payment_entity discriminator
            `ALTER TABLE \`sale_payments\` ADD COLUMN \`payment_entity\` ENUM('SALE', 'SERVICE_ORDER') NOT NULL DEFAULT 'SALE'`,
            // 6. Add index on service_order_id
            `CREATE INDEX \`idx_sale_payments_service_order\` ON \`sale_payments\`(\`service_order_id\`)`,
            // Cleanup helper procedure
            `DROP PROCEDURE IF EXISTS drop_fk_if_exists`,
        ],
    },
    down: {
        sqlite: [
            // SQLite: can't drop columns easily, but we can drop indexes
            `DROP INDEX IF EXISTS "idx_sale_payments_service_order"`,
            // Note: service_order_id and payment_entity columns remain (SQLite limitation)
        ],
        mysql: [
            // Helper procedure
            `DROP PROCEDURE IF EXISTS drop_fk_if_exists`,
            `CREATE PROCEDURE drop_fk_if_exists(IN tbl VARCHAR(255), IN fk_name VARCHAR(255))
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = tbl
                      AND CONSTRAINT_NAME = fk_name
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                ) THEN
                    SET @sql = CONCAT('ALTER TABLE \`', tbl, '\` DROP FOREIGN KEY \`', fk_name, '\`');
                    PREPARE stmt FROM @sql;
                    EXECUTE stmt;
                    DEALLOCATE PREPARE stmt;
                END IF;
            END`,
            `CALL drop_fk_if_exists('sale_payments', 'fk_sale_payments_service_order')`,
            `DROP INDEX \`idx_sale_payments_service_order\` ON \`sale_payments\``,
            `ALTER TABLE \`sale_payments\` DROP COLUMN \`service_order_id\``,
            `ALTER TABLE \`sale_payments\` DROP COLUMN \`payment_entity\``,
            // Revert sale_id to NOT NULL and CASCADE
            `CALL drop_fk_if_exists('sale_payments', 'fk_sale_payments_sale')`,
            `ALTER TABLE \`sale_payments\` MODIFY COLUMN \`sale_id\` VARCHAR(191) NOT NULL`,
            `ALTER TABLE \`sale_payments\` ADD CONSTRAINT \`sale_payments_sale_id_fkey\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\`(\`sale_id\`) ON DELETE CASCADE`,
            // Cleanup helper procedure
            `DROP PROCEDURE IF EXISTS drop_fk_if_exists`,
        ],
    },
};
