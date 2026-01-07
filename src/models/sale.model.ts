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
    paymentMethodId?: string;
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
    productId: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    createdAt: Date;
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
    paymentMethodId?: string;
    notes?: string;
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
        taxAmount?: number;
        discountAmount?: number;
    }[];
}

export interface SaleWithItems extends Sale {
    items: (SaleItem & {
        product: {
            id: string;
            name: string;
            sku: string;
        };
    })[];
}

export interface VoidSaleInput {
    voidedBy: string;
    voidReason: string;
}
