import { PrismaClient } from "../generated/prisma/client";

interface RolePermission {
    rolePermissionId: string;
    roleId: string;
    permissionId: string;
}

const createRolePermissions = (roleId: string, permissionIds: string[]): RolePermission[] => {
    return permissionIds.map(permissionId => ({
        rolePermissionId: `${roleId}-${permissionId}`,
        roleId,
        permissionId,
    }));
};

// =====================================================
// PERMISSION GROUPS FOR REUSE
// =====================================================
const ALL_SALES_PERMISSIONS = [
    'sales.create', 'sales.view', 'sales.edit', 'sales.void'
];

const ALL_PRODUCT_PERMISSIONS = [
    'products.create', 'products.view', 'products.edit', 'products.delete', 'products.pricing'
];

const ALL_INVENTORY_PERMISSIONS = [
    'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.receive'
];

const ALL_CUSTOMER_PERMISSIONS = [
    'customers.create', 'customers.view', 'customers.edit', 'customers.delete'
];

const ALL_PAYMENT_PERMISSIONS = [
    'payments.process', 'payments.view', 'payments.partial'
];

const ALL_REFUND_PERMISSIONS = [
    'refunds.process', 'refunds.view', 'refunds.approve'
];

const ALL_DISCOUNT_PERMISSIONS = [
    'discounts.apply', 'discounts.create', 'discounts.override'
];

const ALL_CASH_PERMISSIONS = [
    'cash.drawer.open', 'cash.count', 'cash.deposit'
];

const ALL_REPORT_PERMISSIONS = [
    'reports.sales.daily', 'reports.sales.detailed', 'reports.inventory', 'reports.financial'
];

const ALL_USER_PERMISSIONS = [
    'users.create', 'users.view', 'users.edit', 'users.delete', 'users.roles.assign'
];

const ALL_SETTINGS_PERMISSIONS = [
    'settings.shop.manage', 'settings.tax.manage', 'settings.payment.manage'
];

const ALL_SYSTEM_PERMISSIONS = [
    'system.admin', 'system.backup', 'system.logs.view'
];

// Basic view-only permissions
const BASIC_VIEW_PERMISSIONS = [
    'sales.view', 'products.view', 'inventory.view', 'customers.view', 'payments.view'
];

// Basic cashier operations
export const BASIC_CASHIER_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view',
    'payments.process', 'payments.view',
    'discounts.apply',
    'cash.drawer.open',
];

// =====================================================
// ROLE PERMISSION DEFINITIONS
// =====================================================

// ===== SYSTEM-LEVEL ROLES =====

// SUPER ADMIN - Full platform access
const SUPER_ADMIN_PERMISSIONS = [
    ...ALL_SYSTEM_PERMISSIONS,
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    ...ALL_USER_PERMISSIONS,
    ...ALL_SETTINGS_PERMISSIONS,
];

// SUPPORT ADMIN - Platform support with limited write access
const SUPPORT_ADMIN_PERMISSIONS = [
    'system.logs.view',
    ...BASIC_VIEW_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    'users.view',
    'settings.shop.manage',
];

// ===== TENANT-LEVEL ROLES =====

// TENANT OWNER - Full business access
const TENANT_OWNER_PERMISSIONS = [
    'system.backup', 'system.logs.view',
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    ...ALL_USER_PERMISSIONS,
    ...ALL_SETTINGS_PERMISSIONS,
];

// ADMIN - Full operational access within tenant
const ADMIN_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    ...ALL_USER_PERMISSIONS,
    ...ALL_SETTINGS_PERMISSIONS,
];

// OPERATIONS DIRECTOR - Multi-branch oversight
const OPERATIONS_DIRECTOR_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    'users.view', 'users.edit', 'users.roles.assign',
    'settings.shop.manage',
];

// ===== LOCATION/BRANCH-LEVEL ROLES =====

// BRANCH MANAGER - Full control over specific location
const BRANCH_MANAGER_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    'users.create', 'users.view', 'users.edit', 'users.roles.assign',
    'settings.shop.manage',
];

// ASSISTANT MANAGER - Supports branch manager
const ASSISTANT_MANAGER_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    'products.create', 'products.view', 'products.edit', 'products.pricing',
    'inventory.view', 'inventory.adjust', 'inventory.receive',
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    'reports.sales.daily', 'reports.sales.detailed', 'reports.inventory',
    'users.view',
];

// MANAGER - General operational management
const MANAGER_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    'products.create', 'products.view', 'products.edit', 'products.pricing',
    'inventory.view', 'inventory.adjust', 'inventory.receive',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    'reports.sales.daily', 'reports.sales.detailed', 'reports.inventory',
];

// SHIFT SUPERVISOR - Elevated cashier with supervision
const SHIFT_SUPERVISOR_PERMISSIONS = [
    'sales.create', 'sales.view', 'sales.edit',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    'refunds.process', 'refunds.view',
    'discounts.apply', 'discounts.override',
    ...ALL_CASH_PERMISSIONS,
    'reports.sales.daily',
];

// TEAM LEAD - Leads small team
const TEAM_LEAD_PERMISSIONS = [
    'sales.create', 'sales.view', 'sales.edit',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    'refunds.process', 'refunds.view',
    'discounts.apply',
    'cash.drawer.open', 'cash.count',
    'reports.sales.daily',
];

// ===== FINANCIAL ROLES =====

// FINANCE MANAGER - Full financial oversight
const FINANCE_MANAGER_PERMISSIONS = [
    'sales.view',
    'products.view', 'products.pricing',
    'inventory.view',
    'customers.view',
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    'system.logs.view',
    'settings.tax.manage', 'settings.payment.manage',
];

// ACCOUNTANT - Financial reporting and reconciliation
const ACCOUNTANT_PERMISSIONS = [
    'sales.view',
    'payments.view',
    'refunds.view',
    'cash.count',
    ...ALL_REPORT_PERMISSIONS,
    'system.logs.view',
];

// BOOKKEEPER - Daily transaction records
const BOOKKEEPER_PERMISSIONS = [
    'sales.view',
    'payments.view',
    'refunds.view',
    'reports.sales.daily', 'reports.sales.detailed',
];

// ===== INVENTORY & SUPPLY CHAIN ROLES =====

// INVENTORY MANAGER - Full stock management
const INVENTORY_MANAGER_PERMISSIONS = [
    'products.view', 'products.edit', 'products.create',
    ...ALL_INVENTORY_PERMISSIONS,
    'reports.inventory',
];

// WAREHOUSE SUPERVISOR - Warehouse operations
const WAREHOUSE_SUPERVISOR_PERMISSIONS = [
    'products.view',
    ...ALL_INVENTORY_PERMISSIONS,
    'reports.inventory',
];

// STOCK CLERK - Basic inventory tasks
const STOCK_CLERK_PERMISSIONS = [
    'products.view',
    'inventory.view', 'inventory.receive',
];

// PURCHASING OFFICER - Supplier and orders
const PURCHASING_OFFICER_PERMISSIONS = [
    'products.view', 'products.create', 'products.edit',
    'inventory.view', 'inventory.receive',
    'reports.inventory',
];

// ===== SALES & CUSTOMER SERVICE ROLES =====

// SALES MANAGER - Manages sales team
const SALES_MANAGER_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    'products.view', 'products.pricing',
    'inventory.view',
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    'cash.drawer.open', 'cash.count',
    'reports.sales.daily', 'reports.sales.detailed',
];

// SENIOR CASHIER - Experienced cashier with refunds
const SENIOR_CASHIER_PERMISSIONS = [
    'sales.create', 'sales.view',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    'refunds.process', 'refunds.view',
    'discounts.apply',
    'cash.drawer.open', 'cash.count',
];

// CASHIER - Standard POS operations
const CASHIER_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view', 'customers.edit',
    'payments.process', 'payments.view', 'payments.partial',
    'discounts.apply',
    'cash.drawer.open', 'cash.count',
];

// TRAINEE CASHIER - Limited cashier in training
const TRAINEE_CASHIER_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'customers.view',
    'payments.process', 'payments.view',
    'cash.drawer.open',
];

// SALES ASSOCIATE - Assists customers
const SALES_ASSOCIATE_PERMISSIONS = [
    'sales.view',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view',
];

// CUSTOMER SERVICE REP - Handles inquiries and returns
const CUSTOMER_SERVICE_REP_PERMISSIONS = [
    'sales.view',
    'products.view',
    'customers.create', 'customers.view', 'customers.edit',
    'payments.view',
    'refunds.process', 'refunds.view',
];

// ===== CAFE & RESTAURANT ROLES =====

// BARISTA - Cafe counter operations
const BARISTA_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view',
    'payments.process', 'payments.view',
    'discounts.apply',
    'cash.drawer.open',
];

// SERVER - Table service
const SERVER_PERMISSIONS = [
    'sales.create', 'sales.view.own', 'sales.edit',
    'products.view',
    'customers.create', 'customers.view',
    'payments.process', 'payments.view', 'payments.partial',
    'discounts.apply',
];

// KITCHEN STAFF - Kitchen display and orders
const KITCHEN_STAFF_PERMISSIONS = [
    'sales.view',
    'products.view',
    'inventory.view',
];

// HEAD CHEF - Kitchen management
const HEAD_CHEF_PERMISSIONS = [
    'sales.view',
    'products.view', 'products.edit',
    'inventory.view', 'inventory.adjust', 'inventory.receive',
    'reports.inventory',
];

// ===== BAR ROLES =====

// BAR MANAGER - Bar operations
const BAR_MANAGER_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    'products.view', 'products.edit', 'products.pricing',
    'inventory.view', 'inventory.adjust', 'inventory.receive',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    'reports.sales.daily', 'reports.sales.detailed', 'reports.inventory',
    'users.view',
];

// BARTENDER - Bar sales
const BARTENDER_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view',
    'payments.process', 'payments.view', 'payments.partial',
    'discounts.apply',
    'cash.drawer.open', 'cash.count',
];

// HOST - Reservations and seating
const HOST_PERMISSIONS = [
    'sales.view',
    'customers.create', 'customers.view', 'customers.edit',
];

// ===== PHARMACY ROLES =====

// PHARMACIST - Full dispensing access
const PHARMACIST_PERMISSIONS = [
    'sales.create', 'sales.view', 'sales.edit',
    'products.view', 'products.edit',
    'inventory.view', 'inventory.adjust',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    'refunds.process', 'refunds.view',
    'discounts.apply',
    'cash.drawer.open', 'cash.count',
    'reports.sales.daily', 'reports.inventory',
];

// PHARMACY MANAGER - Pharmacy operations
const PHARMACY_MANAGER_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    'users.create', 'users.view', 'users.edit',
    'settings.shop.manage',
];

// PHARMACY TECHNICIAN - Assists pharmacist
const PHARMACY_TECHNICIAN_PERMISSIONS = [
    'sales.create', 'sales.view',
    'products.view',
    'inventory.view', 'inventory.receive',
    'customers.view',
    'payments.process', 'payments.view',
    'cash.drawer.open',
];

// PHARMACY ASSISTANT - Front store
const PHARMACY_ASSISTANT_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'inventory.view',
    'customers.create', 'customers.view',
    'payments.process', 'payments.view',
    'discounts.apply',
    'cash.drawer.open',
];

// ===== RETAIL SHOP ROLES =====

// FLOOR MANAGER - Shop floor operations
const FLOOR_MANAGER_PERMISSIONS = [
    'sales.create', 'sales.view', 'sales.edit',
    'products.view', 'products.edit', 'products.pricing',
    'inventory.view', 'inventory.adjust',
    'customers.create', 'customers.view', 'customers.edit',
    ...ALL_PAYMENT_PERMISSIONS,
    'refunds.process', 'refunds.view',
    ...ALL_DISCOUNT_PERMISSIONS,
    'cash.drawer.open', 'cash.count',
    'reports.sales.daily',
    'users.view',
];

// MERCHANDISER - Product displays and pricing
const MERCHANDISER_PERMISSIONS = [
    'products.view', 'products.edit', 'products.pricing',
    'inventory.view',
];

// DELIVERY STAFF - Order deliveries
const DELIVERY_STAFF_PERMISSIONS = [
    'sales.view',
    'customers.view',
];

// ===== SMALL BUSINESS ROLES =====

// OWNER OPERATOR - Single person shop (full access)
const OWNER_OPERATOR_PERMISSIONS = [
    ...ALL_SALES_PERMISSIONS,
    ...ALL_PRODUCT_PERMISSIONS,
    ...ALL_INVENTORY_PERMISSIONS,
    ...ALL_CUSTOMER_PERMISSIONS,
    ...ALL_PAYMENT_PERMISSIONS,
    ...ALL_REFUND_PERMISSIONS,
    ...ALL_DISCOUNT_PERMISSIONS,
    ...ALL_CASH_PERMISSIONS,
    ...ALL_REPORT_PERMISSIONS,
    ...ALL_USER_PERMISSIONS,
    ...ALL_SETTINGS_PERMISSIONS,
];

// PART TIME STAFF - Limited access
const PART_TIME_STAFF_PERMISSIONS = [
    'sales.create', 'sales.view.own',
    'products.view',
    'customers.view',
    'payments.process', 'payments.view',
    'cash.drawer.open',
];

// ===== AUDIT & COMPLIANCE ROLES =====

// AUDITOR - Full read-only for audits
const AUDITOR_PERMISSIONS = [
    'sales.view',
    'products.view',
    'inventory.view',
    'customers.view',
    'payments.view',
    'refunds.view',
    ...ALL_REPORT_PERMISSIONS,
    'system.logs.view',
];

// COMPLIANCE OFFICER - Compliance monitoring
const COMPLIANCE_OFFICER_PERMISSIONS = [
    'sales.view',
    'products.view',
    'inventory.view',
    'customers.view',
    'payments.view',
    'refunds.view',
    ...ALL_REPORT_PERMISSIONS,
    'system.logs.view',
    'users.view',
];

// VIEWER - Basic read-only
const VIEWER_PERMISSIONS = [
    'sales.view',
    'products.view',
    'inventory.view',
    'customers.view',
    'payments.view',
    'reports.sales.daily',
];

// REPORT VIEWER - Reports only
const REPORT_VIEWER_PERMISSIONS = [
    ...ALL_REPORT_PERMISSIONS,
];

// ===== EXTERNAL/INTEGRATION ROLES =====

// API USER - External integrations
const API_USER_PERMISSIONS = [
    'sales.view',
    'products.view',
    'inventory.view',
    'customers.view',
];

// KIOSK - Self-service terminal
const KIOSK_PERMISSIONS = [
    'sales.create',
    'products.view',
    'customers.create',
    'payments.process',
];

// =====================================================
// COMBINE ALL ROLE PERMISSIONS
// =====================================================
const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
    // System-level
    ...createRolePermissions('super-admin', SUPER_ADMIN_PERMISSIONS),
    ...createRolePermissions('support-admin', SUPPORT_ADMIN_PERMISSIONS),

    // Tenant-level
    ...createRolePermissions('tenant-owner', TENANT_OWNER_PERMISSIONS),
    ...createRolePermissions('admin', ADMIN_PERMISSIONS),
    ...createRolePermissions('operations-director', OPERATIONS_DIRECTOR_PERMISSIONS),

    // Location/Branch-level
    ...createRolePermissions('branch-manager', BRANCH_MANAGER_PERMISSIONS),
    ...createRolePermissions('assistant-manager', ASSISTANT_MANAGER_PERMISSIONS),
    ...createRolePermissions('manager', MANAGER_PERMISSIONS),
    ...createRolePermissions('shift-supervisor', SHIFT_SUPERVISOR_PERMISSIONS),
    ...createRolePermissions('team-lead', TEAM_LEAD_PERMISSIONS),

    // Financial
    ...createRolePermissions('finance-manager', FINANCE_MANAGER_PERMISSIONS),
    ...createRolePermissions('accountant', ACCOUNTANT_PERMISSIONS),
    ...createRolePermissions('bookkeeper', BOOKKEEPER_PERMISSIONS),

    // Inventory & Supply Chain
    ...createRolePermissions('inventory-manager', INVENTORY_MANAGER_PERMISSIONS),
    ...createRolePermissions('warehouse-supervisor', WAREHOUSE_SUPERVISOR_PERMISSIONS),
    ...createRolePermissions('stock-clerk', STOCK_CLERK_PERMISSIONS),
    ...createRolePermissions('purchasing-officer', PURCHASING_OFFICER_PERMISSIONS),

    // Sales & Customer Service
    ...createRolePermissions('sales-manager', SALES_MANAGER_PERMISSIONS),
    ...createRolePermissions('senior-cashier', SENIOR_CASHIER_PERMISSIONS),
    ...createRolePermissions('cashier', CASHIER_PERMISSIONS),
    ...createRolePermissions('trainee-cashier', TRAINEE_CASHIER_PERMISSIONS),
    ...createRolePermissions('sales-associate', SALES_ASSOCIATE_PERMISSIONS),
    ...createRolePermissions('customer-service-rep', CUSTOMER_SERVICE_REP_PERMISSIONS),

    // Cafe & Restaurant
    ...createRolePermissions('barista', BARISTA_PERMISSIONS),
    ...createRolePermissions('server', SERVER_PERMISSIONS),
    ...createRolePermissions('kitchen-staff', KITCHEN_STAFF_PERMISSIONS),
    ...createRolePermissions('head-chef', HEAD_CHEF_PERMISSIONS),

    // Bar
    ...createRolePermissions('bar-manager', BAR_MANAGER_PERMISSIONS),
    ...createRolePermissions('bartender', BARTENDER_PERMISSIONS),
    ...createRolePermissions('host', HOST_PERMISSIONS),

    // Pharmacy
    ...createRolePermissions('pharmacist', PHARMACIST_PERMISSIONS),
    ...createRolePermissions('pharmacy-manager', PHARMACY_MANAGER_PERMISSIONS),
    ...createRolePermissions('pharmacy-technician', PHARMACY_TECHNICIAN_PERMISSIONS),
    ...createRolePermissions('pharmacy-assistant', PHARMACY_ASSISTANT_PERMISSIONS),

    // Retail Shop
    ...createRolePermissions('floor-manager', FLOOR_MANAGER_PERMISSIONS),
    ...createRolePermissions('merchandiser', MERCHANDISER_PERMISSIONS),
    ...createRolePermissions('delivery-staff', DELIVERY_STAFF_PERMISSIONS),

    // Small Business
    ...createRolePermissions('owner-operator', OWNER_OPERATOR_PERMISSIONS),
    ...createRolePermissions('part-time-staff', PART_TIME_STAFF_PERMISSIONS),

    // Audit & Compliance
    ...createRolePermissions('auditor', AUDITOR_PERMISSIONS),
    ...createRolePermissions('compliance-officer', COMPLIANCE_OFFICER_PERMISSIONS),
    ...createRolePermissions('viewer', VIEWER_PERMISSIONS),
    ...createRolePermissions('report-viewer', REPORT_VIEWER_PERMISSIONS),

    // External/Integration
    ...createRolePermissions('api-user', API_USER_PERMISSIONS),
    ...createRolePermissions('kiosk', KIOSK_PERMISSIONS),
];

export async function seedRolePermissions(prisma: PrismaClient) {
    console.log('📝 Seeding role permissions...');

    // Group permissions by role for efficient processing
    const permissionsByRole: Record<string, string[]> = {};

    DEFAULT_ROLE_PERMISSIONS.forEach(rolePermission => {
        const { roleId, permissionId } = rolePermission;
        if (!permissionsByRole[roleId]) {
            permissionsByRole[roleId] = [];
        }
        // Avoid duplicates
        if (!permissionsByRole[roleId].includes(permissionId)) {
            permissionsByRole[roleId].push(permissionId);
        }
    });

    let totalCreated = 0;
    for (const [roleId, permissionIds] of Object.entries(permissionsByRole)) {
        console.log(`  → Assigning ${permissionIds.length} permissions to ${roleId}...`);

        for (const permissionId of permissionIds) {
            const rolePermissionId = `${roleId}-${permissionId}`;

            await prisma.rolePermission.upsert({
                where: { rolePermissionId },
                update: {},
                create: {
                    rolePermissionId,
                    roleId: roleId,
                    permissionId: permissionId,
                },
            });
            totalCreated++;
        }
    }

    console.log(`✓ Role permissions seeded (${totalCreated} assignments across ${Object.keys(permissionsByRole).length} roles)`);
}