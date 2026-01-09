export interface PaymentMethod {
    methodId: string;
    name: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
}

export interface CreatePaymentMethodDto {
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