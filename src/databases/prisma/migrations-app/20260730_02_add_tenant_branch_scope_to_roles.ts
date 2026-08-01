/**
 * Migration: 20260730_02
 * Description: Add tenant_id/branch_id scope columns to roles
 *
 * Custom roles previously had no tenant/branch scope at all — the
 * columns didn't exist, so RoleService's tenantId/branchId filters
 * were always inert and every role was effectively global. Adds
 * nullable tenant_id/branch_id (system roles keep both null) and
 * relaxes the unique constraint on roles.name from global to
 * (tenant_id, name), so two different tenants can each have a custom
 * role with the same name.
 *
 * roles.name's uniqueness is already a standalone index
 * (roles_name_key), not an inline column constraint, so this is a
 * plain add-column + drop-index + create-index — no table recreate
 * needed.
 */

import { Migration } from '../migration.types';

export const migration: Migration = {
    version: '20260730_02',
    description: 'Add tenant_id/branch_id scope columns to roles',
    up: {
        sqlite: [
            `ALTER TABLE "roles" ADD COLUMN "tenant_id" TEXT`,
            `ALTER TABLE "roles" ADD COLUMN "branch_id" TEXT`,
            `DROP INDEX IF EXISTS "roles_name_key"`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "unique_tenant_role_name" ON "roles" ("tenant_id", "name")`,
            `CREATE INDEX IF NOT EXISTS "idx_role_tenant" ON "roles" ("tenant_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_role_branch" ON "roles" ("branch_id")`,
        ],
        mysql: [
            `ALTER TABLE roles ADD COLUMN tenant_id VARCHAR(191) DEFAULT NULL`,
            `ALTER TABLE roles ADD COLUMN branch_id VARCHAR(191) DEFAULT NULL`,
            `ALTER TABLE roles DROP INDEX roles_name_key`,
            `ALTER TABLE roles ADD UNIQUE INDEX unique_tenant_role_name (tenant_id, name)`,
            `CREATE INDEX idx_role_tenant ON roles (tenant_id)`,
            `CREATE INDEX idx_role_branch ON roles (branch_id)`,
        ],
    },
    down: {
        sqlite: [
            `DROP INDEX IF EXISTS "idx_role_branch"`,
            `DROP INDEX IF EXISTS "idx_role_tenant"`,
            `DROP INDEX IF EXISTS "unique_tenant_role_name"`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles" ("name")`,
            `ALTER TABLE "roles" DROP COLUMN "branch_id"`,
            `ALTER TABLE "roles" DROP COLUMN "tenant_id"`,
        ],
        mysql: [
            `DROP INDEX idx_role_branch ON roles`,
            `DROP INDEX idx_role_tenant ON roles`,
            `ALTER TABLE roles DROP INDEX unique_tenant_role_name`,
            `ALTER TABLE roles ADD UNIQUE INDEX roles_name_key (name)`,
            `ALTER TABLE roles DROP COLUMN branch_id`,
            `ALTER TABLE roles DROP COLUMN tenant_id`,
        ],
    },
};

export default migration;
