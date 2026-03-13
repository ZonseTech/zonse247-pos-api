export type BusinessType = 'PRODUCT_BASED' | 'SERVICE_BASED';
export type MsonkhoOnlineStatus = 'VERIFIED' | 'PENDING' | 'FAILED';
export type TenantStatus = 'pending' | 'active' | 'suspended' | 'cancelled';
export type MraEnvironment = 'SANDBOX' | 'PRODUCTION';

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
    email: string;
    mraPortalUsername?: string | null;
    isVatRegistered?: boolean;
    isMraEnabled?: boolean;
    mraEnvironment?: MraEnvironment | null;
    taxOfficeCode?: string | null;
    msonkhoOnlineStatus: MsonkhoOnlineStatus;
    address?: string | null;
    country?: string | null;
    status: TenantStatus;
    registeredAt?: Date | null;
    activatedAt?: Date | null;
    synced: number;
    apiBaseUrl?: string | null;
}

export type TenantFormValues = Omit<
    Tenant,
    'id' | 'createdAt' | 'updatedAt' | 'activatedAt' | 'registeredAt' | 'synced'
> & {
    registeredAt?: string;
    activatedAt?: string;
};

export interface VerifyTenantRequest {
    verificationToken: string;
}

export interface TenantQueryParams {
    status?: TenantStatus;
    businessType?: BusinessType;
    country?: string;
    msonkhoOnlineStatus?: MsonkhoOnlineStatus;
    search?: string;
}