export const DEFAULT_ROLE_PERMISSIONS = [
    // ===== SUPER ADMIN - Full system access =====
    { roleUuid: 'super-admin', permissionUuid: 'system.admin' },
    { roleUuid: 'super-admin', permissionUuid: 'system.backup' },
    { roleUuid: 'super-admin', permissionUuid: 'system.logs.view' },

    // Sales permissions
    { roleUuid: 'super-admin', permissionUuid: 'sales.create' },
    { roleUuid: 'super-admin', permissionUuid: 'sales.view' },
    { roleUuid: 'super-admin', permissionUuid: 'sales.edit' },
    { roleUuid: 'super-admin', permissionUuid: 'sales.void' },

    // Product permissions
    { roleUuid: 'super-admin', permissionUuid: 'products.create' },
    { roleUuid: 'super-admin', permissionUuid: 'products.view' },
    { roleUuid: 'super-admin', permissionUuid: 'products.edit' },
    { roleUuid: 'super-admin', permissionUuid: 'products.delete' },
    { roleUuid: 'super-admin', permissionUuid: 'products.pricing' },

    // Inventory permissions
    { roleUuid: 'super-admin', permissionUuid: 'inventory.view' },
    { roleUuid: 'super-admin', permissionUuid: 'inventory.adjust' },
    { roleUuid: 'super-admin', permissionUuid: 'inventory.transfer' },
    { roleUuid: 'super-admin', permissionUuid: 'inventory.receive' },

    // Customer permissions
    { roleUuid: 'super-admin', permissionUuid: 'customers.create' },
    { roleUuid: 'super-admin', permissionUuid: 'customers.view' },
    { roleUuid: 'super-admin', permissionUuid: 'customers.edit' },
    { roleUuid: 'super-admin', permissionUuid: 'customers.delete' },

    // Payment & Refund permissions
    { roleUuid: 'super-admin', permissionUuid: 'payments.process' },
    { roleUuid: 'super-admin', permissionUuid: 'payments.view' },
    { roleUuid: 'super-admin', permissionUuid: 'payments.partial' },
    { roleUuid: 'super-admin', permissionUuid: 'refunds.process' },
    { roleUuid: 'super-admin', permissionUuid: 'refunds.view' },
    { roleUuid: 'super-admin', permissionUuid: 'refunds.approve' },

    // Discount permissions
    { roleUuid: 'super-admin', permissionUuid: 'discounts.apply' },
    { roleUuid: 'super-admin', permissionUuid: 'discounts.create' },
    { roleUuid: 'super-admin', permissionUuid: 'discounts.override' },

    // Cash management
    { roleUuid: 'super-admin', permissionUuid: 'cash.drawer.open' },
    { roleUuid: 'super-admin', permissionUuid: 'cash.count' },
    { roleUuid: 'super-admin', permissionUuid: 'cash.deposit' },

    // Reports
    { roleUuid: 'super-admin', permissionUuid: 'reports.sales.daily' },
    { roleUuid: 'super-admin', permissionUuid: 'reports.sales.detailed' },
    { roleUuid: 'super-admin', permissionUuid: 'reports.inventory' },
    { roleUuid: 'super-admin', permissionUuid: 'reports.financial' },

    // User management
    { roleUuid: 'super-admin', permissionUuid: 'users.create' },
    { roleUuid: 'super-admin', permissionUuid: 'users.view' },
    { roleUuid: 'super-admin', permissionUuid: 'users.edit' },
    { roleUuid: 'super-admin', permissionUuid: 'users.delete' },
    { roleUuid: 'super-admin', permissionUuid: 'users.roles.assign' },

    // Settings
    { roleUuid: 'super-admin', permissionUuid: 'settings.shop.manage' },
    { roleUuid: 'super-admin', permissionUuid: 'settings.tax.manage' },
    { roleUuid: 'super-admin', permissionUuid: 'settings.payment.manage' },

    // ===== ADMIN - Shop level administration =====
    // Sales permissions
    { roleUuid: 'admin', permissionUuid: 'sales.create' },
    { roleUuid: 'admin', permissionUuid: 'sales.view' },
    { roleUuid: 'admin', permissionUuid: 'sales.edit' },
    { roleUuid: 'admin', permissionUuid: 'sales.void' },

    // Product permissions
    { roleUuid: 'admin', permissionUuid: 'products.create' },
    { roleUuid: 'admin', permissionUuid: 'products.view' },
    { roleUuid: 'admin', permissionUuid: 'products.edit' },
    { roleUuid: 'admin', permissionUuid: 'products.delete' },
    { roleUuid: 'admin', permissionUuid: 'products.pricing' },

    // Inventory permissions
    { roleUuid: 'admin', permissionUuid: 'inventory.view' },
    { roleUuid: 'admin', permissionUuid: 'inventory.adjust' },
    { roleUuid: 'admin', permissionUuid: 'inventory.transfer' },
    { roleUuid: 'admin', permissionUuid: 'inventory.receive' },

    // Customer permissions
    { roleUuid: 'admin', permissionUuid: 'customers.create' },
    { roleUuid: 'admin', permissionUuid: 'customers.view' },
    { roleUuid: 'admin', permissionUuid: 'customers.edit' },
    { roleUuid: 'admin', permissionUuid: 'customers.delete' },

    // Payment & Refund permissions
    { roleUuid: 'admin', permissionUuid: 'payments.process' },
    { roleUuid: 'admin', permissionUuid: 'payments.view' },
    { roleUuid: 'admin', permissionUuid: 'payments.partial' },
    { roleUuid: 'admin', permissionUuid: 'refunds.process' },
    { roleUuid: 'admin', permissionUuid: 'refunds.view' },
    { roleUuid: 'admin', permissionUuid: 'refunds.approve' },

    // Discount permissions
    { roleUuid: 'admin', permissionUuid: 'discounts.apply' },
    { roleUuid: 'admin', permissionUuid: 'discounts.create' },
    { roleUuid: 'admin', permissionUuid: 'discounts.override' },

    // Cash management
    { roleUuid: 'admin', permissionUuid: 'cash.drawer.open' },
    { roleUuid: 'admin', permissionUuid: 'cash.count' },
    { roleUuid: 'admin', permissionUuid: 'cash.deposit' },

    // Reports
    { roleUuid: 'admin', permissionUuid: 'reports.sales.daily' },
    { roleUuid: 'admin', permissionUuid: 'reports.sales.detailed' },
    { roleUuid: 'admin', permissionUuid: 'reports.inventory' },
    { roleUuid: 'admin', permissionUuid: 'reports.financial' },

    // User management
    { roleUuid: 'admin', permissionUuid: 'users.create' },
    { roleUuid: 'admin', permissionUuid: 'users.view' },
    { roleUuid: 'admin', permissionUuid: 'users.edit' },
    { roleUuid: 'admin', permissionUuid: 'users.delete' },
    { roleUuid: 'admin', permissionUuid: 'users.roles.assign' },

    // Settings
    { roleUuid: 'admin', permissionUuid: 'settings.shop.manage' },
    { roleUuid: 'admin', permissionUuid: 'settings.tax.manage' },
    { roleUuid: 'admin', permissionUuid: 'settings.payment.manage' },

    // ===== MANAGER - Operational management =====
    // Sales permissions
    { roleUuid: 'manager', permissionUuid: 'sales.create' },
    { roleUuid: 'manager', permissionUuid: 'sales.view' },
    { roleUuid: 'manager', permissionUuid: 'sales.edit' },
    { roleUuid: 'manager', permissionUuid: 'sales.void' },

    // Product permissions
    { roleUuid: 'manager', permissionUuid: 'products.create' },
    { roleUuid: 'manager', permissionUuid: 'products.view' },
    { roleUuid: 'manager', permissionUuid: 'products.edit' },
    { roleUuid: 'manager', permissionUuid: 'products.pricing' },

    // Inventory permissions
    { roleUuid: 'manager', permissionUuid: 'inventory.view' },
    { roleUuid: 'manager', permissionUuid: 'inventory.adjust' },
    { roleUuid: 'manager', permissionUuid: 'inventory.receive' },

    // Customer permissions
    { roleUuid: 'manager', permissionUuid: 'customers.create' },
    { roleUuid: 'manager', permissionUuid: 'customers.view' },
    { roleUuid: 'manager', permissionUuid: 'customers.edit' },

    // Payment & Refund permissions
    { roleUuid: 'manager', permissionUuid: 'payments.process' },
    { roleUuid: 'manager', permissionUuid: 'payments.view' },
    { roleUuid: 'manager', permissionUuid: 'payments.partial' },
    { roleUuid: 'manager', permissionUuid: 'refunds.process' },
    { roleUuid: 'manager', permissionUuid: 'refunds.view' },
    { roleUuid: 'manager', permissionUuid: 'refunds.approve' },

    // Discount permissions
    { roleUuid: 'manager', permissionUuid: 'discounts.apply' },
    { roleUuid: 'manager', permissionUuid: 'discounts.create' },
    { roleUuid: 'manager', permissionUuid: 'discounts.override' },

    // Cash management
    { roleUuid: 'manager', permissionUuid: 'cash.drawer.open' },
    { roleUuid: 'manager', permissionUuid: 'cash.count' },
    { roleUuid: 'manager', permissionUuid: 'cash.deposit' },

    // Reports
    { roleUuid: 'manager', permissionUuid: 'reports.sales.daily' },
    { roleUuid: 'manager', permissionUuid: 'reports.sales.detailed' },
    { roleUuid: 'manager', permissionUuid: 'reports.inventory' },

    // ===== CASHIER - Point of sale operations =====
    // Sales permissions
    { roleUuid: 'cashier', permissionUuid: 'sales.create' },
    { roleUuid: 'cashier', permissionUuid: 'sales.view.own' }, // Can only view own sales

    // Product permissions (view only)
    { roleUuid: 'cashier', permissionUuid: 'products.view' },

    // Inventory permissions (view only)
    { roleUuid: 'cashier', permissionUuid: 'inventory.view' },

    // Customer permissions
    { roleUuid: 'cashier', permissionUuid: 'customers.create' },
    { roleUuid: 'cashier', permissionUuid: 'customers.view' },
    { roleUuid: 'cashier', permissionUuid: 'customers.edit' },

    // Payment permissions
    { roleUuid: 'cashier', permissionUuid: 'payments.process' },
    { roleUuid: 'cashier', permissionUuid: 'payments.view' },
    { roleUuid: 'cashier', permissionUuid: 'payments.partial' },

    // Basic discount permissions
    { roleUuid: 'cashier', permissionUuid: 'discounts.apply' },

    // Cash management
    { roleUuid: 'cashier', permissionUuid: 'cash.drawer.open' },
    { roleUuid: 'cashier', permissionUuid: 'cash.count' },
];
