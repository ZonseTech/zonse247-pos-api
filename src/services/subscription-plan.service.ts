import type { Role } from 'role-permission';
import { SubscriptionPlanModel } from '../models/subscription-plan.model';
import { SubscriptionPlan } from 'subscription';
import { SubscriptionPlanCreateInput, SubscriptionPlanUpdateInput } from '../databases/prisma/generated/prisma/models';

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
        return SubscriptionPlanModel.create(data as unknown as SubscriptionPlanCreateInput);
    }

    static async update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
        const existingPlan = await SubscriptionPlanModel.findById(id);
        if (!existingPlan) {
            return null;
        }

        const numUpdated = await SubscriptionPlanModel.update(id, data as unknown as SubscriptionPlanUpdateInput);
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

    static async validatePlan(planId: string): Promise<boolean> {
        const plan = await SubscriptionPlanModel.findById(planId);
        return !!(plan && plan.isActive);
    }

}