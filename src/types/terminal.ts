import { TerminalActivationStatus } from "../databases/prisma/generated/prisma/enums";

export interface Terminal {
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

export interface CreateTerminalRequest {
    terminalId?: string;
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

export interface TerminalQueryParams {
    tenantId?: string;
    branchId?: string;
    terminalCode?: string;
    isPrimary?: boolean;
    activationStatus?: TerminalActivationStatus;
    isBlocked?: boolean;
    synced?: number;
}
