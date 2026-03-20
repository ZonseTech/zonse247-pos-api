type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED';

// ─── Domain Entities ───────────────────────────────────────────────

export interface SupplierInvoice {
    id: string;
    tenantId: string;
    branchId: string;
    supplierId: string;
    purchaseOrderId?: string | null;
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate?: Date | null;
    status: InvoiceStatus;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SupplierInvoiceItem {
    id: string;
    supplierInvoiceId: string;
    purchaseOrderItemId?: string | null;
    variantId: string;
    tenantId: string;
    branchId: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number | null;
    taxAmount: number;
    discountAmount: number;
    totalPrice: number;
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
    } | null;
}

export interface SupplierInvoiceWithItems extends SupplierInvoice {
    items: SupplierInvoiceItem[];
    supplier?: { id: string; name: string };
    purchaseOrder?: {
        id: string;
        poNumber: string;
    } | null;
}

// ─── 3-Way Match Result ────────────────────────────────────────────

export interface ThreeWayMatchResult {
    purchaseOrderItemId: string;
    variantId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    invoicedQuantity: number;
    match: boolean;
    discrepancies: string[];
}

// ─── DTOs ──────────────────────────────────────────────────────────

export interface CreateSupplierInvoiceInput {
    supplierId: string;
    purchaseOrderId?: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    subtotal?: number;
    taxAmount?: number;
    discountAmount?: number;
    notes?: string;
    items: {
        purchaseOrderItemId?: string;
        variantId: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        taxAmount?: number;
        discountAmount?: number;
        notes?: string;
    }[];
}

export interface UpdateSupplierInvoiceInput {
    dueDate?: string;
    taxAmount?: number;
    discountAmount?: number;
    notes?: string;
    items?: {
        purchaseOrderItemId?: string;
        variantId: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        taxAmount?: number;
        discountAmount?: number;
        notes?: string;
    }[];
}
