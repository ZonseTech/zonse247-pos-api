interface PaymentMethod {
    methodId: string;
    name: string;
    icon?: string;
    tenantId: string;
    branchId: string;
    userId: string;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
}

interface CreatePaymentMethodDto {
    name: string;
    icon?: string;
    tenantId: string;
    branchId: string;
    userId: string;
}

interface UpdatePaymentMethodDto {
    name?: string;
    icon?: string;
    tenantId?: string;
    branchId?: string;
    userId?: string;
}