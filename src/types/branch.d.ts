type MraApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type BranchStatus = 'active' | 'inactive' | 'suspended';

interface Branch {
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
    district?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    currencyCode?: string;
    currencySymbol?: string;
    taxRate?: number;
    chargeTax?: boolean;
    receiptFooter?: string | null;
    logoUrl?: string | null;
    isVirtualWarehouse?: boolean;
    isActive?: boolean;
    synced?: boolean;
    mraApprovalStatus?: MraApprovalStatus;
    mraApprovalDate?: Date | null;
    status?: BranchStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

type BranchFormValues = Omit<Branch, 'createdAt' | 'updatedAt'>;

interface CreateBranchRequest {
    tenantId: string;
    branchCode: string;
    branchName: string;
    siteId?: string;
    siteName?: string;
    description?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    district?: string;
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
}
