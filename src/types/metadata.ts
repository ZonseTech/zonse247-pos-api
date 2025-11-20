import { SyncResult } from "sync";

export interface MetadataItem {
    key: MetadataType;
    label: string;
    loaded: boolean;
    loading: boolean;
    error: string | null;
}

export type MetadataType = 'roles'
    | 'permissions'
    | 'role-permissions'
    | 'default-user'
    | 'customer'
    | 'category'
    | 'subscription-plans'
    | 'tenant-subscription'
    | 'payment-methods'
    | 'payment-service-provider';

export interface MetadataResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface SyncAllResponse {
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