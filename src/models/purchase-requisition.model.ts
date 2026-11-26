type RequisitionStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'CANCELLED';

// ─── Domain Entities ───────────────────────────────────────────────

export interface PurchaseRequisition {
    id: string;
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    requisitionNumber: string;
    requestedBy: string;
    status: RequisitionStatus;
    notes?: string | null;
    approvedAt?: Date | null;
    approvedBy?: string | null;
    rejectedAt?: Date | null;
    rejectedBy?: string | null;
    rejectedReason?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurchaseRequisitionItem {
    id: string;
    requisitionId: string;
    variantId: string;
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    requestedQuantity: number;
    approvedQuantity?: number | null;
    orderedQuantity: number;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    variant?: {
        id: string;
        variantName: string;
        sku?: string | null;
        product?: {
            id: string;
            name: string;
        };
    };
}

// ─── Composed Types ────────────────────────────────────────────────

export interface PurchaseRequisitionWithItems extends PurchaseRequisition {
    items: PurchaseRequisitionItem[];
    requestedByUser?: {
        userId: string;
        firstName: string;
        lastName: string;
    };
    approvedByUser?: {
        userId: string;
        firstName: string;
        lastName: string;
    } | null;
}

// ─── Input DTOs ────────────────────────────────────────────────────

export interface CreateRequisitionInput {
    notes?: string;
    items: {
        variantId: string;
        requestedQuantity: number;
        notes?: string;
    }[];
}

export interface UpdateRequisitionInput {
    notes?: string;
    items?: {
        variantId: string;
        requestedQuantity: number;
        notes?: string;
    }[];
}

export interface ApproveRequisitionInput {
    items?: {
        variantId: string;
        approvedQuantity: number;
    }[];
}

export interface RejectRequisitionInput {
    rejectedReason?: string;
}
