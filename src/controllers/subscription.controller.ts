import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { SubscriptionService } from "../services/subscription.service";

export class SubscriptionController extends BaseController {
    static async list(req: Request, res: Response): Promise<void> {
        try {
            const { status, clientUuid, planId } = req.query;

            let subscriptions: SubscriptionService;

            if (status) {
                subscriptions = await SubscriptionService.getByStatus(status as string);
            } else if (clientUuid) {
                subscriptions = await SubscriptionService.getByClientUuid(clientUuid as string);
            } else if (planId) {
                subscriptions = await SubscriptionService.getByPlanId(planId as string);
            } else {
                subscriptions = await SubscriptionService.getAll();
            }

            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching subscriptions:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions', undefined, error.message);
        }
    }

    static async show(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const subscription = await SubscriptionService.getById(id);

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
            BaseController.sendResponse(res, 201, true, 'Subscription created successfully', newSubscription);
        } catch (error: any) {
            console.error('Error creating subscription:', error);
            let statusCode = 500;
            if (error.message.includes('Missing required field')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already has an active subscription')) {
                statusCode = 409;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedSubscription = await SubscriptionService.update(id, req.body);

            if (!updatedSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription updated successfully', updatedSubscription);
        } catch (error: any) {
            console.error('Error updating subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to update subscription', undefined, error.message);
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const deleted = await SubscriptionService.delete(id);

            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription deleted successfully');
        } catch (error: any) {
            console.error('Error deleting subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to delete subscription', undefined, error.message);
        }
    }

    static async getByStatus(req: Request, res: Response): Promise<void> {
        try {
            const { status } = req.params;
            const subscriptions = await SubscriptionService.getByStatus(status);
            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching subscriptions by status:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions', undefined, error.message);
        }
    }

    static async getByClientUuid(req: Request, res: Response): Promise<void> {
        try {
            const { clientUuid } = req.params;
            const subscriptions = await SubscriptionService.getByClientUuid(clientUuid);
            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching subscriptions by client:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions', undefined, error.message);
        }
    }

    static async getByPlanId(req: Request, res: Response): Promise<void> {
        try {
            const { planId } = req.params;
            const subscriptions = await SubscriptionService.getByPlanId(planId);
            BaseController.sendResponse(res, 200, true, 'Subscriptions retrieved successfully', subscriptions);
        } catch (error: any) {
            console.error('Error fetching subscriptions by plan:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscriptions', undefined, error.message);
        }
    }

    static async cancel(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const cancelledSubscription = await SubscriptionService.cancel(id);

            if (!cancelledSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription cancelled successfully', cancelledSubscription);
        } catch (error: any) {
            console.error('Error cancelling subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to cancel subscription', undefined, error.message);
        }
    }

    static async reactivate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const reactivatedSubscription = await SubscriptionService.reactivate(id);

            if (!reactivatedSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription reactivated successfully', reactivatedSubscription);
        } catch (error: any) {
            console.error('Error reactivating subscription:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to reactivate subscription', undefined, error.message);
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

            const updatedSubscription = await SubscriptionService.processPayment(id, { amount, paymentMethod });

            if (!updatedSubscription) {
                BaseController.sendResponse(res, 404, false, 'Subscription not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Payment processed successfully', updatedSubscription);
        } catch (error: any) {
            console.error('Error processing payment:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to process payment', undefined, error.message);
        }
    }

    static async getExpiring(req: Request, res: Response): Promise<void> {
        try {
            const days = parseInt(req.params.days) || 30;
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
                BaseController.sendResponse(res, 400, false, 'IDs array is required');
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

    static async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
        try {
            const plans = await SubscriptionService.getActivePlans();
            BaseController.sendResponse(res, 200, true, 'Subscription plans retrieved successfully', plans);
        } catch (error: any) {
            console.error('Error fetching subscription plans:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription plans', undefined, error.message);
        }
    }

    static async createSubscription(req: Request, res: Response): Promise<void> {
        try {
            const newSubscription = await SubscriptionService.createSubscription(req.body);
            BaseController.sendResponse(res, 201, true, 'Subscription created successfully', newSubscription);
        } catch (error: any) {
            console.error('Error creating subscription:', error);
            let statusCode = 500;
            if (error.message.includes('Missing required field')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already has an active subscription')) {
                statusCode = 409;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}