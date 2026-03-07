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
