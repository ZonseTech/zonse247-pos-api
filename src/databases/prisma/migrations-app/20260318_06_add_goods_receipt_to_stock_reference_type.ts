/**
 * Migration: 20260318_06
 * Description: Add GOODS_RECEIPT to StockReferenceType enum on stock_movements
 *
 * Adds GOODS_RECEIPT as a new enum value for the reference_type column
 * on stock_movements. When a GRN is posted, a StockMovement with
 * referenceType = GOODS_RECEIPT and referenceId = GRN ID should be created.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_06',
    description: 'Add GOODS_RECEIPT to StockReferenceType enum on stock_movements',
    up: {
        sqlite: [
            // SQLite stores enums as TEXT, so no schema change needed.
            // The application layer handles enum validation.
        ],
        mysql: [
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER', 'GOODS_RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER') NULL`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            `ALTER TABLE \`stock_movements\` MODIFY COLUMN \`reference_type\` ENUM('PURCHASE_ORDER', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER') NULL`,
        ],
    },
};

export default migration;
