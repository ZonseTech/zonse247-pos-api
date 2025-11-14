import { Request, Response, NextFunction } from "express";
import { ClientService } from "../services/client.service";
import { BaseController } from "../controllers/base.controller";

export class ClientMiddleware {
    subscriptionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clientUuid = req.headers?.['x-client-uuid'] as string;

            if (!clientUuid) {
                BaseController.sendResponseWithSubscription(
                    res,
                    400,
                    false,
                    'Client UUID is required',
                    'unknown',
                    null
                );
                return;
            }

            const client: ClientProps = await ClientService.getClientById(
                clientUuid
            );

            if (!client) {
                BaseController.sendNotFoundWithSubscription(res, 'Client not found', 'not_found');
                return;
            }

            if (client.status !== 'active') {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'Client account is not active. Please contact support to activate your account.',
                    client.subscriptionStatus || 'inactive'
                );
                return;
            }

            const subscriptionCheck = this.checkSubscriptionStatus(client);

            if (!subscriptionCheck.isValid) {
                const subscriptionData = {
                    subscriptionStatus: client.subscriptionStatus,
                    trialEndsAt: client.trialEndsAt,
                    companyName: client.companyName,
                    daysRemaining: subscriptionCheck.daysRemaining,
                    isTrialExpired: subscriptionCheck.isTrialExpired
                };

                BaseController.sendForbiddenWithSubscription(
                    res,
                    subscriptionCheck.message,
                    client.subscriptionStatus,
                    subscriptionData
                );
                return;
            }

            if (client.subscriptionStatus === 'trial' && subscriptionCheck.daysRemaining !== null) {
                res.setHeader('X-Trial-Days-Remaining', subscriptionCheck.daysRemaining.toString());
                res.setHeader('X-Subscription-Status', client.subscriptionStatus);
            }

            next();
        } catch (error) {
            console.error('Error in subscription status middleware:', error);
            BaseController.sendServerErrorWithSubscription(
                res,
                'Internal server error while checking subscription status',
                'error'
            );
        }
    };

    subscriptionWarning = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const clientUuid = req.headers?.['X-Client-Uuid'] as string;

            if (!clientUuid) {
                next();
                return;
            }

            const client = await ClientService.getClientById(clientUuid);

            if (client) {
                const subscriptionCheck = this.checkSubscriptionStatus(client);

                res.setHeader('X-Subscription-Status', client.subscriptionStatus);
                res.setHeader('X-Client-Status', client.status);

                if (client.subscriptionStatus === 'trial' && subscriptionCheck.daysRemaining !== null) {
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

    private checkSubscriptionStatus(client: ClientProps): {
        isValid: boolean;
        message: string;
        daysRemaining: number | null;
        isTrialExpired: boolean;
    } {
        const now = new Date();

        switch (client.subscriptionStatus) {
            case 'active':
                return {
                    isValid: true,
                    message: 'Subscription is active',
                    daysRemaining: null,
                    isTrialExpired: false
                };

            case 'trial':
                if (!client.trialEndsAt) {
                    return {
                        isValid: false,
                        message: 'Trial period information is missing',
                        daysRemaining: null,
                        isTrialExpired: true
                    };
                }

                const trialEndDate = new Date(client.trialEndsAt);
                const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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

    trialWarning = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.client && req.client.subscriptionStatus === 'trial') {
                const subscriptionCheck = this.checkSubscriptionStatus(req.client);

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