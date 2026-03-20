/**
 * Migration: 20260318_10
 * Description: Add invoiced_quantity column to purchase_order_items
 *
 * Tracks total invoiced quantity per PO item so partial invoicing
 * is visible directly on PO items (instead of only via aggregate queries).
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_10',
    description: 'Add invoiced_quantity to purchase_order_items for partial invoice tracking',
    up: {
        sqlite: [
            `ALTER TABLE "purchase_order_items" ADD COLUMN "invoiced_quantity" INTEGER NOT NULL DEFAULT 0`,
        ],
        mysql: [
            `ALTER TABLE \`purchase_order_items\` ADD COLUMN \`invoiced_quantity\` INT NOT NULL DEFAULT 0`,
        ],
    },
    down: {
        sqlite: [
            `ALTER TABLE "purchase_order_items" DROP COLUMN "invoiced_quantity"`,
        ],
        mysql: [
            `ALTER TABLE \`purchase_order_items\` DROP COLUMN \`invoiced_quantity\``,
        ],
    },
};
