/**
 * Migration: 20260319_02
 * Description: Add costing method support and cost layers table for perpetual inventory
 *
 * Changes:
 * 1. Add `costing_method` column to inventory table (WEIGHTED_AVERAGE, FIFO, LIFO)
 * 2. Add `OPENING_BALANCE` to StockMovementType enum
 * 3. Add `OPENING_BALANCE` to StockReferenceType enum
 * 4. Create `inventory_cost_layers` table for FIFO/LIFO tracking
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260319_02',
    description: 'Add costing method and cost layers for perpetual inventory',
    up: {
        sqlite: [
            // 1. Add costing_method column to inventory (default: WEIGHTED_AVERAGE)
            `ALTER TABLE "inventory" ADD COLUMN "costing_method" TEXT NOT NULL DEFAULT 'WEIGHTED_AVERAGE'`,

            // 2. Create inventory_cost_layers table for FIFO/LIFO
            `CREATE TABLE IF NOT EXISTS "inventory_cost_layers" (
                "cost_layer_id"      TEXT PRIMARY KEY,
                "tenant_id"          TEXT NOT NULL,
                "branch_id"          TEXT NOT NULL,
                "inventory_id"       TEXT NOT NULL,
                "remaining_quantity" INTEGER NOT NULL DEFAULT 0,
                "original_quantity"  INTEGER NOT NULL,
                "unit_cost"          REAL NOT NULL DEFAULT 0.00,
                "reference_type"     TEXT,
                "reference_id"       TEXT,
                "movement_id"        TEXT,
                "layer_date"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "depleted_at"        DATETIME,
                "version"            INTEGER NOT NULL DEFAULT 1,
                "deleted_at"         DATETIME,
                "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
                FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE,
                FOREIGN KEY ("inventory_id") REFERENCES "inventory"("inventory_id") ON DELETE CASCADE
            )`,
            `CREATE INDEX IF NOT EXISTS "idx_cost_layers_tenant" ON "inventory_cost_layers"("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_cost_layers_branch" ON "inventory_cost_layers"("branch_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_cost_layers_inventory" ON "inventory_cost_layers"("inventory_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_cost_layers_inventory_remaining" ON "inventory_cost_layers"("inventory_id", "remaining_quantity")`,
            `CREATE INDEX IF NOT EXISTS "idx_cost_layers_layer_date" ON "inventory_cost_layers"("inventory_id", "layer_date")`,
            `CREATE INDEX IF NOT EXISTS "idx_cost_layers_deleted" ON "inventory_cost_layers"("deleted_at")`,
        ],
        mysql: [
            // 1. Add costing_method column to inventory
            `ALTER TABLE \`inventory\` ADD COLUMN \`costing_method\` ENUM('WEIGHTED_AVERAGE','FIFO','LIFO') NOT NULL DEFAULT 'WEIGHTED_AVERAGE'`,

            // 2. Add OPENING_BALANCE to StockMovementType enum
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`movement_type\` ENUM('PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DAMAGE','EXPIRY','OPENING_BALANCE') NOT NULL`,

            // 3. Add OPENING_BALANCE to StockReferenceType enum
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER','GOODS_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER','OPENING_BALANCE') NULL`,

            // 4. Create inventory_cost_layers table
            `CREATE TABLE IF NOT EXISTS \`inventory_cost_layers\` (
                \`cost_layer_id\`      VARCHAR(36) NOT NULL,
                \`tenant_id\`          VARCHAR(36) NOT NULL,
                \`branch_id\`          VARCHAR(36) NOT NULL,
                \`inventory_id\`       VARCHAR(36) NOT NULL,
                \`remaining_quantity\` INT NOT NULL DEFAULT 0,
                \`original_quantity\`  INT NOT NULL,
                \`unit_cost\`          DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
                \`reference_type\`     VARCHAR(50) NULL,
                \`reference_id\`       VARCHAR(36) NULL,
                \`movement_id\`        VARCHAR(36) NULL,
                \`layer_date\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`depleted_at\`        DATETIME NULL,
                \`version\`            INT NOT NULL DEFAULT 1,
                \`deleted_at\`         DATETIME NULL,
                \`created_at\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`cost_layer_id\`),
                CONSTRAINT \`fk_cost_layers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`tenant_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_cost_layers_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`branch_id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_cost_layers_inventory\` FOREIGN KEY (\`inventory_id\`) REFERENCES \`inventory\`(\`inventory_id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // 5. Add indexes for cost layers
            `ALTER TABLE \`inventory_cost_layers\` ADD INDEX \`idx_cost_layers_tenant\` (\`tenant_id\`)`,
            `ALTER TABLE \`inventory_cost_layers\` ADD INDEX \`idx_cost_layers_branch\` (\`branch_id\`)`,
            `ALTER TABLE \`inventory_cost_layers\` ADD INDEX \`idx_cost_layers_inventory\` (\`inventory_id\`)`,
            `ALTER TABLE \`inventory_cost_layers\` ADD INDEX \`idx_cost_layers_inventory_remaining\` (\`inventory_id\`, \`remaining_quantity\`)`,
            `ALTER TABLE \`inventory_cost_layers\` ADD INDEX \`idx_cost_layers_layer_date\` (\`inventory_id\`, \`layer_date\`)`,
            `ALTER TABLE \`inventory_cost_layers\` ADD INDEX \`idx_cost_layers_deleted\` (\`deleted_at\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP TABLE IF EXISTS "inventory_cost_layers"`,
            // SQLite doesn't support DROP COLUMN easily; leave costing_method in place
        ],
        mysql: [
            `DROP TABLE IF EXISTS \`inventory_cost_layers\``,
            `ALTER TABLE \`inventory\` DROP COLUMN \`costing_method\``,
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`movement_type\` ENUM('PURCHASE_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DAMAGE','EXPIRY') NOT NULL`,
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER','GOODS_RECEIPT','SALE','RETURN','ADJUSTMENT','TRANSFER') NULL`,
        ],
    },
};
