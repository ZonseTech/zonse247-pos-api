/**
 * Table Fetch Configurations
 * Defines query configurations for each table in master data fetching
 */

import { InitialSyncTable, INT_ID_TABLES } from './constants';
import { TableConfig } from './types';

// ==========================================
// Table Configuration
// ==========================================

/**
 * Table configuration for optimized fetching
 * - idField: Primary key field for cursor pagination
 * - includeRelations: Related data to include (avoid N+1)
 * - selectFields: Fields to select (null = all)
 * - orderBy: Sort order for consistent pagination
 */
export const TABLE_CONFIG: Record<InitialSyncTable, TableConfig> = {
    districts: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    roles: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    permissions: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    rolePermissions: {
        idField: 'id',
        includeRelations: {
            permission: {
                select: {
                    permissionId: true,
                    name: true,
                    displayName: true,
                    description: true,
                    category: true,
                    scope: true,
                }
            },
            role: {
                select: {
                    roleId: true,
                    name: true,
                    displayName: true,
                }
            }
        },
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    subscriptionPlans: {
        idField: 'subscriptionPlanId',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    planFeatures: {
        idField: 'featureCategoryId',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    paymentMethods: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    paymentServiceProviders: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    categories: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    suppliers: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    customers: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    products: {
        idField: 'id',
        includeRelations: {
            category: true,
            variants: true,
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    productVariants: {
        idField: 'id',
        includeRelations: {
            barcodes: true,
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    productBarcodes: {
        idField: 'id',
        hasTenantScope: false,
        hasBranchScope: false,
        softDelete: false,
    },
    variantBarcodes: {
        idField: 'id',
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    inventory: {
        idField: 'id',
        includeRelations: {
            variant: {
                select: {
                    id: true,
                    productId: true,
                    variantName: true,
                    sku: true,
                    sellingPrice: true,
                    costPrice: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            },
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
    users: {
        idField: 'id',
        includeRelations: {
            role: true,
        },
        selectFields: {
            userId: true,
            tenantId: true,
            branchId: true,
            roleId: true,
            username: true,
            email: true,
            fullname: true,
            phone: true,
            pinCode: true,
            status: true,
            accessibleBranches: true,
            allowedTerminals: true,
            maxDiscountPercent: true,
            canOverridePrices: true,
            createdAt: true,
            updatedAt: true,
            // Exclude password for security
        },
        hasTenantScope: true,
        hasBranchScope: true,
        softDelete: true,
    },
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get table configuration
 */
export function getTableConfig(table: InitialSyncTable): TableConfig {
    return TABLE_CONFIG[table];
}

/**
 * Check if table uses integer primary key
 */
export function hasIntegerId(table: InitialSyncTable): boolean {
    return INT_ID_TABLES.includes(table);
}

/**
 * Parse cursor to appropriate type for the table
 */
export function parseCursor(table: InitialSyncTable, cursor: string): string | number {
    if (hasIntegerId(table)) {
        const parsed = parseInt(cursor, 10);
        if (isNaN(parsed)) {
            throw new Error(`Invalid cursor for table ${table}: expected integer`);
        }
        return parsed;
    }
    return cursor;
}

/**
 * Tables that should filter by isActive status
 */
export const ACTIVE_FILTER_TABLES: InitialSyncTable[] = [
    'paymentMethods',
    'categories',
    'subscriptionPlans',
];

/**
 * Check if table should filter by isActive status
 */
export function shouldFilterByActive(table: InitialSyncTable): boolean {
    return ACTIVE_FILTER_TABLES.includes(table);
}
