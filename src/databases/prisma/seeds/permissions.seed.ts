import { PrismaClient } from "../generated/mysql/client";
import { PermissionCategory, PermissionScope } from "../../../utils/enums";

/**
 * Comprehensive permissions for multi-tenant POS system
 * Supports: Cafes, Bars, Pharmacies, Retail Stores (Small to Large businesses)
 */
const APP_PERMISSIONS = [
    // =====================================================
    // SALES PERMISSIONS
    // =====================================================
    {
        permissionId: 'sales.create',
        name: 'sales.create',
        displayName: 'Create Sales',
        description: 'Create new sales transactions',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'sales.view',
        name: 'sales.view',
        displayName: 'View All Sales',
        description: 'View all sales transactions in the location',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'sales.view.own',
        name: 'sales.view.own',
        displayName: 'View Own Sales',
        description: 'View only own sales transactions',
        category: PermissionCategory.SALES,
        scope: PermissionScope.SELF,
    },
    {
        permissionId: 'sales.edit',
        name: 'sales.edit',
        displayName: 'Edit Sales',
        description: 'Edit existing sales transactions',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'sales.void',
        name: 'sales.void',
        displayName: 'Void Sales',
        description: 'Void/cancel sales transactions',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'sales.return',
        name: 'sales.return',
        displayName: 'Process Returns',
        description: 'Process product returns',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'sales.hold',
        name: 'sales.hold',
        displayName: 'Hold Sales',
        description: 'Put sales on hold for later completion',
        category: PermissionCategory.SALES,
        scope: PermissionScope.TERMINAL,
    },
    {
        permissionId: 'sales.layaway',
        name: 'sales.layaway',
        displayName: 'Manage Layaway',
        description: 'Create and manage layaway orders',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // PRODUCT PERMISSIONS
    // =====================================================
    {
        permissionId: 'products.create',
        name: 'products.create',
        displayName: 'Create Products',
        description: 'Create new products in the catalog',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'products.view',
        name: 'products.view',
        displayName: 'View Products',
        description: 'View product catalog and details',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'products.edit',
        name: 'products.edit',
        displayName: 'Edit Products',
        description: 'Edit existing product information',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'products.delete',
        name: 'products.delete',
        displayName: 'Delete Products',
        description: 'Delete products from catalog',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'products.pricing',
        name: 'products.pricing',
        displayName: 'Manage Pricing',
        description: 'View and modify product prices and costs',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'products.import',
        name: 'products.import',
        displayName: 'Import Products',
        description: 'Bulk import products from files',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'products.export',
        name: 'products.export',
        displayName: 'Export Products',
        description: 'Export product data to files',
        category: PermissionCategory.PRODUCTS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // CATEGORY PERMISSIONS
    // =====================================================
    {
        permissionId: 'categories.create',
        name: 'categories.create',
        displayName: 'Create Categories',
        description: 'Create product categories',
        category: PermissionCategory.CATEGORIES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'categories.view',
        name: 'categories.view',
        displayName: 'View Categories',
        description: 'View product categories',
        category: PermissionCategory.CATEGORIES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'categories.edit',
        name: 'categories.edit',
        displayName: 'Edit Categories',
        description: 'Edit product categories',
        category: PermissionCategory.CATEGORIES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'categories.delete',
        name: 'categories.delete',
        displayName: 'Delete Categories',
        description: 'Delete product categories',
        category: PermissionCategory.CATEGORIES,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // INVENTORY PERMISSIONS
    // =====================================================
    {
        permissionId: 'inventory.view',
        name: 'inventory.view',
        displayName: 'View Inventory',
        description: 'View inventory levels and stock information',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'inventory.adjust',
        name: 'inventory.adjust',
        displayName: 'Adjust Inventory',
        description: 'Make manual inventory adjustments',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'inventory.transfer',
        name: 'inventory.transfer',
        displayName: 'Transfer Inventory',
        description: 'Transfer inventory between locations',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'inventory.receive',
        name: 'inventory.receive',
        displayName: 'Receive Inventory',
        description: 'Receive inventory from suppliers or transfers',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'inventory.count',
        name: 'inventory.count',
        displayName: 'Inventory Count',
        description: 'Perform physical inventory counts',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'inventory.reorder',
        name: 'inventory.reorder',
        displayName: 'Manage Reorder Levels',
        description: 'Set and manage reorder points and quantities',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'inventory.waste',
        name: 'inventory.waste',
        displayName: 'Record Waste/Spoilage',
        description: 'Record product waste, spoilage, or damage',
        category: PermissionCategory.INVENTORY,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // CUSTOMER PERMISSIONS
    // =====================================================
    {
        permissionId: 'customers.create',
        name: 'customers.create',
        displayName: 'Create Customers',
        description: 'Create new customer records',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'customers.view',
        name: 'customers.view',
        displayName: 'View Customers',
        description: 'View customer information and history',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'customers.edit',
        name: 'customers.edit',
        displayName: 'Edit Customers',
        description: 'Edit customer information',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'customers.delete',
        name: 'customers.delete',
        displayName: 'Delete Customers',
        description: 'Delete customer records',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'customers.credit',
        name: 'customers.credit',
        displayName: 'Manage Customer Credit',
        description: 'Manage customer store credit and balances',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'customers.loyalty',
        name: 'customers.loyalty',
        displayName: 'Manage Loyalty Points',
        description: 'View and adjust customer loyalty points',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // PAYMENT PERMISSIONS
    // =====================================================
    {
        permissionId: 'payments.process',
        name: 'payments.process',
        displayName: 'Process Payments',
        description: 'Process customer payments',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.TERMINAL,
    },
    {
        permissionId: 'payments.view',
        name: 'payments.view',
        displayName: 'View Payments',
        description: 'View payment records and history',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'payments.partial',
        name: 'payments.partial',
        displayName: 'Accept Partial Payments',
        description: 'Accept partial payments on orders',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'payments.credit',
        name: 'payments.credit',
        displayName: 'Process Credit Sales',
        description: 'Allow sales on credit/account',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'payments.split',
        name: 'payments.split',
        displayName: 'Split Payments',
        description: 'Split payments across multiple methods',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.TERMINAL,
    },

    // =====================================================
    // REFUND PERMISSIONS
    // =====================================================
    {
        permissionId: 'refunds.process',
        name: 'refunds.process',
        displayName: 'Process Refunds',
        description: 'Process customer refunds',
        category: PermissionCategory.REFUNDS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'refunds.view',
        name: 'refunds.view',
        displayName: 'View Refunds',
        description: 'View refund records',
        category: PermissionCategory.REFUNDS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'refunds.approve',
        name: 'refunds.approve',
        displayName: 'Approve Refunds',
        description: 'Approve refund requests over limits',
        category: PermissionCategory.REFUNDS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'refunds.void',
        name: 'refunds.void',
        displayName: 'Void Refunds',
        description: 'Void processed refunds',
        category: PermissionCategory.REFUNDS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // EXPENSE PERMISSIONS
    // =====================================================
    {
        permissionId: 'expenses.create',
        name: 'expenses.create',
        displayName: 'Record Expenses',
        description: 'Record new business expenses',
        category: PermissionCategory.EXPENSES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'expenses.view',
        name: 'expenses.view',
        displayName: 'View Expenses',
        description: 'View recorded expenses',
        category: PermissionCategory.EXPENSES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'expenses.approve',
        name: 'expenses.approve',
        displayName: 'Approve Expenses',
        description: 'Approve or reject expenses pending approval',
        category: PermissionCategory.EXPENSES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'expenses.void',
        name: 'expenses.void',
        displayName: 'Void Expenses',
        description: 'Void previously approved expenses',
        category: PermissionCategory.EXPENSES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'expenses.manage_categories',
        name: 'expenses.manage_categories',
        displayName: 'Manage Expense Categories',
        description: 'Create, edit, and delete expense categories',
        category: PermissionCategory.EXPENSES,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // DISCOUNT PERMISSIONS
    // =====================================================
    {
        permissionId: 'discounts.apply',
        name: 'discounts.apply',
        displayName: 'Apply Discounts',
        description: 'Apply predefined discounts to sales',
        category: PermissionCategory.DISCOUNTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'discounts.create',
        name: 'discounts.create',
        displayName: 'Create Discounts',
        description: 'Create discount rules and promotions',
        category: PermissionCategory.DISCOUNTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'discounts.edit',
        name: 'discounts.edit',
        displayName: 'Edit Discounts',
        description: 'Edit existing discount rules',
        category: PermissionCategory.DISCOUNTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'discounts.delete',
        name: 'discounts.delete',
        displayName: 'Delete Discounts',
        description: 'Delete discount rules',
        category: PermissionCategory.DISCOUNTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'discounts.override',
        name: 'discounts.override',
        displayName: 'Override Discount Limits',
        description: 'Override maximum discount limits',
        category: PermissionCategory.DISCOUNTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'discounts.manual',
        name: 'discounts.manual',
        displayName: 'Manual Discounts',
        description: 'Apply manual/ad-hoc discounts',
        category: PermissionCategory.DISCOUNTS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // PROMOTIONS PERMISSIONS
    // =====================================================
    {
        permissionId: 'promotions.create',
        name: 'promotions.create',
        displayName: 'Create Promotions',
        description: 'Create promotional campaigns',
        category: PermissionCategory.PROMOTIONS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'promotions.view',
        name: 'promotions.view',
        displayName: 'View Promotions',
        description: 'View promotional campaigns',
        category: PermissionCategory.PROMOTIONS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'promotions.edit',
        name: 'promotions.edit',
        displayName: 'Edit Promotions',
        description: 'Edit promotional campaigns',
        category: PermissionCategory.PROMOTIONS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'promotions.delete',
        name: 'promotions.delete',
        displayName: 'Delete Promotions',
        description: 'Delete promotional campaigns',
        category: PermissionCategory.PROMOTIONS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // CASH MANAGEMENT PERMISSIONS
    // =====================================================
    {
        permissionId: 'cash.drawer.open',
        name: 'cash.drawer.open',
        displayName: 'Open Cash Drawer',
        description: 'Open cash drawer manually without a sale',
        category: PermissionCategory.CASH_MANAGEMENT,
        scope: PermissionScope.TERMINAL,
    },
    {
        permissionId: 'cash.count',
        name: 'cash.count',
        displayName: 'Count Cash',
        description: 'Perform cash counts and reconciliation',
        category: PermissionCategory.CASH_MANAGEMENT,
        scope: PermissionScope.TERMINAL,
    },
    {
        permissionId: 'cash.deposit',
        name: 'cash.deposit',
        displayName: 'Cash Deposits',
        description: 'Record cash deposits and bank drops',
        category: PermissionCategory.CASH_MANAGEMENT,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'cash.payout',
        name: 'cash.payout',
        displayName: 'Cash Payouts',
        description: 'Process cash payouts from drawer',
        category: PermissionCategory.CASH_MANAGEMENT,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'cash.float',
        name: 'cash.float',
        displayName: 'Manage Float',
        description: 'Set and adjust cash drawer float',
        category: PermissionCategory.CASH_MANAGEMENT,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'cash.close',
        name: 'cash.close',
        displayName: 'Close Cash Drawer',
        description: 'Close and reconcile cash drawer at end of shift',
        category: PermissionCategory.CASH_MANAGEMENT,
        scope: PermissionScope.TERMINAL,
    },

    // =====================================================
    // REPORT PERMISSIONS
    // =====================================================
    {
        permissionId: 'reports.sales.daily',
        name: 'reports.sales.daily',
        displayName: 'Daily Sales Reports',
        description: 'View daily sales summary reports',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reports.sales.detailed',
        name: 'reports.sales.detailed',
        displayName: 'Detailed Sales Reports',
        description: 'View detailed sales reports with line items',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reports.inventory',
        name: 'reports.inventory',
        displayName: 'Inventory Reports',
        description: 'View inventory and stock reports',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reports.financial',
        name: 'reports.financial',
        displayName: 'Financial Reports',
        description: 'View financial and accounting reports',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'reports.staff',
        name: 'reports.staff',
        displayName: 'Staff Reports',
        description: 'View staff performance and activity reports',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reports.customers',
        name: 'reports.customers',
        displayName: 'Customer Reports',
        description: 'View customer analytics and reports',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reports.taxes',
        name: 'reports.taxes',
        displayName: 'Tax Reports',
        description: 'View tax collection reports',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reports.export',
        name: 'reports.export',
        displayName: 'Export Reports',
        description: 'Export reports to PDF, Excel, CSV',
        category: PermissionCategory.REPORTS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // ANALYTICS PERMISSIONS
    // =====================================================
    {
        permissionId: 'analytics.view',
        name: 'analytics.view',
        displayName: 'View Analytics',
        description: 'View business analytics dashboard',
        category: PermissionCategory.ANALYTICS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'analytics.advanced',
        name: 'analytics.advanced',
        displayName: 'Advanced Analytics',
        description: 'Access advanced analytics and insights',
        category: PermissionCategory.ANALYTICS,
        scope: PermissionScope.TENANT,
    },

    // =====================================================
    // USER MANAGEMENT PERMISSIONS
    // =====================================================
    {
        permissionId: 'users.create',
        name: 'users.create',
        displayName: 'Create Users',
        description: 'Create new user accounts',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'users.view',
        name: 'users.view',
        displayName: 'View Users',
        description: 'View user accounts and profiles',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'users.edit',
        name: 'users.edit',
        displayName: 'Edit Users',
        description: 'Edit user account information',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'users.delete',
        name: 'users.delete',
        displayName: 'Delete Users',
        description: 'Delete or deactivate user accounts',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'users.roles.assign',
        name: 'users.roles.assign',
        displayName: 'Assign User Roles',
        description: 'Assign and modify user roles',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'users.permissions.view',
        name: 'users.permissions.view',
        displayName: 'View User Permissions',
        description: 'View user permission assignments',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'users.clock',
        name: 'users.clock',
        displayName: 'Manage Time Clock',
        description: 'Manage staff clock in/out and timesheets',
        category: PermissionCategory.USERS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // ROLE MANAGEMENT PERMISSIONS
    // =====================================================
    {
        permissionId: 'roles.create',
        name: 'roles.create',
        displayName: 'Create Roles',
        description: 'Create custom roles',
        category: PermissionCategory.ROLES,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'roles.view',
        name: 'roles.view',
        displayName: 'View Roles',
        description: 'View role definitions',
        category: PermissionCategory.ROLES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'roles.edit',
        name: 'roles.edit',
        displayName: 'Edit Roles',
        description: 'Edit custom role permissions',
        category: PermissionCategory.ROLES,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'roles.delete',
        name: 'roles.delete',
        displayName: 'Delete Roles',
        description: 'Delete custom roles',
        category: PermissionCategory.ROLES,
        scope: PermissionScope.TENANT,
    },

    // =====================================================
    // SETTINGS PERMISSIONS
    // =====================================================
    {
        permissionId: 'settings.branch.manage',
        name: 'settings.branch.manage',
        displayName: 'Manage Branch Settings',
        description: 'Manage branch/location configuration',
        category: PermissionCategory.SETTINGS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'settings.tax.manage',
        name: 'settings.tax.manage',
        displayName: 'Manage Tax Settings',
        description: 'Configure tax rates and rules',
        category: PermissionCategory.SETTINGS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'settings.payment.manage',
        name: 'settings.payment.manage',
        displayName: 'Manage Payment Settings',
        description: 'Configure payment methods and processors',
        category: PermissionCategory.SETTINGS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'settings.receipt.manage',
        name: 'settings.receipt.manage',
        displayName: 'Manage Receipt Settings',
        description: 'Configure receipt templates and printing',
        category: PermissionCategory.SETTINGS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'settings.loyalty.manage',
        name: 'settings.loyalty.manage',
        displayName: 'Manage Loyalty Program',
        description: 'Configure loyalty program settings',
        category: PermissionCategory.SETTINGS,
        scope: PermissionScope.TENANT,
    },

    // =====================================================
    // BRANCH MANAGEMENT PERMISSIONS
    // =====================================================
    {
        permissionId: 'branches.create',
        name: 'branches.create',
        displayName: 'Create Branches',
        description: 'Create new branch locations',
        category: PermissionCategory.BRANCHES,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'branches.view',
        name: 'branches.view',
        displayName: 'View Branches',
        description: 'View branch locations',
        category: PermissionCategory.BRANCHES,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'branches.edit',
        name: 'branches.edit',
        displayName: 'Edit Branches',
        description: 'Edit branch information',
        category: PermissionCategory.BRANCHES,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'branches.delete',
        name: 'branches.delete',
        displayName: 'Delete Branches',
        description: 'Delete or deactivate branches',
        category: PermissionCategory.BRANCHES,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'branches.edit.own',
        name: 'branches.edit.own',
        displayName: 'Edit Own Branch',
        description: 'Edit only the branch/location assigned to the user',
        category: PermissionCategory.BRANCHES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'branches.status.manage',
        name: 'branches.status.manage',
        displayName: 'Manage Branch Status',
        description: 'Activate or deactivate branches/locations',
        category: PermissionCategory.BRANCHES,
        scope: PermissionScope.TENANT,
    },

    // =====================================================
    // TERMINAL PERMISSIONS
    // =====================================================
    {
        permissionId: 'terminals.create',
        name: 'terminals.create',
        displayName: 'Create Terminals',
        description: 'Register new POS terminals',
        category: PermissionCategory.TERMINALS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'terminals.view',
        name: 'terminals.view',
        displayName: 'View Terminals',
        description: 'View registered terminals',
        category: PermissionCategory.TERMINALS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'terminals.edit',
        name: 'terminals.edit',
        displayName: 'Edit Terminals',
        description: 'Edit terminal settings',
        category: PermissionCategory.TERMINALS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'terminals.delete',
        name: 'terminals.delete',
        displayName: 'Delete Terminals',
        description: 'Remove terminals',
        category: PermissionCategory.TERMINALS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // SUPPLIER PERMISSIONS
    // =====================================================
    {
        permissionId: 'suppliers.create',
        name: 'suppliers.create',
        displayName: 'Create Suppliers',
        description: 'Create new supplier records',
        category: PermissionCategory.SUPPLIERS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'suppliers.view',
        name: 'suppliers.view',
        displayName: 'View Suppliers',
        description: 'View supplier information',
        category: PermissionCategory.SUPPLIERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'suppliers.edit',
        name: 'suppliers.edit',
        displayName: 'Edit Suppliers',
        description: 'Edit supplier information',
        category: PermissionCategory.SUPPLIERS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'suppliers.delete',
        name: 'suppliers.delete',
        displayName: 'Delete Suppliers',
        description: 'Delete supplier records',
        category: PermissionCategory.SUPPLIERS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'suppliers.orders',
        name: 'suppliers.orders',
        displayName: 'Manage Purchase Orders',
        description: 'Create and manage purchase orders',
        category: PermissionCategory.SUPPLIERS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // SYSTEM PERMISSIONS
    // =====================================================
    {
        permissionId: 'system.admin',
        name: 'system.admin',
        displayName: 'System Administration',
        description: 'Full system administration access',
        category: PermissionCategory.SYSTEM,
        scope: PermissionScope.GLOBAL,
    },
    {
        permissionId: 'system.backup',
        name: 'system.backup',
        displayName: 'System Backup',
        description: 'Create and manage data backups',
        category: PermissionCategory.SYSTEM,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'system.restore',
        name: 'system.restore',
        displayName: 'System Restore',
        description: 'Restore data from backups',
        category: PermissionCategory.SYSTEM,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'system.logs.view',
        name: 'system.logs.view',
        displayName: 'View System Logs',
        description: 'View system logs and audit trails',
        category: PermissionCategory.LOGS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'system.maintenance',
        name: 'system.maintenance',
        displayName: 'System Maintenance',
        description: 'Perform system maintenance tasks',
        category: PermissionCategory.MAINTENANCE,
        scope: PermissionScope.GLOBAL,
    },

    // =====================================================
    // SUBSCRIPTION & BILLING PERMISSIONS
    // =====================================================
    {
        permissionId: 'subscriptions.view',
        name: 'subscriptions.view',
        displayName: 'View Subscription',
        description: 'View subscription plan and status',
        category: PermissionCategory.SUBSCRIPTIONS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'subscriptions.manage',
        name: 'subscriptions.manage',
        displayName: 'Manage Subscription',
        description: 'Upgrade, downgrade, or cancel subscription',
        category: PermissionCategory.SUBSCRIPTIONS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'billing.view',
        name: 'billing.view',
        displayName: 'View Billing',
        description: 'View invoices and billing history',
        category: PermissionCategory.BILLING,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'billing.manage',
        name: 'billing.manage',
        displayName: 'Manage Billing',
        description: 'Update payment methods and billing info',
        category: PermissionCategory.BILLING,
        scope: PermissionScope.TENANT,
    },

    // =====================================================
    // INTEGRATION & API PERMISSIONS
    // =====================================================
    {
        permissionId: 'integrations.view',
        name: 'integrations.view',
        displayName: 'View Integrations',
        description: 'View connected integrations',
        category: PermissionCategory.INTEGRATIONS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'integrations.manage',
        name: 'integrations.manage',
        displayName: 'Manage Integrations',
        description: 'Connect and configure integrations',
        category: PermissionCategory.INTEGRATIONS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'api.access',
        name: 'api.access',
        displayName: 'API Access',
        description: 'Access REST API endpoints',
        category: PermissionCategory.API,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'api.keys.manage',
        name: 'api.keys.manage',
        displayName: 'Manage API Keys',
        description: 'Create and manage API keys',
        category: PermissionCategory.API,
        scope: PermissionScope.TENANT,
    },

    // TODO: Remove the following permissions 
    // =====================================================
    // ORDERS PERMISSIONS (For restaurants/cafes/bars)
    // =====================================================
    {
        permissionId: 'orders.create',
        name: 'orders.create',
        displayName: 'Create Orders',
        description: 'Create new orders (table/takeaway)',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'orders.view',
        name: 'orders.view',
        displayName: 'View Orders',
        description: 'View all orders',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'orders.edit',
        name: 'orders.edit',
        displayName: 'Edit Orders',
        description: 'Edit existing orders',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'orders.cancel',
        name: 'orders.cancel',
        displayName: 'Cancel Orders',
        description: 'Cancel orders',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'orders.status',
        name: 'orders.status',
        displayName: 'Update Order Status',
        description: 'Update order preparation/delivery status',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },

    // TODO: Remove the following permissions
    // =====================================================
    // TABLE MANAGEMENT (For restaurants/bars)
    // =====================================================
    {
        permissionId: 'tables.view',
        name: 'tables.view',
        displayName: 'View Tables',
        description: 'View table layout and status',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'tables.manage',
        name: 'tables.manage',
        displayName: 'Manage Tables',
        description: 'Manage table assignments and layout',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'tables.transfer',
        name: 'tables.transfer',
        displayName: 'Transfer Tables',
        description: 'Transfer orders between tables',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'tables.merge',
        name: 'tables.merge',
        displayName: 'Merge/Split Tables',
        description: 'Merge or split table orders',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },

    // TODO: Remove the following permissions 
    // =====================================================
    // RESERVATIONS (For restaurants/bars)
    // =====================================================
    {
        permissionId: 'reservations.create',
        name: 'reservations.create',
        displayName: 'Create Reservations',
        description: 'Create new reservations',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reservations.view',
        name: 'reservations.view',
        displayName: 'View Reservations',
        description: 'View reservation calendar',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reservations.edit',
        name: 'reservations.edit',
        displayName: 'Edit Reservations',
        description: 'Edit existing reservations',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'reservations.cancel',
        name: 'reservations.cancel',
        displayName: 'Cancel Reservations',
        description: 'Cancel reservations',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },

    // TODO: Remove the following permissions
    // =====================================================
    // KITCHEN DISPLAY SYSTEM (For restaurants/cafes)
    // =====================================================
    {
        permissionId: 'kitchen.view',
        name: 'kitchen.view',
        displayName: 'View Kitchen Display',
        description: 'View kitchen order display',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'kitchen.manage',
        name: 'kitchen.manage',
        displayName: 'Manage Kitchen Orders',
        description: 'Mark orders as prepared/ready',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },

    // TODO: Remove the following permissions 
    // =====================================================
    // DELIVERY PERMISSIONS
    // =====================================================
    {
        permissionId: 'delivery.view',
        name: 'delivery.view',
        displayName: 'View Deliveries',
        description: 'View delivery orders and status',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'delivery.manage',
        name: 'delivery.manage',
        displayName: 'Manage Deliveries',
        description: 'Assign and manage delivery orders',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'delivery.status',
        name: 'delivery.status',
        displayName: 'Update Delivery Status',
        description: 'Update delivery status (picked up, delivered)',
        category: PermissionCategory.SALES,
        scope: PermissionScope.SELF,
    },

    // TODO: Remove the following permissions
    // =====================================================
    // TIPS MANAGEMENT (For restaurants/bars/cafes)
    // =====================================================
    {
        permissionId: 'tips.collect',
        name: 'tips.collect',
        displayName: 'Collect Tips',
        description: 'Accept and record tips',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.TERMINAL,
    },
    {
        permissionId: 'tips.view',
        name: 'tips.view',
        displayName: 'View Tips',
        description: 'View tip reports',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'tips.manage',
        name: 'tips.manage',
        displayName: 'Manage Tips',
        description: 'Manage tip pooling and distribution',
        category: PermissionCategory.PAYMENTS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // PHARMACY-SPECIFIC PERMISSIONS
    // =====================================================
    {
        permissionId: 'pharmacy.dispense',
        name: 'pharmacy.dispense',
        displayName: 'Dispense Medication',
        description: 'Dispense prescription medications',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'pharmacy.prescriptions',
        name: 'pharmacy.prescriptions',
        displayName: 'Manage Prescriptions',
        description: 'View and manage prescriptions',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'pharmacy.controlled',
        name: 'pharmacy.controlled',
        displayName: 'Controlled Substances',
        description: 'Handle controlled substance transactions',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },
    {
        permissionId: 'pharmacy.counseling',
        name: 'pharmacy.counseling',
        displayName: 'Patient Counseling',
        description: 'Record patient counseling sessions',
        category: PermissionCategory.CUSTOMERS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // AGE VERIFICATION (For bars/pharmacies)
    // =====================================================
    {
        permissionId: 'age.verify',
        name: 'age.verify',
        displayName: 'Age Verification',
        description: 'Verify customer age for restricted products',
        category: PermissionCategory.SALES,
        scope: PermissionScope.TERMINAL,
    },
    {
        permissionId: 'age.override',
        name: 'age.override',
        displayName: 'Override Age Check',
        description: 'Override age verification (supervisor)',
        category: PermissionCategory.SALES,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // EXPORT PERMISSIONS
    // =====================================================
    {
        permissionId: 'exports.data',
        name: 'exports.data',
        displayName: 'Export Data',
        description: 'Export business data',
        category: PermissionCategory.EXPORTS,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'exports.reports',
        name: 'exports.reports',
        displayName: 'Export Reports',
        description: 'Export reports to various formats',
        category: PermissionCategory.EXPORTS,
        scope: PermissionScope.BRANCH,
    },

    // =====================================================
    // SUPPORT PERMISSIONS
    // =====================================================
    {
        permissionId: 'support.tickets.create',
        name: 'support.tickets.create',
        displayName: 'Create Support Tickets',
        description: 'Create support tickets',
        category: PermissionCategory.SUPPORT,
        scope: PermissionScope.TENANT,
    },
    {
        permissionId: 'support.tickets.view',
        name: 'support.tickets.view',
        displayName: 'View Support Tickets',
        description: 'View support tickets',
        category: PermissionCategory.SUPPORT,
        scope: PermissionScope.TENANT,
    },
];

export async function seedPermissions(prisma: PrismaClient) {
    console.log('📝 Seeding permissions...');

    for (const perm of APP_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { permissionId: perm.permissionId },
            update: {
                name: perm.name,
                displayName: perm.displayName,
                description: perm.description,
                category: perm.category,
                scope: perm.scope as any,
            },
            create: {
                permissionId: perm.permissionId,
                name: perm.name,
                displayName: perm.displayName,
                description: perm.description,
                category: perm.category,
                scope: perm.scope as any,
            },
        });
    }

    console.log(`✓ ${APP_PERMISSIONS.length} permissions seeded`);
}

// Export permissions list for use in role-permissions seed
export { APP_PERMISSIONS };