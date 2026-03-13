import { Tenant } from "tenant";
import { BranchModel } from "../models/branch.model";
import { Request, Response, NextFunction } from "express";
import { TenantService } from "../services/tenant.service";
import { BaseController } from "../controllers/base.controller";
import { SecureSettingsService } from "../services/secure-settings.service";

export class TenantMiddleware {

    tenantStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            let tenantId = null;
            const tenantSignature = req.headers?.['x-tenant-signature'] as string;

            if (req.headers?.['x-tenant-id']) {
                tenantId = req.headers?.['x-tenant-id'] as string;
            }

            if (!tenantId && (req as any).auth?.tenantId) {
                tenantId = (req as any).auth.tenantId;
            }

            if (tenantSignature) {
                const verification = await SecureSettingsService.verifyTenantSignature(tenantSignature);
                tenantId = verification.tenantId;

                if (!verification.isValid) {
                    BaseController.sendForbiddenWithSubscription(
                        res,
                        'Invalid tenant signature. Please re-authenticate.',
                        'unauthorized'
                    );
                    return;
                }
            }

            const tenant: Omit<Tenant, 'verificationToken'> = await TenantService.getTenantById(
                tenantId
            );

            if (!tenant) {
                BaseController.sendNotFoundWithSubscription(res, 'Tenant not found', 'not_found');
                return;
            }

            if (tenant.status !== 'active') {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'Tenant account is not active. Please contact support to activate your account.',
                    'inactive'
                );
                return;
            }

            const activeBranches = await BranchModel.findByTenantId(tenantId, { isActive: true });

            if (!activeBranches || activeBranches.length === 0) {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'No active branch found for this tenant.',
                    'inactive'
                );
                return;
            }

            (req as any).tenant = tenant;
            (req as any).activeBranches = activeBranches;

            next();
        } catch (error) {
            console.error('Error in subscription status middleware:', error);
            BaseController.sendServerErrorWithSubscription(
                res,
                'Authentication error:',
                error instanceof Error ? error.message : 'Internal server error'
            );
        }
    };
}