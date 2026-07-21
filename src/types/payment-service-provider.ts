export type PaymentServiceProvider = {
    providerId: string;
    name: string;
    type: string;
    userId: string;
    paymentMethodId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    logoUrl?: string;
};

export interface CreatePaymentServiceProviderRequest {
    name: string;
    type: string;
    userId: string;
    paymentMethodId?: string;
    logoUrl: string;
}

export interface UpdatePaymentServiceProviderDto {
    name?: string;
    type?: string;
    userId?: string;
    paymentMethodId?: string;
    logoUrl?: string;
}

export interface PaymentServiceProviderFilters {
    paymentMethodId?: string;
}