import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentMethodService } from '../services/payment-method.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from 'payment-method';
import { parsePaginationParams } from '../utils/pagination.utils';
import { AuditService, getAuditContext } from '../services/audit.service';
import { AuthRequest } from '../lib/express.type';

export class PaymentMethodController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const subscriptions = await PaymentMethodService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching Subscriptions:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async list(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { search } = req.query;
            const pagination = parsePaginationParams(req.query);

            const result = await PaymentMethodService.listPaymentMethods(
                tenantId,
                branchId,
                pagination,
                search && typeof search === 'string' ? { search } : undefined,
            );

            BaseController.sendPaginated(res, 'Payment methods retrieved successfully', result.data, result.pagination, 'paymentMethods');
        } catch (error) {
            console.error('Controller: Error listing payment methods:', error);
            PaymentMethodController.sendServerError(
                res,
                'Failed to retrieve payment methods',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async getTree(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const tree = await PaymentMethodService.getPaymentMethodTree(tenantId, branchId);
            PaymentMethodController.sendSuccess(res, 'Payment method tree retrieved successfully', tree);
        } catch (error) {
            console.error('Controller: Error getting payment method tree:', error);
            PaymentMethodController.sendServerError(
                res,
                'Failed to retrieve payment method tree',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async getById(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { paymentMethodId } = req.params;

            if (!paymentMethodId) {
                PaymentMethodController.sendBadRequest(res, 'Payment method ID is required');
                return;
            }

            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const paymentMethod = await PaymentMethodService.getPaymentMethodById(paymentMethodId as string, tenantId, branchId);

            if (!paymentMethod) {
                PaymentMethodController.sendNotFound(res, 'Payment method not found');
                return;
            }

            PaymentMethodController.sendSuccess(res, 'Payment method retrieved successfully', paymentMethod);
        } catch (error) {
            console.error('Controller: Error getting payment method by ID:', error);
            PaymentMethodController.sendServerError(
                res,
                'Failed to retrieve payment method',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async create(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const paymentMethodData: CreatePaymentMethodDto = req.body;

            if (!paymentMethodData.name) {
                PaymentMethodController.sendBadRequest(
                    res,
                    'Name is required'
                );
                return;
            }

            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const newPaymentMethod = await PaymentMethodService.createPaymentMethod(paymentMethodData, tenantId, branchId);

            AuditService.logCreate(getAuditContext(req), 'PaymentMethod', (newPaymentMethod as any).paymentMethodId || '', (newPaymentMethod as any).name || (paymentMethodData as any).name || '', paymentMethodData as any);

            PaymentMethodController.sendCreated(res, 'Payment method created successfully', newPaymentMethod);
        } catch (error) {
            console.error('Controller: Error creating payment method:', error);

            if (error instanceof Error) {
                if (error.message.includes('already exists')) {
                    PaymentMethodController.sendBadRequest(res, error.message);
                    return;
                }
                if (error.message.includes('required')) {
                    PaymentMethodController.sendBadRequest(res, error.message);
                    return;
                }
            }

            PaymentMethodController.sendServerError(
                res,
                'Failed to create payment method',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async update(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { paymentMethodId } = req.params;
            const updateData: UpdatePaymentMethodDto = req.body;

            if (!paymentMethodId) {
                PaymentMethodController.sendBadRequest(res, 'Payment method ID is required');
                return;
            }

            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const updatedPaymentMethod = await PaymentMethodService.updatePaymentMethod(paymentMethodId as string, updateData, tenantId, branchId);

            if (!updatedPaymentMethod) {
                PaymentMethodController.sendNotFound(res, 'Payment method not found');
                return;
            }

            AuditService.logUpdate(getAuditContext(req), 'PaymentMethod', paymentMethodId as string, paymentMethodId as string, undefined, updateData as any);

            PaymentMethodController.sendSuccess(res, 'Payment method updated successfully', updatedPaymentMethod);
        } catch (error) {
            console.error('Controller: Error updating payment method:', error);

            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    PaymentMethodController.sendNotFound(res, error.message);
                    return;
                }
                if (error.message.includes('already exists')) {
                    PaymentMethodController.sendBadRequest(res, error.message);
                    return;
                }
            }

            PaymentMethodController.sendServerError(
                res,
                'Failed to update payment method',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async delete(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { paymentMethodId } = req.params;

            if (!paymentMethodId) {
                PaymentMethodController.sendBadRequest(res, 'Payment method ID is required');
                return;
            }

            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const deleted = await PaymentMethodService.deletePaymentMethod(paymentMethodId as string, tenantId, branchId);

            if (!deleted) {
                PaymentMethodController.sendNotFound(res, 'Payment method not found');
                return;
            }

            AuditService.logDelete(getAuditContext(req), 'PaymentMethod', paymentMethodId as string, paymentMethodId as string);

            PaymentMethodController.sendSuccess(res, 'Payment method deleted successfully');
        } catch (error) {
            console.error('Controller: Error deleting payment method:', error);

            if (error instanceof Error && error.message.includes('not found')) {
                PaymentMethodController.sendNotFound(res, error.message);
                return;
            }

            PaymentMethodController.sendServerError(
                res,
                'Failed to delete payment method',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async getCount(req: Request, res: Response): Promise<void> {
        try {
            const count = await PaymentMethodService.getPaymentMethodsCount();

            PaymentMethodController.sendSuccess(res, 'Payment methods count retrieved successfully', { count });
        } catch (error) {
            console.error('Controller: Error getting payment methods count:', error);
            PaymentMethodController.sendServerError(
                res,
                'Failed to get payment methods count',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async getUnsynced(req: Request, res: Response): Promise<void> {
        try {
            const unsyncedPaymentMethods = await PaymentMethodService.getUnsyncedPaymentMethods();

            PaymentMethodController.sendSuccess(
                res,
                'Unsynced payment methods retrieved successfully',
                unsyncedPaymentMethods
            );
        } catch (error) {
            console.error('Controller: Error getting unsynced payment methods:', error);
            PaymentMethodController.sendServerError(
                res,
                'Failed to retrieve unsynced payment methods',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    static async markAsSynced(req: Request, res: Response): Promise<void> {
        try {
            const { paymentMethodId } = req.params;

            if (!paymentMethodId) {
                PaymentMethodController.sendBadRequest(res, 'Payment method ID is required');
                return;
            }

            const marked = await PaymentMethodService.markPaymentMethodAsSynced(paymentMethodId as string);

            if (!marked) {
                PaymentMethodController.sendNotFound(res, 'Payment method not found');
                return;
            }

            PaymentMethodController.sendSuccess(res, 'Payment method marked as synced successfully');
        } catch (error) {
            console.error('Controller: Error marking payment method as synced:', error);
            PaymentMethodController.sendServerError(
                res,
                'Failed to mark payment method as synced',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}