type GRNStatus = 'DRAFT' | 'VERIFIED' | 'POSTED' | 'CANCELLED';

// ─── Domain Entities ───────────────────────────────────────────────

export interface GoodsReceipt {
    id: string;
    tenantId: string;
    branchId: string;
    purchaseOrderId: string;
    receiptNumber: string;
    status: GRNStatus;
    receivedAt: Date;
    receivedBy: string;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface GoodsReceiptItem {
    id: string;
    goodsReceiptId: string;
    purchaseOrderItemId: string;
    variantId: string;
    tenantId: string;
    branchId: string;
    receivedQuantity: number;
    rejectedQuantity: number;
    rejectionReason?: string | null;
    unitCost: number;
    totalCost: number;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    variant?: {
        id: string;
        variantName: string;
        sku?: string | null;
        product?: { id: string; name: string };
    };
    purchaseOrderItem?: {
        id: string;
        orderedQuantity: number;
        receivedQuantity: number;
        damagedQuantity: number;
    };
}

export interface GoodsReceiptWithItems extends GoodsReceipt {
    items: GoodsReceiptItem[];
    purchaseOrder?: {
        id: string;
        poNumber: string;
        supplierId: string;
        supplier?: { id: string; name: string };
    };
    receivedByUser?: { userId: string; firstName: string; lastName: string };
}

// ─── DTOs ──────────────────────────────────────────────────────────

export interface CreateGoodsReceiptInput {
    purchaseOrderId: string;
    notes?: string;
    items: {
        purchaseOrderItemId: string;
        variantId: string;
        receivedQuantity: number;
        rejectedQuantity?: number;
        rejectionReason?: string;
        unitCost: number;
        notes?: string;
    }[];
}

export interface UpdateGoodsReceiptInput {
    notes?: string;
    items?: {
        purchaseOrderItemId: string;
        variantId: string;
        receivedQuantity: number;
        rejectedQuantity?: number;
        rejectionReason?: string;
        unitCost: number;
        notes?: string;
    }[];
}

export interface VerifyGoodsReceiptInput {
    notes?: string;
}

export interface PostGoodsReceiptInput {
    notes?: string;
}
