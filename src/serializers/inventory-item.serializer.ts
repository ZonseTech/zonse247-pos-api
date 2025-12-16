import { AuthenticatedUser } from 'auth';
import { InventoryItem } from 'inventory-item';
import { v4 as uuidv4 } from 'uuid';

/**
 * Model class for Inventory Item operations
 * Handles data transformation between API requests and database schema
 */
export class InventoryItemModel {
    private data: Partial<InventoryItem>;

    constructor(inventoryData: Partial<InventoryItem> = {}) {
        this.data = inventoryData;
    }

    /**
     * Create a new inventory item from request parameters
     */
    static create(params: Record<string, any>, auth: AuthenticatedUser): InventoryItemModel {
        const item = new InventoryItemModel({
            productId: uuidv4(),
            barcode: String(params.barcode),
            sku: params.sku,
            name: params.name,
            description: params.description,
            brand: params.brand,
            unit: params.unit || 'piece',
            color: params.color,
            size: params.size,
            dimensions: params.dimensions,
            weight: params.weight ? parseFloat(params.weight) : undefined,
            properties: params.properties,

            // Pricing
            costPrice: params.costPrice ? parseFloat(params.costPrice) : 0,
            sellPrice: params.sellPrice ? parseFloat(params.sellPrice) : 0,
            promoPrice: params.promoPrice ? parseFloat(params.promoPrice) : undefined,
            promoStart: params.promoStart,
            promoEnd: params.promoEnd,

            // Stock
            quantity: params.quantity === '' ? '0' : String(params.quantity || '0'),
            originalQuantity: params.quantity === '' ? '0' : String(params.quantity || '0'),
            reservedQuantity: params.reservedQuantity ? parseInt(params.reservedQuantity) : 0,
            minStock: params.minStock ? parseInt(params.minStock) : 0,
            maxStock: params.maxStock ? parseInt(params.maxStock) : undefined,
            reorderLevel: params.reorderLevel ? parseInt(params.reorderLevel) : undefined,

            // Settings
            trackInventory: params.trackInventory !== false,
            allowNegativeStock: params.allowNegativeStock || false,
            isTaxable: params.isTaxable !== false,
            status: 'active',

            // Dates
            expirationDate: params.expirationDate,
            manufactureDate: params.manufactureDate,

            // Media
            imageUrls: params.imageUrls,

            // Supplier
            supplierName: params.supplierName,
            supplierCode: params.supplierCode,

            // References
            categoryId: params.categoryId || params.categoryUuid,
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
            createdBy: auth.userId,
            lastUpdatedBy: auth.userId,
        });

        return item;
    }

    /**
     * Create inventory item model from update parameters
     */
    static fromParams(params: Record<string, any>, auth: AuthenticatedUser): InventoryItemModel {
        const item: Partial<InventoryItem> = {
            productId: params.productId || params.uuid,
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            userId: auth.userId,
            lastUpdatedBy: auth.userId,
        };

        // Only include fields that are present in params
        if (params.barcode !== undefined) item.barcode = String(params.barcode);
        if (params.sku !== undefined) item.sku = params.sku;
        if (params.name !== undefined) item.name = params.name;
        if (params.description !== undefined) item.description = params.description;
        if (params.brand !== undefined) item.brand = params.brand;
        if (params.unit !== undefined) item.unit = params.unit;
        if (params.color !== undefined) item.color = params.color;
        if (params.size !== undefined) item.size = params.size;
        if (params.dimensions !== undefined) item.dimensions = params.dimensions;
        if (params.weight !== undefined) item.weight = params.weight ? parseFloat(params.weight) : undefined;
        if (params.properties !== undefined) item.properties = params.properties;

        // Pricing
        if (params.costPrice !== undefined) item.costPrice = parseFloat(params.costPrice) || 0;
        if (params.sellPrice !== undefined) item.sellPrice = parseFloat(params.sellPrice) || 0;
        if (params.promoPrice !== undefined) item.promoPrice = params.promoPrice ? parseFloat(params.promoPrice) : undefined;
        if (params.promoStart !== undefined) item.promoStart = params.promoStart;
        if (params.promoEnd !== undefined) item.promoEnd = params.promoEnd;

        // Stock
        if (params.quantity !== undefined) item.quantity = String(params.quantity || '0');
        if (params.originalQuantity !== undefined) item.originalQuantity = String(params.originalQuantity || '0');
        if (params.reservedQuantity !== undefined) item.reservedQuantity = parseInt(params.reservedQuantity) || 0;
        if (params.minStock !== undefined) item.minStock = parseInt(params.minStock) || 0;
        if (params.maxStock !== undefined) item.maxStock = params.maxStock ? parseInt(params.maxStock) : undefined;
        if (params.reorderLevel !== undefined) item.reorderLevel = params.reorderLevel ? parseInt(params.reorderLevel) : undefined;

        // Settings
        if (params.trackInventory !== undefined) item.trackInventory = Boolean(params.trackInventory);
        if (params.allowNegativeStock !== undefined) item.allowNegativeStock = Boolean(params.allowNegativeStock);
        if (params.isTaxable !== undefined) item.isTaxable = Boolean(params.isTaxable);
        if (params.status !== undefined) item.status = params.status;

        // Dates
        if (params.expirationDate !== undefined) item.expirationDate = params.expirationDate;
        if (params.manufactureDate !== undefined) item.manufactureDate = params.manufactureDate;

        // Media
        if (params.imageUrls !== undefined) item.imageUrls = params.imageUrls;

        // Supplier
        if (params.supplierName !== undefined) item.supplierName = params.supplierName;
        if (params.supplierCode !== undefined) item.supplierCode = params.supplierCode;

        // References
        if (params.categoryId !== undefined) item.categoryId = params.categoryId;

        return new InventoryItemModel(item);
    }

    /**
     * Validate required fields
     */
    validate(): boolean {
        return !!(
            this.data.name &&
            this.data.barcode &&
            this.data.tenantId &&
            this.data.branchId
        );
    }

    /**
     * Convert to database-ready JSON
     */
    toJSON(): InventoryItem {
        return this.data as InventoryItem;
    }

    // Getters
    get productId(): string | undefined {
        return this.data.productId;
    }

    get barcode(): string | undefined {
        return this.data.barcode;
    }

    get name(): string | undefined {
        return this.data.name;
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

    get categoryId(): string | undefined {
        return this.data.categoryId;
    }
}

/**
 * @deprecated Use InventoryItemModel instead
 */
export class ProductModel extends InventoryItemModel { }
