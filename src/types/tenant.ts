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
    verificationToken: string;
    status: TenantStatus;
    registeredAt?: Date | null;
    activatedAt?: Date | null;
    synced?: boolean;
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
