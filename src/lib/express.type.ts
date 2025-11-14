interface AuthRequestBase {
    auth?: User;
    requestStartTime: number;
    verifiedMetadata?: {
        tenantId: string;
        branchId: string;
        terminalId: string;
        verificationKey: string;
    };
}

export type AuthRequest = AuthRequestBase;
