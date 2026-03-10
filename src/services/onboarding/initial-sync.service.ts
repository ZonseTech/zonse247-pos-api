import prisma from '../../databases/prisma/client';
import type { OnboardingStepType } from 'on-boarding';

/**
 * Master data tables in dependency order (parent tables first)
 */
export const INITIAL_SYNC_TABLES = [
    'districts',
    'roles',
    'permissions',
    'rolePermissions',
    'subscriptionPlans',
    'planFeatures',
    'paymentMethods',
    'paymentServiceProviders',
    'categories',
    'suppliers',
    'customers',
    'products',
    'productVariants',
    'productBarcodes',
    'variantBarcodes',
    'inventory',
    'users',
] as const;

export type InitialSyncTable = typeof INITIAL_SYNC_TABLES[number];

/**
 * Mapping of onboarding step types to sync tables
 */
export const STEP_TO_TABLES_MAP: Record<string, InitialSyncTable[]> = {
    'SUBSCRIPTION_PLANS_SYNC': ['subscriptionPlans', 'planFeatures'],
    'PAYMENT_METHODS_SYNC': ['paymentMethods'],
    'PAYMENT_PROVIDERS_SYNC': ['paymentServiceProviders'],
    'CATEGORIES_SYNC': ['categories'],
    'CUSTOMERS_SYNC': ['customers'],
    'PRODUCTS_SYNC': ['products', 'productVariants', 'productBarcodes', 'variantBarcodes'],
    'INVENTORY_SYNC': ['inventory'],
    'USERS_SYNC': ['users', 'roles', 'permissions', 'rolePermissions'],
    'SETTINGS_SYNC': ['districts'],
};

export interface InitialSyncParams {
    tenantId: string;
    branchId: string;
    terminalId: string;
}

export interface TableSyncResult {
    table: string;
    success: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
}

export interface InitialSyncResult {
    success: boolean;
    tables: TableSyncResult[];
    summary: {
        totalTables: number;
        successfulTables: number;
        failedTables: number;
        totalRecords: number;
        insertedRecords: number;
        skippedRecords: number;
        failedRecords: number;
    };
    errors: string[];
    completedAt: Date;
}

export interface PullDataParams extends InitialSyncParams {
    tables?: InitialSyncTable[];
    batchSize?: number;
}

/**
 * @class   InitialSyncService
 * @desc    Handles initial master data sync from cloud to local Electron app
 *          Used during onboarding after terminal activation
 */
export class InitialSyncService {
    private static readonly DEFAULT_BATCH_SIZE = 500;

    /**
     * Pull all master data from cloud server for initial sync
     * This is called by the Electron app after terminal activation
     * The data comes from the request body (fetched by client from cloud)
     */
    static async syncMasterData(
        params: InitialSyncParams,
        data: Record<string, unknown[]>
    ): Promise<InitialSyncResult> {
        const result: InitialSyncResult = {
            success: true,
            tables: [],
            summary: {
                totalTables: 0,
                successfulTables: 0,
                failedTables: 0,
                totalRecords: 0,
                insertedRecords: 0,
                skippedRecords: 0,
                failedRecords: 0,
            },
            errors: [],
            completedAt: new Date(),
        };

        // Process tables in dependency order
        for (const table of INITIAL_SYNC_TABLES) {
            if (!data[table] || !Array.isArray(data[table])) {
                continue;
            }

            result.summary.totalTables++;
            const tableResult = await this.syncTable(table, data[table], params);
            result.tables.push(tableResult);

            if (tableResult.success) {
                result.summary.successfulTables++;
            } else {
                result.summary.failedTables++;
                result.success = false;
            }

            result.summary.totalRecords += tableResult.inserted + tableResult.skipped + tableResult.failed;
            result.summary.insertedRecords += tableResult.inserted;
            result.summary.skippedRecords += tableResult.skipped;
            result.summary.failedRecords += tableResult.failed;
            result.errors.push(...tableResult.errors);
        }

        result.completedAt = new Date();
        return result;
    }

    /**
     * Sync a specific onboarding step's tables
     */
    static async syncStepTables(
        stepType: OnboardingStepType,
        params: InitialSyncParams,
        data: Record<string, unknown[]>
    ): Promise<InitialSyncResult> {
        const tablesToSync = STEP_TO_TABLES_MAP[stepType] || [];
        const filteredData: Record<string, unknown[]> = {};

        for (const table of tablesToSync) {
            if (data[table]) {
                filteredData[table] = data[table];
            }
        }

        return this.syncMasterData(params, filteredData);
    }

    /**
     * Sync a single table with upsert pattern (insert or skip if exists)
     */
    private static async syncTable(
        table: InitialSyncTable,
        records: unknown[],
        params: InitialSyncParams
    ): Promise<TableSyncResult> {
        const result: TableSyncResult = {
            table,
            success: true,
            inserted: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            errors: [],
        };

        if (!records || records.length === 0) {
            return result;
        }

        try {
            switch (table) {
                case 'districts':
                    await this.syncDistricts(records, result);
                    break;
                case 'roles':
                    await this.syncRoles(records, result);
                    break;
                case 'permissions':
                    await this.syncPermissions(records, result);
                    break;
                case 'rolePermissions':
                    await this.syncRolePermissions(records, result);
                    break;
                case 'subscriptionPlans':
                    await this.syncSubscriptionPlans(records, result);
                    break;
                case 'planFeatures':
                    await this.syncPlanFeatures(records, result);
                    break;
                case 'paymentMethods':
                    await this.syncPaymentMethods(records, params, result);
                    break;
                case 'paymentServiceProviders':
                    await this.syncPaymentServiceProviders(records, result);
                    break;
                case 'categories':
                    await this.syncCategories(records, params, result);
                    break;
                case 'suppliers':
                    await this.syncSuppliers(records, params, result);
                    break;
                case 'customers':
                    await this.syncCustomers(records, params, result);
                    break;
                case 'products':
                    await this.syncProducts(records, params, result);
                    break;
                case 'productVariants':
                    await this.syncProductVariants(records, params, result);
                    break;
                case 'productBarcodes':
                    await this.syncProductBarcodes(records, params, result);
                    break;
                case 'variantBarcodes':
                    await this.syncVariantBarcodes(records, params, result);
                    break;
                case 'inventory':
                    await this.syncInventory(records, params, result);
                    break;
                case 'users':
                    await this.syncUsers(records, params, result);
                    break;
                default:
                    result.errors.push(`Unknown table: ${table}`);
                    result.success = false;
            }
        } catch (error) {
            result.success = false;
            result.errors.push(`${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }

    // ==========================================
    // Individual Table Sync Methods
    // ==========================================

    private static async syncDistricts(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.district.findUnique({
                    where: { districtId: record.districtId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.district.create({
                        data: {
                            districtId: record.districtId,
                            name: record.name,
                            code: record.code || null,
                            region: record.region || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`District ${record.districtId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncRoles(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.role.findUnique({
                    where: { roleId: record.roleId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.role.create({
                        data: {
                            roleId: record.roleId,
                            name: record.name,
                            displayName: record.displayName || record.name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            description: record.description || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Role ${record.roleId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncPermissions(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.permission.findUnique({
                    where: { permissionId: record.permissionId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.permission.create({
                        data: {
                            permissionId: record.permissionId,
                            name: record.name,
                            displayName: record.displayName || record.name,
                            description: record.description || null,
                            category: record.category || 'general',
                            scope: record.scope || 'branch',
                            isSystemPermission: record.isSystemPermission ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Permission ${record.permissionId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncRolePermissions(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.rolePermission.findFirst({
                    where: {
                        roleId: record.roleId,
                        permissionId: record.permissionId
                    }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.rolePermission.create({
                        data: {
                            rolePermissionId: record.rolePermissionId,
                            roleId: record.roleId,
                            permissionId: record.permissionId,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`RolePermission: ${(error as Error).message}`);
            }
        }
    }

    private static async syncSubscriptionPlans(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const planId = record.subscriptionPlanId || record.planId;
                const existing = await prisma.subscriptionPlan.findUnique({
                    where: { subscriptionPlanId: planId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.subscriptionPlan.create({
                        data: {
                            subscriptionPlanId: planId,
                            planCode: record.planCode || record.name?.toUpperCase().replace(/\s+/g, '_'),
                            name: record.name,
                            description: record.description || null,
                            monthlyPrice: record.monthlyPrice ? parseFloat(String(record.monthlyPrice)) : 0,
                            yearlyPrice: record.yearlyPrice ? parseFloat(String(record.yearlyPrice)) : 0,
                            color: record.color || null,
                            isPopular: record.isPopular || record.popular || false,
                            isActive: record.isActive ?? true,
                            features: record.features || [],
                            limits: record.limits || {},
                            notes: record.notes || null,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`SubscriptionPlan: ${(error as Error).message}`);
            }
        }
    }

    private static async syncPlanFeatures(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.planFeature.findUnique({
                    where: { featureCategoryId: record.featureCategoryId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.planFeature.create({
                        data: {
                            title: record.title,
                            features: record.features || {},
                            displayOrder: record.displayOrder || 0,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`PlanFeature: ${(error as Error).message}`);
            }
        }
    }

    private static async syncPaymentMethods(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.paymentMethod.findUnique({
                    where: { methodId: record.methodId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.paymentMethod.create({
                        data: {
                            methodId: record.methodId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            name: record.name,
                            icon: record.icon || null,
                            sortOrder: record.sortOrder || 0,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`PaymentMethod ${record.methodId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncPaymentServiceProviders(records: unknown[], result: TableSyncResult): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.paymentServiceProvider.findUnique({
                    where: { providerId: record.providerId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.paymentServiceProvider.create({
                        data: {
                            providerId: record.providerId,
                            userId: record.userId || 'system',
                            name: record.name,
                            type: record.type || 'bank',
                            description: record.description || null,
                            logoUrl: record.logoUrl || record.logo || null,
                            isActive: record.isActive ?? true,
                            sortOrder: record.sortOrder || 0,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`PaymentServiceProvider: ${(error as Error).message}`);
            }
        }
    }

    private static async syncCategories(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.category.findUnique({
                    where: { categoryId: record.categoryId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.category.create({
                        data: {
                            categoryId: record.categoryId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            userId: record.userId || 'system',
                            name: record.name,
                            description: record.description || null,
                            sortOrder: record.sortOrder || 0,
                            color: record.color || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Category ${record.categoryId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncSuppliers(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                // Supplier uses id as primary key
                const supplierId = record.id || record.supplierId;
                const existing = await prisma.supplier.findUnique({
                    where: { id: supplierId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.supplier.create({
                        data: {
                            id: supplierId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            name: record.name,
                            contactPerson: record.contactPerson || null,
                            email: record.email || null,
                            phone: record.phone || null,
                            address: record.address || null,
                            taxId: record.taxId || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Supplier ${record.id || record.supplierId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncCustomers(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.customer.findUnique({
                    where: { customerId: record.customerId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.customer.create({
                        data: {
                            customerId: record.customerId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            name: record.name,
                            email: record.email || null,
                            phone: record.phone || null,
                            address: record.address || null,
                            isDefault: record.isDefault ?? false,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Customer ${record.customerId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncProducts(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                // Use id as the primary key for findUnique
                const productId = record.id || record.productId;
                const existing = await prisma.product.findUnique({
                    where: { id: productId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.product.create({
                        data: {
                            id: productId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            categoryId: record.categoryId || null,
                            name: record.name,
                            description: record.description || null,
                            brand: record.brand || null,
                            isTaxable: record.isTaxable ?? true,
                            supplierName: record.supplierName || null,
                            supplierCode: record.supplierCode || null,
                            defaultUnit: record.defaultUnit || record.unit || 'piece',
                            imageUrl: record.imageUrl || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Product ${record.id || record.productId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncProductVariants(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                // Use id as the primary key for findUnique
                const variantId = record.id || record.variantId;
                const existing = await prisma.productVariant.findUnique({
                    where: { id: variantId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.productVariant.create({
                        data: {
                            id: variantId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            productId: record.productId,
                            sku: record.sku || null,
                            variantName: record.variantName || record.name || 'Default',
                            primaryBarcode: record.primaryBarcode || null,
                            sellingPrice: record.sellingPrice || record.price ? parseFloat(String(record.sellingPrice || record.price)) : 0,
                            costPrice: record.costPrice ? parseFloat(String(record.costPrice)) : 0,
                            unit: record.unit || 'piece',
                            description: record.description || null,
                            brand: record.brand || null,
                            imageUrl: record.imageUrl || null,
                            isTaxable: record.isTaxable ?? null,
                            isDefault: record.isDefault ?? false,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`ProductVariant ${record.id || record.variantId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncProductBarcodes(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                // ProductBarcode uses barcode as unique, check by barcode
                const existing = await prisma.productBarcode.findUnique({
                    where: { barcode: record.barcode }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.productBarcode.create({
                        data: {
                            id: record.id || record.barcodeId,
                            productId: record.productId,
                            barcode: record.barcode,
                            barcodeType: record.barcodeType || 'EAN13',
                            barcodeSource: record.barcodeSource || 'STORE',
                            description: record.description || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`ProductBarcode: ${(error as Error).message}`);
            }
        }
    }

    private static async syncVariantBarcodes(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                // VariantBarcode uses id as primary key
                const barcodeId = record.id || record.barcodeId;
                const existing = await prisma.variantBarcode.findUnique({
                    where: { id: barcodeId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.variantBarcode.create({
                        data: {
                            id: barcodeId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            variantId: record.variantId,
                            barcode: record.barcode,
                            barcodeType: record.barcodeType || 'EAN13',
                            barcodeSource: record.barcodeSource || 'STORE',
                            description: record.description || null,
                            isActive: record.isActive ?? true,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`VariantBarcode: ${(error as Error).message}`);
            }
        }
    }

    private static async syncInventory(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                // Inventory uses id as primary key
                const inventoryId = record.id || record.inventoryId;
                const existing = await prisma.inventory.findUnique({
                    where: { id: inventoryId }
                });

                if (existing) {
                    // Update inventory quantities for existing records
                    await prisma.inventory.update({
                        where: { id: inventoryId },
                        data: {
                            availableQuantity: record.availableQuantity || record.quantity || 0,
                            reservedQuantity: record.reservedQuantity || 0,
                            updatedAt: new Date(),
                        }
                    });
                    result.updated++;
                } else {
                    await prisma.inventory.create({
                        data: {
                            id: inventoryId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            productId: record.productId,
                            variantId: record.variantId || null,
                            availableQuantity: record.availableQuantity || record.quantity || 0,
                            reservedQuantity: record.reservedQuantity || 0,
                            damagedQuantity: record.damagedQuantity || 0,
                            averageCost: record.averageCost ? parseFloat(String(record.averageCost)) : 0,
                            lastPurchaseCost: record.lastPurchaseCost ? parseFloat(String(record.lastPurchaseCost)) : 0,
                            reorderPoint: record.reorderPoint || null,
                            maxStock: record.maxStock || record.reorderQuantity || null,
                            trackInventory: record.trackInventory ?? true,
                            allowNegativeStock: record.allowNegativeStock ?? false,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Inventory ${record.id || record.inventoryId}: ${(error as Error).message}`);
            }
        }
    }

    private static async syncUsers(
        records: unknown[],
        params: InitialSyncParams,
        result: TableSyncResult
    ): Promise<void> {
        for (const record of records as any[]) {
            try {
                const existing = await prisma.user.findUnique({
                    where: { userId: record.userId }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await prisma.user.create({
                        data: {
                            userId: record.userId,
                            tenantId: params.tenantId,
                            branchId: params.branchId,
                            roleId: record.roleId,
                            username: record.username,
                            email: record.email || null,
                            password: record.password || record.passwordHash || 'changeme123',
                            fullname: record.fullname || record.fullName || record.username,
                            phone: record.phone || null,
                            pinCode: record.pinCode || record.pin || null,
                            status: record.status || (record.isActive === false ? 'inactive' : 'active'),
                            accessibleBranches: record.accessibleBranches || null,
                            maxDiscountPercent: record.maxDiscountPercent ? parseFloat(String(record.maxDiscountPercent)) : 0,
                            canOverridePrices: record.canOverridePrices ?? false,
                        }
                    });
                    result.inserted++;
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`User ${record.userId}: ${(error as Error).message}`);
            }
        }
    }
}
