/**
 * Migration: 20260306_07
 * Description: Add version and deletedAt fields to Tenant, Branch, Role, Permission, RolePermission
 * 
 * These fields enable:
 * - Optimistic locking (version) for conflict detection during sync
 * - Soft deletes (deletedAt) for proper sync of deleted records
 * 
 * Also adds deletedAt indexes for efficient queries filtering out soft-deleted records.
 */

import { Migration } from '../migration.types';

const mysqlStatements = [
    // Tenant table
    `ALTER TABLE \`tenants\` ADD COLUMN \`version\` INT NOT NULL DEFAULT 1`,
    `ALTER TABLE \`tenants\` ADD COLUMN \`deleted_at\` DATETIME(3) NULL`,
    `CREATE INDEX \`idx_tenants_deleted_at\` ON \`tenants\` (\`deleted_at\`)`,

    // Branch table
    `ALTER TABLE \`branches\` ADD COLUMN \`version\` INT NOT NULL DEFAULT 1`,
    `ALTER TABLE \`branches\` ADD COLUMN \`deleted_at\` DATETIME(3) NULL`,
    `CREATE INDEX \`idx_branches_deleted_at\` ON \`branches\` (\`deleted_at\`)`,

    // Role table
    `ALTER TABLE \`roles\` ADD COLUMN \`version\` INT NOT NULL DEFAULT 1`,
    `ALTER TABLE \`roles\` ADD COLUMN \`deleted_at\` DATETIME(3) NULL`,
    `CREATE INDEX \`idx_roles_deleted_at\` ON \`roles\` (\`deleted_at\`)`,

    // Permission table
    `ALTER TABLE \`permissions\` ADD COLUMN \`version\` INT NOT NULL DEFAULT 1`,
    `ALTER TABLE \`permissions\` ADD COLUMN \`deleted_at\` DATETIME(3) NULL`,
    `CREATE INDEX \`idx_permissions_deleted_at\` ON \`permissions\` (\`deleted_at\`)`,

    // RolePermission table
    `ALTER TABLE \`role_permissions\` ADD COLUMN \`version\` INT NOT NULL DEFAULT 1`,
    `ALTER TABLE \`role_permissions\` ADD COLUMN \`deleted_at\` DATETIME(3) NULL`,
    `CREATE INDEX \`idx_role_permissions_deleted_at\` ON \`role_permissions\` (\`deleted_at\`)`,
];

const sqliteStatements = [
    // Tenant table
    `ALTER TABLE \`tenants\` ADD COLUMN \`version\` INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE \`tenants\` ADD COLUMN \`deleted_at\` DATETIME NULL`,
    `CREATE INDEX \`idx_tenants_deleted_at\` ON \`tenants\` (\`deleted_at\`)`,

    // Branch table
    `ALTER TABLE \`branches\` ADD COLUMN \`version\` INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE \`branches\` ADD COLUMN \`deleted_at\` DATETIME NULL`,
    `CREATE INDEX \`idx_branches_deleted_at\` ON \`branches\` (\`deleted_at\`)`,

    // Role table
    `ALTER TABLE \`roles\` ADD COLUMN \`version\` INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE \`roles\` ADD COLUMN \`deleted_at\` DATETIME NULL`,
    `CREATE INDEX \`idx_roles_deleted_at\` ON \`roles\` (\`deleted_at\`)`,

    // Permission table
    `ALTER TABLE \`permissions\` ADD COLUMN \`version\` INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE \`permissions\` ADD COLUMN \`deleted_at\` DATETIME NULL`,
    `CREATE INDEX \`idx_permissions_deleted_at\` ON \`permissions\` (\`deleted_at\`)`,

    // RolePermission table
    `ALTER TABLE \`role_permissions\` ADD COLUMN \`version\` INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE \`role_permissions\` ADD COLUMN \`deleted_at\` DATETIME NULL`,
    `CREATE INDEX \`idx_role_permissions_deleted_at\` ON \`role_permissions\` (\`deleted_at\`)`,
];

export const migration: Migration = {
    version: '20260306_07',
    description: 'Add version and deletedAt to Tenant, Branch, Role, Permission, RolePermission tables',
    up: {
        sqlite: sqliteStatements,
        mysql: mysqlStatements,
    },
    down: {
        sqlite: [
            // Drop indexes
            `DROP INDEX IF EXISTS \`idx_tenants_deleted_at\``,
            `DROP INDEX IF EXISTS \`idx_branches_deleted_at\``,
            `DROP INDEX IF EXISTS \`idx_roles_deleted_at\``,
            `DROP INDEX IF EXISTS \`idx_permissions_deleted_at\``,
            `DROP INDEX IF EXISTS \`idx_role_permissions_deleted_at\``,
            // Note: SQLite doesn't support DROP COLUMN in older versions
            // For production rollback, a table rebuild would be needed
        ],
        mysql: [
            // Drop indexes first
            `DROP INDEX \`idx_tenants_deleted_at\` ON \`tenants\``,
            `DROP INDEX \`idx_branches_deleted_at\` ON \`branches\``,
            `DROP INDEX \`idx_roles_deleted_at\` ON \`roles\``,
            `DROP INDEX \`idx_permissions_deleted_at\` ON \`permissions\``,
            `DROP INDEX \`idx_role_permissions_deleted_at\` ON \`role_permissions\``,
            // Drop columns
            `ALTER TABLE \`tenants\` DROP COLUMN \`version\`, DROP COLUMN \`deleted_at\``,
            `ALTER TABLE \`branches\` DROP COLUMN \`version\`, DROP COLUMN \`deleted_at\``,
            `ALTER TABLE \`roles\` DROP COLUMN \`version\`, DROP COLUMN \`deleted_at\``,
            `ALTER TABLE \`permissions\` DROP COLUMN \`version\`, DROP COLUMN \`deleted_at\``,
            `ALTER TABLE \`role_permissions\` DROP COLUMN \`version\`, DROP COLUMN \`deleted_at\``,
        ],
    },
};
