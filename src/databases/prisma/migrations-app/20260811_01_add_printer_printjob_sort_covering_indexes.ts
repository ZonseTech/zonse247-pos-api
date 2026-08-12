/**
 * Migration: 20260811_01
 * Description: Add composite indexes covering the ORDER BY used by printer/print-job
 * list queries (MySQL)
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260811_01',
    description: 'Add composite sort-covering indexes for printers/print_jobs (MySQL)',
    up: {
        sqlite: [],
        mysql: [
            'CREATE INDEX `printers_branch_id_is_active_is_default_created_at_idx` ON `printers` (`branch_id`, `is_active`, `is_default`, `created_at`)',
            'CREATE INDEX `printers_tenant_id_is_active_is_default_created_at_idx` ON `printers` (`tenant_id`, `is_active`, `is_default`, `created_at`)',
            'CREATE INDEX `print_jobs_branch_id_status_priority_created_at_idx` ON `print_jobs` (`branch_id`, `status`, `priority`, `created_at`)',
        ],
    },
    down: {
        sqlite: [],
        mysql: [
            'ALTER TABLE `printers` DROP INDEX `printers_branch_id_is_active_is_default_created_at_idx`',
            'ALTER TABLE `printers` DROP INDEX `printers_tenant_id_is_active_is_default_created_at_idx`',
            'ALTER TABLE `print_jobs` DROP INDEX `print_jobs_branch_id_status_priority_created_at_idx`',
        ],
    },
};
