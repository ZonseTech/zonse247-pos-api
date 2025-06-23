import { v4 as uuidv4 } from 'uuid';

export class ProductModel {
    private data: Partial<Product>;

    constructor(productData: Partial<Product> = {}) {
        this.data = productData;
    }

    static create(params: Record<string, any>, auth: AuthenticatedUser): ProductModel {
        const product = new ProductModel({
            uuid: uuidv4(),
            barcode: parseInt(params.barcode),
            expirationDate: params.expirationDate,
            costPrice: params.costPrice,
            sellPrice: params.sellPrice,
            promoPrice: params.promoPrice,
            customPrice: params.customPrice,
            categoryUuid: params.categoryUuid,
            description: params.description,
            quantity: params.quantity === '' ? 0 : params.quantity,
            originalQuantity: parseInt(params.quantity === '' ? 0 : params.quantity),
            name: params.name,
            stock: params.stock,
            minStock: params.minStock,
            status: 'active',
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid,
            userUuid: auth.userUuid,
        });

        return product;
    }

    static fromParams(params: Record<string, any>, auth: AuthenticatedUser): ProductModel {
        return new ProductModel({
            uuid: params.uuid,
            barcode: parseInt(params.barcode),
            expirationDate: params.expirationDate,
            costPrice: params.costPrice,
            sellPrice: params.sellPrice,
            promoPrice: params.promoPrice,
            customPrice: params.customPrice,
            categoryUuid: params.categoryUuid,
            description: params.description,
            quantity: params.quantity === '' ? 0 : params.quantity,
            originalQuantity: parseInt(params.quantity === '' ? 0 : params.quantity),
            name: params.name,
            stock: params.stock,
            minStock: params.minStock,
            clientUuid: auth.clientUuid,
            shopUuid: auth.shopUuid,
            userUuid: auth.userUuid,
        });
    }

    validate(): boolean {
        return !!(this.data.name && this.data.barcode && this.data.clientUuid && this.data.shopUuid);
    }

    toJSON(): Product {
        return this.data as Product;
    }

    get uuid(): string | undefined {
        return this.data.uuid;
    }

    get barcode(): number | string | undefined {
        return this.data.barcode;
    }

    get clientUuid(): string | undefined {
        return this.data.clientUuid;
    }

    get shopUuid(): string | undefined {
        return this.data.shopUuid;
    }

    get userUuid(): string | undefined {
        return this.data.userUuid;
    }
}