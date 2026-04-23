export interface Customer {
    customerId: string;
    name: string;
    tenantId: string;
    branchId: string;
    userId?: string;
    phone?: string;
    email?: string;
    address?: string;
    isDefault?: boolean;
}

export interface CreateCustomerData {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    isDefault?: boolean;
    tenantId: string;
    branchId: string;
    userId?: string;
}

export interface UpdateCustomerData {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    isDefault?: boolean;
}

export interface SearchConditions {
    tenantId?: string;
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
}

/** Tenant + branch scope used by all tenant-aware operations */
export interface TenantScope {
    tenantId: string;
}

export interface TenantBranchScope extends TenantScope {
    branchId: string;
}