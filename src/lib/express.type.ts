import { Tenant } from "tenant";
import { User } from "users";
import { Branch } from "branch";

interface AuthRequestBase {
    auth?: User & {
        /** The currently active branch ID (from header or switch) */
        activeBranchId?: string;
        /** The full active branch object when validated */
        activeBranch?: Branch;
    };
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

/**
 * Get the effective branch ID for the current request
 * Priority: activeBranchId > currentBranchId > branchId
 */
export const getEffectiveBranchId = (auth: AuthRequest['auth']): string => {
    if (!auth) return '';
    return (auth as any).activeBranchId || auth.currentBranchId || auth.branchId || '';
};
