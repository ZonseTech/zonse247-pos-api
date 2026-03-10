import { PurchaseOrderStatus } from '../databases/prisma/generated/prisma/client';

export interface PurchaseOrder {
    id: string;
    purchaseOrderId: string;
    tenantId: string;
    branchId: string;
    supplierId: string;
    poNumber: string;
    status: PurchaseOrderStatus;
    orderDate: Date;
    expectedDeliveryDate?: Date;
    receivedAt?: Date;
    notes?: string;
    createdBy: string;
    receivedBy?: string;
    isLocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurchaseOrderItem {
    id: string;
    purchaseOrderId: string;
    variantId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    damagedQuantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
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
    tenantId: string;
    branchId: string;
    supplierId: string;
    expectedDeliveryDate?: string;
    notes?: string;
    createdBy: string;
    items: {
        variantId: string;
        orderedQuantity: number;
        unitPrice: number;
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
}
