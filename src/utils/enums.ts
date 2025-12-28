export const ClientType = {
    WEB: 'web',
    MOBILE: 'mobile',
    DESKTOP: 'desktop',
} as const;

export const PermissionScope = {
    USER: 'user',
    GLOBAL: 'global',
    TENANT: 'tenant',
    BRANCH: 'branch',
    TERMINAL: 'terminal',
    SELF: 'self',
} as const;

export const PermissionCategory = {
    // Core POS Operations
    SALES: 'sales',
    PRODUCTS: 'products',
    INVENTORY: 'inventory',
    CUSTOMERS: 'customers',

    // Financial Management
    PAYMENTS: 'payments',
    REFUNDS: 'refunds',
    DISCOUNTS: 'discounts',
    TAXES: 'taxes',
    CASH_MANAGEMENT: 'cash_management',

    // Reporting & Analytics
    REPORTS: 'reports',
    ANALYTICS: 'analytics',
    EXPORTS: 'exports',

    // User & Access Management
    USERS: 'users',
    ROLES: 'roles',
    PERMISSIONS: 'permissions',

    // System Configuration
    SETTINGS: 'settings',
    SYSTEM: 'system',
    BRANCHES: 'branches',
    TERMINALS: 'terminals',

    // Business Management
    SUPPLIERS: 'suppliers',
    CATEGORIES: 'categories',
    BRANDS: 'brands',
    PROMOTIONS: 'promotions',

    // Subscription & Billing
    SUBSCRIPTIONS: 'subscriptions',
    BILLING: 'billing',

    // Integration & API
    INTEGRATIONS: 'integrations',
    API: 'api',

    // Maintenance & Support
    MAINTENANCE: 'maintenance',
    SUPPORT: 'support',
    LOGS: 'logs',
} as const;

export type ClientTypeValue = typeof ClientType[keyof typeof ClientType];
export type PermissionScopeType = typeof PermissionScope[keyof typeof PermissionScope];
export type PermissionCategoryType = typeof PermissionCategory[keyof typeof PermissionCategory];
