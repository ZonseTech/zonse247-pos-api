export interface PaymentMethod {
    methodId: string;
    tenantId?: string;
    branchId?: string;
    name: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreatePaymentMethodDto {
    tenantId: string;
    branchId: string;
    name: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface UpdatePaymentMethodDto {
    name?: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
}