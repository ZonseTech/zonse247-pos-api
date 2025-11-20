import { Tenant } from "tenant";
import { User } from "users";

interface AuthRequestBase {
    auth?: User;
    requestStartTime: number;
    tenant: Tenant;
    verifiedMetadata?: {
        tenantId: string;
        branchId: string;
        terminalId: string;
        verificationKey: string;
    };
}

export type AuthRequest = AuthRequestBase;
