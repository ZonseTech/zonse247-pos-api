export type PaymentServiceProvider = {
    providerId: string;
    name: string;
    type: string;
    tenantId: string;
    branchId: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
    logoUrl?: string;
};

export interface CreatePaymentServiceProviderRequest {
    name: string;
    type: string;
    tenantId: string;
    branchId: string;
    userId: string;
    logoUrl: string;
}

export interface UpdatePaymentServiceProviderDto {
    name?: string;
    type?: string;
    tenantId?: string;
    branchId?: string;
    userId?: string;
    logoUrl?: string;
}

export interface PaymentServiceProviderFilters {
    tenantId: string;
    branchId: string;
}