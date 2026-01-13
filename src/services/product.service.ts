import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '../databases/prisma/generated/prisma/client';
import { prisma } from '../databases/prisma/client';
import {
    CreateProductInput,
    UpdateProductInput,
    ProductWithInventory,
    SearchProductResult,
} from '../models/product.model';


export class ProductService {
    /**
     * Create a new product
     */
    static async createProduct(data: CreateProductInput, tenantId: string, branchId: string): Promise<ProductWithInventory> {
        const product = await prisma.product.create({
            data: {
                id: uuidv4(),
                tenantId: tenantId,
                branchId: branchId,
                categoryId: data.categoryId,
                sku: data.sku,
                name: data.name,
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

        return this.mapProductWithInventory(product);
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
        // Use a transaction to update product, inventory settings, and barcodes
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
