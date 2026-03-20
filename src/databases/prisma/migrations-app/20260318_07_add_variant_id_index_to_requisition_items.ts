/**
 * Migration: 20260318_07
 * Description: Add missing variant_id index to purchase_requisition_items
 *
 * Adds a standalone index on variant_id for PurchaseRequisitionItem
 * to improve FK-based lookups.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260318_07',
    description: 'Add missing variant_id index to purchase_requisition_items',
    up: {
        sqlite: [
            `CREATE INDEX IF NOT EXISTS "purchase_requisition_items_variant_id_idx" ON "purchase_requisition_items"("variant_id")`,
        ],
        mysql: [
            `ALTER TABLE \`purchase_requisition_items\` ADD INDEX \`purchase_requisition_items_variant_id_idx\` (\`variant_id\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP INDEX IF EXISTS "purchase_requisition_items_variant_id_idx"`,
        ],
        mysql: [
            `ALTER TABLE \`purchase_requisition_items\` DROP INDEX \`purchase_requisition_items_variant_id_idx\``,
        ],
    },
};

export default migration;
