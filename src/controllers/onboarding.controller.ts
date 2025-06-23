import { Request, Response } from 'express';
import { ShopService } from '../services/shop.service';
import { ClientService } from '../services/client.service';
import { WorkstationService } from '../services/workstation.service';
import { SubscriptionService } from '../services/subscription.service';

export class OnboardingController {
    static sendResponse<T>(res: Response, statusCode: number, success: boolean, message: string, data?: T, error?: string): void {
        const response: ApiResponse<T> = {
            success,
            message,
            ...(data && { data }),
            ...(error && { error })
        };
        res.status(statusCode).json(response);
    }

    static async getOnboardingStatus(req: Request<{ clientUuid: string }>, res: Response): Promise<void> {
        try {
            const { clientUuid } = req.params;

            if (!clientUuid) {
                OnboardingController.sendResponse(res, 400, false, 'Client ID is required');
                return;
            }

            const onboardingStatus = await ClientService.getOnboardingStatus(clientUuid);
            OnboardingController.sendResponse(res, 200, true, 'Onboarding status retrieved successfully', onboardingStatus);
        } catch (error: any) {
            console.error('Error getting onboarding status:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            OnboardingController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}