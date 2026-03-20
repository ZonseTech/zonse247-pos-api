import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { SubscriptionService } from "../services/subscription.service";
import { AuthRequest, getEffectiveBranchId } from "../lib/express.type";
import { parsePaginationParams } from "../utils/pagination.utils"; import { AuditService, getAuditContext } from '../services/audit.service';
export class SubscriptionController extends BaseController {

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const { status, planId, tenantId } = req.query;
            const pagination = parsePaginationParams(req.query);

            if (status) {
                const validStatuses = ['active', 'cancelled', 'expired', 'past_due'];
                if (!validStatuses.includes(status as string)) {
                    BaseController.sendResponse(res, 400, false, 'Invalid status. Must be one of: active, cancelled, expired, past_due');
                    return;
                }
            }

            const result = await SubscriptionService.listSubscriptions(pagination, {
                status: status as string | undefined,
                planId: planId as string | undefined,
                tenantId: tenantId as string | undefined,
            });

            BaseController.sendPaginated(res, 'Subscriptions retrieved successfully', result.data, result.pagination, 'subscriptions');
        } catch (error: any) {
            console.error('Error fetching subscriptions:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions', undefined, error.message);
        }
    }

    static async getByTenantId(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
                return;
            }

            const subscriptions = await SubscriptionService.getByTenantId(tenantId as string);
            BaseController.sendResponse(res, 200, true, 'Tenant subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching tenant subscriptions:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch tenant subscriptions', undefined, error.message);
        }
    }

    static async show(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const subscription = await SubscriptionService.getById(id as string);

            if (!subscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription retrieved successfully', subscription);
        } catch (error: any) {
            console.error('Error fetching subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription', undefined, error.message);
        }
    }

    static async store(req: Request, res: Response): Promise<void> {
        try {
            const newSubscription = await SubscriptionService.create(req.body);

            AuditService.logCreate(getAuditContext(req), 'Subscription', (newSubscription as any).subscriptionId || '', (newSubscription as any).subscriptionId || '', req.body);

            BaseController.sendResponse(res, 201, true, 'Subscription created successfully', newSubscription);
        } catch (error: any) {
            console.error('Error creating subscription:', error);

            let statusCode = 500;
            const message = error.message;

            if (error.message.includes('Missing required field')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already has an active subscription')) {
                statusCode = 409;
            } else if (error.message.includes('Invalid') || error.message.includes('Validation')) {
                statusCode = 422;
            }

            BaseController.sendResponse(res, statusCode, false, message, undefined, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedSubscription = await SubscriptionService.update(id as string, req.body);

            if (!updatedSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            AuditService.logUpdate(getAuditContext(req), 'Subscription', id as string, id as string, undefined, req.body);

            BaseController.sendResponse(res, 200, true, 'Subscription updated successfully', updatedSubscription);
        } catch (error: any) {
            console.error('Error updating subscription:', error);

            let statusCode = 500;
            if (error.message.includes('not found') || error.message.includes('does not exist')) {
                statusCode = 404;
            } else if (error.message.includes('Invalid') || error.message.includes('Validation')) {
                statusCode = 422;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const deleted = await SubscriptionService.delete(id as string);

            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            AuditService.logDelete(getAuditContext(req), 'Subscription', id as string, id as string);

            BaseController.sendResponse(res, 200, true, 'Subscription deleted successfully');
        } catch (error: any) {
            console.error('Error deleting subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to delete subscription', undefined, error.message);
        }
    }

    static async cancel(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const cancelledSubscription = await SubscriptionService.cancel(id as string);

            if (!cancelledSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            AuditService.logStatusChange(getAuditContext(req), 'cancel', 'Subscription', id as string, id as string, 'active', 'cancelled');

            BaseController.sendResponse(res, 200, true, 'Subscription cancelled successfully', cancelledSubscription);
        } catch (error: any) {
            console.error('Error cancelling subscription:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already cancelled')) {
                statusCode = 409;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async reactivate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const reactivatedSubscription = await SubscriptionService.reactivate(id as string);

            if (!reactivatedSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription reactivated successfully', reactivatedSubscription);
        } catch (error: any) {
            console.error('Error reactivating subscription:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already active')) {
                statusCode = 409;
            } else if (error.message.includes('plan not found')) {
                statusCode = 422;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async processPayment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { amount, paymentMethod } = req.body;

            if (!amount || !paymentMethod) {
                BaseController.sendResponse(res, 400, false, 'Amount and payment method are required');
                return;
            }

            if (amount <= 0) {
                BaseController.sendResponse(res, 400, false, 'Amount must be greater than 0');
                return;
            }

            const updatedSubscription = await SubscriptionService.processPayment(id as string, { amount, paymentMethod });

            if (!updatedSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Payment processed successfully', updatedSubscription);
        } catch (error: any) {
            console.error('Error processing payment:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Invalid amount')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getExpiring(req: Request, res: Response): Promise<void> {
        try {
            const days = parseInt(req.query.days as string) || 30;

            if (days < 1 || days > 365) {
                BaseController.sendResponse(res, 400, false, 'Days must be between 1 and 365');
                return;
            }

            const subscriptions = await SubscriptionService.getExpiring(days);
            BaseController.sendResponse(res, 200, true, 'Expiring subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching expiring subscriptions:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch expiring subscriptions', undefined, error.message);
        }
    }

    static async bulkUpdate(req: Request, res: Response): Promise<void> {
        try {
            const { ids, data } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                BaseController.sendResponse(res, 400, false, 'IDs array is required and must not be empty');
                return;
            }

            if (!data || typeof data !== 'object') {
                BaseController.sendResponse(res, 400, false, 'Update data is required');
                return;
            }

            const updatedSubscriptions = await SubscriptionService.bulkUpdate(ids, data);
            BaseController.sendResponse(res, 200, true, 'Subscriptions updated successfully', updatedSubscriptions);
        } catch (error: any) {
            console.error('Error bulk updating subscriptions:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to bulk update subscriptions', undefined, error.message);
        }
    }

    static async getStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await SubscriptionService.getStats();
            BaseController.sendResponse(res, 200, true, 'Subscription statistics retrieved successfully', stats);
        } catch (error: any) {
            console.error('Error fetching subscription stats:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription statistics', undefined, error.message);
        }
    }

    static async getByStatus(req: Request, res: Response): Promise<void> {
        try {
            const { status } = req.params;
            const validStatuses = ['active', 'cancelled', 'expired', 'past_due'];
            if (!validStatuses.includes(status as string)) {
                BaseController.sendResponse(res, 400, false, 'Invalid status. Must be one of: active, cancelled, expired, past_due');
                return;
            }
            const subscriptions = await SubscriptionService.getByStatus(status as 'active' | 'cancelled' | 'expired' | 'past_due');
            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved by status', subscriptions);
        } catch (error: any) {
            console.error('Error fetching subscriptions by status:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions by status', undefined, error.message);
        }
    }

    static async getCurrentBranchSubscription(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as unknown as AuthRequest;
            const branchId = getEffectiveBranchId(authReq.auth);

            if (!branchId) {
                BaseController.sendResponse(res, 400, false, 'No active branch found. Please select a branch first.');
                return;
            }

            const subscription = await SubscriptionService.getByBranchId(branchId);

            if (!subscription) {
                BaseController.sendResponse(res, 404, false, 'No subscription found for this branch');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Branch subscription retrieved successfully', subscription);
        } catch (error: any) {
            console.error('Error fetching branch subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch branch subscription', undefined, error.message);
        }
    }

    static async getByPlanId(req: Request, res: Response): Promise<void> {
        try {
            const { planId } = req.params;
            const subscriptions = await SubscriptionService.getByPlanId(planId as string);
            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved by plan', subscriptions);
        } catch (error: any) {
            console.error('Error fetching subscriptions by plan:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions by plan', undefined, error.message);
        }
    }

    /**
     * @method  subscribeBranch
     * @desc    Subscribe a specific branch to a plan
     * @body    { branchId, subscriptionPlanId, subscriptionMonths?, autoRenew?, paymentMethod? }
     */
    static async subscribeBranch(req: Request, res: Response): Promise<void> {
        try {
            const { branchId, subscriptionPlanId, subscriptionMonths, autoRenew, paymentMethod } = req.body;

            if (!branchId) {
                BaseController.sendResponse(res, 400, false, 'Branch ID is required');
                return;
            }

            if (!subscriptionPlanId) {
                BaseController.sendResponse(res, 400, false, 'Subscription plan ID is required');
                return;
            }

            const subscription = await SubscriptionService.subscribeBranch(branchId, subscriptionPlanId, {
                subscriptionMonths,
                autoRenew,
                paymentMethod,
            });

            BaseController.sendResponse(res, 201, true, 'Branch subscribed successfully', subscription);
        } catch (error: any) {
            console.error('Error subscribing branch:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('inactive')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}