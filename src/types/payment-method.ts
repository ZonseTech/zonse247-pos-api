export interface PaymentMethod {
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

export interface CreatePaymentMethodDto {
    name: string;
    icon?: string;
    tenantId: string;
    branchId: string;
    userId: string;
}

export interface UpdatePaymentMethodDto {
    name?: string;
    icon?: string;
    tenantId?: string;
    branchId?: string;
    userId?: string;
}