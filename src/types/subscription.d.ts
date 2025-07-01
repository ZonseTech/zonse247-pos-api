interface SubscriptionResponse {
    data: Array<ClientSubscription>;
    message: string;
    success: boolean;
}

interface SubscriptionPlan {
    uuid: string;
    name: string;
    description?: string;
    price: number;
    billingCycle: 'monthly' | 'yearly' | 'lifetime';
    features?: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}


interface ClientSubscription {
    uuid: string;
    clientUuid: string;
    clientDetails?: {
        clientCode: string;
        companyName: string;
        ownerName: string;
    };
    planId: string;
    status: 'active' | 'cancelled' | 'expired' | 'past_due';
    startsAt: string;
    endsAt?: string;
    autoRenew: boolean;
    maxShops: number;
    paymentMethod?: string;
    lastPaymentDate?: string;
    nextPaymentDate?: string;
    createdAt?: string;
    updatedAt?: string;
    synced?: 0 | 1,
}

interface CreateSubscriptionRequest {
    clientUuid: string;
    planId: string;
    paymentMethod?: string;
    autoRenew?: boolean;
    startsAt?: string;
}

interface UpdateSubscriptionRequest {
    status?: ClientSubscription['status'];
    endsAt?: string;
    autoRenew?: boolean;
    paymentMethod?: string;
    nextPaymentDate?: string;
}

interface BulkUpdateRequest {
    ids: string[];
    data: Partial<ClientSubscription>;
}

interface ProcessPaymentRequest {
    amount: number;
    paymentMethod: string;
}

interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

interface SubscriptionStats {
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    pastDue: number;
    monthlyRevenue: number;
    annualRevenue: number;
}
