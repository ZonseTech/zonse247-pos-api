/**
 * Table Sync Configurations
 * Defines transformation and sync configurations for each table
 */

import prisma from '../../databases/prisma/client';
import { OnboardingParams, TableSyncResult } from './types';
import {
    syncTableRecords,
    createEmptyTableSyncResult,
    parseNumeric,
    parseBoolean,
    toDisplayName,
} from './base-sync.service';
import { DEFAULTS } from './constants';

// ==========================================
// Type Definitions
// ==========================================

type RecordAny = Record<string, unknown>;

interface TableSyncHandler {
    sync: (records: unknown[], params: OnboardingParams) => Promise<TableSyncResult>;
}

// ==========================================
// System Tables (No Tenant/Branch Scope)
// ==========================================

const districtsSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        const result = createEmptyTableSyncResult('districts');

        for (const record of records as RecordAny[]) {
            try {
                const districtId = record.districtId as string;
                if (!districtId) {
                    result.failed++;
                    result.errors.push('District: Missing required districtId field');
                    continue;
                }

                const existingById = await prisma.district.findUnique({ where: { districtId } });
                const code = (record.code as string) || null;
                const existingByCode = code
                    ? await prisma.district.findUnique({ where: { code } })
                    : null;

                if (existingById || existingByCode) {
                    result.skipped++;
                } else {
                    await prisma.district.create({
                        data: {
                            districtId,
                            name: record.name as string,
                            code,
                            region: (record.region as string) || null,
                            isActive: parseBoolean(record.isActive, true),
                        },
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`District: ${(error as Error).message}`);
            }
        }

        result.success = result.failed === 0;
        return result;
    },
};

const rolesSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.roleId as string,
                findExisting: (id) => prisma.role.findUnique({ where: { roleId: id } }),
                transformForCreate: (r) => ({
                    roleId: r.roleId,
                    name: r.name,
                    displayName: r.displayName || toDisplayName(r.name as string),
                    description: r.description || null,
                    isActive: parseBoolean(r.isActive, true),
                }),
                create: (data: any) => prisma.role.create({ data }),
            },
            'roles'
        );
    },
};

const permissionsSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.permissionId as string,
                findExisting: (id) => prisma.permission.findUnique({ where: { permissionId: id } }),
                transformForCreate: (r) => ({
                    permissionId: r.permissionId,
                    name: r.name,
                    displayName: r.displayName || r.name,
                    description: r.description || null,
                    category: r.category || 'general',
                    scope: r.scope || 'branch',
                    isSystemPermission: parseBoolean(r.isSystemPermission, true),
                }),
                create: (data: any) => prisma.permission.create({ data }),
            },
            'permissions'
        );
    },
};

const rolePermissionsSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        const result = createEmptyTableSyncResult('rolePermissions');

        for (const record of records as RecordAny[]) {
            try {
                const existing = await prisma.rolePermission.findFirst({
                    where: {
                        roleId: record.roleId as string,
                        permissionId: record.permissionId as string,
                    },
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.rolePermission.create({
                        data: {
                            rolePermissionId: record.rolePermissionId as string,
                            roleId: record.roleId as string,
                            permissionId: record.permissionId as string,
                        },
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`RolePermission: ${(error as Error).message}`);
            }
        }

        result.success = result.failed === 0;
        return result;
    },
};

const subscriptionPlansSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => (r.subscriptionPlanId || r.planId) as string,
                findExisting: (id) => prisma.subscriptionPlan.findUnique({ where: { subscriptionPlanId: id } }),
                transformForCreate: (r) => ({
                    subscriptionPlanId: r.subscriptionPlanId || r.planId,
                    planCode: r.planCode || (r.name as string)?.toUpperCase().replace(/\s+/g, '_'),
                    name: r.name,
                    description: r.description || null,
                    monthlyPrice: parseNumeric(r.monthlyPrice),
                    yearlyPrice: parseNumeric(r.yearlyPrice),
                    color: r.color || null,
                    isPopular: parseBoolean(r.isPopular || r.popular),
                    isActive: parseBoolean(r.isActive, true),
                    features: r.features || [],
                    limits: r.limits || {},
                    notes: r.notes || null,
                }),
                create: (data: any) => prisma.subscriptionPlan.create({ data }),
            },
            'subscriptionPlans'
        );
    },
};

const planFeaturesSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.featureCategoryId as string,
                findExisting: (id) => prisma.planFeature.findUnique({ where: { featureCategoryId: parseInt(id, 10) } }),
                transformForCreate: (r) => ({
                    title: r.title,
                    features: r.features || {},
                    displayOrder: r.displayOrder || 0,
                }),
                create: (data: any) => prisma.planFeature.create({ data }),
            },
            'planFeatures'
        );
    },
};

const paymentServiceProvidersSync: TableSyncHandler = {
    async sync(records: unknown[]): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.providerId as string,
                findExisting: (id) => prisma.paymentServiceProvider.findUnique({ where: { providerId: id } }),
                transformForCreate: (r) => ({
                    providerId: r.providerId,
                    userId: r.userId || 'system',
                    name: r.name,
                    type: r.type || 'bank',
                    description: r.description || null,
                    logoUrl: r.logoUrl || r.logo || null,
                    isActive: parseBoolean(r.isActive, true),
                    sortOrder: r.sortOrder || 0,
                }),
                create: (data: any) => prisma.paymentServiceProvider.create({ data }),
            },
            'paymentServiceProviders'
        );
    },
};

// ==========================================
// Tenant/Branch Scoped Tables
// ==========================================

const paymentMethodsSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.methodId as string,
                findExisting: (id) => prisma.paymentMethod.findUnique({ where: { methodId: id } }),
                transformForCreate: (r, p) => ({
                    methodId: r.methodId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    name: r.name,
                    icon: r.icon || null,
                    sortOrder: r.sortOrder || 0,
                    isActive: parseBoolean(r.isActive, true),
                }),
                create: (data: any) => prisma.paymentMethod.create({ data }),
            },
            'paymentMethods',
            params
        );
    },
};

const categoriesSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.categoryId as string,
                findExisting: (id) => prisma.category.findUnique({ where: { categoryId: id } }),
                transformForCreate: (r, p) => ({
                    categoryId: r.categoryId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    userId: r.userId || 'system',
                    name: r.name,
                    description: r.description || null,
                    sortOrder: r.sortOrder || 0,
                    color: r.color || null,
                    isActive: parseBoolean(r.isActive, true),
                }),
                create: (data: any) => prisma.category.create({ data }),
            },
            'categories',
            params
        );
    },
};

const suppliersSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => (r.id || r.supplierId) as string,
                findExisting: (id) => prisma.supplier.findUnique({ where: { id } }),
                transformForCreate: (r, p) => ({
                    id: r.id || r.supplierId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    name: r.name,
                    contactPerson: r.contactPerson || null,
                    email: r.email || null,
                    phone: r.phone || null,
                    address: r.address || null,
                    taxId: r.taxId || null,
                    isActive: parseBoolean(r.isActive, true),
                }),
                create: (data: any) => prisma.supplier.create({ data }),
            },
            'suppliers',
            params
        );
    },
};

const customersSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.customerId as string,
                findExisting: (id) => prisma.customer.findUnique({ where: { customerId: id } }),
                transformForCreate: (r, p) => ({
                    customerId: r.customerId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    name: r.name,
                    email: r.email || null,
                    phone: r.phone || null,
                    address: r.address || null,
                    isDefault: parseBoolean(r.isDefault),
                }),
                create: (data: any) => prisma.customer.create({ data }),
            },
            'customers',
            params
        );
    },
};

const productsSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => (r.id || r.productId) as string,
                findExisting: (id) => prisma.product.findUnique({ where: { id } }),
                transformForCreate: (r, p) => ({
                    id: r.id || r.productId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    categoryId: r.categoryId || null,
                    name: r.name,
                    description: r.description || null,
                    brand: r.brand || null,
                    isTaxable: parseBoolean(r.isTaxable, true),
                    supplierName: r.supplierName || null,
                    supplierCode: r.supplierCode || null,
                    defaultUnit: r.defaultUnit || r.unit || DEFAULTS.UNIT,
                    imageUrl: r.imageUrl || null,
                    isActive: parseBoolean(r.isActive, true),
                }),
                create: (data: any) => prisma.product.create({ data }),
            },
            'products',
            params
        );
    },
};

const productVariantsSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => (r.id || r.variantId) as string,
                findExisting: (id) => prisma.productVariant.findUnique({ where: { id } }),
                transformForCreate: (r, p) => ({
                    id: r.id || r.variantId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    productId: r.productId,
                    sku: r.sku || null,
                    variantName: r.variantName || r.name || 'Default',
                    primaryBarcode: r.primaryBarcode || null,
                    sellingPrice: parseNumeric(r.sellingPrice || r.price),
                    costPrice: parseNumeric(r.costPrice),
                    unit: r.unit || DEFAULTS.UNIT,
                    description: r.description || null,
                    brand: r.brand || null,
                    imageUrl: r.imageUrl || null,
                    isTaxable: r.isTaxable !== undefined ? parseBoolean(r.isTaxable) : null,
                    isDefault: parseBoolean(r.isDefault),
                    isActive: parseBoolean(r.isActive, true),
                }),
                create: (data: any) => prisma.productVariant.create({ data }),
            },
            'productVariants',
            params
        );
    },
};

const productBarcodesSync: TableSyncHandler = {
    async sync(records: unknown[], _params: OnboardingParams): Promise<TableSyncResult> {
        const result = createEmptyTableSyncResult('productBarcodes');

        for (const record of records as RecordAny[]) {
            try {
                const barcode = record.barcode as string;
                if (!barcode) {
                    result.failed++;
                    result.errors.push('ProductBarcode: Missing barcode field');
                    continue;
                }

                const existing = await prisma.productBarcode.findUnique({
                    where: { barcode },
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.productBarcode.create({
                        data: {
                            productId: record.productId as string,
                            barcode,
                            isPrimary: parseBoolean(record.isPrimary),
                        },
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`ProductBarcode: ${(error as Error).message}`);
            }
        }

        result.success = result.failed === 0;
        return result;
    },
};

const variantBarcodesSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => (r.id || r.barcodeId) as string,
                findExisting: (id) => prisma.variantBarcode.findUnique({ where: { id } }),
                transformForCreate: (r, p) => ({
                    id: r.id || r.barcodeId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    variantId: r.variantId,
                    barcode: r.barcode,
                    barcodeType: r.barcodeType || 'EAN13',
                    isPrimary: parseBoolean(r.isPrimary),
                }),
                create: (data: any) => prisma.variantBarcode.create({ data }),
            },
            'variantBarcodes',
            params
        );
    },
};

const inventorySync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        const result = createEmptyTableSyncResult('inventory');

        for (const record of records as RecordAny[]) {
            try {
                const inventoryId = (record.id || record.inventoryId) as string;
                if (!inventoryId) {
                    result.failed++;
                    result.errors.push('Inventory: Missing required ID field');
                    continue;
                }

                const existing = await prisma.inventory.findUnique({
                    where: { id: inventoryId },
                });

                if (existing) {
                    // Update inventory quantities for existing records
                    await prisma.inventory.update({
                        where: { id: inventoryId },
                        data: {
                            availableQuantity: parseNumeric(record.availableQuantity || record.quantity),
                            reservedQuantity: parseNumeric(record.reservedQuantity),
                            updatedAt: new Date(),
                        },
                    });
                    result.updated++;
                } else {
                    await prisma.inventory.create({
                        data: {
                            id: inventoryId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            productId: record.productId as string,
                            variantId: (record.variantId as string) || null,
                            availableQuantity: parseNumeric(record.availableQuantity || record.quantity),
                            reservedQuantity: parseNumeric(record.reservedQuantity),
                            damagedQuantity: parseNumeric(record.damagedQuantity),
                            averageCost: parseNumeric(record.averageCost),
                            lastPurchaseCost: parseNumeric(record.lastPurchaseCost),
                            reorderPoint: record.reorderPoint ? parseNumeric(record.reorderPoint) : null,
                            maxStock: record.maxStock || record.reorderQuantity ? parseNumeric(record.maxStock || record.reorderQuantity) : null,
                            trackInventory: parseBoolean(record.trackInventory, true),
                            allowNegativeStock: parseBoolean(record.allowNegativeStock),
                        },
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Inventory: ${(error as Error).message}`);
            }
        }

        result.success = result.failed === 0;
        return result;
    },
};

const usersSync: TableSyncHandler = {
    async sync(records: unknown[], params: OnboardingParams): Promise<TableSyncResult> {
        return syncTableRecords(
            records as RecordAny[],
            {
                getId: (r) => r.userId as string,
                findExisting: (id) => prisma.user.findUnique({ where: { userId: id } }),
                transformForCreate: (r, p) => ({
                    userId: r.userId,
                    tenantId: p?.tenantId,
                    branchId: p?.branchId,
                    roleId: r.roleId || null,
                    username: r.username,
                    email: r.email || null,
                    fullname: r.fullname || r.name || r.username,
                    phone: r.phone || null,
                    password: r.password || 'temporary-hash', // Password should be hashed before sync
                    pinCode: r.pinCode || null,
                    status: r.status || DEFAULTS.STATUS,
                    accessibleBranches: r.accessibleBranches || [],
                    allowedTerminals: r.allowedTerminals || [],
                    maxDiscountPercent: r.maxDiscountPercent ? parseNumeric(r.maxDiscountPercent) : null,
                    canOverridePrices: parseBoolean(r.canOverridePrices),
                }),
                create: (data: any) => prisma.user.create({ data }),
            },
            'users',
            params
        );
    },
};

// ==========================================
// Export Table Sync Handlers Map
// ==========================================

export const TABLE_SYNC_HANDLERS: Record<string, TableSyncHandler> = {
    districts: districtsSync,
    roles: rolesSync,
    permissions: permissionsSync,
    rolePermissions: rolePermissionsSync,
    subscriptionPlans: subscriptionPlansSync,
    planFeatures: planFeaturesSync,
    paymentMethods: paymentMethodsSync,
    paymentServiceProviders: paymentServiceProvidersSync,
    categories: categoriesSync,
    suppliers: suppliersSync,
    customers: customersSync,
    products: productsSync,
    productVariants: productVariantsSync,
    productBarcodes: productBarcodesSync,
    variantBarcodes: variantBarcodesSync,
    inventory: inventorySync,
    users: usersSync,
};

/**
 * Sync a single table using the appropriate handler
 */
export async function syncTable(
    table: string,
    records: unknown[],
    params: OnboardingParams
): Promise<TableSyncResult> {
    const handler = TABLE_SYNC_HANDLERS[table];

    if (!handler) {
        return {
            table,
            success: false,
            inserted: 0,
            updated: 0,
            skipped: 0,
            failed: records.length,
            errors: [`Unknown table: ${table}`],
        };
    }

    return handler.sync(records, params);
}
