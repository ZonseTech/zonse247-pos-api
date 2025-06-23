interface Workstation {
    uuid: string;
    shopCode: string;
    clientUuid: string;
    tillName: string;
    tillNumber: string;
    deviceId: string;
    deviceType: 'desktop' | 'tablet' | 'mobile';
    ipAddress: string;
    isPrimary: boolean;
    status: 'active' | 'inactive' | 'maintenance';
    registeredAt?: string;
    lastActivity?: string;
    lastSync?: string | null;
    createdAt?: string;
    updatedAt?: string;
    synced?: number;
}

interface CreateWorkstationRequest {
    shopCode: string;
    clientUuid: string;
    tillName: string;
    tillNumber: string;
    deviceId?: string;
    deviceType?: 'desktop' | 'tablet' | 'mobile';
    ipAddress?: string;
    isPrimary?: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}