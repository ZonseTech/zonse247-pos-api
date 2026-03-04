import { BranchSubscription } from "subscription";
import { BranchMRAApprovalStatus } from "../databases/prisma/generated/prisma/enums";

export type MraApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BranchStatus = 'active' | 'inactive' | 'suspended';
export type BranchBusinessType = 'PRODUCT_BASED' | 'SERVICE_BASED' | 'HYBRID';

export interface Branch {
    branchId: string;
    tenantId: string;
    branchName: string;
    branchCode: string;
    siteId?: string | null;
    siteName?: string | null;
    description?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressLine3?: string | null;
    districtId?: string | null;
    location?: string | null;
    businessType?: BranchBusinessType | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    currencyCode?: string;
    currencySymbol?: string;
    taxRate: any;
    chargeTax?: boolean;
    receiptFooter?: string | null;
    logoUrl?: string | null;
    isVirtualWarehouse?: boolean;
    isActive?: boolean;
    synced: number;
    mraApprovalStatus?: BranchMRAApprovalStatus;
    mraApprovalDate?: Date | null;
    branchSubscriptionId?: string | null;
    branchSubscription?: BranchSubscription | null;
    status?: BranchStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

export type BranchFormValues = Omit<Branch, 'createdAt' | 'updatedAt'>;

export interface CreateBranchRequest {
    tenantId: string;
    branchId?: string;
    branchCode?: string;
    branchName: string;
    siteId?: string;
    siteName?: string;
    description?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    districtId?: string;
    location?: string;
    businessType?: BranchBusinessType;
    city?: string;
    state?: string;
    postalCode?: string;
    phoneNumber?: string;
    email?: string;
    currencyCode?: string;
    currencySymbol?: string;
    taxRate?: number;
    chargeTax?: boolean;
    receiptFooter?: string;
    logoUrl?: string;
    isVirtualWarehouse?: boolean;
    isActive?: boolean;
    subscriptionPlanId: string;
    subscriptionMonths?: number;
    branchSubscriptionId?: string;
    status?: string;
    mraApprovalStatus?: string;
    synced?: number;
}
