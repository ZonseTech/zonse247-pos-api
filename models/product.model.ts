import { v4 as uuidv4 } from 'uuid';

export class ProductModel {
    private data: Partial<Product>;

    constructor(productData: Partial<Product> = {}) {
        this.data = productData;
    }

    static create(params: Record<string, any>, auth: AuthenticatedUser): ProductModel {
        const product = new ProductModel({
            productId: uuidv4(),
            barcode: parseInt(params.barcode),
            expirationDate: params.expirationDate,
            costPrice: params.costPrice,
            sellPrice: params.sellPrice,
            promoPrice: params.promoPrice,
            categoryId: params.categoryUuid,
            description: params.description,
            quantity: params.quantity === '' ? 0 : params.quantity,
            originalQuantity: parseInt(params.quantity === '' ? 0 : params.quantity),
            name: params.name,
            stock: params.stock,
            minStock: params.minStock,
            status: 'active',
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
        });

        return product;
    }

    static fromParams(params: Record<string, any>, auth: AuthenticatedUser): ProductModel {
        return new ProductModel({
            productId: params.uuid,
            barcode: parseInt(params.barcode),
            expirationDate: params.expirationDate,
            costPrice: params.costPrice,
            sellPrice: params.sellPrice,
            promoPrice: params.promoPrice,
            categoryId: params.categoryId,
            description: params.description,
            quantity: params.quantity === '' ? 0 : params.quantity,
            originalQuantity: parseInt(params.quantity === '' ? 0 : params.quantity),
            name: params.name,
            stock: params.stock,
            minStock: params.minStock,
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
        });
    }

    validate(): boolean {
        return !!(this.data.name && this.data.barcode && this.data.tenantId && this.data.branchId);
    }

    toJSON(): Product {
        return this.data as Product;
    }

    get productId(): string | undefined {
        return this.data.productId;
    }

    get barcode(): number | string | undefined {
        return this.data.barcode;
    }

    get tenantId(): string | undefined {
        return this.data.tenantId;
    }

    get branchId(): string | undefined {
        return this.data.branchId;
    }

    get userId(): string | undefined {
        return this.data.userId;
    }
}