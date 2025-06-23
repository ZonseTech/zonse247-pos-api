import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { EmailService } from "../services/email.service";
import { checkEmailServiceHealth } from "../config/email.config";

export class EmailController extends BaseController {
    static async testEmail(req: Request, res: Response): Promise<void> {
        try {
            const testClient = {
                companyName: 'Test Company',
                ownerName: 'Test Owner',
                email: 'test@example.com',
                clientUuid: 'test-uuid',
                authKey: 'test-auth-key'
            };

            await EmailService.sendWelcomeEmail(testClient);

            EmailController.sendSuccess(res, 'Test email sent successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            EmailController.sendServerError(res, 'Failed to send test email', errorMessage);
        }
    }

    static async checkEmailHealth(req: Request, res: Response): Promise<void> {
        try {
            const health = await checkEmailServiceHealth();

            if (health.status === 'healthy') {
                EmailController.sendSuccess(res, 'Email service is healthy', health);
            } else {
                EmailController.sendServerError(res, 'Email service is unhealthy', JSON.stringify(health));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            EmailController.sendServerError(res, 'Failed to check email service health', errorMessage);
        }
    }
}