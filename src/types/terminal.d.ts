interface TerminalVerificationParams {
    tenantCode: string;
    verificationToken: string;
    os: string;
    hostname: string;
    macAddress: string;
}

interface Terminal {
    terminalId: string;
    tenantId: string;
    branchId: string;
    mraTerminalId?: string | null;
    terminalCode: string;
    terminalLabel: string;
    terminalPosition?: number | null;
    deviceId?: string | null;
    osName?: string | null;
    osVersion?: string | null;
    osBuild?: string | null;
    macAddress?: string | null;
    posProductId?: string | null;
    posProductVersion?: string | null;
    terminalConfigVersion?: number | null;
    offlineMaxTransactionAgeHours?: number | null;
    offlineMaxCumulativeAmount?: number | null;
    activationCode?: string | null;
    activationStatus?: 'PENDING' | 'ACTIVATED' | 'DEACTIVATED' | 'SUSPENDED' | 'BLOCKED';
    activationDate?: Date | null;
    isPrimary?: boolean;
    isBlocked?: boolean;
    blockingReason?: string | null;
    blockedAt?: Date | null;
    mraApplicationStatus?: 'APPLIED' | 'APPROVED' | 'REJECTED';
    mraApprovalDate?: Date | null;
    lastActivity?: Date | null;
    lastSync?: Date | null;
    lastSyncTimestamp?: Date | null;
    synced?: number;
    registeredAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

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

interface CreateTerminalRequest {
    tenantId: string;
    branchId: string;
    terminalCode: string;
    terminalLabel: string;
    terminalPosition?: number;
    deviceId?: string;
    osName?: string;
    osVersion?: string;
    osBuild?: string;
    macAddress?: string;
    isPrimary?: boolean;
}