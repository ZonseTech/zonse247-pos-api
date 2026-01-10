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

/**
 * Safely extract a route parameter as string.
 * Express types req.params values as string | string[] but route params are always strings.
 */
export const getParam = (param: string | string[] | undefined): string => {
    if (Array.isArray(param)) return param[0] || '';
    return param || '';
};
