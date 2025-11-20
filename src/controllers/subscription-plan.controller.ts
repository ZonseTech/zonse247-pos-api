import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { SubscriptionPlanService } from "../services/subscription-plan.service";

export class SubscriptionPlanController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const plans = await SubscriptionPlanService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Subscription plans retrieved successfully', plans);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const { billingCycle, isActive } = req.query;
            let plans;

            if (billingCycle) {
                plans = await SubscriptionPlanService.getByBillingCycle(billingCycle as string);
            } else if (isActive !== undefined) {
                const allPlans = await SubscriptionPlanService.getAll();
                plans = allPlans.filter(plan =>
                    isActive === 'true' ? plan.isActive : !plan.isActive
                );
            } else {
                plans = await SubscriptionPlanService.getAll();
            }

            BaseController.sendResponse(res, 200, true, 'Subscription plans retrieved successfully', plans);
        } catch (error: any) {
            console.error('Error fetching subscription plans:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription plans', undefined, error.message);
        }
    }

    static async show(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const plan = await SubscriptionPlanService.getById(id);

            if (!plan) {
                BaseController.sendResponse(res, 404, false, 'Subscription plan not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription plan retrieved successfully', plan);
        } catch (error: any) {
            console.error('Error fetching subscription plan:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription plan', undefined, error.message);
        }
    }

    static async store(req: Request, res: Response): Promise<void> {
        try {
            const newPlan = await SubscriptionPlanService.create(req.body);
            BaseController.sendResponse(res, 201, true, 'Subscription plan created successfully', newPlan);
        } catch (error: any) {
            console.error('Error creating subscription plan:', error);

            let statusCode = 500;
            if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedPlan = await SubscriptionPlanService.update(id, req.body);

            if (!updatedPlan) {
                BaseController.sendResponse(res, 404, false, 'Subscription plan not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription plan updated successfully', updatedPlan);
        } catch (error: any) {
            console.error('Error updating subscription plan:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
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
            const deleted = await SubscriptionPlanService.delete(id);

            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Subscription plan not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription plan deleted successfully');
        } catch (error: any) {
            console.error('Error deleting subscription plan:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to delete subscription plan', undefined, error.message);
        }
    }

    static async toggleStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedPlan = await SubscriptionPlanService.toggleStatus(id);

            if (!updatedPlan) {
                BaseController.sendResponse(res, 404, false, 'Subscription plan not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Subscription plan status updated successfully', updatedPlan);
        } catch (error: any) {
            console.error('Error toggling subscription plan status:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to toggle subscription plan status', undefined, error.message);
        }
    }

    static async getByBillingCycle(req: Request, res: Response): Promise<void> {
        try {
            const { billingCycle } = req.params;
            const plans = await SubscriptionPlanService.getByBillingCycle(billingCycle);
            BaseController.sendResponse(res, 200, true, 'Subscription plans retrieved successfully', plans);
        } catch (error: any) {
            console.error('Error fetching subscription plans by billing cycle:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription plans', undefined, error.message);
        }
    }

    static async getActive(req: Request, res: Response): Promise<void> {
        try {
            const plans = await SubscriptionPlanService.getActivePlans();
            BaseController.sendResponse(res, 200, true, 'Active subscription plans retrieved successfully', plans);
        } catch (error: any) {
            console.error('Error fetching active subscription plans:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch active subscription plans', undefined, error.message);
        }
    }

    static async validatePlan(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const isValid = await SubscriptionPlanService.validatePlan(id);

            BaseController.sendResponse(res, 200, true, 'Plan validation completed', {
                valid: isValid,
                message: isValid ? 'Plan is valid and active' : 'Plan is invalid or inactive'
            });
        } catch (error: any) {
            console.error('Error validating subscription plan:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to validate subscription plan', undefined, error.message);
        }
    }
}