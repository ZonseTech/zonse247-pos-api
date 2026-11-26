import { assertValidPermissionIds } from "./permissions";

const definePermissionGroup = (
    groupName: string,
    permissionIds: string[],
): string[] => {
    assertValidPermissionIds(permissionIds, `permission group ${groupName}`);
    return permissionIds;
};

export const ALL_SALES_PERMISSIONS = definePermissionGroup("ALL_SALES_PERMISSIONS", [
    "sales.create", "sales.view", "sales.edit", "sales.void",
]);

export const ALL_SALES_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_SALES_EXTENDED_PERMISSIONS", [
    "sales.return", "sales.hold", "sales.layaway",
]);

export const ALL_PRODUCT_PERMISSIONS = definePermissionGroup("ALL_PRODUCT_PERMISSIONS", [
    "products.create", "products.view", "products.edit", "products.delete", "products.pricing",
]);

export const ALL_PRODUCT_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_PRODUCT_EXTENDED_PERMISSIONS", [
    "products.import", "products.export",
]);

export const ALL_CATEGORY_PERMISSIONS = definePermissionGroup("ALL_CATEGORY_PERMISSIONS", [
    "categories.create", "categories.view", "categories.edit", "categories.delete",
]);

export const ALL_INVENTORY_PERMISSIONS = definePermissionGroup("ALL_INVENTORY_PERMISSIONS", [
    "inventory.view", "inventory.adjust", "inventory.transfer", "inventory.receive",
]);

export const ALL_INVENTORY_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_INVENTORY_EXTENDED_PERMISSIONS", [
    "inventory.count", "inventory.reorder", "inventory.waste",
]);

export const ALL_CUSTOMER_PERMISSIONS = definePermissionGroup("ALL_CUSTOMER_PERMISSIONS", [
    "customers.create", "customers.view", "customers.edit", "customers.delete",
]);

export const ALL_CUSTOMER_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_CUSTOMER_EXTENDED_PERMISSIONS", [
    "customers.credit", "customers.loyalty",
]);

export const ALL_PAYMENT_PERMISSIONS = definePermissionGroup("ALL_PAYMENT_PERMISSIONS", [
    "payments.process", "payments.view", "payments.partial",
]);

export const ALL_PAYMENT_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_PAYMENT_EXTENDED_PERMISSIONS", [
    "payments.credit", "payments.split",
]);

export const ALL_REFUND_PERMISSIONS = definePermissionGroup("ALL_REFUND_PERMISSIONS", [
    "refunds.process", "refunds.view", "refunds.approve",
]);

export const ALL_REFUND_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_REFUND_EXTENDED_PERMISSIONS", [
    "refunds.void",
]);

export const ALL_DISCOUNT_PERMISSIONS = definePermissionGroup("ALL_DISCOUNT_PERMISSIONS", [
    "discounts.apply", "discounts.create", "discounts.override",
]);

export const ALL_DISCOUNT_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_DISCOUNT_EXTENDED_PERMISSIONS", [
    "discounts.edit", "discounts.delete", "discounts.manual",
]);

export const ALL_PROMOTION_PERMISSIONS = definePermissionGroup("ALL_PROMOTION_PERMISSIONS", [
    "promotions.create", "promotions.view", "promotions.edit", "promotions.delete",
]);

export const ALL_CASH_PERMISSIONS = definePermissionGroup("ALL_CASH_PERMISSIONS", [
    "cash.drawer.open", "cash.count", "cash.deposit",
]);

export const ALL_CASH_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_CASH_EXTENDED_PERMISSIONS", [
    "cash.payout", "cash.float", "cash.close",
]);

export const ALL_EXPENSE_PERMISSIONS = definePermissionGroup("ALL_EXPENSE_PERMISSIONS", [
    "expenses.create", "expenses.view", "expenses.approve", "expenses.void", "expenses.manage_categories",
]);

export const MANAGER_EXPENSE_PERMISSIONS = definePermissionGroup("MANAGER_EXPENSE_PERMISSIONS", [
    "expenses.create", "expenses.view", "expenses.approve",
]);

export const BASIC_EXPENSE_PERMISSIONS = definePermissionGroup("BASIC_EXPENSE_PERMISSIONS", [
    "expenses.create", "expenses.view",
]);

export const ALL_REPORT_PERMISSIONS = definePermissionGroup("ALL_REPORT_PERMISSIONS", [
    "reports.sales.daily", "reports.sales.detailed", "reports.inventory", "reports.financial",
]);

export const ALL_REPORT_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_REPORT_EXTENDED_PERMISSIONS", [
    "reports.staff", "reports.customers", "reports.taxes", "reports.export",
]);

export const ALL_ANALYTICS_PERMISSIONS = definePermissionGroup("ALL_ANALYTICS_PERMISSIONS", [
    "analytics.view", "analytics.advanced",
]);

export const ALL_USER_PERMISSIONS = definePermissionGroup("ALL_USER_PERMISSIONS", [
    "users.create", "users.view", "users.edit", "users.delete", "users.roles.assign",
]);

export const ALL_USER_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_USER_EXTENDED_PERMISSIONS", [
    "users.permissions.view", "users.clock",
]);

export const ALL_SETTINGS_PERMISSIONS = definePermissionGroup("ALL_SETTINGS_PERMISSIONS", [
    "settings.branch.manage", "settings.tax.manage", "settings.payment.manage",
]);

export const ALL_SETTINGS_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_SETTINGS_EXTENDED_PERMISSIONS", [
    "settings.receipt.manage", "settings.loyalty.manage", "settings.navigation.manage",
]);

export const ALL_SYSTEM_PERMISSIONS = definePermissionGroup("ALL_SYSTEM_PERMISSIONS", [
    "system.admin", "system.backup", "system.logs.view",
]);

export const ALL_SYSTEM_EXTENDED_PERMISSIONS = definePermissionGroup("ALL_SYSTEM_EXTENDED_PERMISSIONS", [
    "system.restore", "system.maintenance",
]);

export const ALL_ROLE_PERMISSIONS = definePermissionGroup("ALL_ROLE_PERMISSIONS", [
    "roles.view", "roles.create", "roles.edit", "roles.delete",
]);

export const ALL_BRANCH_PERMISSIONS = definePermissionGroup("ALL_BRANCH_PERMISSIONS", [
    "branches.view", "branches.create", "branches.edit", "branches.delete", "branches.status.manage",
]);

export const OWN_BRANCH_PERMISSIONS = definePermissionGroup("OWN_BRANCH_PERMISSIONS", [
    "branches.view", "branches.edit.own",
]);

export const ALL_TERMINAL_PERMISSIONS = definePermissionGroup("ALL_TERMINAL_PERMISSIONS", [
    "terminals.view", "terminals.create", "terminals.edit", "terminals.delete",
]);

export const ALL_SUPPLIER_PERMISSIONS = definePermissionGroup("ALL_SUPPLIER_PERMISSIONS", [
    "suppliers.create", "suppliers.view", "suppliers.edit", "suppliers.delete", "suppliers.orders",
]);

export const ALL_SUBSCRIPTION_AND_BILLING_PERMISSIONS = definePermissionGroup("ALL_SUBSCRIPTION_AND_BILLING_PERMISSIONS", [
    "subscriptions.view", "subscriptions.manage", "billing.view", "billing.manage",
]);

export const ALL_INTEGRATION_AND_API_PERMISSIONS = definePermissionGroup("ALL_INTEGRATION_AND_API_PERMISSIONS", [
    "integrations.view", "integrations.manage", "api.access", "api.keys.manage",
]);

export const ALL_DELIVERY_PERMISSIONS = definePermissionGroup("ALL_DELIVERY_PERMISSIONS", [
    "delivery.view", "delivery.manage", "delivery.status",
]);

export const ALL_AGE_VERIFICATION_PERMISSIONS = definePermissionGroup("ALL_AGE_VERIFICATION_PERMISSIONS", [
    "age.verify", "age.override",
]);

export const ALL_PHARMACY_PERMISSIONS = definePermissionGroup("ALL_PHARMACY_PERMISSIONS", [
    "pharmacy.dispense", "pharmacy.prescriptions", "pharmacy.controlled", "pharmacy.counseling",
]);

export const ALL_EXPORT_PERMISSIONS = definePermissionGroup("ALL_EXPORT_PERMISSIONS", [
    "exports.data", "exports.reports",
]);

export const ALL_SUPPORT_PERMISSIONS = definePermissionGroup("ALL_SUPPORT_PERMISSIONS", [
    "support.tickets.create", "support.tickets.view",
]);

export const BASIC_VIEW_PERMISSIONS = definePermissionGroup("BASIC_VIEW_PERMISSIONS", [
    "sales.view", "products.view", "inventory.view", "customers.view", "payments.view",
]);

export const BASIC_CASHIER_PERMISSIONS = definePermissionGroup("BASIC_CASHIER_PERMISSIONS", [
    "sales.create", "sales.view.own",
    "products.view",
    "inventory.view",
    "customers.create", "customers.view",
    "payments.process", "payments.view",
    "discounts.apply",
    "cash.drawer.open",
]);
