export type BusinessType = 'PRODUCT_BASED' | 'SERVICE_BASED';
export type MsonkhoOnlineStatus = 'VERIFIED' | 'PENDING' | 'FAILED';
export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'TRIAL';
export type TenantStatus = 'pending' | 'active' | 'suspended' | 'cancelled';

export interface BaseTimestamps {
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface Tenant extends BaseTimestamps {
    tenantId?: string;
    tenantCode: string;
    businessName: string;
    tradingName?: string | null;
    tin: string;
    businessType: BusinessType;
    ownerName: string;
    phoneNumber: string;
    verificationToken: string;
    authKey: string;
    email: string;
    mraPortalUsername?: string | null;
    isVatRegistered?: boolean;
    taxOfficeCode?: string | null;
    msonkhoOnlineStatus: MsonkhoOnlineStatus;
    subscriptionPlan?: string | null;
    subscriptionStatus: SubscriptionStatus;
    address?: string | null;
    country?: string | null;
    trialEndsAt?: Date | null;
    status: TenantStatus;
    registeredAt?: Date | null;
    activatedAt?: Date | null;
    synced: number;
}

export type TenantFormValues = Omit<
    Tenant,
    'id' | 'createdAt' | 'updatedAt' | 'activatedAt' | 'trialEndsAt' | 'registeredAt' | 'synced'
> & {
    trialEndsAt?: string;
    registeredAt?: string;
    activatedAt?: string;
};

export interface VerifyTenantRequest {
    verificationToken: string;
}

export interface TenantQueryParams {
    status?: TenantStatus;
    subscriptionStatus?: SubscriptionStatus;
    businessType?: BusinessType;
    country?: string;
    msonkhoOnlineStatus?: MsonkhoOnlineStatus;
    search?: string;
}