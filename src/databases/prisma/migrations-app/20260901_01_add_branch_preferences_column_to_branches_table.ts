/**
 * Migration: 20260901_01
 * Description: add_branch_preferences_column_to_branches_table
 *
 * Created: 2026-09-01T13:02:53.036Z
 *
 * IMPORTANT:
 * - Never modify this migration once deployed
 * - Use IF NOT EXISTS / IF EXISTS for idempotent operations
 * - Test on both SQLite and MySQL
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260901_01',
    description: 'add_branch_preferences_column_to_branches_table',
    up: {
        sqlite: [
            `ALTER TABLE "branches" ADD COLUMN "branch_preferences" TEXT`,
        ],
        mysql: [
            // Plain ALTER TABLE, not a guarded stored procedure: CREATE
            // PROCEDURE/CALL fail under Prisma's $executeRawUnsafe with
            // MySQL error 1295 ("not supported in the prepared statement
            // protocol yet"). Idempotency instead relies on the migration
            // runner treating "Duplicate column name" as a skippable error.
            `ALTER TABLE branches ADD COLUMN branch_preferences JSON NULL`,
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            `ALTER TABLE branches DROP COLUMN branch_preferences`,
        ],
    },
};
