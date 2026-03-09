import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../databases/prisma/client';
import { ProductService } from '../../../services/inventory/product.service';
import { StockMovementService } from '../../../services/inventory/stock-movement.service';
import {
    ValidationError,
} from '../../../utils/db-error-handler.util';
import { AuthContext, ProductCreateData, ProductUpdateData, VariantData } from '../types/inventory.types';
import { INVENTORY_DEFAULTS, BARCODE_DEFAULTS } from '../constants/inventory.constants';

/**
 * Repository for inventory write operations (create, update, delete)
 */
export class InventoryWriteRepository {
    /**
     * Validate variant data before create/update
     */
    static async validateVariantData(
        variants: VariantData[],
        auth: AuthContext,
        excludeVariantId?: string
    ): Promise<void> {
        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            const variantLabel = variants.length > 1 ? ` (Variant ${i + 1})` : '';
            const variantField = variants.length > 1 ? `variants[${i}]` : 'variant';

            const sellPrice = parseFloat(String(variant.sellPrice || variant.sellingPrice || 0));
            if (sellPrice < 0) {
                throw new ValidationError(
                    `Selling price${variantLabel} cannot be negative. Received: ${sellPrice}`,
                    {},
                    `${variantField}.sellPrice`
                );
            }

            const quantity = parseInt(String(variant.quantity || 0));
            if (quantity < 0) {
                throw new ValidationError(
                    `Quantity${variantLabel} cannot be negative. Received: ${quantity}`,
                    {},
                    `${variantField}.quantity`
                );
            }

            const minStock = variant.minStock ? parseInt(String(variant.minStock)) : null;
            const maxStock = variant.maxStock ? parseInt(String(variant.maxStock)) : null;
            if (minStock !== null && maxStock !== null && minStock > maxStock) {
                throw new ValidationError(
                    `Minimum stock${variantLabel} (${minStock}) cannot exceed maximum stock (${maxStock}).`,
                    {},
                    `${variantField}.minStock`
                );
            }

            const primaryBarcode = variant.primaryBarcode || variant.barcode;
            const additionalBarcodes = variant.additionalBarcodes?.map((bc) => ({
                barcode: typeof bc === 'string' ? bc : bc.code || bc.barcode,
            }));

            await ProductService.validateBarcodesForDuplicates(
                primaryBarcode,
                additionalBarcodes,
                auth.tenantId,
                auth.branchId,
                excludeVariantId
            );
        }
    }

    /**
     * Create a new product with variants
     */
    static async createProductWithVariants(
        inventoryData: ProductCreateData,
        auth: AuthContext
    ): Promise<string> {
        const variants: VariantData[] = inventoryData.variants?.length
            ? inventoryData.variants
            : [inventoryData];

        await this.validateVariantData(variants, auth);

        const productId = uuidv4();

        await prisma.$transaction(async (tx) => {
            const firstVariant = variants[0];

            await tx.product.create({
                data: {
                    id: productId,
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    name: inventoryData.name.trim(),
                    categoryId: inventoryData.categoryId || null,
                    description: firstVariant.description || inventoryData.description || null,
                    brand: firstVariant.brand || inventoryData.brand || null,
                    isTaxable: firstVariant.isTaxable !== false,
                    supplierName: firstVariant.supplierName || inventoryData.supplierName || null,
                    supplierCode: firstVariant.supplierCode || inventoryData.supplierCode || null,
                    defaultUnit: inventoryData.unit || inventoryData.defaultUnit || firstVariant.unit || INVENTORY_DEFAULTS.unit,
                    isActive: firstVariant.status !== 'inactive',
                },
            });

            for (let i = 0; i < variants.length; i++) {
                await this.createVariantWithInventory(tx, productId, variants[i], auth, i === 0);
            }
        });

        return productId;
    }

    /**
     * Create a single variant with its inventory record
     */
    private static async createVariantWithInventory(
        tx: any,
        productId: string,
        variant: VariantData,
        auth: AuthContext,
        isFirst: boolean
    ): Promise<string> {
        const variantId = variant.id || uuidv4();
        const sellPrice = parseFloat(String(variant.sellPrice || variant.sellingPrice || 0));
        const quantity = parseInt(String(variant.quantity || 0));
        const minStock = variant.minStock ? parseInt(String(variant.minStock)) : null;
        const maxStock = variant.maxStock ? parseInt(String(variant.maxStock)) : null;
        const primaryBarcode = variant.primaryBarcode || variant.barcode || null;
        const sku = variant.sku || variant.barcode || null;
        const costPrice = parseFloat(String(variant.costPrice || 0));

        await tx.productVariant.create({
            data: {
                id: variantId,
                productId,
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                sku,
                variantName: variant.variantName || 'Default',
                primaryBarcode,
                sellingPrice: sellPrice,
                costPrice,
                unit: variant.unit || INVENTORY_DEFAULTS.unit,
                description: variant.description || null,
                brand: variant.brand || null,
                size: variant.size || null,
                weight: variant.weight ? parseFloat(String(variant.weight)) : null,
                dimensions: variant.dimensions || null,
                promoPrice: variant.promoPrice ? parseFloat(String(variant.promoPrice)) : null,
                promoStart: variant.promoStart ? new Date(variant.promoStart as string) : null,
                promoEnd: variant.promoEnd ? new Date(variant.promoEnd as string) : null,
                isTaxable: variant.isTaxable !== false,
                expirationDate: variant.expirationDate ? new Date(variant.expirationDate as string) : null,
                manufactureDate: variant.manufactureDate ? new Date(variant.manufactureDate as string) : null,
                supplierName: variant.supplierName || null,
                supplierCode: variant.supplierCode || null,
                isDefault: isFirst || variant.isDefault === true,
                isActive: variant.status !== 'inactive',
            },
        });

        const inventoryId = uuidv4();

        await tx.inventory.create({
            data: {
                id: inventoryId,
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                productId,
                variantId,
                availableQuantity: 0,
                reservedQuantity: parseInt(String(variant.reservedQuantity || 0)),
                damagedQuantity: 0,
                averageCost: costPrice,
                lastPurchaseCost: costPrice,
                reorderPoint: minStock,
                maxStock,
                trackInventory: variant.trackInventory !== false,
                allowNegativeStock: variant.allowNegativeStock || false,
            },
        });

        if (quantity > 0) {
            await StockMovementService.recordInitialStock(
                {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    inventoryId,
                    quantity,
                    unitCost: costPrice,
                    notes: 'Initial stock on product creation',
                    movedBy: auth.userId,
                },
                tx
            );
        }

        await this.createAdditionalBarcodes(tx, variantId, variant.additionalBarcodes);

        return variantId;
    }

    /**
     * Create additional barcodes for a variant
     */
    private static async createAdditionalBarcodes(
        tx: any,
        variantId: string,
        barcodes?: Array<{ code?: string; barcode?: string; type?: string; source?: string }>
    ): Promise<void> {
        if (!barcodes || !Array.isArray(barcodes)) return;

        for (const barcode of barcodes) {
            const barcodeValue = typeof barcode === 'string' ? barcode : barcode.code || barcode.barcode;
            if (barcodeValue) {
                await tx.variantBarcode.create({
                    data: {
                        id: uuidv4(),
                        variantId,
                        barcode: barcodeValue,
                        barcodeType: barcode.type || BARCODE_DEFAULTS.type,
                        barcodeSource: barcode.source || BARCODE_DEFAULTS.source,
                        isActive: BARCODE_DEFAULTS.isActive,
                    },
                });
            }
        }
    }

    /**
     * Update a variant and its inventory
     */
    static async updateVariant(variantId: string, updateData: Record<string, any>): Promise<number> {
        await prisma.$transaction(async (tx) => {
            const variantUpdate = this.buildVariantUpdate(updateData);
            if (Object.keys(variantUpdate).length > 0) {
                await tx.productVariant.update({
                    where: { id: variantId },
                    data: variantUpdate,
                });
            }

            const productUpdate = this.buildProductUpdate(updateData);
            if (Object.keys(productUpdate).length > 0) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: variantId },
                    select: { productId: true },
                });
                if (variant) {
                    await tx.product.update({
                        where: { id: variant.productId },
                        data: productUpdate,
                    });
                }
            }

            const inventoryUpdate = this.buildInventoryUpdate(updateData);
            if (Object.keys(inventoryUpdate).length > 0) {
                inventoryUpdate.version = { increment: 1 };
                await tx.inventory.updateMany({
                    where: { variantId },
                    data: inventoryUpdate,
                });
            }
        });

        return 1;
    }

    /**
     * Update a product with all its variants
     */
    static async updateProductWithVariants(
        productId: string,
        updateData: ProductUpdateData,
        auth: AuthContext
    ): Promise<number> {
        await prisma.$transaction(async (tx) => {
            const productUpdate = this.buildProductUpdate(updateData);
            if (Object.keys(productUpdate).length > 0) {
                await tx.product.update({
                    where: { id: productId },
                    data: productUpdate,
                });
            }

            if (updateData.variants && Array.isArray(updateData.variants)) {
                for (const variantData of updateData.variants) {
                    if (variantData.id) {
                        await this.updateExistingVariant(tx, variantData);
                    } else {
                        await this.createVariantWithInventory(tx, productId, variantData, auth, false);
                    }
                }
            }
        });

        return 1;
    }

    /**
     * Update an existing variant within a transaction
     */
    private static async updateExistingVariant(
        tx: any,
        variantData: VariantData,
    ): Promise<void> {
        const variantUpdate = this.buildVariantUpdateFromData(variantData);
        if (Object.keys(variantUpdate).length > 0) {
            await tx.productVariant.update({
                where: { id: variantData.id },
                data: variantUpdate,
            });
        }

        const inventoryUpdate = this.buildInventoryUpdateFromVariantData(variantData);
        if (Object.keys(inventoryUpdate).length > 0) {
            inventoryUpdate.version = { increment: 1 };
            await tx.inventory.updateMany({
                where: { variantId: variantData.id },
                data: inventoryUpdate,
            });
        }
    }

    /**
     * Build variant update object from generic update data
     */
    private static buildVariantUpdate(updateData: Record<string, any>): Record<string, any> {
        const variantUpdate: Record<string, any> = {};

        if (updateData.description !== undefined) variantUpdate.description = updateData.description || null;
        if (updateData.unit !== undefined) variantUpdate.unit = updateData.unit;
        if (updateData.sellPrice !== undefined || updateData.sellingPrice !== undefined) {
            variantUpdate.sellingPrice = parseFloat(updateData.sellPrice || updateData.sellingPrice);
        }
        if (updateData.barcode !== undefined || updateData.primaryBarcode !== undefined) {
            variantUpdate.primaryBarcode = updateData.barcode || updateData.primaryBarcode;
        }
        if (updateData.status !== undefined) {
            variantUpdate.isActive = updateData.status !== 'inactive';
        }
        if (updateData.brand !== undefined) variantUpdate.brand = updateData.brand || null;
        if (updateData.size !== undefined) variantUpdate.size = updateData.size || null;
        if (updateData.dimensions !== undefined) variantUpdate.dimensions = updateData.dimensions || null;
        if (updateData.weight !== undefined) {
            variantUpdate.weight = updateData.weight ? parseFloat(updateData.weight) : null;
        }
        if (updateData.promoPrice !== undefined) {
            variantUpdate.promoPrice = updateData.promoPrice ? parseFloat(updateData.promoPrice) : null;
        }
        if (updateData.promoStart !== undefined) {
            variantUpdate.promoStart = updateData.promoStart ? new Date(updateData.promoStart) : null;
        }
        if (updateData.promoEnd !== undefined) {
            variantUpdate.promoEnd = updateData.promoEnd ? new Date(updateData.promoEnd) : null;
        }
        if (updateData.isTaxable !== undefined) variantUpdate.isTaxable = updateData.isTaxable;
        if (updateData.expirationDate !== undefined) {
            variantUpdate.expirationDate = updateData.expirationDate ? new Date(updateData.expirationDate) : null;
        }
        if (updateData.manufactureDate !== undefined) {
            variantUpdate.manufactureDate = updateData.manufactureDate ? new Date(updateData.manufactureDate) : null;
        }
        if (updateData.supplierName !== undefined) variantUpdate.supplierName = updateData.supplierName || null;
        if (updateData.supplierCode !== undefined) variantUpdate.supplierCode = updateData.supplierCode || null;

        return variantUpdate;
    }

    /**
     * Build variant update from variant-specific data
     */
    private static buildVariantUpdateFromData(variantData: VariantData): Record<string, any> {
        const variantUpdate: Record<string, any> = {};

        if (variantData.variantName !== undefined) variantUpdate.variantName = variantData.variantName;
        if (variantData.sku !== undefined) variantUpdate.sku = variantData.sku || null;
        if (variantData.primaryBarcode !== undefined || variantData.barcode !== undefined) {
            variantUpdate.primaryBarcode = variantData.primaryBarcode || variantData.barcode || null;
        }
        if (variantData.sellingPrice !== undefined || variantData.sellPrice !== undefined) {
            variantUpdate.sellingPrice = parseFloat(String(variantData.sellingPrice ?? variantData.sellPrice));
        }
        if (variantData.costPrice !== undefined) {
            variantUpdate.costPrice = parseFloat(String(variantData.costPrice));
        }
        if (variantData.unit !== undefined) variantUpdate.unit = variantData.unit;
        if (variantData.description !== undefined) variantUpdate.description = variantData.description || null;
        if (variantData.brand !== undefined) variantUpdate.brand = variantData.brand || null;
        if (variantData.imageUrl !== undefined) variantUpdate.imageUrl = variantData.imageUrl || null;
        if (variantData.isTaxable !== undefined) variantUpdate.isTaxable = variantData.isTaxable;
        if (variantData.supplierName !== undefined) variantUpdate.supplierName = variantData.supplierName || null;
        if (variantData.supplierCode !== undefined) variantUpdate.supplierCode = variantData.supplierCode || null;
        if (variantData.size !== undefined) variantUpdate.size = variantData.size || null;
        if (variantData.weight !== undefined) {
            variantUpdate.weight = variantData.weight ? parseFloat(String(variantData.weight)) : null;
        }
        if (variantData.weightUnit !== undefined) variantUpdate.weightUnit = variantData.weightUnit || null;
        if (variantData.volume !== undefined) {
            variantUpdate.volume = variantData.volume ? parseFloat(String(variantData.volume)) : null;
        }
        if (variantData.volumeUnit !== undefined) variantUpdate.volumeUnit = variantData.volumeUnit || null;
        if (variantData.dimensions !== undefined) variantUpdate.dimensions = variantData.dimensions || null;
        if (variantData.color !== undefined) {
            variantUpdate.customAttributes = JSON.stringify({ color: variantData.color });
        }
        if (variantData.promoPrice !== undefined) {
            variantUpdate.promoPrice = variantData.promoPrice ? parseFloat(String(variantData.promoPrice)) : null;
        }
        if (variantData.promoStart !== undefined) {
            variantUpdate.promoStart = variantData.promoStart && variantData.promoStart !== ''
                ? new Date(variantData.promoStart as string) : null;
        }
        if (variantData.promoEnd !== undefined) {
            variantUpdate.promoEnd = variantData.promoEnd && variantData.promoEnd !== ''
                ? new Date(variantData.promoEnd as string) : null;
        }
        if (variantData.expirationDate !== undefined) {
            variantUpdate.expirationDate = variantData.expirationDate && variantData.expirationDate !== ''
                ? new Date(variantData.expirationDate as string) : null;
        }
        if (variantData.manufactureDate !== undefined) {
            variantUpdate.manufactureDate = variantData.manufactureDate && variantData.manufactureDate !== ''
                ? new Date(variantData.manufactureDate as string) : null;
        }
        if (variantData.expiryDateAlert !== undefined) {
            variantUpdate.expiryDateAlert = variantData.expiryDateAlert ? parseInt(String(variantData.expiryDateAlert)) : null;
        }
        if (variantData.isDefault !== undefined) variantUpdate.isDefault = variantData.isDefault;
        if (variantData.isActive !== undefined) variantUpdate.isActive = variantData.isActive;
        if (variantData.status !== undefined) variantUpdate.isActive = variantData.status === 'active';

        return variantUpdate;
    }

    /**
     * Build product update object
     */
    private static buildProductUpdate(updateData: Record<string, any>): Record<string, any> {
        const productUpdate: Record<string, any> = {};

        if (updateData.name !== undefined) productUpdate.name = updateData.name;
        if (updateData.categoryId !== undefined) productUpdate.categoryId = updateData.categoryId || null;
        if (updateData.description !== undefined) productUpdate.description = updateData.description || null;
        if (updateData.brand !== undefined) productUpdate.brand = updateData.brand || null;
        if (updateData.isTaxable !== undefined) productUpdate.isTaxable = updateData.isTaxable;
        if (updateData.supplierName !== undefined) productUpdate.supplierName = updateData.supplierName || null;
        if (updateData.supplierCode !== undefined) productUpdate.supplierCode = updateData.supplierCode || null;
        if (updateData.defaultUnit !== undefined || updateData.unit !== undefined) {
            productUpdate.defaultUnit = updateData.defaultUnit || updateData.unit;
        }
        if (updateData.imageUrl !== undefined) productUpdate.imageUrl = updateData.imageUrl || null;
        if (updateData.isActive !== undefined) productUpdate.isActive = updateData.isActive;

        return productUpdate;
    }

    /**
     * Build inventory update object
     */
    private static buildInventoryUpdate(updateData: Record<string, any>): Record<string, any> {
        const inventoryUpdate: Record<string, any> = {};

        if (updateData.quantity !== undefined) {
            inventoryUpdate.availableQuantity = parseInt(updateData.quantity);
        }
        if (updateData.reservedQuantity !== undefined) {
            inventoryUpdate.reservedQuantity = parseInt(updateData.reservedQuantity);
        }
        if (updateData.costPrice !== undefined) {
            inventoryUpdate.averageCost = parseFloat(updateData.costPrice);
            inventoryUpdate.lastPurchaseCost = parseFloat(updateData.costPrice);
        }
        if (updateData.minStock !== undefined) {
            inventoryUpdate.reorderPoint = updateData.minStock ? parseInt(updateData.minStock) : null;
        }
        if (updateData.reorderLevel !== undefined) {
            inventoryUpdate.reorderPoint = updateData.reorderLevel ? parseInt(updateData.reorderLevel) : null;
        }
        if (updateData.maxStock !== undefined) {
            inventoryUpdate.maxStock = updateData.maxStock ? parseInt(updateData.maxStock) : null;
        }
        if (updateData.trackInventory !== undefined) {
            inventoryUpdate.trackInventory = updateData.trackInventory;
        }
        if (updateData.allowNegativeStock !== undefined) {
            inventoryUpdate.allowNegativeStock = updateData.allowNegativeStock;
        }

        return inventoryUpdate;
    }

    /**
     * Build inventory update from variant data
     */
    private static buildInventoryUpdateFromVariantData(variantData: VariantData): Record<string, any> {
        const inventoryUpdate: Record<string, any> = {};

        if (variantData.quantity !== undefined || variantData.availableQuantity !== undefined) {
            inventoryUpdate.availableQuantity = parseInt(String(variantData.quantity ?? variantData.availableQuantity));
        }
        if (variantData.reservedQuantity !== undefined) {
            inventoryUpdate.reservedQuantity = parseInt(String(variantData.reservedQuantity));
        }
        if (variantData.costPrice !== undefined) {
            inventoryUpdate.averageCost = parseFloat(String(variantData.costPrice));
            inventoryUpdate.lastPurchaseCost = parseFloat(String(variantData.costPrice));
        }
        if (variantData.minStock !== undefined || variantData.reorderLevel !== undefined) {
            const reorderValue = variantData.minStock ?? variantData.reorderLevel;
            inventoryUpdate.reorderPoint = reorderValue ? parseInt(String(reorderValue)) : null;
        }
        if (variantData.maxStock !== undefined) {
            inventoryUpdate.maxStock = variantData.maxStock ? parseInt(String(variantData.maxStock)) : null;
        }
        if (variantData.trackInventory !== undefined) {
            inventoryUpdate.trackInventory = variantData.trackInventory;
        }
        if (variantData.allowNegativeStock !== undefined) {
            inventoryUpdate.allowNegativeStock = variantData.allowNegativeStock;
        }

        return inventoryUpdate;
    }

    /**
     * Void/deactivate a variant
     */
    static async voidVariant(variantId: string): Promise<number> {
        await prisma.productVariant.update({
            where: { id: variantId },
            data: { isActive: false },
        });
        return 1;
    }

    /**
     * Delete a variant
     */
    static async deleteVariant(variantId: string): Promise<number> {
        await prisma.productVariant.delete({
            where: { id: variantId },
        });
        return 1;
    }
}
