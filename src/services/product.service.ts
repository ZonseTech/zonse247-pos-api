import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '../databases/prisma/generated/prisma/client';
import { prisma } from '../databases/prisma/client';
import {
    CreateProductInput,
    UpdateProductInput,
    ProductWithInventory,
    SearchProductResult,
} from '../models/product.model';
import {
    DbErrorHandler,
    ValidationError,
    ConflictError,
    NotFoundError,
    BusinessLogicError,
    ProductErrors,
    InventoryErrors,
} from '../utils/db-error-handler.util';


export class ProductService {
    /**
     * Check if a barcode already exists in the store (tenant + branch)
     * Returns the product name if duplicate found, null otherwise
     */
    static async checkDuplicateBarcode(
        barcode: string,
        tenantId: string,
        branchId: string,
        excludeProductId?: string
    ): Promise<{ exists: boolean; productName?: string; matchType?: 'primary' | 'alternative' }> {
        const existingPrimaryBarcode = await prisma.product.findFirst({
            where: {
                primaryBarcode: barcode,
                tenantId,
                branchId,
                isActive: true,
                ...(excludeProductId && { id: { not: excludeProductId } }),
            },
            select: { id: true, name: true },
        });

        if (existingPrimaryBarcode) {
            return {
                exists: true,
                productName: existingPrimaryBarcode.name,
                matchType: 'primary',
            };
        }

        const existingAlternativeBarcode = await prisma.productBarcode.findFirst({
            where: {
                barcode,
                isActive: true,
                product: {
                    tenantId,
                    branchId,
                    isActive: true,
                    ...(excludeProductId && { id: { not: excludeProductId } }),
                },
            },
            include: {
                product: {
                    select: { id: true, name: true },
                },
            },
        });

        if (existingAlternativeBarcode) {
            return {
                exists: true,
                productName: existingAlternativeBarcode.product.name,
                matchType: 'alternative',
            };
        }

        return { exists: false };
    }

    /**
     * Validate all barcodes for duplicates before creating/updating a product
     */
    static async validateBarcodesForDuplicates(
        primaryBarcode: string | undefined,
        alternativeBarcodes: { barcode: string }[] | undefined,
        tenantId: string,
        branchId: string,
        excludeProductId?: string
    ): Promise<void> {
        const errors: Record<string, string> = {};
        const barcodeSet = new Set<string>();

        // Validate primary barcode
        if (primaryBarcode) {
            const duplicateCheck = await this.checkDuplicateBarcode(
                primaryBarcode,
                tenantId,
                branchId,
                excludeProductId
            );
            if (duplicateCheck.exists) {
                errors.primaryBarcode = ProductErrors.BARCODE_EXISTS(primaryBarcode, duplicateCheck.productName);
            }
            barcodeSet.add(primaryBarcode.toLowerCase());
        }

        // Validate alternative barcodes
        if (alternativeBarcodes && alternativeBarcodes.length > 0) {
            for (let i = 0; i < alternativeBarcodes.length; i++) {
                const bc = alternativeBarcodes[i];
                const normalizedBarcode = bc.barcode.toLowerCase();

                // Check for duplicates within the request itself
                if (barcodeSet.has(normalizedBarcode)) {
                    errors[`barcodes[${i}]`] = ProductErrors.DUPLICATE_BARCODES_IN_REQUEST(bc.barcode);
                } else {
                    barcodeSet.add(normalizedBarcode);

                    // Check for duplicates in the database
                    const duplicateCheck = await this.checkDuplicateBarcode(
                        bc.barcode,
                        tenantId,
                        branchId,
                        excludeProductId
                    );
                    if (duplicateCheck.exists) {
                        errors[`barcodes[${i}]`] = ProductErrors.BARCODE_EXISTS(bc.barcode, duplicateCheck.productName);
                    }
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Duplicate barcode(s) detected', errors);
        }
    }

    /**
     * Validate product input data
     */
    static validateProductInput(data: CreateProductInput): void {
        const errors: Record<string, string> = {};

        if (!data.name || data.name.trim().length === 0) {
            errors.name = 'Product name is required.';
        }

        if (!data.sku || data.sku.trim().length === 0) {
            errors.sku = 'SKU is required.';
        }

        if (data.sellingPrice !== undefined && data.sellingPrice < 0) {
            errors.sellingPrice = ProductErrors.INVALID_PRICE;
        }

        if (data.minStock !== undefined && data.maxStock !== undefined) {
            if (data.minStock > data.maxStock) {
                errors.minStock = InventoryErrors.MIN_EXCEEDS_MAX(data.minStock, data.maxStock);
            }
        }

        if (data.reorderLevel !== undefined && data.maxStock !== undefined) {
            if (data.reorderLevel > data.maxStock) {
                errors.reorderLevel = InventoryErrors.REORDER_EXCEEDS_MAX(data.reorderLevel, data.maxStock);
            }
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Product validation failed', errors);
        }
    }

    /**
     * Create a new product with inventory
     */
    static async createProduct(data: CreateProductInput, tenantId: string, branchId: string): Promise<ProductWithInventory> {
        try {
            // Validate input data
            this.validateProductInput(data);

            // Check for duplicate barcodes
            await this.validateBarcodesForDuplicates(
                data.primaryBarcode,
                data.barcodes,
                tenantId,
                branchId
            );

            // Check for duplicate SKU
            const existingSku = await prisma.product.findFirst({
                where: {
                    sku: data.sku,
                    tenantId,
                    branchId,
                    isActive: true,
                },
                select: { id: true, name: true },
            });

            if (existingSku) {
                throw new ConflictError(ProductErrors.SKU_EXISTS(data.sku), 'sku');
            }

            // Verify category exists if provided
            if (data.categoryId) {
                const categoryExists = await prisma.category.findFirst({
                    where: {
                        categoryId: data.categoryId,
                        tenantId,
                        branchId,
                    },
                });
                if (!categoryExists) {
                    throw new NotFoundError('Category', data.categoryId);
                }
            }

            const product = await prisma.$transaction(async (tx) => {
                const newProduct = await tx.product.create({
                    data: {
                        id: uuidv4(),
                        tenantId: tenantId,
                        branchId: branchId,
                        categoryId: data.categoryId,
                        sku: data.sku,
                        name: data.name.trim(),
                        primaryBarcode: data.primaryBarcode,
                        description: data.description,
                        unit: data.unit || 'piece',
                        sellingPrice: data.sellingPrice,
                        productBarcodes: data.barcodes
                            ? {
                                create: data.barcodes.map((bc) => ({
                                    id: uuidv4(),
                                    barcode: bc.barcode,
                                    barcodeType: bc.barcodeType || 'EAN13',
                                    barcodeSource: bc.barcodeSource || 'SUPPLIER',
                                    description: bc.description,
                                })),
                            }
                            : undefined,
                        inventories: {
                            create: {
                                id: uuidv4(),
                                tenantId: tenantId,
                                branchId: branchId,
                                availableQuantity: 0,
                                reservedQuantity: 0,
                                damagedQuantity: 0,
                                averageCost: 0,
                                lastPurchaseCost: 0,
                                reorderPoint: data.reorderLevel || data.minStock,
                                maxStock: data.maxStock,
                                trackInventory: data.trackInventory !== undefined ? data.trackInventory : true,
                                allowNegativeStock: data.allowNegativeStock !== undefined ? data.allowNegativeStock : false,
                            },
                        },
                    },
                    include: {
                        inventories: true,
                        productBarcodes: true,
                        category: true,
                    },
                });

                return newProduct;
            });

            return this.mapProductWithInventory(product);
        } catch (error) {
            // Re-throw if it's already a handled error
            if (error instanceof ValidationError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof BusinessLogicError) {
                throw error;
            }

            // Handle Prisma errors
            throw DbErrorHandler.handlePrismaError(error);
        }
    }

    /**
     * Get product by ID with inventory
     */
    static async getProductById(
        productId: string,
        tenantId: string,
        branchId: string
    ): Promise<ProductWithInventory | null> {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                tenantId,
                branchId,
            },
            include: {
                inventories: true,
                productBarcodes: {
                    where: { isActive: true },
                },
                category: true,
            },
        });

        if (!product) return null;

        return this.mapProductWithInventory(product);
    }

    /**
     * Search product by SKU, barcode, or name
     */
    static async searchProduct(
        searchTerm: string,
        tenantId: string,
        branchId: string
    ): Promise<SearchProductResult | null> {
        // First try exact match on SKU
        let product = await prisma.product.findFirst({
            where: {
                sku: searchTerm,
                tenantId,
                branchId,
                isActive: true,
            },
            include: {
                inventories: true,
                productBarcodes: {
                    where: { isActive: true },
                },
                category: true,
            },
        });

        if (product) {
            return {
                product: this.mapProductWithInventory(product),
                matchedBy: 'sku',
            };
        }

        // Try primary barcode
        product = await prisma.product.findFirst({
            where: {
                primaryBarcode: searchTerm,
                tenantId,
                branchId,
                isActive: true,
            },
            include: {
                inventories: true,
                productBarcodes: {
                    where: { isActive: true },
                },
                category: true,
            },
        });

        if (product) {
            return {
                product: this.mapProductWithInventory(product),
                matchedBy: 'primaryBarcode',
            };
        }

        // Try alternative barcodes
        const barcode = await prisma.productBarcode.findFirst({
            where: {
                barcode: searchTerm,
                isActive: true,
                product: {
                    tenantId,
                    branchId,
                    isActive: true,
                },
            },
            include: {
                product: {
                    include: {
                        inventories: true,
                        productBarcodes: {
                            where: { isActive: true },
                        },
                        category: true,
                    },
                },
            },
        });

        if (barcode) {
            return {
                product: this.mapProductWithInventory(barcode.product),
                matchedBy: 'barcode',
            };
        }

        // Finally, try name (partial match)
        product = await prisma.product.findFirst({
            where: {
                name: {
                    contains: searchTerm,
                },
                tenantId,
                branchId,
                isActive: true,
            },
            include: {
                inventories: true,
                productBarcodes: {
                    where: { isActive: true },
                },
                category: true,
            },
        });

        if (product) {
            return {
                product: this.mapProductWithInventory(product),
                matchedBy: 'name',
            };
        }

        return null;
    }

    /**
     * List all products for a branch
     */
    static async listProducts(
        tenantId: string,
        branchId: string,
        page = 1,
        perPage = 10,
        search = '',
        filter = 'all',
        status?: string,
        categoryId?: string,
        includeInactive = false
    ): Promise<{ products: ProductWithInventory[]; total: number; totalPages: number }> {
        const skip = (page - 1) * perPage;

        const whereClause: Prisma.ProductWhereInput = {
            tenantId,
            branchId,
        };

        // Status filter (frontend: ACTIVE, INACTIVE, OUT_OF_STOCK, DISCONTINUED)
        if (status === 'ACTIVE') {
            whereClause.isActive = true;
            // Will post-filter to exclude out of stock
        } else if (status === 'INACTIVE' || status === 'DISCONTINUED') {
            whereClause.isActive = false;
        } else if (status === 'OUT_OF_STOCK') {
            whereClause.isActive = true;
            // Will post-filter for availableQuantity = 0
        } else if (filter === 'all' && !includeInactive) {
            whereClause.isActive = true;
        } else if (filter === 'active') {
            whereClause.isActive = true;
        } else if (filter === 'inactive') {
            whereClause.isActive = false;
        } else if (filter === 'new' || filter === 'new-stock') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            whereClause.createdAt = { gte: oneWeekAgo };
            whereClause.isActive = true;
        } else if (filter === 'low-stock' || filter === 'out-of-stock') {
            whereClause.isActive = true;
            // Will filter in post-processing
        } else if (!includeInactive) {
            whereClause.isActive = true;
        }

        // Filter by category
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        // Search
        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { primaryBarcode: { contains: search } },
                {
                    productBarcodes: {
                        some: {
                            barcode: { contains: search }
                        }
                    }
                }
            ];
        }

        const [results, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                include: {
                    inventories: true,
                    productBarcodes: {
                        where: { isActive: true },
                    },
                    category: true,
                },
                skip,
                take: perPage,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.product.count({ where: whereClause }),
        ]);

        let products = results.map((p) => this.mapProductWithInventory(p));

        // Post-process for status filters
        if (status === 'ACTIVE') {
            // Exclude out of stock items from active
            products = products.filter(product =>
                product.inventory && product.inventory.availableQuantity > 0
            );
        } else if (status === 'OUT_OF_STOCK') {
            products = products.filter(product =>
                product.inventory && product.inventory.availableQuantity === 0
            );
        } else if (filter === 'low-stock') {
            products = products.filter(product => {
                if (!product.inventory) return false;
                const reorderPoint = product.inventory.reorderPoint || 0;
                return product.inventory.availableQuantity > 0 && product.inventory.availableQuantity <= reorderPoint;
            });
        } else if (filter === 'out-of-stock') {
            products = products.filter(product =>
                product.inventory && product.inventory.availableQuantity === 0
            );
        }

        const total = (status === 'ACTIVE' || status === 'OUT_OF_STOCK' || filter === 'low-stock' || filter === 'out-of-stock')
            ? products.length
            : totalCount;
        const totalPages = Math.ceil(total / perPage);

        return {
            products,
            total,
            totalPages,
        };
    }

    /**
     * Update product
     */
    static async updateProduct(
        productId: string,
        tenantId: string,
        branchId: string,
        data: UpdateProductInput
    ): Promise<ProductWithInventory> {
        await this.validateBarcodesForDuplicates(
            data.primaryBarcode,
            data.barcodes,
            tenantId,
            branchId,
            productId
        );

        const product = await prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: {
                    id: productId,
                    tenantId,
                    branchId,
                },
                data: {
                    name: data.name,
                    categoryId: data.categoryId,
                    primaryBarcode: data.primaryBarcode,
                    description: data.description,
                    unit: data.unit,
                    sellingPrice: data.sellingPrice,
                    isActive: data.isActive,
                },
            });

            if (
                data.trackInventory !== undefined ||
                data.allowNegativeStock !== undefined ||
                data.minStock !== undefined ||
                data.maxStock !== undefined ||
                data.reorderLevel !== undefined
            ) {
                await tx.inventory.updateMany({
                    where: {
                        productId,
                        tenantId,
                        branchId,
                    },
                    data: {
                        ...(data.trackInventory !== undefined && { trackInventory: data.trackInventory }),
                        ...(data.allowNegativeStock !== undefined && { allowNegativeStock: data.allowNegativeStock }),
                        ...(data.reorderLevel !== undefined && { reorderPoint: data.reorderLevel }),
                        ...(data.minStock !== undefined && { reorderPoint: data.minStock }),
                        ...(data.maxStock !== undefined && { maxStock: data.maxStock }),
                    },
                });
            }

            if (data.barcodes !== undefined) {
                await tx.productBarcode.updateMany({
                    where: {
                        productId,
                    },
                    data: {
                        isActive: false,
                    },
                });

                if (data.barcodes.length > 0) {
                    await tx.productBarcode.createMany({
                        data: data.barcodes.map((bc) => ({
                            id: uuidv4(),
                            productId,
                            barcode: bc.barcode,
                            barcodeType: bc.barcodeType || 'EAN13',
                            barcodeSource: bc.barcodeSource || 'SUPPLIER',
                            description: bc.description,
                            isActive: true,
                        })),
                    });
                }
            }

            return tx.product.findUnique({
                where: { id: productId },
                include: {
                    inventories: true,
                    productBarcodes: {
                        where: { isActive: true },
                    },
                    category: true,
                },
            });
        });

        if (!product) {
            throw new Error('Product not found');
        }

        return this.mapProductWithInventory(product);
    }

    /**
     * Delete (deactivate) product
     */
    static async deleteProduct(
        productId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        await prisma.product.update({
            where: {
                id: productId,
                tenantId,
                branchId,
            },
            data: {
                isActive: false,
            },
        });
    }

    /**
     * Add barcode to product
     */
    static async addBarcode(
        productId: string,
        tenantId: string,
        branchId: string,
        barcode: string,
        barcodeType: string,
        barcodeSource: string,
        description?: string
    ): Promise<void> {
        // Verify product belongs to tenant and branch
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                tenantId,
                branchId,
            },
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const duplicateCheck = await this.checkDuplicateBarcode(
            barcode,
            tenantId,
            branchId,
            productId
        );

        if (duplicateCheck.exists) {
            throw new Error(
                `Barcode "${barcode}" is already assigned to product "${duplicateCheck.productName}"`
            );
        }

        await prisma.productBarcode.create({
            data: {
                id: uuidv4(),
                productId,
                barcode,
                barcodeType: barcodeType as any,
                barcodeSource: barcodeSource as any,
                description,
            },
        });
    }

    /**
     * Helper: Map product with inventory
     */
    private static mapProductWithInventory(product: any): ProductWithInventory {
        const inventory = product.inventories?.[0] || product.inventory;

        // Determine status based on isActive and inventory
        let status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' = 'ACTIVE';
        if (!product.isActive) {
            status = 'DISCONTINUED'; // or 'INACTIVE'
        } else if (inventory && inventory.availableQuantity === 0) {
            status = 'OUT_OF_STOCK';
        } else {
            status = 'ACTIVE';
        }

        return {
            id: product.id,
            tenantId: product.tenantId,
            branchId: product.branchId,
            categoryId: product.categoryId,
            sku: product.sku,
            name: product.name,
            primaryBarcode: product.primaryBarcode,
            description: product.description,
            unit: product.unit,
            sellingPrice: Number(product.sellingPrice),
            isActive: product.isActive,
            status: status,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            inventory: inventory
                ? {
                    availableQuantity: inventory.availableQuantity,
                    reservedQuantity: inventory.reservedQuantity,
                    damagedQuantity: inventory.damagedQuantity,
                    averageCost: Number(inventory.averageCost),
                    lastPurchaseCost: Number(inventory.lastPurchaseCost),
                    reorderPoint: inventory.reorderPoint,
                    maxStock: inventory.maxStock,
                    trackInventory: inventory.trackInventory,
                    allowNegativeStock: inventory.allowNegativeStock,
                }
                : undefined,
            categoryDetails: product.category
                ? {
                    categoryId: product.category.categoryId,
                    name: product.category.name,
                    description: product.category.description,
                    isActive: product.category.isActive,
                    isDefault: product.category.isDefault,
                }
                : undefined,
            barcodes: product.productBarcodes?.map((bc: any) => ({
                id: bc.id,
                productId: bc.productId,
                barcode: bc.barcode,
                barcodeType: bc.barcodeType,
                barcodeSource: bc.barcodeSource,
                description: bc.description,
                isActive: bc.isActive,
                createdAt: bc.createdAt,
                updatedAt: bc.updatedAt,
            })),
        };
    }
}
