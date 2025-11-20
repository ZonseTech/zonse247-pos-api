import { ApiResponse } from "network";

export interface EncryptionResult {
    encrypted: string;
    iv: string;
}

export interface SetupParams {
    setupId: string;
    tenantId: string;
    branchId: string;
    terminalId: string;
    verificationToken: string;
    tenantSignature?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SetupData {
    setupId: string;
    tenantId: string;
    branchId: string;
    terminalId: string;
    encryptedVerificationToken: string;
    iv: string;
    dataSignature: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface EncryptedSetupParams {
    id: string;
    encryptedVerificationToken: string;
    iv: string;
    dataSignature: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface StorageAdapter {
    getUserDataPath(): string;
    isElectron(): boolean;
}

export interface DataStoreAdapter {
    hasSetup: () => Promise<ApiResponse<boolean>>;
    getSetup: () => Promise<ApiResponse<SetupData>>;
    saveSetup: (data: SetupData) => Promise<{ success: boolean; error?: string }>;
    updateSetup: (updates: Partial<SetupData>) => Promise<{ success: boolean; error?: string }>;
    clearSetup: () => Promise<{ success: boolean; error?: string }>;
    getSignature: () => Promise<ApiResponse<string>>;
}
