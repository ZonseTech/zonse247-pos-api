interface MetadataItem {
    key: MetadataType;
    label: string;
    loaded: boolean;
    loading: boolean;
    error: string | null;
}

type MetadataType = 'roles'
    | 'permissions'
    | 'role-permissions'
    | 'default-user'
    | 'customer'
    | 'category'
    | 'subscription-plans'
    | 'tenant-subscription'
    | 'payment-methods'
    | 'payment-service-provider';

interface MetadataResponse {
    success: boolean;
    message?: string;
    data?: any;
}

interface SyncResult {
    type: string;
    success: boolean;
    recordsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    errors: string[];
}

interface SyncAllResponse {
    success: boolean;
    message?: string;
    data?: {
        results: SyncResult[];
        overallSuccess: boolean;
        totalProcessed: number;
        totalInserted: number;
        totalUpdated: number;
    };
}