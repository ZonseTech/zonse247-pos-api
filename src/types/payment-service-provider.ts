export type PaymentServiceProvider = {
    providerId: string;
    name: string;
    tenantId: string;
    branchId: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
    logoUrl?: string;
    synced?: number;
};

export interface CreatePaymentServiceProviderRequest {
    name: string;
    tenantId: string;
    branchId: string;
    userId: string;
    logoUrl: string;
}

export interface UpdatePaymentServiceProviderDto {
    name?: string;
    tenantId?: string;
    branchId?: string;
    userId?: string;
    logoUrl?: string;
    synced?: number;
}

export interface PaymentServiceProviderFilters {
    tenantId: string;
    branchId: string;
}