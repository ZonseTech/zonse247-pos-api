type PurchaseOrderStatus = 'PENDING' | 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
    id: string;
    purchaseOrderId: string;
    tenantId: string;
    branchId: string;
    supplierId: string;
    requisitionId?: string | null;
    poNumber: string;
    status: PurchaseOrderStatus;
    orderDate: Date;
    expectedDeliveryDate?: Date;
    receivedAt?: Date;
    notes?: string;
    createdBy: string;
    receivedBy?: string;
    isLocked: boolean;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurchaseOrderItem {
    id: string;
    purchaseOrderId: string;
    tenantId: string;
    branchId: string;
    variantId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    damagedQuantity: number;
    invoicedQuantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    variant?: {
        id: string;
        variantName: string;
        sku?: string;
        product?: {
            id: string;
            name: string;
        };
    };
}

export interface CreatePurchaseOrderInput {
    supplierId: string;
    requisitionId?: string;
    expectedDeliveryDate?: string;
    notes?: string;
    createdBy: string;
    items: {
        variantId: string;
        orderedQuantity: number;
        unitPrice: number;
        notes?: string;
    }[];
}

export interface UpdatePurchaseOrderInput {
    supplierId?: string;
    expectedDeliveryDate?: string;
    notes?: string;
    items?: {
        variantId: string;
        orderedQuantity: number;
        unitPrice: number;
        notes?: string;
    }[];
}

export interface ReceivePurchaseOrderInput {
    receivedBy: string;
    items: {
        variantId: string;
        receivedQuantity: number;
        damagedQuantity: number;
    }[];
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
    items: PurchaseOrderItem[];
    supplier?: {
        id: string;
        name: string;
    };
    requisition?: {
        id: string;
        requisitionNumber: string;
    } | null;
}
