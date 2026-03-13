import { Request } from 'express';
import { AuthRequest } from '../lib/express.type';
import { AuthScopeParams } from 'auth';

/**
 * Scope parameters for tenant/branch filtering
 */
export interface ScopeParams {
    tenantId: string;
    branchId?: string;
}

/**
 * Required scope parameters (both tenant and branch)
 */
export interface RequiredScopeParams {
    tenantId: string;
    branchId: string;
}

/**
 * Options for building scope queries
 */
export interface ScopeBuilderOptions {
    includeTenant?: boolean;
    includeBranch?: boolean;
    branchIdOverride?: string;
    isAdminMode?: boolean;
}

/**
 * ScopeBuilder - A reusable utility for building scope-aware queries
 * 
 * Handles the priority: activeBranchId > currentBranchId > branchId
 * Can be used by any module that needs tenant/branch scoping
 */
export class ScopeBuilder {
    private tenantId: string;
    private branchId: string;

    constructor(auth: AuthRequest['auth']) {
        this.tenantId = auth?.tenantId || '';
        this.branchId = ScopeBuilder.getEffectiveBranchId(auth);
    }

    /**
     * Get the effective branch ID from auth context
     * Priority: activeBranchId > currentBranchId > branchId
     */
    static getEffectiveBranchId(auth: AuthRequest['auth']): string {
        if (!auth) return '';
        return (auth as any).activeBranchId || auth.currentBranchId || auth.branchId || '';
    }

    /**
     * Extract scope from Express request
     */
    static fromRequest(req: Request & AuthRequest): ScopeBuilder {
        return new ScopeBuilder(req.auth);
    }

    /**
     * Build scope parameters for database queries
     */
    build(options: ScopeBuilderOptions = {}): AuthScopeParams {
        const {
            includeTenant = true,
            includeBranch = true,
            branchIdOverride,
            isAdminMode = false,
        } = options;

        const scope: AuthScopeParams = {};

        if (includeTenant && !isAdminMode && this.tenantId) {
            scope.tenantId = this.tenantId;
        }

        if (includeBranch) {
            const effectiveBranchId = branchIdOverride || this.branchId;
            if (effectiveBranchId) {
                scope.branchId = effectiveBranchId;
            }
        }

        return scope;
    }

    /**
     * Build required scope (throws if missing)
     */
    buildRequired(): RequiredScopeParams {
        if (!this.tenantId) {
            throw new Error('Tenant ID is required');
        }
        if (!this.branchId) {
            throw new Error('Branch ID is required');
        }
        return {
            tenantId: this.tenantId,
            branchId: this.branchId,
        };
    }

    /**
     * Get tenant ID
     */
    getTenantId(): string {
        return this.tenantId;
    }

    /**
     * Get branch ID
     */
    getBranchId(): string {
        return this.branchId;
    }

    /**
     * Check if scope has valid tenant
     */
    hasTenant(): boolean {
        return !!this.tenantId;
    }

    /**
     * Check if scope has valid branch
     */
    hasBranch(): boolean {
        return !!this.branchId;
    }

    /**
     * Create scope params object (simple helper)
     */
    toParams(): ScopeParams {
        return {
            tenantId: this.tenantId,
            ...(this.branchId && { branchId: this.branchId }),
        };
    }
}

/**
 * Quick helper to get scope from request
 * @example
 * const scope = getScopeFromRequest(req);
 * const terminals = await TerminalModel.getAll(scope.build());
 */
export const getScopeFromRequest = (req: Request & AuthRequest): ScopeBuilder => {
    return ScopeBuilder.fromRequest(req);
};

/**
 * Quick helper to get effective branch ID from request
 */
export const getEffectiveBranchId = (req: Request & AuthRequest): string => {
    return ScopeBuilder.getEffectiveBranchId(req.auth);
};

/**
 * Quick helper to build scope params from request
 */
export const buildScopeParams = (
    req: Request & AuthRequest,
    options: ScopeBuilderOptions = {}
): AuthScopeParams => {
    return ScopeBuilder.fromRequest(req).build(options);
};
