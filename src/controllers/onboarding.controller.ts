import { Request, Response } from 'express';
import { TenantService } from '../services/tenant.service';
import { ApiResponse } from 'network';

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

    static async getOnboardingStatus(req: Request<{ tenantId: string }>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                OnboardingController.sendResponse(res, 400, false, 'Tenant ID is required');
                return;
            }

            const onboardingStatus = await TenantService.getOnboardingStatus(tenantId);
            OnboardingController.sendResponse(res, 200, true, 'Onboarding status retrieved successfully', onboardingStatus);
        } catch (error: any) {
            console.error('Error getting onboarding status:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            OnboardingController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}