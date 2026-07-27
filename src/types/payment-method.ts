export interface PaymentMethod {
    methodId: string;
    tenantId?: string;
    branchId?: string;
    name: string;
    icon?: string;
    sortOrder?: number;
    parentMethodId?: string | null;
    category?: string | null;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    children?: PaymentMethod[];
}

export interface CreatePaymentMethodDto {
    tenantId: string;
    branchId: string;
    name: string;
    icon?: string;
    sortOrder?: number;
    parentMethodId?: string;
    isActive?: boolean;
}

export interface UpdatePaymentMethodDto {
    name?: string;
    icon?: string;
    sortOrder?: number;
    parentMethodId?: string;
    isActive?: boolean;
}