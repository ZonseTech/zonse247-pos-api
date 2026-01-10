import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentServiceProviderService } from '../services/payment-service-provider.service';
import { AuthRequest } from '../lib/express.type';
import { PaymentServiceProviderFilters } from 'payment-service-provider';

export class PaymentServiceProviderController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const services = await PaymentServiceProviderService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Services retrieved successfully', services);
        } catch (error: any) {
            console.error('Error fetching services:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getWelcome(req: Request, res: Response): Promise<void> {
        try {
            PaymentServiceProviderController.sendSuccess(res, 'Payment Service Provider API is running');
        } catch (error) {
            console.error('Error in getWelcome:', error);
            PaymentServiceProviderController.sendServerError(res, 'Internal server error');
        }
    }

    static async getAllPaymentServiceProviders(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const filters: PaymentServiceProviderFilters = {
                tenantId: user.tenantId,
                branchId: user.branchId
            };

            const psps = await PaymentServiceProviderService.selectAll(filters);
            PaymentServiceProviderController.sendSuccess(res, 'Payment service providers retrieved successfully', psps);
        } catch (error) {
            console.error('Error in getAllPaymentServiceProviders:', error);
            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to retrieve payment service providers',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async createPaymentServiceProvider(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const { name, type, logoUrl } = req.body;

            if (!name || !type || !logoUrl) {
                PaymentServiceProviderController.sendBadRequest(res, 'Name, type, and logo URL are required');
                return;
            }

            const newPSP = await PaymentServiceProviderService.createPaymentServiceProvider(
                { name, type, logoUrl },
                user as any
            );

            PaymentServiceProviderController.sendCreated(res, 'Payment service provider created successfully', newPSP);
        } catch (error) {
            console.error('Error in createPaymentServiceProvider:', error);

            if (error instanceof Error && error.message.includes('Validation failed')) {
                PaymentServiceProviderController.sendValidationError(res, error.message);
                return;
            }

            if (error instanceof Error && error.message.includes('already exists')) {
                PaymentServiceProviderController.sendBadRequest(res, error.message);
                return;
            }

            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to create payment service provider',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async updatePaymentServiceProvider(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const { pspId } = req.params;
            const updateData = req.body;

            if (!pspId) {
                PaymentServiceProviderController.sendBadRequest(res, 'Payment service provider ID is required');
                return;
            }

            await PaymentServiceProviderService.updatePaymentServiceProvider(pspId as string, updateData, user as any);
            PaymentServiceProviderController.sendSuccess(res, 'Payment service provider updated successfully');
        } catch (error) {
            console.error('Error in updatePaymentServiceProvider:', error);

            if (error instanceof Error && error.message.includes('Validation failed')) {
                PaymentServiceProviderController.sendValidationError(res, error.message);
                return;
            }

            if (error instanceof Error && error.message.includes('not found')) {
                PaymentServiceProviderController.sendNotFound(res, error.message);
                return;
            }

            if (error instanceof Error && error.message.includes('already exists')) {
                PaymentServiceProviderController.sendBadRequest(res, error.message);
                return;
            }

            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to update payment service provider',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async deletePaymentServiceProvider(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const { pspId } = req.params;

            if (!pspId) {
                PaymentServiceProviderController.sendBadRequest(res, 'Payment service provider ID is required');
                return;
            }

            await PaymentServiceProviderService.deletePaymentServiceProvider(pspId as string, user as any);
            PaymentServiceProviderController.sendSuccess(res, 'Payment service provider deleted successfully');
        } catch (error) {
            console.error('Error in deletePaymentServiceProvider:', error);

            if (error instanceof Error && error.message.includes('not found')) {
                PaymentServiceProviderController.sendNotFound(res, error.message);
                return;
            }

            if (error instanceof Error && error.message.includes('Cannot delete')) {
                PaymentServiceProviderController.sendBadRequest(res, error.message);
                return;
            }

            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to delete payment service provider',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async getPaymentServiceProviderById(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const { pspId } = req.params;

            if (!pspId) {
                PaymentServiceProviderController.sendBadRequest(res, 'Payment service provider ID is required');
                return;
            }

            const filters: PaymentServiceProviderFilters = {
                tenantId: user.tenantId,
                branchId: user.branchId
            };

            const psp = await PaymentServiceProviderService.getPaymentServiceProviderById(pspId as string, filters);

            if (!psp) {
                PaymentServiceProviderController.sendNotFound(res, 'Payment service provider not found');
                return;
            }

            PaymentServiceProviderController.sendSuccess(res, 'Payment service provider retrieved successfully', psp);
        } catch (error) {
            console.error('Error in getPaymentServiceProviderById:', error);
            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to retrieve payment service provider',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async searchPaymentServiceProviders(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const { name } = req.query;

            if (!name || typeof name !== 'string') {
                PaymentServiceProviderController.sendBadRequest(res, 'Search name is required');
                return;
            }

            const filters: PaymentServiceProviderFilters = {
                tenantId: user.tenantId,
                branchId: user.branchId
            };

            const psps = await PaymentServiceProviderService.getPaymentServiceProviderById(name, filters);
            PaymentServiceProviderController.sendSuccess(res, 'Payment service providers search completed', psps);
        } catch (error) {
            console.error('Error in searchPaymentServiceProviders:', error);
            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to search payment service providers',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async markPaymentServiceProviderAsSynced(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const user = req.auth;
            if (!user) {
                PaymentServiceProviderController.sendUnauthorized(res);
                return;
            }

            const { pspId } = req.params;

            if (!pspId) {
                PaymentServiceProviderController.sendBadRequest(res, 'Payment service provider ID is required');
                return;
            }

            await PaymentServiceProviderService.markPaymentServiceProviderAsSynced(pspId as string, user as any);
            PaymentServiceProviderController.sendSuccess(res, 'Payment service provider marked as synced successfully');
        } catch (error) {
            console.error('Error in markPaymentServiceProviderAsSynced:', error);

            if (error instanceof Error && error.message.includes('not found')) {
                PaymentServiceProviderController.sendNotFound(res, error.message);
                return;
            }

            PaymentServiceProviderController.sendServerError(
                res,
                'Failed to mark payment service provider as synced',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}