export type PaymentTerms = 'CASH_ON_DELIVERY' | 'NET_15' | 'NET_30' | 'NET_60' | 'NET_90';
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Supplier {
    id: string;
    tenantId: string;
    branchId: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    paymentTerms: PaymentTerms;
    creditLimit: number;
    status: SupplierStatus;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateSupplierInput {
    tenantId: string;
    branchId: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    paymentTerms?: PaymentTerms;
    creditLimit?: number;
    status?: SupplierStatus;
}

export interface UpdateSupplierInput {
    name?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    paymentTerms?: PaymentTerms;
    creditLimit?: number;
    status?: SupplierStatus;
    isActive?: boolean;
}

export interface SupplierProductHistoryItem {
    variantId: string;
    productId: string;
    productName: string;
    variantName: string;
    sku: string | null;
    unit: string;
    totalOrdered: number;
    totalReceived: number;
    lastUnitPrice: number;
    lastOrderDate: Date;
    lastPoNumber: string;
    orderCount: number;
}
