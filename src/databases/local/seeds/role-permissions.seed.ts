import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_ROLE_PERMISSIONS = [
    // ===== SUPER ADMIN - Full system access =====
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'system.admin' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'system.backup' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'system.logs.view' },

    // Sales permissions
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'sales.create' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'sales.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'sales.edit' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'sales.void' },

    // Product permissions
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'products.create' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'products.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'products.edit' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'products.delete' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'products.pricing' },

    // Inventory permissions
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'inventory.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'inventory.adjust' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'inventory.transfer' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'inventory.receive' },

    // Customer permissions
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'customers.create' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'customers.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'customers.edit' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'customers.delete' },

    // Payment & Refund permissions
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'payments.process' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'payments.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'payments.partial' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'refunds.process' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'refunds.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'refunds.approve' },

    // Discount permissions
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'discounts.apply' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'discounts.create' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'discounts.override' },

    // Cash management
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'cash.drawer.open' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'cash.count' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'cash.deposit' },

    // Reports
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'reports.sales.daily' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'reports.sales.detailed' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'reports.inventory' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'reports.financial' },

    // User management
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'users.create' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'users.view' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'users.edit' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'users.delete' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'users.roles.assign' },

    // Settings
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'settings.shop.manage' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'settings.tax.manage' },
    { uuid: uuidv4(), roleUuid: 'super-admin', permissionUuid: 'settings.payment.manage' },

    // ===== ADMIN - Shop level administration =====
    // Sales permissions
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'sales.create' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'sales.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'sales.edit' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'sales.void' },

    // Product permissions
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'products.create' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'products.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'products.edit' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'products.delete' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'products.pricing' },

    // Inventory permissions
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'inventory.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'inventory.adjust' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'inventory.transfer' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'inventory.receive' },

    // Customer permissions
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'customers.create' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'customers.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'customers.edit' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'customers.delete' },

    // Payment & Refund permissions
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'payments.process' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'payments.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'payments.partial' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'refunds.process' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'refunds.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'refunds.approve' },

    // Discount permissions
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'discounts.apply' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'discounts.create' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'discounts.override' },

    // Cash management
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'cash.drawer.open' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'cash.count' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'cash.deposit' },

    // Reports
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'reports.sales.daily' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'reports.sales.detailed' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'reports.inventory' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'reports.financial' },

    // User management
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'users.create' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'users.view' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'users.edit' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'users.delete' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'users.roles.assign' },

    // Settings
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'settings.shop.manage' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'settings.tax.manage' },
    { uuid: uuidv4(), roleUuid: 'admin', permissionUuid: 'settings.payment.manage' },

    // ===== MANAGER - Operational management =====
    // Sales permissions
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'sales.create' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'sales.view' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'sales.edit' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'sales.void' },

    // Product permissions
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'products.create' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'products.view' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'products.edit' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'products.pricing' },

    // Inventory permissions
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'inventory.view' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'inventory.adjust' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'inventory.receive' },

    // Customer permissions
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'customers.create' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'customers.view' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'customers.edit' },

    // Payment & Refund permissions
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'payments.process' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'payments.view' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'payments.partial' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'refunds.process' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'refunds.view' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'refunds.approve' },

    // Discount permissions
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'discounts.apply' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'discounts.create' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'discounts.override' },

    // Cash management
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'cash.drawer.open' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'cash.count' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'cash.deposit' },

    // Reports
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'reports.sales.daily' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'reports.sales.detailed' },
    { uuid: uuidv4(), roleUuid: 'manager', permissionUuid: 'reports.inventory' },

    // ===== CASHIER - Point of sale operations =====
    // Sales permissions
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'sales.create' },
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'sales.view.own' }, // Can only view own sales

    // Product permissions (view only)
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'products.view' },

    // Inventory permissions (view only)
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'inventory.view' },

    // Customer permissions
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'customers.create' },
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'customers.view' },
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'customers.edit' },

    // Payment permissions
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'payments.process' },
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'payments.view' },
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'payments.partial' },

    // Basic discount permissions
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'discounts.apply' },

    // Cash management
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'cash.drawer.open' },
    { uuid: uuidv4(), roleUuid: 'cashier', permissionUuid: 'cash.count' },
];
