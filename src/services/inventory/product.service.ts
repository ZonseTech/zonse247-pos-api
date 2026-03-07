import {
    DbErrorHandler,
    ValidationError,
    ConflictError,
    NotFoundError,
    BusinessLogicError,
} from '../../utils/db-error-handler.util';
import {
    CreateProductInput,
    CreateVariantInput,
    UpdateProductInput,
    UpdateVariantInput,
    ProductWithInventory,
    ProductWithVariants,
    SearchProductResult,
    DuplicateBarcodeResult,
    PaginatedProductsResponse,
} from '../../types/product.types';
import {
    PAGINATION,
    ERROR_MESSAGES,
    normalizeBarcode,
    stringifyCustomAttributes,
} from '../../constants/product.constants';
import {
    mapVariantToProductWithInventory,
    mapProductWithVariants,
    filterByStockStatus,
    filterByStockFilter,
    extractVariantData,
} from '../../utils/product.utils';
import { ProductRepository, TenantBranchScope } from '../../repositories/product.repository';

/**
 * Product Service - handles all product-related business logic
 */
export class ProductService {
    static async checkDuplicateBarcode(
        barcode: string,
        tenantId: string,
        branchId: string,
        excludeVariantId?: string
    ): Promise<DuplicateBarcodeResult> {
        const scope = { tenantId, branchId };

        const primary = await ProductRepository.findByPrimaryBarcode(barcode, scope, excludeVariantId);
        if (primary) {
            return { exists: true, productName: primary.product.name, variantName: primary.variantName, matchType: 'primary' };
        }

        const alternative = await ProductRepository.findByAlternativeBarcode(barcode, scope, excludeVariantId);
        if (alternative) {
            return { exists: true, productName: alternative.variant.product.name, variantName: alternative.variant.variantName, matchType: 'alternative' };
        }

        return { exists: false };
    }

    static async validateBarcodesForDuplicates(
        primaryBarcode: string | undefined,
        alternativeBarcodes: { barcode: string }[] | undefined,
        tenantId: string,
        branchId: string,
        excludeVariantId?: string
    ): Promise<void> {
        const errors: Record<string, string> = {};
        const barcodeSet = new Set<string>();

        if (primaryBarcode) {
            const dup = await this.checkDuplicateBarcode(primaryBarcode, tenantId, branchId, excludeVariantId);
            if (dup.exists) {
                const displayName = dup.variantName ? `${dup.productName} - ${dup.variantName}` : dup.productName;
                errors.primaryBarcode = ERROR_MESSAGES.BARCODE_EXISTS(primaryBarcode, displayName);
            }
            barcodeSet.add(normalizeBarcode(primaryBarcode));
        }

        if (alternativeBarcodes?.length) {
            for (let i = 0; i < alternativeBarcodes.length; i++) {
                const bc = alternativeBarcodes[i];
                const normalized = normalizeBarcode(bc.barcode);

                if (barcodeSet.has(normalized)) {
                    errors[`barcodes[${i}]`] = ERROR_MESSAGES.DUPLICATE_BARCODES_IN_REQUEST(bc.barcode);
                } else {
                    barcodeSet.add(normalized);
                    const dup = await this.checkDuplicateBarcode(bc.barcode, tenantId, branchId, excludeVariantId);
                    if (dup.exists) {
                        const displayName = dup.variantName ? `${dup.productName} - ${dup.variantName}` : dup.productName;
                        errors[`barcodes[${i}]`] = ERROR_MESSAGES.BARCODE_EXISTS(bc.barcode, displayName);
                    }
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Duplicate barcode(s) detected', errors);
        }
    }

    static validateProductInput(data: CreateProductInput): void {
        const errors: Record<string, string> = {};

        if (!data.name || data.name.trim().length === 0) {
            errors.name = ERROR_MESSAGES.NAME_REQUIRED;
        }

        const sellingPrice = data.variant?.sellingPrice ?? data.sellingPrice;
        if (sellingPrice !== undefined && sellingPrice < 0) {
            errors.sellingPrice = ERROR_MESSAGES.INVALID_PRICE;
        }

        if (data.minStock !== undefined && data.maxStock !== undefined && data.minStock > data.maxStock) {
            errors.minStock = ERROR_MESSAGES.MIN_EXCEEDS_MAX(data.minStock, data.maxStock);
        }

        if (data.reorderLevel !== undefined && data.maxStock !== undefined && data.reorderLevel > data.maxStock) {
            errors.reorderLevel = ERROR_MESSAGES.REORDER_EXCEEDS_MAX(data.reorderLevel, data.maxStock);
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Product validation failed', errors);
        }
    }

    private static async validateSkuUniqueness(sku: string, scope: TenantBranchScope, excludeVariantId?: string): Promise<void> {
        const existing = await ProductRepository.findBySku(sku, scope, excludeVariantId);
        if (existing) throw new ConflictError(ERROR_MESSAGES.SKU_EXISTS(sku), 'sku');
    }

    private static async validateCategoryExists(categoryId: string, scope: TenantBranchScope): Promise<void> {
        const category = await ProductRepository.findCategoryById(categoryId, scope);
        if (!category) throw new NotFoundError('Category', categoryId);
    }

    private static async validateVariantNameUniqueness(productId: string, variantName: string, excludeVariantId?: string): Promise<void> {
        const existing = await ProductRepository.findVariantByName(productId, variantName, excludeVariantId);
        if (existing) throw new ConflictError(ERROR_MESSAGES.VARIANT_NAME_EXISTS(variantName), 'variantName');
    }

    private static handleServiceError(error: unknown): never {
        if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError || error instanceof BusinessLogicError) {
            throw error;
        }
        throw DbErrorHandler.handlePrismaError(error);
    }

    static async createProduct(data: CreateProductInput, tenantId: string, branchId: string): Promise<ProductWithInventory> {
        try {
            const scope = { tenantId, branchId };
            this.validateProductInput(data);

            const variantData = extractVariantData(data);

            await this.validateBarcodesForDuplicates(variantData.barcode, variantData.barcodes, tenantId, branchId);
            if (variantData.sku) await this.validateSkuUniqueness(variantData.sku, scope);
            if (data.categoryId) await this.validateCategoryExists(data.categoryId, scope);

            const result = await ProductRepository.createProductWithVariant(
                { name: data.name, categoryId: data.categoryId, description: data.description, brand: data.brand, isTaxable: data.isTaxable, supplierName: data.supplierName, supplierCode: data.supplierCode, defaultUnit: data.defaultUnit, imageUrl: data.imageUrl },
                { productId: '', sku: variantData.sku, variantName: variantData.variantName, primaryBarcode: variantData.barcode, sellingPrice: variantData.sellingPrice, costPrice: variantData.costPrice, unit: variantData.unit, barcodes: variantData.barcodes, inventory: { trackInventory: data.trackInventory, allowNegativeStock: data.allowNegativeStock, reorderLevel: data.reorderLevel, minStock: data.minStock, maxStock: data.maxStock } },
                scope
            );

            return mapVariantToProductWithInventory(result);
        } catch (error) {
            this.handleServiceError(error);
        }
    }

    static async createVariant(data: CreateVariantInput, tenantId: string, branchId: string): Promise<ProductWithInventory> {
        try {
            const scope = { tenantId, branchId };

            await this.validateBarcodesForDuplicates(data.primaryBarcode, data.barcodes, tenantId, branchId);
            if (data.sku) await this.validateSkuUniqueness(data.sku, scope);

            const product = await ProductRepository.findActiveProductById(data.productId, scope);
            if (!product) throw new NotFoundError('Product', data.productId);

            await this.validateVariantNameUniqueness(data.productId, data.variantName);

            const result = await ProductRepository.createVariant(
                { ...data, customAttributes: stringifyCustomAttributes(data.customAttributes), inventory: { trackInventory: data.trackInventory, allowNegativeStock: data.allowNegativeStock, reorderLevel: data.reorderLevel, minStock: data.minStock, maxStock: data.maxStock } },
                scope,
                product.defaultUnit ?? undefined
            );

            return mapVariantToProductWithInventory(result);
        } catch (error) {
            this.handleServiceError(error);
        }
    }

    static async getProductById(productId: string, tenantId: string, branchId: string): Promise<ProductWithVariants | null> {
        const product = await ProductRepository.findProductById(productId, { tenantId, branchId });
        return product ? mapProductWithVariants(product) : null;
    }

    static async getVariantById(variantId: string, tenantId: string, branchId: string): Promise<ProductWithInventory | null> {
        const variant = await ProductRepository.findVariantById(variantId, { tenantId, branchId });
        return variant ? mapVariantToProductWithInventory(variant) : null;
    }

    static async searchProduct(searchTerm: string, tenantId: string, branchId: string): Promise<SearchProductResult | null> {
        const scope = { tenantId, branchId };

        let variant = await ProductRepository.searchBySku(searchTerm, scope);
        if (variant) return { product: mapVariantToProductWithInventory(variant), matchedBy: 'sku' };

        variant = await ProductRepository.searchByPrimaryBarcode(searchTerm, scope);
        if (variant) return { product: mapVariantToProductWithInventory(variant), matchedBy: 'primaryBarcode' };

        const barcode = await ProductRepository.searchByAlternativeBarcode(searchTerm, scope);
        if (barcode) return { product: mapVariantToProductWithInventory(barcode.variant), matchedBy: 'barcode' };

        const product = await ProductRepository.searchByProductName(searchTerm, scope);
        if (product?.variants.length) {
            return { product: mapVariantToProductWithInventory({ ...product.variants[0], product: { ...product, variants: undefined as any } }), matchedBy: 'name' };
        }

        variant = await ProductRepository.searchByVariantName(searchTerm, scope);
        if (variant) return { product: mapVariantToProductWithInventory(variant), matchedBy: 'variantName' };

        return null;
    }

    static async listProducts(
        tenantId: string,
        branchId: string,
        page: number = PAGINATION.DEFAULT_PAGE,
        perPage: number = PAGINATION.DEFAULT_PER_PAGE,
        search = '',
        filter = 'all',
        status?: string,
        categoryId?: string,
        includeInactive = false
    ): Promise<PaginatedProductsResponse> {
        const { results, totalCount } = await ProductRepository.listVariants({ tenantId, branchId }, { page, perPage, search, filter, status, categoryId, includeInactive });

        let products = results.map(mapVariantToProductWithInventory);
        products = filterByStockStatus(products, status);
        products = filterByStockFilter(products, filter);

        const requiresPostFilter = status === 'ACTIVE' || status === 'OUT_OF_STOCK' || filter === 'low-stock' || filter === 'out-of-stock';
        const total = requiresPostFilter ? products.length : totalCount;

        return { products, total, totalPages: Math.ceil(total / perPage) };
    }

    static async updateProduct(productId: string, tenantId: string, branchId: string, data: UpdateProductInput): Promise<ProductWithVariants> {
        const product = await ProductRepository.updateProduct(productId, { tenantId, branchId }, data);
        return mapProductWithVariants(product);
    }

    static async updateVariant(variantId: string, tenantId: string, branchId: string, data: UpdateVariantInput): Promise<ProductWithInventory> {
        const scope = { tenantId, branchId };

        if (data.primaryBarcode || data.barcodes) {
            await this.validateBarcodesForDuplicates(data.primaryBarcode, data.barcodes, tenantId, branchId, variantId);
        }

        const variant = await ProductRepository.updateVariant(variantId, scope, {
            ...data,
            customAttributes: stringifyCustomAttributes(data.customAttributes),
            inventory: (data.trackInventory !== undefined || data.allowNegativeStock !== undefined || data.minStock !== undefined || data.maxStock !== undefined || data.reorderLevel !== undefined)
                ? { trackInventory: data.trackInventory, allowNegativeStock: data.allowNegativeStock, reorderLevel: data.reorderLevel, minStock: data.minStock, maxStock: data.maxStock }
                : undefined,
        });

        if (!variant) throw new NotFoundError('Variant', variantId);
        return mapVariantToProductWithInventory(variant);
    }

    static async deleteProduct(productId: string, tenantId: string, branchId: string): Promise<void> {
        await ProductRepository.softDeleteProduct(productId, { tenantId, branchId });
    }

    static async deleteVariant(variantId: string, tenantId: string, branchId: string): Promise<void> {
        await ProductRepository.softDeleteVariant(variantId, { tenantId, branchId });
    }

    static async addBarcode(variantId: string, tenantId: string, branchId: string, barcode: string, barcodeType: string, barcodeSource: string, description?: string): Promise<void> {
        const scope = { tenantId, branchId };
        const variant = await ProductRepository.findVariantById(variantId, scope);
        if (!variant) throw new NotFoundError('Variant', variantId);

        const dup = await this.checkDuplicateBarcode(barcode, tenantId, branchId, variantId);
        if (dup.exists) {
            const displayName = dup.variantName ? `${dup.productName} - ${dup.variantName}` : dup.productName;
            throw new ConflictError(ERROR_MESSAGES.BARCODE_EXISTS(barcode, displayName), 'barcode');
        }

        await ProductRepository.createBarcode(variantId, barcode, barcodeType, barcodeSource, description);
    }
}
