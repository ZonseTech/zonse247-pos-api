/**
 * Migration: 20260319_04
 * Description: Add DRAFT and SENT values to PurchaseOrderStatus enum
 *
 * Changes:
 * 1. Add `DRAFT` and `SENT` to purchase_orders.status ENUM (MySQL)
 * 2. SQLite uses TEXT so no ALTER needed — values are already handled at application level
 *
 * The service creates POs with status 'DRAFT' and transitions to 'SENT' when
 * the order is sent to the supplier, but these values were missing from the
 * database ENUM column.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260319_04',
    description: 'Add DRAFT and SENT values to PurchaseOrderStatus enum',
    up: {
        sqlite: [
            // SQLite uses TEXT — no schema change needed
        ],
        mysql: [
            // Modify the status ENUM to include DRAFT and SENT
            `ALTER TABLE \`purchase_orders\` MODIFY COLUMN \`status\` ENUM('DRAFT','PENDING','SENT','SHIPPED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'PENDING'`,
        ],
    },
};
