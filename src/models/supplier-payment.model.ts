type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

// ─── Domain Entities ───────────────────────────────────────────────

export interface SupplierPayment {
    id: string;
    tenantId: string;
    branchId: string;
    supplierId: string;
    paymentNumber: string;
    paymentDate: Date;
    amount: number;
    paymentMethod?: string | null;
    reference?: string | null;
    status: PaymentStatus;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SupplierPaymentAllocation {
    id: string;
    tenantId: string;
    branchId: string;
    paymentId: string;
    invoiceId: string;
    allocatedAmount: number;
    allocatedDate: Date;
    notes?: string | null;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    invoice?: {
        id: string;
        invoiceNumber: string;
        totalAmount: number;
        amountPaid: number;
        balanceDue: number;
        status: string;
    };
}

export interface SupplierPaymentWithAllocations extends SupplierPayment {
    allocations: SupplierPaymentAllocation[];
    supplier?: { id: string; name: string };
}

// ─── DTOs ──────────────────────────────────────────────────────────

export interface CreateSupplierPaymentInput {
    supplierId: string;
    paymentDate?: string;
    amount: number;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    allocations: {
        invoiceId: string;
        allocatedAmount: number;
        notes?: string;
    }[];
}

export interface VoidSupplierPaymentInput {
    reason?: string;
}
