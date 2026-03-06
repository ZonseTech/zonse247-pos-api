/**
 * Migration: 20260306_02
 * Description: Add composite index on stock_movements for performance optimization
 * 
 * Stock movement queries (daily reports, sync, balances) will be optimized with this composite index.
 * The index covers common query patterns:
 * - Filtering by tenant and branch (multi-tenant isolation)
 * - Date range queries for reports and sync delta
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260306_02',
    description: 'Add composite index on stock_movements (tenant_id, branch_id, movement_date) for performance',
    up: {
        sqlite: [
            `CREATE INDEX IF NOT EXISTS "idx_stockmovement_branch_date" ON "stock_movements" ("tenant_id", "branch_id", "movement_date")`,
        ],
        mysql: [
            `CREATE INDEX \`idx_stockmovement_branch_date\` ON \`stock_movements\` (\`tenant_id\`, \`branch_id\`, \`movement_date\`)`,
        ],
    },
    down: {
        sqlite: [
            `DROP INDEX IF EXISTS "idx_stockmovement_branch_date"`,
        ],
        mysql: [
            `DROP INDEX \`idx_stockmovement_branch_date\` ON \`stock_movements\``,
        ],
    },
};
