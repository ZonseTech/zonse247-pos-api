import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { SubscriptionPlanService } from "../services/subscription-plan.service";
import { parsePaginationParams } from "../utils/pagination.utils"; import { AuditService, getAuditContext } from '../services/audit.service';
export class SubscriptionPlanController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const plans = await SubscriptionPlanService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Subscription plans retrieved successfully', plans);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const { isActive } = req.query;
            const pagination = parsePaginationParams(req.query);
            const result = await SubscriptionPlanService.listPlans(
                pagination,
                isActive !== undefined ? { isActive: isActive === 'true' } : undefined,
            );

            BaseController.sendPaginated(res, 'Subscription plans retrieved successfully', result.data, result.pagination, 'plans');
        } catch (error: any) {
            console.error('Error fetching subscription plans:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch subscription plans', undefined, error.message);
        }
    }

    static async show(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const plan = await SubscriptionPlanService.getById(id as string);

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

            AuditService.logCreate(getAuditContext(req), 'SubscriptionPlan', (newPlan as any).planId || '', (newPlan as any).name || req.body.name || '', req.body);

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
            const updatedPlan = await SubscriptionPlanService.update(id as string, req.body);

            if (!updatedPlan) {
                BaseController.sendResponse(res, 404, false, 'Subscription plan not found');
                return;
            }

            AuditService.logUpdate(getAuditContext(req), 'SubscriptionPlan', id as string, (updatedPlan as any).name || id as string, undefined, req.body);

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
            const deleted = await SubscriptionPlanService.delete(id as string);

            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Subscription plan not found');
                return;
            }

            AuditService.logDelete(getAuditContext(req), 'SubscriptionPlan', id as string, id as string);

            BaseController.sendResponse(res, 200, true, 'Subscription plan deleted successfully');
        } catch (error: any) {
            console.error('Error deleting subscription plan:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to delete subscription plan', undefined, error.message);
        }
    }

    static async toggleStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedPlan = await SubscriptionPlanService.toggleStatus(id as string);

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
            const isValid = await SubscriptionPlanService.validatePlan(id as string);

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