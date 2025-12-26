import { Request, Response, NextFunction } from "express";
import { TenantService } from "../services/tenant.service";
import { BaseController } from "../controllers/base.controller";
import { SecureSettingsService } from "../services/secure-settings.service";
import { Tenant } from "tenant";
import { AuthRequest } from "src/lib/express.type";
import jwt from 'jsonwebtoken';

export class TenantMiddleware {

    verifyRequestHeaders = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        try {
            const tenantSignature = req.headers['x-tenant-signature'] as string | undefined;

            if (!tenantSignature || tenantSignature.trim() === '') {
                return BaseController.sendResponseWithSubscription(
                    res,
                    400,
                    false,
                    'Application not verified. Please verify your application before using the system.',
                    'unknown',
                    null
                );
            }

            req.headers['x-tenant-signature'] = tenantSignature.trim();

            next();
        } catch (error) {
            let message = 'Authentication failed. Please check your token and try again.';

            if (error instanceof jwt.TokenExpiredError) {
                message = 'Authentication failed: token has expired.';
            } else if (error instanceof jwt.JsonWebTokenError) {
                message = 'Authentication failed: invalid token format.';
            }

            res.status(401).json({
                success: false,
                error: 'Authentication Error',
                message,
            });
        }
    };

    subscriptionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const tenantSignature = req.headers?.['x-tenant-signature'] as string;

            if (!tenantSignature) {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'Missing tenant signature',
                    'unauthorized'
                );
                return;
            }

            const verification = await SecureSettingsService.verifyTenantSignature(tenantSignature);

            if (!verification.isValid) {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'Invalid tenant signature. Please re-authenticate.',
                    'unauthorized'
                );
                return;
            }

            const tenant: Omit<Tenant, 'verificationToken'> = await TenantService.getTenantById(
                verification.tenantId
            );

            if (!tenant) {
                BaseController.sendNotFoundWithSubscription(res, 'Tenant not found', 'not_found');
                return;
            }

            if (tenant.status !== 'active') {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'Tenant account is not active. Please contact support to activate your account.',
                    tenant.subscriptionStatus || 'inactive'
                );
                return;
            }

            const subscriptionCheck = this.checkSubscriptionStatus(tenant);

            if (!subscriptionCheck.isValid) {
                const subscriptionData = {
                    subscriptionStatus: tenant.subscriptionStatus,
                    trialEndsAt: tenant.trialEndsAt,
                    businessName: tenant.businessName,
                    daysRemaining: subscriptionCheck.daysRemaining,
                    isTrialExpired: subscriptionCheck.isTrialExpired
                };

                BaseController.sendForbiddenWithSubscription(
                    res,
                    subscriptionCheck.message,
                    tenant.subscriptionStatus,
                    subscriptionData
                );
                return;
            }

            if (tenant.subscriptionStatus?.toLowerCase() === 'trial' && subscriptionCheck.daysRemaining !== null) {
                res.setHeader('X-Trial-Days-Remaining', subscriptionCheck.daysRemaining.toString());
                res.setHeader('X-Subscription-Status', tenant.subscriptionStatus);
            }

            (req as any).tenantContext = {
                tenantId: verification.tenantId,
                branchId: verification.branchId,
                terminalId: verification.terminalId
            };

            next();
        } catch (error) {
            console.error('Error in subscription status middleware:', error);
            BaseController.sendServerErrorWithSubscription(
                res,
                'Authentication error',
                'error'
            );
        }
    };

    subscriptionWarning = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const tenantId = req.headers?.['X-Tenant-Id'] as string;

            if (!tenantId) {
                next();
                return;
            }

            const tenant = await TenantService.getTenantById(tenantId);

            if (tenant) {
                const subscriptionCheck = this.checkSubscriptionStatus(tenant);

                res.setHeader('X-Subscription-Status', tenant.subscriptionStatus);
                res.setHeader('X-Tenant-Status', tenant.status);

                if (tenant.subscriptionStatus?.toLowerCase() === 'trial' && subscriptionCheck.daysRemaining !== null) {
                    res.setHeader('X-Trial-Days-Remaining', subscriptionCheck.daysRemaining.toString());
                }

                if (!subscriptionCheck.isValid) {
                    res.setHeader('X-Subscription-Warning', subscriptionCheck.message);
                }
            }

            next();
        } catch (error) {
            console.error('Error in subscription warning middleware:', error);
            next();
        }
    };

    private checkSubscriptionStatus(tenant: Omit<Tenant, 'verificationToken'>): {
        isValid: boolean;
        message: string;
        daysRemaining: number | null;
        isTrialExpired: boolean;
    } {
        const now = new Date();

        switch (tenant.subscriptionStatus.toLowerCase()) {
            case 'active':
                return {
                    isValid: true,
                    message: 'Subscription is active',
                    daysRemaining: null,
                    isTrialExpired: false
                };

            case 'trial': {
                if (!tenant.trialEndsAt) {
                    return {
                        isValid: false,
                        message: 'Trial period information is missing',
                        daysRemaining: null,
                        isTrialExpired: true
                    };
                }

                const trialEndDate = new Date(tenant.trialEndsAt);
                const daysRemaining = Math.ceil(
                    (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysRemaining <= 0) {
                    return {
                        isValid: false,
                        message: 'Your trial period has expired. Please upgrade to continue using the service.',
                        daysRemaining: 0,
                        isTrialExpired: true
                    };
                }

                return {
                    isValid: true,
                    message: `Trial active with ${daysRemaining} days remaining`,
                    daysRemaining,
                    isTrialExpired: false
                };
            }



            case 'expired':
                return {
                    isValid: false,
                    message: 'Your subscription has expired. Please renew to continue using the service.',
                    daysRemaining: null,
                    isTrialExpired: false
                };

            case 'suspended':
                return {
                    isValid: false,
                    message: 'Your subscription has been suspended. Please contact support to resolve this issue.',
                    daysRemaining: null,
                    isTrialExpired: false
                };

            case 'cancelled':
                return {
                    isValid: false,
                    message: 'Your subscription has been cancelled. Please reactivate to continue using the service.',
                    daysRemaining: null,
                    isTrialExpired: false
                };

            case 'inactive':
            default:
                return {
                    isValid: false,
                    message: 'Your subscription is inactive. Please activate your subscription to continue.',
                    daysRemaining: null,
                    isTrialExpired: false
                };
        }
    }

    trialWarning = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.tenant && req.tenant.subscriptionStatus?.toLowerCase() === 'trial') {
                const subscriptionCheck = this.checkSubscriptionStatus(req.tenant);

                if (subscriptionCheck.daysRemaining !== null && subscriptionCheck.daysRemaining <= 7) {
                    res.setHeader('X-Trial-Warning', 'true');
                    res.setHeader('X-Trial-Days-Remaining', subscriptionCheck.daysRemaining.toString());
                }
            }

            next();
        } catch (error) {
            console.error('Error in trial warning middleware:', error);
            next();
        }
    };
}