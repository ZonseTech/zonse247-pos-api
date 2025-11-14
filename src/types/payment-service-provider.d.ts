type PaymentServiceProvider = {
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

interface CreatePaymentServiceProviderRequest {
    name: string;
    tenantId: string;
    branchId: string;
    userId: string;
    logoUrl: string;
}

interface UpdatePaymentServiceProviderDto {
    name?: string;
    tenantId?: string;
    branchId?: string;
    userId?: string;
    logoUrl?: string;
    synced?: number;
}

interface PaymentServiceProviderFilters {
    tenantId: string;
    branchId: string;
}