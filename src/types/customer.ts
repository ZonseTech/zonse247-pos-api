export interface Customer {
    customerId: string;
    name: string;
    tenantId: string;
    branchId: string;
    userId: string;
    phone?: string;
    email?: string;
    address?: string;
    isDefault?: boolean;
    synced: number;
}

export interface CreateCustomerData {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    isDefault?: boolean;
    tenantId: string;
    branchId: string;
    userId: string;
}

export interface UpdateCustomerData {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    isDefault?: boolean;
}

export interface SearchConditions {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
}