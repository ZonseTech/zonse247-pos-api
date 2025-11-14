export enum PermissionScope {
    USER = 'user',
    GLOBAL = 'global',
    CLIENT = 'client',
    SHOP = 'shop',
    WORKSTATION = 'workstation',
    SELF = 'self'
}

export enum PermissionCategory {
    // Core POS Operations
    SALES = 'sales',
    PRODUCTS = 'products',
    INVENTORY = 'inventory',
    CUSTOMERS = 'customers',

    // Financial Management
    PAYMENTS = 'payments',
    REFUNDS = 'refunds',
    DISCOUNTS = 'discounts',
    TAXES = 'taxes',
    CASH_MANAGEMENT = 'cash_management',

    // Reporting & Analytics
    REPORTS = 'reports',
    ANALYTICS = 'analytics',
    EXPORTS = 'exports',

    // User & Access Management
    USERS = 'users',
    ROLES = 'roles',
    PERMISSIONS = 'permissions',

    // System Configuration
    SETTINGS = 'settings',
    SYSTEM = 'system',
    SHOPS = 'shops',
    WORKSTATIONS = 'workstations',

    // Business Management
    SUPPLIERS = 'suppliers',
    CATEGORIES = 'categories',
    BRANDS = 'brands',
    PROMOTIONS = 'promotions',

    // Subscription & Billing
    SUBSCRIPTIONS = 'subscriptions',
    BILLING = 'billing',

    // Integration & API
    INTEGRATIONS = 'integrations',
    API = 'api',

    // Maintenance & Support
    MAINTENANCE = 'maintenance',
    SUPPORT = 'support',
    LOGS = 'logs'
}