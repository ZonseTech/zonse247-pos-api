import { AuthenticatedUser } from 'auth';
import { InventoryItem } from 'inventory-item';
import prisma from '../databases/prisma/client';
import { ProductService } from '../services/inventory/product.service';
import {
    DbErrorHandler,
    ValidationError,
    ConflictError,
    NotFoundError,
    BusinessLogicError,
    ProductErrors,
    InventoryErrors,
} from '../utils/db-error-handler.util';

import { InventoryReadRepository } from './inventory/repositories/inventory-read.repository';
import { InventoryWriteRepository } from './inventory/repositories/inventory-write.repository';
import { InventoryAnalyticsRepository } from './inventory/repositories/inventory-analytics.repository';
import {
    InventoryDetailedCounts,
    InventoryOverview,
    TopValueInventoryItem,
    ProductsWithVariantsResult,
} from './inventory/types/inventory.types';

export class InventoryModel {
    /**
     * Find inventory item by variant ID or product ID
     */
    static async findById(id: string, auth: AuthenticatedUser): Promise<InventoryItem | any | null> {
        return InventoryReadRepository.findById(id, auth);
    }

    /**
     * Find active inventory items
     */
    static async findActive(auth: AuthenticatedUser): Promise<InventoryItem[]> {
        return InventoryReadRepository.findActive(auth);
    }

    /**
     * Find all inventory items, optionally including voided/inactive ones
     * @param auth - Authentication context
     * @param includeVoided - If true, includes inactive/voided items
     */
    static async findAll(auth: AuthenticatedUser, includeVoided = false): Promise<InventoryItem[]> {
        return InventoryReadRepository.findAll(auth, includeVoided);
    }

    /**
     * Find active inventory items with pagination and filters
     */
    static async findActiveWithPagination(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<InventoryItem[]> {
        return InventoryReadRepository.findActiveWithPagination(auth, skip, limit, {
            search,
            filter: filter as any,
            categoryId,
            startDate,
            endDate,
        });
    }

    /**
     * Get filtered count of inventory items
     */
    static async getFilteredCount(
        auth: AuthenticatedUser,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<number> {
        return InventoryReadRepository.getFilteredCount(auth, {
            search,
            filter: filter as any,
            categoryId,
            startDate,
            endDate,
        });
    }

    /**
     * Find by SKU or barcode
     */
    static async findBySku(skuOrBarcode: string, auth: AuthenticatedUser): Promise<InventoryItem | null> {
        return InventoryReadRepository.findBySku(skuOrBarcode, auth);
    }

    /**
     * Check if variant exists
     */
    static async exists(variantId: string, auth: AuthenticatedUser): Promise<boolean> {
        return InventoryReadRepository.exists(variantId, auth);
    }

    /**
     * Find products with their variants grouped
     */
    static async findProductsWithVariants(
        auth: AuthenticatedUser,
        skip: number,
        limit: number,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<ProductsWithVariantsResult> {
        return InventoryReadRepository.findProductsWithVariants(auth, skip, limit, {
            search,
            filter: filter as any,
            categoryId,
            startDate,
            endDate,
        });
    }

    /**
     * Get product count
     */
    static async getProductCount(
        auth: AuthenticatedUser,
        search = '',
        filter = 'all',
        categoryId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<number> {
        return InventoryReadRepository.getProductCount(auth, {
            search,
            filter: filter as any,
            categoryId,
            startDate,
            endDate,
        });
    }

    /**
     * Create a new product with variants
     */
    static async create(inventoryData: Record<string, any>, auth: AuthenticatedUser): Promise<void> {
        try {
            await InventoryWriteRepository.createProductWithVariants(inventoryData as any, auth);
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof BusinessLogicError
            ) {
                throw error;
            }
            console.log(error);
            throw DbErrorHandler.handlePrismaError(error);
        }
    }

    /**
     * Update variant and inventory
     */
    static async update(variantId: string, updateData: Record<string, any>): Promise<number> {
        return InventoryWriteRepository.updateVariant(variantId, updateData);
    }

    /**
     * Update a product with all its variants
     */
    static async updateProductWithVariants(
        productId: string,
        updateData: Record<string, any>,
        auth: AuthenticatedUser
    ): Promise<number> {
        return InventoryWriteRepository.updateProductWithVariants(productId, updateData, auth);
    }

    /**
     * Update with user context
     */
    static async updateWithUser(
        variantId: string,
        updateData: Record<string, any>,
        _auth: AuthenticatedUser
    ): Promise<number> {
        return this.update(variantId, updateData);
    }

    /**
     * Update with validation
     */
    static async updateWithValidation(
        id: string,
        inventoryData: Record<string, any>,
        auth: AuthenticatedUser
    ): Promise<number> {
        try {
            const isProductUpdate = inventoryData.variants && Array.isArray(inventoryData.variants);

            if (isProductUpdate) {
                const productExists = await prisma.product.findFirst({
                    where: { id, tenantId: auth.tenantId, branchId: auth.branchId },
                });

                if (!productExists) {
                    throw new NotFoundError('Product', id);
                }

                if (inventoryData.categoryId !== undefined && inventoryData.categoryId !== null) {
                    const categoryExists = await prisma.category.findFirst({
                        where: {
                            categoryId: inventoryData.categoryId,
                            tenantId: auth.tenantId,
                            branchId: auth.branchId,
                        },
                    });
                    if (!categoryExists) {
                        throw new NotFoundError('Category', inventoryData.categoryId);
                    }
                }

                for (const variantData of inventoryData.variants) {
                    if (!variantData.id) continue;

                    const newBarcode = variantData.barcode || variantData.primaryBarcode;
                    if (newBarcode !== undefined && newBarcode !== null && newBarcode !== '') {
                        const duplicateCheck = await ProductService.checkDuplicateBarcode(
                            newBarcode,
                            auth.tenantId,
                            auth.branchId,
                            variantData.id
                        );
                        if (duplicateCheck.exists) {
                            throw new ConflictError(
                                ProductErrors.BARCODE_EXISTS(newBarcode, duplicateCheck.productName),
                                'barcode'
                            );
                        }
                    }

                    const minStock = variantData.minStock !== undefined ? parseInt(variantData.minStock) : null;
                    const maxStock = variantData.maxStock !== undefined ? parseInt(variantData.maxStock) : null;
                    if (minStock !== null && maxStock !== null && minStock > maxStock) {
                        throw new ValidationError('Invalid stock configuration', {
                            minStock: InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock),
                        });
                    }
                }

                return await this.updateProductWithVariants(id, inventoryData, auth);
            }

            const exists = await this.exists(id, auth);
            if (!exists) {
                throw new NotFoundError('Product', id);
            }

            const minStock = inventoryData.minStock !== undefined ? parseInt(inventoryData.minStock) : null;
            const maxStock = inventoryData.maxStock !== undefined ? parseInt(inventoryData.maxStock) : null;

            if (minStock !== null && maxStock !== null && minStock > maxStock) {
                throw new ValidationError('Invalid stock configuration', {
                    minStock: InventoryErrors.MIN_EXCEEDS_MAX(minStock, maxStock),
                });
            }

            const newBarcode = inventoryData.barcode || inventoryData.primaryBarcode;
            if (newBarcode !== undefined) {
                const duplicateCheck = await ProductService.checkDuplicateBarcode(
                    newBarcode,
                    auth.tenantId,
                    auth.branchId,
                    id
                );
                if (duplicateCheck.exists) {
                    throw new ConflictError(
                        ProductErrors.BARCODE_EXISTS(newBarcode, duplicateCheck.productName),
                        'barcode'
                    );
                }
            }

            if (inventoryData.categoryId !== undefined && inventoryData.categoryId !== null) {
                const categoryExists = await prisma.category.findFirst({
                    where: {
                        categoryId: inventoryData.categoryId,
                        tenantId: auth.tenantId,
                        branchId: auth.branchId,
                    },
                });
                if (!categoryExists) {
                    throw new NotFoundError('Category', inventoryData.categoryId);
                }
            }

            return await this.update(id, inventoryData);
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof BusinessLogicError
            ) {
                throw error;
            }
            throw DbErrorHandler.handlePrismaError(error);
        }
    }

    /**
     * Void/deactivate variant
     */
    static async void(variantId: string, _auth: AuthenticatedUser): Promise<number> {
        return InventoryWriteRepository.voidVariant(variantId);
    }

    /**
     * Void with existence check
     */
    static async voidWithCheck(variantId: string, auth: AuthenticatedUser): Promise<number> {
        const exists = await this.exists(variantId, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }
        return this.void(variantId, auth);
    }

    /**
     * Delete variant
     */
    static async delete(variantId: string): Promise<number> {
        return InventoryWriteRepository.deleteVariant(variantId);
    }

    /**
     * Delete with existence check
     */
    static async deleteWithCheck(variantId: string, auth: AuthenticatedUser): Promise<number> {
        const exists = await this.exists(variantId, auth);
        if (!exists) {
            throw new Error('Inventory item not found or access denied');
        }
        return this.delete(variantId);
    }

    // ============================================================
    // ANALYTICS OPERATIONS
    // ============================================================

    /**
     * Get detailed inventory counts
     */
    static async getDetailedCounts(auth: AuthenticatedUser): Promise<InventoryDetailedCounts> {
        return InventoryAnalyticsRepository.getDetailedCounts(auth);
    }

    /**
     * Get comprehensive inventory overview
     */
    static async getInventoryOverview(
        auth: AuthenticatedUser,
        options: {
            search?: string;
            filter?: string;
            categoryId?: string;
            startDate?: string;
            endDate?: string;
        } = {}
    ): Promise<InventoryOverview> {
        return InventoryAnalyticsRepository.getInventoryOverview(auth, options as any);
    }

    /**
     * Get top valuable inventory items
     */
    static async getTopValueInventoryItems(
        auth: AuthenticatedUser,
        limit = 10
    ): Promise<TopValueInventoryItem[]> {
        return InventoryAnalyticsRepository.getTopValueInventoryItems(auth, limit);
    }

    static async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}
