// ─── Status Types ──────────────────────────────────────────────────

type SupplierReturnStatus = 'DRAFT' | 'APPROVED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
type CreditNoteStatus = 'PENDING' | 'APPLIED' | 'CANCELLED';

// ─── Domain Entities ───────────────────────────────────────────────

export interface SupplierReturn {
    id: string;
    tenantId: string;
    branchId: string;
    supplierId: string;
    purchaseOrderId?: string | null;
    goodsReceiptId?: string | null;
    returnNumber: string;
    status: SupplierReturnStatus;
    returnDate: Date;
    returnedBy: string;
    reason?: string | null;
    notes?: string | null;
    totalAmount: number;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SupplierReturnItem {
    id: string;
    supplierReturnId: string;
    goodsReceiptItemId?: string | null;
    variantId: string;
    tenantId: string;
    branchId: string;
    returnQuantity: number;
    unitCost: number;
    totalCost: number;
    reason?: string | null;
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
}

export interface SupplierReturnWithItems extends SupplierReturn {
    items: SupplierReturnItem[];
    supplier?: { id: string; name: string };
    purchaseOrder?: { id: string; poNumber: string } | null;
    goodsReceipt?: { id: string; receiptNumber: string } | null;
    returnedByUser?: { userId: string; firstName: string; lastName: string };
    creditNotes?: SupplierCreditNote[];
}

export interface SupplierCreditNote {
    id: string;
    supplierReturnId: string;
    tenantId: string;
    branchId: string;
    supplierId: string;
    creditNoteNumber: string;
    creditNoteDate: Date;
    amount: number;
    status: CreditNoteStatus;
    appliedToInvoiceId?: string | null;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    supplierReturn?: SupplierReturn;
    appliedToInvoice?: { id: string; invoiceNumber: string } | null;
}

// ─── DTOs ──────────────────────────────────────────────────────────

export interface CreateSupplierReturnInput {
    supplierId: string;
    purchaseOrderId?: string;
    goodsReceiptId?: string;
    reason?: string;
    notes?: string;
    items: {
        goodsReceiptItemId?: string;
        variantId: string;
        returnQuantity: number;
        unitCost: number;
        reason?: string;
        notes?: string;
    }[];
}

export interface UpdateSupplierReturnInput {
    reason?: string;
    notes?: string;
    items?: {
        goodsReceiptItemId?: string;
        variantId: string;
        returnQuantity: number;
        unitCost: number;
        reason?: string;
        notes?: string;
    }[];
}

export interface ApplySupplierCreditNoteInput {
    invoiceId: string;
    notes?: string;
}
