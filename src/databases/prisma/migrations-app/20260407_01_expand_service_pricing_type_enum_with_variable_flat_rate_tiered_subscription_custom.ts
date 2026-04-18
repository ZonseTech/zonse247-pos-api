/**
 * Migration: 20260407_01
 * Description: Expand ServicePricingType enum with VARIABLE, FLAT_RATE, TIERED, SUBSCRIPTION, CUSTOM
 *
 * Changes:
 * 1. MySQL: ALTER services.pricing_type ENUM to include new values
 * 2. SQLite: No-op (TEXT column accepts any string)
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260407_01',
    description: 'Expand ServicePricingType enum with VARIABLE, FLAT_RATE, TIERED, SUBSCRIPTION, CUSTOM',
    up: {
        mysql: [
            `ALTER TABLE services MODIFY COLUMN pricing_type ENUM('FIXED', 'VARIABLE', 'HOURLY', 'PER_UNIT', 'PACKAGE', 'FLAT_RATE', 'TIERED', 'SUBSCRIPTION', 'CUSTOM') NOT NULL DEFAULT 'FIXED'`,
        ],
        sqlite: [
        // SQLite stores enums as TEXT, no schema change needed — validated at app level
        ],
    },
    down: {
        mysql: [
            `ALTER TABLE services MODIFY COLUMN pricing_type ENUM('FIXED', 'HOURLY', 'PER_UNIT', 'PACKAGE') NOT NULL DEFAULT 'FIXED'`,
        ],
        sqlite: [],
    },
};
