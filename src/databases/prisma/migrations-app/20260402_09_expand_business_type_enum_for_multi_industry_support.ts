/**
 * Migration: 20260402_09
 * Description: Expand BusinessType enum with service-oriented types: SALON, REPAIR, TATTOO, MED_SPA, FITNESS
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260402_09',
    description: 'Expand BusinessType enum with service-oriented types: SALON, REPAIR, TATTOO, MED_SPA, FITNESS',
    up: {
        mysql: [
            // Expand the ENUM column to include new business types
            `ALTER TABLE branches MODIFY COLUMN business_type ENUM('PRODUCT_BASED', 'SERVICE_BASED', 'HYBRID', 'SALON', 'REPAIR', 'TATTOO', 'MED_SPA', 'FITNESS') DEFAULT 'PRODUCT_BASED'`,
        ],
        sqlite: [
        // SQLite stores enums as TEXT, no schema change needed — just validate at app level
        // No-op: the column is already TEXT and accepts any string value
        ],
    },
    down: {
        mysql: [
            `ALTER TABLE branches MODIFY COLUMN business_type ENUM('PRODUCT_BASED', 'SERVICE_BASED', 'HYBRID') DEFAULT 'PRODUCT_BASED'`,
        ],
        sqlite: [],
    },
};
