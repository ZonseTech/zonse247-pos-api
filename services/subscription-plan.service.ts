import { SubscriptionPlanModel } from '../models/subscription-plan.model';

export class SubscriptionPlanService {

    static async selectAll(params): Promise<Array<Role>> {
        return await SubscriptionPlanModel.findAllByRDBMS(params);
    }

    static async getAll(): Promise<SubscriptionPlan[]> {
        return SubscriptionPlanModel.findAll();
    }

    static async getById(id: string): Promise<SubscriptionPlan | null> {
        return SubscriptionPlanModel.findById(id);
    }

    static async getActivePlans(): Promise<SubscriptionPlan[]> {
        return SubscriptionPlanModel.findActivePlans();
    }

    static async create(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
        return SubscriptionPlanModel.create(data);
    }

    static async update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
        const existingPlan = await SubscriptionPlanModel.findById(id);
        if (!existingPlan) {
            return null;
        }

        const numUpdated = await SubscriptionPlanModel.update(id, data);
        if (numUpdated === 0) {
            return null;
        }

        return SubscriptionPlanModel.findById(id);
    }

    static async delete(id: string): Promise<boolean> {
        const numDeleted = await SubscriptionPlanModel.delete(id);
        return numDeleted > 0;
    }

    static async toggleStatus(id: string): Promise<any> {
        const plan = await SubscriptionPlanModel.findById(id);
        if (!plan) {
            return null;
        }

        return SubscriptionPlanModel.update(id, {
            isActive: !plan.isActive
        });
    }

    static async getByBillingCycle(billingCycle: string): Promise<SubscriptionPlan[]> {
        return SubscriptionPlanModel.findByBillingCycle(billingCycle);
    }

    static async validatePlan(planId: string): Promise<boolean> {
        const plan = await SubscriptionPlanModel.findById(planId);
        return !!(plan && plan.isActive);
    }

}