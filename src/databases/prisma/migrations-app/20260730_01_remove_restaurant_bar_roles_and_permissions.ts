/**
 * Migration: 20260730_01
 * Description: Remove restaurant/bar-specific roles and permissions
 *
 * Product no longer targets cafe/bar/restaurant verticals. Removes the
 * barista/server/kitchen-staff/head-chef/bar-manager/bartender/host
 * roles and the orders, tables, reservations, kitchen, and tips
 * permission groups (never actually granted to any role — dead
 * reference data). Any users still assigned to one of these roles are
 * reassigned to 'cashier' first, since users.role_id is a foreign key
 * into roles.
 *
 * down only restores the roles/permissions rows themselves (matching
 * how other "module removed" migrations in this set only restore
 * structure, not data) — it does not re-grant role_permissions or move
 * reassigned users back, since neither is recoverable from this
 * migration alone.
 */

import { Migration } from '../migration.types';

const REMOVED_ROLE_IDS = ['barista', 'server', 'kitchen-staff', 'head-chef', 'bar-manager', 'bartender', 'host'];
const REMOVED_PERMISSION_IDS = [
    'orders.create', 'orders.view', 'orders.edit', 'orders.cancel', 'orders.status',
    'tables.view', 'tables.manage', 'tables.transfer', 'tables.merge',
    'reservations.create', 'reservations.view', 'reservations.edit', 'reservations.cancel',
    'kitchen.view', 'kitchen.manage',
    'tips.collect', 'tips.view', 'tips.manage',
];

const roleIdList = REMOVED_ROLE_IDS.map((id) => `'${id}'`).join(', ');
const permissionIdList = REMOVED_PERMISSION_IDS.map((id) => `'${id}'`).join(', ');

export const migration: Migration = {
    version: '20260730_01',
    description: 'Remove restaurant/bar-specific roles and permissions',
    up: {
        sqlite: [
            `UPDATE "users" SET "role_id" = 'cashier' WHERE "role_id" IN (${roleIdList})`,
            `DELETE FROM "role_permissions" WHERE "role_id" IN (${roleIdList})`,
            `DELETE FROM "role_permissions" WHERE "permission_id" IN (${permissionIdList})`,
            `DELETE FROM "user_permissions" WHERE "permission_id" IN (${permissionIdList})`,
            `DELETE FROM "roles" WHERE "role_id" IN (${roleIdList})`,
            `DELETE FROM "permissions" WHERE "permission_id" IN (${permissionIdList})`,
        ],
        mysql: [
            `UPDATE users SET role_id = 'cashier' WHERE role_id IN (${roleIdList})`,
            `DELETE FROM role_permissions WHERE role_id IN (${roleIdList})`,
            `DELETE FROM role_permissions WHERE permission_id IN (${permissionIdList})`,
            `DELETE FROM user_permissions WHERE permission_id IN (${permissionIdList})`,
            `DELETE FROM roles WHERE role_id IN (${roleIdList})`,
            `DELETE FROM permissions WHERE permission_id IN (${permissionIdList})`,
        ],
    },
    down: {
        sqlite: [
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('barista', 'barista', 'Barista', 'Prepares beverages and handles cafe counter sales', 1, 1)`,
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('server', 'server', 'Server/Waiter', 'Takes orders, serves customers, and processes table payments', 1, 1)`,
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('kitchen-staff', 'kitchen_staff', 'Kitchen Staff', 'Views orders, manages kitchen display, and updates order status', 1, 1)`,
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('head-chef', 'head_chef', 'Head Chef', 'Manages kitchen operations, recipes, and food inventory', 1, 1)`,
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('bar-manager', 'bar_manager', 'Bar Manager', 'Manages bar operations, staff scheduling, and liquor inventory', 1, 1)`,
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('bartender', 'bartender', 'Bartender', 'Prepares drinks, serves customers, and handles bar sales', 1, 1)`,
            `INSERT OR IGNORE INTO "roles" ("role_id", "name", "display_name", "description", "is_system_role", "is_active") VALUES ('host', 'host', 'Host/Hostess', 'Manages reservations, seating, and customer reception', 1, 1)`,

            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('orders.create', 'orders.create', 'Create Orders', 'Create new orders (table/takeaway)', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('orders.view', 'orders.view', 'View Orders', 'View all orders', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('orders.edit', 'orders.edit', 'Edit Orders', 'Edit existing orders', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('orders.cancel', 'orders.cancel', 'Cancel Orders', 'Cancel orders', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('orders.status', 'orders.status', 'Update Order Status', 'Update order preparation/delivery status', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tables.view', 'tables.view', 'View Tables', 'View table layout and status', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tables.manage', 'tables.manage', 'Manage Tables', 'Manage table assignments and layout', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tables.transfer', 'tables.transfer', 'Transfer Tables', 'Transfer orders between tables', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tables.merge', 'tables.merge', 'Merge/Split Tables', 'Merge or split table orders', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('reservations.create', 'reservations.create', 'Create Reservations', 'Create new reservations', 'customers', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('reservations.view', 'reservations.view', 'View Reservations', 'View reservation calendar', 'customers', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('reservations.edit', 'reservations.edit', 'Edit Reservations', 'Edit existing reservations', 'customers', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('reservations.cancel', 'reservations.cancel', 'Cancel Reservations', 'Cancel reservations', 'customers', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('kitchen.view', 'kitchen.view', 'View Kitchen Display', 'View kitchen order display', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('kitchen.manage', 'kitchen.manage', 'Manage Kitchen Orders', 'Mark orders as prepared/ready', 'sales', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tips.collect', 'tips.collect', 'Collect Tips', 'Accept and record tips', 'payments', 'terminal')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tips.view', 'tips.view', 'View Tips', 'View tip reports', 'payments', 'branch')`,
            `INSERT OR IGNORE INTO "permissions" ("permission_id", "name", "display_name", "description", "category", "scope") VALUES ('tips.manage', 'tips.manage', 'Manage Tips', 'Manage tip pooling and distribution', 'payments', 'branch')`,
        ],
        mysql: [
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('barista', 'barista', 'Barista', 'Prepares beverages and handles cafe counter sales', 1, 1)`,
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('server', 'server', 'Server/Waiter', 'Takes orders, serves customers, and processes table payments', 1, 1)`,
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('kitchen-staff', 'kitchen_staff', 'Kitchen Staff', 'Views orders, manages kitchen display, and updates order status', 1, 1)`,
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('head-chef', 'head_chef', 'Head Chef', 'Manages kitchen operations, recipes, and food inventory', 1, 1)`,
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('bar-manager', 'bar_manager', 'Bar Manager', 'Manages bar operations, staff scheduling, and liquor inventory', 1, 1)`,
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('bartender', 'bartender', 'Bartender', 'Prepares drinks, serves customers, and handles bar sales', 1, 1)`,
            `INSERT IGNORE INTO roles (role_id, name, display_name, description, is_system_role, is_active) VALUES ('host', 'host', 'Host/Hostess', 'Manages reservations, seating, and customer reception', 1, 1)`,

            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('orders.create', 'orders.create', 'Create Orders', 'Create new orders (table/takeaway)', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('orders.view', 'orders.view', 'View Orders', 'View all orders', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('orders.edit', 'orders.edit', 'Edit Orders', 'Edit existing orders', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('orders.cancel', 'orders.cancel', 'Cancel Orders', 'Cancel orders', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('orders.status', 'orders.status', 'Update Order Status', 'Update order preparation/delivery status', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tables.view', 'tables.view', 'View Tables', 'View table layout and status', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tables.manage', 'tables.manage', 'Manage Tables', 'Manage table assignments and layout', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tables.transfer', 'tables.transfer', 'Transfer Tables', 'Transfer orders between tables', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tables.merge', 'tables.merge', 'Merge/Split Tables', 'Merge or split table orders', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('reservations.create', 'reservations.create', 'Create Reservations', 'Create new reservations', 'customers', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('reservations.view', 'reservations.view', 'View Reservations', 'View reservation calendar', 'customers', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('reservations.edit', 'reservations.edit', 'Edit Reservations', 'Edit existing reservations', 'customers', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('reservations.cancel', 'reservations.cancel', 'Cancel Reservations', 'Cancel reservations', 'customers', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('kitchen.view', 'kitchen.view', 'View Kitchen Display', 'View kitchen order display', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('kitchen.manage', 'kitchen.manage', 'Manage Kitchen Orders', 'Mark orders as prepared/ready', 'sales', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tips.collect', 'tips.collect', 'Collect Tips', 'Accept and record tips', 'payments', 'terminal')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tips.view', 'tips.view', 'View Tips', 'View tip reports', 'payments', 'branch')`,
            `INSERT IGNORE INTO permissions (permission_id, name, display_name, description, category, scope) VALUES ('tips.manage', 'tips.manage', 'Manage Tips', 'Manage tip pooling and distribution', 'payments', 'branch')`,
        ],
    },
};

export default migration;
