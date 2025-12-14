import { v4 as uuidv4 } from 'uuid';
import { ValidationParams } from 'on-boarding';
import prisma from '../databases/prisma/client';
import type { PlanFeature, SubscriptionPlan } from 'subscription';
import { SubscriptionPlanCreateInput, SubscriptionPlanUpdateInput } from '../databases/prisma/generated/prisma/models';

export class SubscriptionPlanModel {
	static async findAllByRDBMS(_: ValidationParams): Promise<SubscriptionPlan[]> {
		try {
			return await prisma.subscriptionPlan.findMany() as unknown as SubscriptionPlan[];
		} catch (error) {
			throw new Error(
				`Error finding subscription plans: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findAll(): Promise<SubscriptionPlan[]> {
		try {
			return await prisma.subscriptionPlan.findMany() as unknown as SubscriptionPlan[];
		} catch (error) {
			throw new Error(
				`Error finding subscription plans: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findById(id: string): Promise<SubscriptionPlan | null> {
		try {
			return await prisma.subscriptionPlan.findUnique({
				where: { subscriptionPlanId: id }
			}) as unknown as SubscriptionPlan | null;
		} catch (error) {
			throw new Error(
				`Error finding subscription plan by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findActivePlans(): Promise<SubscriptionPlan[]> {
		try {
			return await prisma.subscriptionPlan.findMany({
				where: { isActive: true }
			}) as unknown as SubscriptionPlan[];
		} catch (error) {
			throw new Error(
				`Error finding active subscription plans: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async create(planData: SubscriptionPlanCreateInput): Promise<SubscriptionPlan> {
		try {
			const planWithId = {
				...planData,
				subscriptionPlanId: uuidv4()
			};

			return await prisma.subscriptionPlan.create({
				data: planWithId
			}) as unknown as SubscriptionPlan;
		} catch (error) {
			throw new Error(
				`Error creating subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async update(id: string, data: SubscriptionPlanUpdateInput): Promise<number> {
		try {
			await prisma.subscriptionPlan.update({
				where: { subscriptionPlanId: id },
				data: {
					...data,
					updatedAt: new Date()
				}
			});
			return 1;
		} catch (error) {
			throw new Error(
				`Error updating subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async delete(id: string): Promise<number> {
		try {
			await prisma.subscriptionPlan.delete({
				where: { subscriptionPlanId: id }
			});
			return 1;
		} catch (error) {
			throw new Error(
				`Error deleting subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async toggleStatus(id: string): Promise<number> {
		try {
			const plan = await this.findById(id);
			if (!plan) {
				throw new Error('Subscription plan not found');
			}
			return await this.update(id, { isActive: !plan.isActive });
		} catch (error) {
			throw new Error(
				`Error toggling subscription plan status: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async validatePlan(planId: string): Promise<boolean> {
		try {
			const plan = await this.findById(planId);
			return !!(plan && plan.isActive);
		} catch (error) {
			throw new Error(
				`Error validating subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async getPlanPrice(planId: string): Promise<number> {
		try {
			const plan = await this.findById(planId);
			if (!plan) {
				throw new Error('Subscription plan not found');
			}
			return plan.monthlyPrice || plan.yearlyPrice;
		} catch (error) {
			throw new Error(
				`Error getting subscription plan price: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async getPlansByFeature(feature: PlanFeature): Promise<SubscriptionPlan[]> {
		try {
			// Note: Filtering JSON fields requires raw queries or application-level filtering
			// This approach loads all active plans and filters in memory
			const allPlans = await prisma.subscriptionPlan.findMany({
				where: { isActive: true }
			}) as unknown as SubscriptionPlan[];

			return allPlans.filter(plan =>
				plan.features && Array.isArray(plan.features) && plan.features.includes(feature)
			);
		} catch (error) {
			throw new Error(
				`Error getting subscription plans by feature: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}