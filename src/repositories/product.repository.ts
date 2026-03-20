import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';
import { DEFAULTS, getNewProductDate } from '../constants/product.constants';
import { BarcodeInput } from '../types/product.types';
import {
    buildProductInclude,
    buildVariantInclude,
    createBarcodeRecords,
    createInventoryData,
} from '../utils/product.utils';

export interface TenantBranchScope {
    tenantId: string;
    branchId: string;
}

export interface CreateVariantData {
    productId: string;
    sku?: string;
    variantName: string;
    primaryBarcode?: string;
    sellingPrice: number;
    costPrice?: number;
    unit?: string;
    description?: string;
    brand?: string;
    imageUrl?: string;
    isTaxable?: boolean;
    supplierName?: string;
    supplierCode?: string;
    size?: string;
    weight?: number;
    weightUnit?: string;
    volume?: number;
    volumeUnit?: string;
    dimensions?: string;
    customAttributes?: string;
    promoPrice?: number;
    promoStart?: Date;
    promoEnd?: Date;
    expirationDate?: Date;
    manufactureDate?: Date;
    expiryDateAlert?: number;  // Days before expiration to trigger alert
    isDefault?: boolean;
    barcodes?: BarcodeInput[];
    inventory?: {
        trackInventory?: boolean;
        allowNegativeStock?: boolean;
        reorderLevel?: number;
        minStock?: number;
        maxStock?: number;
    };
}

export class ProductRepository {
    static async findByPrimaryBarcode(barcode: string, scope: TenantBranchScope, excludeVariantId?: string) {
        return prisma.productVariant.findFirst({
            where: {
                primaryBarcode: barcode,
                ...scope,
                isActive: true,
                ...(excludeVariantId && { id: { not: excludeVariantId } }),
            },
            include: { product: { select: { name: true } } },
        });
    }

    static async findByAlternativeBarcode(barcode: string, scope: TenantBranchScope, excludeVariantId?: string) {
        return prisma.variantBarcode.findFirst({
            where: {
                barcode,
                isActive: true,
                variant: { ...scope, isActive: true, ...(excludeVariantId && { id: { not: excludeVariantId } }) },
            },
            include: { variant: { include: { product: { select: { name: true } } } } },
        });
    }

    static async createBarcode(variantId: string, barcode: string, barcodeType: string, barcodeSource: string, description?: string) {
        return prisma.variantBarcode.create({
            data: { id: uuidv4(), variantId, barcode, barcodeType: barcodeType as any, barcodeSource: barcodeSource as any, description },
        });
    }

    static async findBySku(sku: string, scope: TenantBranchScope, excludeVariantId?: string) {
        return prisma.productVariant.findFirst({
            where: { sku, ...scope, isActive: true, ...(excludeVariantId && { id: { not: excludeVariantId } }) },
        });
    }

    static async findCategoryById(categoryId: string, scope: TenantBranchScope) {
        return prisma.category.findFirst({ where: { categoryId, ...scope, isActive: true } });
    }

    static async findVariantByName(productId: string, variantName: string, excludeVariantId?: string) {
        return prisma.productVariant.findFirst({
            where: { productId, variantName, isActive: true, deletedAt: null, ...(excludeVariantId && { id: { not: excludeVariantId } }) },
        });
    }

    static async findProductById(productId: string, scope: TenantBranchScope) {
        return prisma.product.findFirst({ where: { id: productId, ...scope, isActive: true, deletedAt: null }, include: buildProductInclude() });
    }

    static async findActiveProductById(productId: string, scope: TenantBranchScope) {
        return prisma.product.findFirst({ where: { id: productId, ...scope, isActive: true } });
    }

    static async createProductWithVariant(
        productData: { name: string; categoryId?: string; description?: string; brand?: string; isTaxable?: boolean; supplierName?: string; supplierCode?: string; defaultUnit?: string; imageUrl?: string },
        variantData: CreateVariantData,
        scope: TenantBranchScope
    ) {
        const productId = uuidv4();
        const variantId = uuidv4();

        return prisma.$transaction(async (tx) => {
            await tx.product.create({
                data: {
                    id: productId,
                    ...scope,
                    categoryId: productData.categoryId,
                    name: productData.name.trim(),
                    description: productData.description,
                    brand: productData.brand,
                    isTaxable: productData.isTaxable,
                    supplierName: productData.supplierName,
                    supplierCode: productData.supplierCode,
                    defaultUnit: productData.defaultUnit ?? variantData.unit,
                    imageUrl: productData.imageUrl,
                },
            });

            return tx.productVariant.create({
                data: {
                    id: variantId,
                    productId,
                    ...scope,
                    sku: variantData.sku,
                    variantName: variantData.variantName,
                    primaryBarcode: variantData.primaryBarcode,
                    sellingPrice: variantData.sellingPrice,
                    costPrice: variantData.costPrice ?? DEFAULTS.COST_PRICE,
                    unit: variantData.unit ?? DEFAULTS.UNIT,
                    isDefault: true,
                    barcodes: variantData.barcodes ? { create: createBarcodeRecords(variantData.barcodes) } : undefined,
                    inventory: { create: createInventoryData(scope.tenantId, scope.branchId, variantData.inventory) },
                },
                include: buildVariantInclude(),
            });
        });
    }

    static async updateProduct(
        productId: string,
        scope: TenantBranchScope,
        data: { name?: string; categoryId?: string; description?: string; brand?: string; isTaxable?: boolean; supplierName?: string; supplierCode?: string; defaultUnit?: string; imageUrl?: string; isActive?: boolean }
    ) {
        return prisma.product.update({
            where: { id: productId, ...scope },
            data,
            include: buildProductInclude(),
        });
    }

    static async softDeleteProduct(productId: string, scope: TenantBranchScope) {
        const now = new Date();
        return prisma.$transaction(async (tx) => {
            // Get variant IDs so we can also soft-delete their inventory records
            const variants = await tx.productVariant.findMany({
                where: { productId, ...scope },
                select: { id: true },
            });
            const variantIds = variants.map((v) => v.id);

            await tx.productVariant.updateMany({ where: { productId, ...scope }, data: { isActive: false, deletedAt: now } });
            await tx.product.update({ where: { id: productId, ...scope }, data: { isActive: false, deletedAt: now } });

            // Mark associated inventory records as deleted
            if (variantIds.length > 0) {
                await tx.inventory.updateMany({ where: { variantId: { in: variantIds } }, data: { deletedAt: now } });
            }
        });
    }

    static async findVariantById(variantId: string, scope: TenantBranchScope) {
        return prisma.productVariant.findFirst({ where: { id: variantId, ...scope, isActive: true, deletedAt: null }, include: buildVariantInclude() });
    }

    static async createVariant(data: CreateVariantData, scope: TenantBranchScope, defaultUnit?: string) {
        const variantId = uuidv4();

        return prisma.$transaction(async (tx) => {
            if (data.isDefault) {
                await tx.productVariant.updateMany({ where: { productId: data.productId, isDefault: true }, data: { isDefault: false } });
            }

            return tx.productVariant.create({
                data: {
                    id: variantId,
                    productId: data.productId,
                    ...scope,
                    sku: data.sku,
                    variantName: data.variantName,
                    primaryBarcode: data.primaryBarcode,
                    sellingPrice: data.sellingPrice,
                    costPrice: data.costPrice ?? DEFAULTS.COST_PRICE,
                    unit: data.unit ?? defaultUnit ?? DEFAULTS.UNIT,
                    description: data.description,
                    brand: data.brand,
                    imageUrl: data.imageUrl,
                    isTaxable: data.isTaxable,
                    supplierName: data.supplierName,
                    supplierCode: data.supplierCode,
                    size: data.size,
                    weight: data.weight,
                    weightUnit: data.weightUnit,
                    volume: data.volume,
                    volumeUnit: data.volumeUnit,
                    dimensions: data.dimensions,
                    customAttributes: data.customAttributes,
                    promoPrice: data.promoPrice,
                    promoStart: data.promoStart,
                    promoEnd: data.promoEnd,
                    expirationDate: data.expirationDate,
                    manufactureDate: data.manufactureDate,
                    expiryDateAlert: data.expiryDateAlert,
                    isDefault: data.isDefault ?? false,
                    barcodes: data.barcodes ? { create: createBarcodeRecords(data.barcodes) } : undefined,
                    inventory: { create: createInventoryData(scope.tenantId, scope.branchId, data.inventory) },
                },
                include: buildVariantInclude(),
            });
        });
    }

    static async updateVariant(
        variantId: string,
        scope: TenantBranchScope,
        data: Partial<CreateVariantData> & { isActive?: boolean }
    ) {
        return prisma.$transaction(async (tx) => {
            if (data.isDefault) {
                const current = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
                if (current) {
                    await tx.productVariant.updateMany({
                        where: { productId: current.productId, isDefault: true, id: { not: variantId } },
                        data: { isDefault: false },
                    });
                }
            }

            await tx.productVariant.update({
                where: { id: variantId, ...scope },
                data: {
                    sku: data.sku,
                    variantName: data.variantName,
                    primaryBarcode: data.primaryBarcode,
                    sellingPrice: data.sellingPrice,
                    costPrice: data.costPrice,
                    unit: data.unit,
                    description: data.description,
                    brand: data.brand,
                    imageUrl: data.imageUrl,
                    isTaxable: data.isTaxable,
                    supplierName: data.supplierName,
                    supplierCode: data.supplierCode,
                    size: data.size,
                    weight: data.weight,
                    weightUnit: data.weightUnit,
                    volume: data.volume,
                    volumeUnit: data.volumeUnit,
                    dimensions: data.dimensions,
                    customAttributes: data.customAttributes,
                    promoPrice: data.promoPrice,
                    promoStart: data.promoStart,
                    promoEnd: data.promoEnd,
                    expirationDate: data.expirationDate,
                    manufactureDate: data.manufactureDate,
                    expiryDateAlert: data.expiryDateAlert,
                    isDefault: data.isDefault,
                    isActive: data.isActive,
                },
            });

            if (data.inventory) {
                const inv = data.inventory;
                await tx.inventory.updateMany({
                    where: { variantId, ...scope },
                    data: {
                        ...(inv.trackInventory !== undefined && { trackInventory: inv.trackInventory }),
                        ...(inv.allowNegativeStock !== undefined && { allowNegativeStock: inv.allowNegativeStock }),
                        ...(inv.reorderLevel !== undefined && { reorderPoint: inv.reorderLevel }),
                        ...(inv.minStock !== undefined && { reorderPoint: inv.minStock }),
                        ...(inv.maxStock !== undefined && { maxStock: inv.maxStock }),
                        version: { increment: 1 }, // Always increment version on update
                    },
                });
            }

            if (data.barcodes !== undefined) {
                await tx.variantBarcode.updateMany({ where: { variantId }, data: { isActive: false } });
                if (data.barcodes.length > 0) {
                    await tx.variantBarcode.createMany({
                        data: data.barcodes.map((bc) => ({
                            id: uuidv4(),
                            variantId,
                            barcode: bc.barcode,
                            barcodeType: (bc.barcodeType ?? DEFAULTS.BARCODE_TYPE) as any,
                            barcodeSource: (bc.barcodeSource ?? DEFAULTS.BARCODE_SOURCE) as any,
                            description: bc.description,
                            isActive: true,
                        })),
                    });
                }
            }

            return tx.productVariant.findUnique({ where: { id: variantId }, include: buildVariantInclude() });
        });
    }

    static async softDeleteVariant(variantId: string, scope: TenantBranchScope) {
        const now = new Date();
        return prisma.$transaction(async (tx) => {
            await tx.productVariant.update({ where: { id: variantId, ...scope }, data: { isActive: false, deletedAt: now } });

            // Mark associated inventory records as deleted
            await tx.inventory.updateMany({ where: { variantId }, data: { deletedAt: now } });

            // If this was the last active variant, also soft-delete the parent product
            const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
            if (variant) {
                const remainingActive = await tx.productVariant.count({
                    where: { productId: variant.productId, isActive: true },
                });
                if (remainingActive === 0) {
                    await tx.product.update({ where: { id: variant.productId }, data: { isActive: false, deletedAt: now } });
                }
            }
        });
    }

    static async searchBySku(sku: string, scope: TenantBranchScope) {
        return prisma.productVariant.findFirst({
            where: { sku, ...scope, isActive: true, product: { isActive: true } },
            include: buildVariantInclude(),
        });
    }

    static async searchByPrimaryBarcode(barcode: string, scope: TenantBranchScope) {
        return prisma.productVariant.findFirst({
            where: { primaryBarcode: barcode, ...scope, isActive: true, product: { isActive: true } },
            include: buildVariantInclude(),
        });
    }

    static async searchByAlternativeBarcode(barcode: string, scope: TenantBranchScope) {
        return prisma.variantBarcode.findFirst({
            where: { barcode, isActive: true, variant: { ...scope, isActive: true, product: { isActive: true } } },
            include: { variant: { include: buildVariantInclude() } },
        });
    }

    static async searchByProductName(name: string, scope: TenantBranchScope) {
        return prisma.product.findFirst({
            where: { name: { contains: name }, ...scope, isActive: true },
            include: {
                category: true,
                variants: { where: { isActive: true }, orderBy: { isDefault: 'desc' }, take: 1, include: { inventories: true, barcodes: { where: { isActive: true } } } },
            },
        });
    }

    static async searchByVariantName(name: string, scope: TenantBranchScope) {
        return prisma.productVariant.findFirst({
            where: { variantName: { contains: name }, ...scope, isActive: true, product: { isActive: true } },
            include: buildVariantInclude(),
        });
    }

    static async listVariants(scope: TenantBranchScope, options: { page?: number; perPage?: number; search?: string; filter?: string; status?: string; categoryId?: string; includeInactive?: boolean }) {
        const { page = 1, perPage = 10, search = '', filter = 'all', status, categoryId, includeInactive = false } = options;
        const skip = (page - 1) * perPage;
        const where = this.buildListWhere(scope, { filter, status, categoryId, search, includeInactive });

        const [results, totalCount] = await Promise.all([
            prisma.productVariant.findMany({
                where,
                include: buildVariantInclude(),
                skip,
                take: perPage,
                orderBy: [{ product: { name: 'asc' } }, { isDefault: 'desc' }, { variantName: 'asc' }],
            }),
            prisma.productVariant.count({ where }),
        ]);

        return { results, totalCount };
    }

    private static buildListWhere(scope: TenantBranchScope, opts: { filter?: string; status?: string; categoryId?: string; search?: string; includeInactive?: boolean }): any {
        const { filter, status, categoryId, search, includeInactive } = opts;
        const where: any = { ...scope };

        if (status === 'ACTIVE' || status === 'OUT_OF_STOCK') {
            where.isActive = true;
            where.product = { isActive: true };
        } else if (status === 'INACTIVE' || status === 'DISCONTINUED') {
            where.OR = [{ isActive: false }, { product: { isActive: false } }];
        } else if (filter === 'active') {
            where.isActive = true;
            where.product = { isActive: true };
        } else if (filter === 'inactive') {
            where.OR = [{ isActive: false }, { product: { isActive: false } }];
        } else if (filter === 'new' || filter === 'new-stock') {
            where.createdAt = { gte: getNewProductDate() };
            where.isActive = true;
            where.product = { isActive: true };
        } else if (filter === 'low-stock' || filter === 'out-of-stock') {
            where.isActive = true;
            where.product = { isActive: true };
        } else if (!includeInactive) {
            where.isActive = true;
            where.product = { isActive: true };
        }

        if (categoryId) where.product = { ...(where.product as object || {}), categoryId };

        if (search) {
            where.OR = [
                { product: { name: { contains: search } } },
                { variantName: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                { barcodes: { some: { barcode: { contains: search } } } },
            ];
        }

        return where;
    }

    /**
     * Move a variant to a different product (convert to variant of another product)
     * Returns the updated variant and info about whether the original product was orphaned
     */
    static async moveVariantToProduct(
        variantId: string,
        targetProductId: string,
        scope: TenantBranchScope,
        options: { variantName?: string; deleteOrphanedProduct?: boolean } = {}
    ): Promise<{
        variant: any;
        orphanedProductDeleted: boolean;
        deletedProductId?: string;
        affectedRecords: { saleItems: number; stockMovements: number; purchaseOrderItems: number };
        originalProductId: string;
    }> {
        return prisma.$transaction(async (tx) => {
            // Get the current variant with its product
            const currentVariant = await tx.productVariant.findFirst({
                where: { id: variantId, ...scope },
                include: { product: true },
            });

            if (!currentVariant) {
                throw new Error(`Variant with ID ${variantId} not found`);
            }

            const originalProductId = currentVariant.productId;

            // Verify target product exists and is in the same scope
            const targetProduct = await tx.product.findFirst({
                where: { id: targetProductId, ...scope, isActive: true },
            });

            if (!targetProduct) {
                throw new Error(`Target product with ID ${targetProductId} not found`);
            }

            // Prevent moving to the same product
            if (originalProductId === targetProductId) {
                throw new Error('Variant is already under this product');
            }

            // Check if variant name already exists in target product
            const newVariantName = options.variantName || currentVariant.variantName;
            const existingVariantWithName = await tx.productVariant.findFirst({
                where: {
                    productId: targetProductId,
                    variantName: newVariantName,
                    id: { not: variantId },
                },
            });

            if (existingVariantWithName) {
                throw new Error(`A variant with name "${newVariantName}" already exists in the target product`);
            }

            // Count affected historical records BEFORE making changes
            const [saleItemsCount, purchaseOrderItemsCount] = await Promise.all([
                tx.saleItem.count({ where: { variantId } }),
                tx.purchaseOrderItem.count({ where: { variantId } }),
            ]);

            // Get inventory IDs for this variant to count stock movements
            const inventories = await tx.inventory.findMany({
                where: { variantId },
                select: { id: true },
            });
            const inventoryIds = inventories.map(inv => inv.id);

            const stockMovementsCount = inventoryIds.length > 0
                ? await tx.stockMovement.count({ where: { inventoryId: { in: inventoryIds } } })
                : 0;

            // Update the variant's productId (move it to the new product)
            const updatedVariant = await tx.productVariant.update({
                where: { id: variantId },
                data: {
                    productId: targetProductId,
                    variantName: newVariantName,
                    isDefault: false, // Moving a variant should not make it default
                },
                include: buildVariantInclude(),
            });

            // IMPORTANT: Also update the Inventory record's productId to maintain consistency
            // This ensures current inventory state reflects the new product relationship
            await tx.inventory.updateMany({
                where: { variantId: variantId },
                data: { productId: targetProductId },
            });

            // Check if the original product is now orphaned (no more variants)
            let orphanedProductDeleted = false;
            let deletedProductId: string | undefined;

            const remainingVariants = await tx.productVariant.count({
                where: { productId: originalProductId },
            });

            if (remainingVariants === 0 && options.deleteOrphanedProduct !== false) {
                // Soft-delete the orphaned product to preserve sync tombstone
                await tx.product.update({
                    where: { id: originalProductId },
                    data: { isActive: false, deletedAt: new Date() },
                });
                orphanedProductDeleted = true;
                deletedProductId = originalProductId;
            }

            return {
                variant: updatedVariant,
                orphanedProductDeleted,
                deletedProductId,
                affectedRecords: {
                    saleItems: saleItemsCount,
                    stockMovements: stockMovementsCount,
                    purchaseOrderItems: purchaseOrderItemsCount,
                },
                originalProductId,
            };
        });
    }

    /**
     * Get the count of variants for a product
     */
    static async getVariantCount(productId: string): Promise<number> {
        return prisma.productVariant.count({
            where: { productId },
        });
    }
}
