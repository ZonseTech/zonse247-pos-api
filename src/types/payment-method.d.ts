interface PaymentMethod {
    uuid: string;
    name: string;
    icon?: string;
    clientUuid: string;
    shopUuid: string;
    userUuid: string;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
}

interface CreatePaymentMethodDto {
    name: string;
    icon?: string;
    clientUuid: string;
    shopUuid: string;
    userUuid: string;
}

interface UpdatePaymentMethodDto {
    name?: string;
    icon?: string;
    clientUuid?: string;
    shopUuid?: string;
    userUuid?: string;
}