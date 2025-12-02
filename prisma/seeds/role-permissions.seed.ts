import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from "../../generated/prisma/client";
import { RolePermission } from 'role-permission';

const DEFAULT_ROLE_PERMISSIONS: Array<RolePermission> = [
    // ===== SUPER ADMIN - Full system access =====
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'system.admin' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'system.backup' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'system.logs.view' },

    // Sales permissions
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'sales.create' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'sales.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'sales.edit' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'sales.void' },

    // Product permissions
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'products.create' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'products.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'products.edit' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'products.delete' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'products.pricing' },

    // Inventory permissions
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'inventory.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'inventory.adjust' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'inventory.transfer' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'inventory.receive' },

    // Customer permissions
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'customers.create' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'customers.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'customers.edit' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'customers.delete' },

    // Payment & Refund permissions
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'payments.process' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'payments.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'payments.partial' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'refunds.process' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'refunds.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'refunds.approve' },

    // Discount permissions
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'discounts.apply' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'discounts.create' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'discounts.override' },

    // Cash management
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'cash.drawer.open' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'cash.count' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'cash.deposit' },

    // Reports
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'reports.sales.daily' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'reports.sales.detailed' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'reports.inventory' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'reports.financial' },

    // User management
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'users.create' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'users.view' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'users.edit' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'users.delete' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'users.roles.assign' },

    // Settings
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'settings.shop.manage' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'settings.tax.manage' },
    { rolePermissionId: uuidv4(), roleId: 'super-admin', permissionId: 'settings.payment.manage' },

    // ===== ADMIN - Shop level administration =====
    // Sales permissions
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'sales.create' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'sales.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'sales.edit' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'sales.void' },

    // Product permissions
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'products.create' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'products.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'products.edit' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'products.delete' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'products.pricing' },

    // Inventory permissions
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'inventory.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'inventory.adjust' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'inventory.transfer' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'inventory.receive' },

    // Customer permissions
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'customers.create' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'customers.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'customers.edit' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'customers.delete' },

    // Payment & Refund permissions
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'payments.process' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'payments.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'payments.partial' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'refunds.process' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'refunds.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'refunds.approve' },

    // Discount permissions
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'discounts.apply' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'discounts.create' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'discounts.override' },

    // Cash management
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'cash.drawer.open' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'cash.count' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'cash.deposit' },

    // Reports
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'reports.sales.daily' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'reports.sales.detailed' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'reports.inventory' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'reports.financial' },

    // User management
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'users.create' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'users.view' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'users.edit' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'users.delete' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'users.roles.assign' },

    // Settings
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'settings.shop.manage' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'settings.tax.manage' },
    { rolePermissionId: uuidv4(), roleId: 'admin', permissionId: 'settings.payment.manage' },

    // ===== MANAGER - Operational management =====
    // Sales permissions
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'sales.create' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'sales.view' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'sales.edit' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'sales.void' },

    // Product permissions
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'products.create' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'products.view' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'products.edit' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'products.pricing' },

    // Inventory permissions
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'inventory.view' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'inventory.adjust' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'inventory.receive' },

    // Customer permissions
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'customers.create' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'customers.view' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'customers.edit' },

    // Payment & Refund permissions
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'payments.process' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'payments.view' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'payments.partial' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'refunds.process' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'refunds.view' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'refunds.approve' },

    // Discount permissions
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'discounts.apply' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'discounts.create' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'discounts.override' },

    // Cash management
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'cash.drawer.open' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'cash.count' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'cash.deposit' },

    // Reports
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'reports.sales.daily' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'reports.sales.detailed' },
    { rolePermissionId: uuidv4(), roleId: 'manager', permissionId: 'reports.inventory' },

    // ===== CASHIER - Point of sale operations =====
    // Sales permissions
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'sales.create' },
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'sales.view.own' }, // Can only view own sales

    // Product permissions (view only)
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'products.view' },

    // Inventory permissions (view only)
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'inventory.view' },

    // Customer permissions
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'customers.create' },
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'customers.view' },
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'customers.edit' },

    // Payment permissions
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'payments.process' },
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'payments.view' },
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'payments.partial' },

    // Basic discount permissions
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'discounts.apply' },

    // Cash management
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'cash.drawer.open' },
    { rolePermissionId: uuidv4(), roleId: 'cashier', permissionId: 'cash.count' },
];

export async function seedRolePermissions(prisma: PrismaClient) {
    console.log('📝 Seeding role permissions...');

    const permissionsByRole: Record<string, string[]> = {};

    DEFAULT_ROLE_PERMISSIONS.forEach(rolePermission => {
        const { roleId, permissionId } = rolePermission;
        if (!permissionsByRole[roleId]) {
            permissionsByRole[roleId] = [];
        }
        permissionsByRole[roleId].push(permissionId);
    });

    for (const [roleId, permissionIds] of Object.entries(permissionsByRole)) {
        for (const permissionId of permissionIds) {
            const role_permission_id = `${roleId}-${permissionId}`;

            await prisma.role_permissions.upsert({
                where: { role_permission_id },
                update: {},
                create: {
                    role_permission_id,
                    role_id: roleId,
                    permission_id: permissionId,
                },
            });
        }
    }

    console.log('✅ Role permissions seeded');
}