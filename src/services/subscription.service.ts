import { BranchSubscriptionModel } from '../models/branch-subscription.model';
import { SubscriptionPlanService } from './subscription-plan.service';
import type { CreateSubscriptionRequest, BranchSubscription } from 'subscription';
import { ValidationError } from '../utils/errors';

export class SubscriptionService {

	static async getAll(): Promise<Array<BranchSubscription>> {
		const subscriptions = await BranchSubscriptionModel.findAll();
		return subscriptions;
	}

	static async getById(id: string): Promise<BranchSubscription | null> {
		return BranchSubscriptionModel.findById(id);
	}

	static async create(
		data: CreateSubscriptionRequest & { branchSubscriptionId?: string }
	): Promise<BranchSubscription> {

		const validationError = ValidationError.validateRequired(data, [
			'subscriptionPlanId',
		]);
		if (validationError) {
			throw new ValidationError(validationError);
		}

		const plan = await SubscriptionPlanService.getById(data.subscriptionPlanId);
		if (!plan || !plan.isActive) {
			throw new ValidationError('Subscription plan not found or inactive');
		}

		if (data.branchSubscriptionId) {
			const existingSubscription = await BranchSubscriptionModel.findById(data.branchSubscriptionId);
			if (existingSubscription) {
				await BranchSubscriptionModel.update(existingSubscription.branchSubscriptionId, {
					status: 'cancelled',
				});
			}
		}

		const subscriptionData = BranchSubscriptionModel.buildSubscriptionData({
			subscriptionPlanId: data.subscriptionPlanId,
			subscriptionMonths: data.subscriptionMonths,
			autoRenew: data.autoRenew,
			paymentMethod: data.paymentMethod,
		});

		const newSubscription = await BranchSubscriptionModel.create(subscriptionData);
		return newSubscription;
	}

	static async update(
		id: string,
		data: Partial<BranchSubscription>
	): Promise<BranchSubscription | null> {
		const existingSubscription = await BranchSubscriptionModel.findById(id);
		if (!existingSubscription) {
			return null;
		}

		return await BranchSubscriptionModel.update(id, data);
	}

	static async delete(id: string): Promise<boolean> {
		const numDeleted = await BranchSubscriptionModel.delete(id);
		return numDeleted > 0;
	}

	static async getByStatus(status: 'active' | 'cancelled' | 'expired' | 'past_due'): Promise<BranchSubscription[]> {
		return BranchSubscriptionModel.findByStatus(status);
	}

	static async getByPlanId(planId: string): Promise<BranchSubscription[]> {
		return BranchSubscriptionModel.findByPlanId(planId);
	}

	static async getByBranchId(branchId: string): Promise<BranchSubscription | null> {
		return BranchSubscriptionModel.findByBranchId(branchId);
	}

	static async cancel(id: string): Promise<BranchSubscription | null> {
		const subscription = await BranchSubscriptionModel.findById(id);
		if (!subscription) {
			return null;
		}

		return await BranchSubscriptionModel.update(id, {
			status: 'cancelled',
			endsAt: new Date(),
			autoRenew: false,
		});
	}

	static async reactivate(id: string): Promise<BranchSubscription | null> {
		const subscription = await BranchSubscriptionModel.findById(id);
		if (!subscription) {
			return null;
		}

		const plan = await SubscriptionPlanService.getById(subscription.subscriptionPlanId);
		if (!plan) {
			throw new Error('Subscription plan not found');
		}

		const now = new Date();
		let endDate: Date | null = null;

		if (plan.monthlyPrice) {
			endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
		}

		if (plan.yearlyPrice) {
			endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
		}

		return await BranchSubscriptionModel.update(id, {
			status: 'active',
			startsAt: now,
			endsAt: endDate || undefined,
			autoRenew: true,
		});
	}

	static async processPayment(
		id: string,
		paymentData: { amount: number; paymentMethod: string }
	): Promise<BranchSubscription | null> {
		const subscription = await BranchSubscriptionModel.findById(id);
		if (!subscription) {
			return null;
		}

		const now = new Date();
		const plan = await SubscriptionPlanService.getById(subscription.subscriptionPlanId);

		let nextPaymentDate: Date | null = null;
		if (plan) {
			if (plan.monthlyPrice) {
				nextPaymentDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			}
			if (plan.yearlyPrice) {
				nextPaymentDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
			}
		}

		return await BranchSubscriptionModel.update(id, {
			lastPaymentDate: now,
			paymentMethod: paymentData.paymentMethod,
			status: 'active',
			nextPaymentDate: nextPaymentDate || undefined,
			endsAt: nextPaymentDate || undefined,
		});
	}

	static async getExpiring(days = 30): Promise<BranchSubscription[]> {
		return BranchSubscriptionModel.findExpiring(days);
	}

	static async bulkUpdate(
		ids: string[],
		updateData: Partial<BranchSubscription>
	): Promise<BranchSubscription[]> {
		const updatedSubscriptions: BranchSubscription[] = [];

		for (const id of ids) {
			try {
				const updated = await BranchSubscriptionModel.update(id, updateData);
				if (updated) {
					updatedSubscriptions.push(updated);
				}
			} catch (error) {
				console.error(`Error updating subscription ${id}:`, error);
			}
		}

		return updatedSubscriptions;
	}

	static async getStats(): Promise<{
		total: number;
		active: number;
		cancelled: number;
		expired: number;
		pastDue: number;
		monthlyRevenue: number;
		annualRevenue: number;
	}> {
		return BranchSubscriptionModel.getStats();
	}

	static async getRenewable(): Promise<BranchSubscription[]> {
		return BranchSubscriptionModel.findRenewableSubscriptions();
	}
}
