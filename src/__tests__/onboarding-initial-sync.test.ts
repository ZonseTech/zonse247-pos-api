import { InitialSyncService } from '../services/onboarding/initial-sync.service';
import { INITIAL_SYNC_TABLES } from '../services/onboarding/constants';
import prisma from '../databases/prisma/client';

jest.mock('../databases/prisma/client', () => {
    const createMock = jest.fn();
    const findUniqueMock = jest.fn();
    const findFirstMock = jest.fn();
    const updateMock = jest.fn();

    return {
        __esModule: true,
        default: {
            district: { findUnique: findUniqueMock, create: createMock },
            role: { findUnique: findUniqueMock, create: createMock },
            permission: { findUnique: findUniqueMock, create: createMock },
            rolePermission: { findFirst: findFirstMock, create: createMock },
            subscriptionPlan: { findUnique: findUniqueMock, create: createMock },
            planFeature: { findUnique: findUniqueMock, create: createMock },
            paymentMethod: { findUnique: findUniqueMock, create: createMock },
            paymentServiceProvider: { findUnique: findUniqueMock, create: createMock },
            category: { findUnique: findUniqueMock, create: createMock },
            supplier: { findUnique: findUniqueMock, create: createMock },
            customer: { findUnique: findUniqueMock, create: createMock },
            product: { findUnique: findUniqueMock, findFirst: findFirstMock, create: createMock },
            productVariant: { findUnique: findUniqueMock, create: createMock },
            productBarcode: { findUnique: findUniqueMock, create: createMock },
            variantBarcode: { findUnique: findUniqueMock, create: createMock },
            inventory: { findUnique: findUniqueMock, create: createMock, update: updateMock },
            user: { findUnique: findUniqueMock, create: createMock },
        },
        prisma: {
            district: { findUnique: findUniqueMock, create: createMock },
            role: { findUnique: findUniqueMock, create: createMock },
            permission: { findUnique: findUniqueMock, create: createMock },
            rolePermission: { findFirst: findFirstMock, create: createMock },
            subscriptionPlan: { findUnique: findUniqueMock, create: createMock },
            planFeature: { findUnique: findUniqueMock, create: createMock },
            paymentMethod: { findUnique: findUniqueMock, create: createMock },
            paymentServiceProvider: { findUnique: findUniqueMock, create: createMock },
            category: { findUnique: findUniqueMock, create: createMock },
            supplier: { findUnique: findUniqueMock, create: createMock },
            customer: { findUnique: findUniqueMock, create: createMock },
            product: { findUnique: findUniqueMock, findFirst: findFirstMock, create: createMock },
            productVariant: { findUnique: findUniqueMock, create: createMock },
            productBarcode: { findUnique: findUniqueMock, create: createMock },
            variantBarcode: { findUnique: findUniqueMock, create: createMock },
            inventory: { findUnique: findUniqueMock, create: createMock, update: updateMock },
            user: { findUnique: findUniqueMock, create: createMock },
        },
    };
});

describe('onboarding initial sync', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        const mockPrisma = prisma as any;
        Object.values(mockPrisma).forEach((model: any) => {
            if (model?.findUnique) {
                model.findUnique.mockResolvedValue(null);
            }
            if (model?.findFirst) {
                model.findFirst.mockResolvedValue(null);
            }
            if (model?.create) {
                model.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
            }
            if (model?.update) {
                model.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
            }
        });

        mockPrisma.product.findUnique.mockImplementation(async ({ where }: { where?: { id?: string } }) => {
            if (where?.id === 'prod-1') {
                return { id: 'prod-1' };
            }
            return null;
        });

        mockPrisma.productVariant.findUnique.mockResolvedValue(null);
    });

    it('persists the full onboarding master-data set into the local terminal database during initial sync', async () => {
        const params = {
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            terminalId: 'terminal-1',
        };

        const payload = {
            districts: [
                {
                    districtId: 'district-1',
                    name: 'Lilongwe',
                    code: 'LL',
                    region: 'Central',
                    isActive: true,
                },
            ],
            roles: [
                {
                    roleId: 'role-1',
                    name: 'manager',
                    displayName: 'Manager',
                    description: 'Branch manager',
                    isActive: true,
                },
            ],
            permissions: [
                {
                    permissionId: 'perm-1',
                    name: 'manage_inventory',
                    displayName: 'Manage Inventory',
                    description: 'Inventory permissions',
                    category: 'inventory',
                    scope: 'branch',
                    isSystemPermission: true,
                },
            ],
            rolePermissions: [
                {
                    rolePermissionId: 'role-perm-1',
                    roleId: 'role-1',
                    permissionId: 'perm-1',
                },
            ],
            subscriptionPlans: [
                {
                    subscriptionPlanId: 'plan-1',
                    planCode: 'STARTER',
                    name: 'Starter',
                    description: 'Starter plan',
                    monthlyPrice: 1000,
                    yearlyPrice: 12000,
                    isActive: true,
                    features: ['inventory'],
                    limits: { maxBranches: 1 },
                    notes: 'Good for small teams',
                },
            ],
            planFeatures: [
                {
                    featureCategoryId: 'feature-1',
                    title: 'Core Features',
                    features: { inventory: true },
                    displayOrder: 1,
                },
            ],
            paymentMethods: [
                {
                    methodId: 'cash',
                    name: 'Cash',
                    icon: 'cash',
                    sortOrder: 1,
                    isActive: true,
                },
            ],
            paymentServiceProviders: [
                {
                    providerId: 'provider-1',
                    name: 'MNO',
                    type: 'bank',
                    userId: 'system',
                    logoUrl: 'https://example.com/logo.png',
                    isActive: true,
                    sortOrder: 1,
                },
            ],
            categories: [
                {
                    categoryId: 'cat-1',
                    name: 'Drinks',
                    description: 'Beverages',
                    sortOrder: 1,
                    color: '#ff0000',
                    isActive: true,
                },
            ],
            suppliers: [
                {
                    id: 'sup-1',
                    name: 'Acme',
                    contactPerson: 'Jane',
                    email: 'sales@acme.com',
                    phone: '0888000000',
                    address: 'Blantyre',
                    taxId: '12345',
                    isActive: true,
                },
            ],
            customers: [
                {
                    customerId: 'cust-1',
                    name: 'Ada Lovelace',
                    email: 'ada@example.com',
                    phone: '0888000000',
                    address: 'Lilongwe',
                    isDefault: true,
                },
            ],
            products: [
                {
                    id: 'prod-1',
                    name: 'Coffee',
                    description: 'Fresh brew',
                    brand: 'Local',
                    categoryId: 'cat-1',
                    defaultUnit: 'piece',
                    isTaxable: true,
                    isActive: true,
                },
            ],
            productVariants: [
                {
                    id: 'variant-1',
                    productId: 'prod-1',
                    variantName: 'Small',
                    sellingPrice: 120,
                    costPrice: 90,
                    unit: 'piece',
                    isDefault: true,
                    isActive: true,
                },
            ],
            productBarcodes: [
                {
                    productId: 'prod-1',
                    barcode: '1234567890123',
                    isPrimary: true,
                },
            ],
            variantBarcodes: [
                {
                    id: 'vb-1',
                    variantId: 'variant-1',
                    barcode: '9876543210987',
                    barcodeType: 'EAN13',
                    isPrimary: true,
                },
            ],
            inventory: [
                {
                    id: 'inv-1',
                    productId: 'prod-1',
                    variantId: 'variant-1',
                    availableQuantity: 15,
                    reservedQuantity: 0,
                    damagedQuantity: 0,
                    averageCost: 90,
                    lastPurchaseCost: 90,
                    trackInventory: true,
                    allowNegativeStock: false,
                },
            ],
            users: [
                {
                    userId: 'user-1',
                    username: 'ada',
                    email: 'ada@example.com',
                    fullname: 'Ada Lovelace',
                    phone: '0888000000',
                    password: 'temporary-hash',
                    pinCode: '1234',
                    status: 'active',
                    accessibleBranches: ['branch-1'],
                    allowedTerminals: ['terminal-1'],
                    maxDiscountPercent: 10,
                    canOverridePrices: true,
                },
            ],
        };

        const result = await InitialSyncService.syncMasterData(params as any, payload as any);

        expect(result.success).toBe(true);
        expect(result.summary.insertedRecords).toBe(15);
        expect(result.summary.failedRecords).toBe(0);
        expect(result.tables.map((tableResult: any) => tableResult.table)).toEqual([...INITIAL_SYNC_TABLES]);
        expect(result.tables.every((tableResult: any) => tableResult.success)).toBe(true);

        expect((prisma as any).district.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ districtId: 'district-1', name: 'Lilongwe' }),
        }));

        expect((prisma as any).role.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ roleId: 'role-1', name: 'manager' }),
        }));

        expect((prisma as any).permission.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ permissionId: 'perm-1', name: 'manage_inventory' }),
        }));

        expect((prisma as any).rolePermission.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ rolePermissionId: 'role-perm-1', roleId: 'role-1' }),
        }));

        expect((prisma as any).subscriptionPlan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ subscriptionPlanId: 'plan-1', name: 'Starter' }),
        }));

        const planFeatureCall = (prisma as any).planFeature.create.mock.calls.find((call: any[]) => call[0]?.data?.title === 'Core Features');
        expect(planFeatureCall).toBeDefined();

        expect((prisma as any).paymentMethod.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ methodId: 'cash', name: 'Cash' }),
        }));

        expect((prisma as any).paymentServiceProvider.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ providerId: 'provider-1', name: 'MNO' }),
        }));

        expect((prisma as any).category.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ categoryId: 'cat-1', name: 'Drinks' }),
        }));

        expect((prisma as any).supplier.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ id: 'sup-1', name: 'Acme' }),
        }));

        expect((prisma as any).customer.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ customerId: 'cust-1', name: 'Ada Lovelace' }),
        }));

        expect((prisma as any).product.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ id: 'prod-1', name: 'Coffee' }),
        }));

        const productVariantResult = result.tables.find((tableResult: any) => tableResult.table === 'productVariants');
        expect(productVariantResult).toEqual(expect.objectContaining({
            table: 'productVariants',
            success: true,
            skipped: 1,
        }));

        const inventoryResult = result.tables.find((tableResult: any) => tableResult.table === 'inventory');
        expect(inventoryResult).toEqual(expect.objectContaining({
            table: 'inventory',
            success: true,
            skipped: 1,
        }));

        expect((prisma as any).productBarcode.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ barcode: '1234567890123', productId: 'prod-1' }),
        }));

        expect((prisma as any).variantBarcode.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ id: 'vb-1', variantId: 'variant-1', barcode: '9876543210987' }),
        }));

        expect(result.tables.find((tableResult: any) => tableResult.table === 'inventory')).toEqual(expect.objectContaining({
            table: 'inventory',
            success: true,
            skipped: 1,
        }));

        expect((prisma as any).user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ userId: 'user-1', username: 'ada' }),
        }));
    });
});
