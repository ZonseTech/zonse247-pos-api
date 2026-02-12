import { SaleStatus } from '../databases/prisma/generated/prisma/client';

export interface Sale {
    id: string;
    tenantId: string;
    branchId: string;
    saleNumber: string;
    customerId?: string;
    terminalId?: string;
    userId: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    amountPaid: number;
    changeAmount: number;
    paymentMethodId?: string; // Keep for backward compatibility (single payment)
    status: SaleStatus;
    saleDate: Date;
    notes?: string;
    isVoided: boolean;
    voidedAt?: Date;
    voidedBy?: string;
    voidReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SaleItem {
    id: string;
    saleId: string;
    variantId: string;      // Changed from productId
    productId?: string;     // Legacy - kept for backward compatibility
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    createdAt: Date;
}

// NEW: Payment interface for split payments
export interface SalePaymentInput {
    paymentMethodId: string;
    amount: number;
    reference?: string;      // Card ref, mobile money transaction ID
    providerId?: string;     // Payment service provider ID
    providerRef?: string;    // External reference from provider
    notes?: string;
}

export interface SalePayment {
    id: string;
    saleId: string;
    paymentMethodId: string;
    amount: number;
    reference?: string;
    providerId?: string;
    providerRef?: string;
    status: "PENDING" | "COMPLETED" | "REFUNDED" | "CANCELLED" | "FAILED";
    processedAt: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    paymentMethod?: {
        methodId: string;
        name: string;
        icon?: string;
    };
}

export interface CreateSaleInput {
    tenantId: string;
    branchId: string;
    customerId?: string;
    terminalId?: string;
    userId: string;
    taxAmount?: number;
    discountAmount?: number;
    amountPaid: number;
    paymentMethodId?: string; // Single payment (backward compatible)
    payments?: SalePaymentInput[]; // NEW: Multiple payments support
    notes?: string;
    items: {
        variantId: string;      // Now uses variantId
        productId?: string;     // Legacy - kept for backward compatibility, mapped to variantId
        quantity: number;
        unitPrice: number;
        taxAmount?: number;
        discountAmount?: number;
    }[];
}

export interface SaleWithItems extends Sale {
    items: (SaleItem & {
        variant?: {
            id: string;
            variantName: string;
            sku?: string | null;
            product: {
                id: string;
                name: string;
            };
        };
        // Legacy: Flattened product info for backward compatibility
        product?: {
            id: string;
            name: string;
            sku?: string | null;
        };
    })[];
    payments?: SalePayment[]; // NEW: Include payments in response
    // Relations for display
    paymentMethod?: {
        methodId: string;
        name: string;
        icon?: string;
    };
    terminal?: {
        terminalId: string;
        terminalLabel: string;
        terminalCode: string;
    };
    user?: {
        userId: string;
        fullname: string;
        username: string;
    };
    customer?: {
        customerId: string;
        name: string;
        phone?: string;
        email?: string;
    };
}

export interface VoidSaleInput {
    voidedBy: string;
    voidReason: string;
}
