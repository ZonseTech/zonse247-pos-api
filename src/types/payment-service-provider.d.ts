type PaymentServiceProvider = {
    name: string;
    uuid: string;
    clientUuid: string;
    shopUuid: string;
    userUuid: string;
    createdAt?: Date;
    updatedAt?: Date;
    logoUrl?: string;
    synced?: number;
};

interface CreatePaymentServiceProviderRequest {
    name: string;
    clientUuid: string;
    shopUuid: string;
    userUuid: string;
    logoUrl: string;
}

interface UpdatePaymentServiceProviderDto {
    name?: string;
    clientUuid?: string;
    shopUuid?: string;
    userUuid?: string;
    logoUrl?: string;
    synced?: number;
}

interface PaymentServiceProviderFilters {
    clientUuid: string;
    shopUuid: string;
}