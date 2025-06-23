interface Product {
    uuid: string;
    barcode: number | string;
    expirationDate?: string;
    createdAt?: string;
    clientUuid?: string;
    shopUuid?: string;
    userUuid?: string;
    updatedAt?: string;
    costPrice?: string;
    description?: string;
    sellPrice?: string;
    promoPrice?: string;
    customPrice?: string;
    categoryUuid?: string;
    quantity?: string | number;
    orderItems?: number;
    originalQuantity?: number;
    name?: string;
    stock?: number;
    minStock?: string;
    status?: string;
    isExpired?: boolean;
    categoryDetails?: Category;
    synced?: 1 | 0;
}