import { TenantService } from './tenant.service';
import { TenantModel } from '../models/tenant.model';
import { SubscriptionModel } from '../models/subscription.model';
import { SubscriptionPlanService } from './subscription-plan.service';
import type { Role } from 'role-permission';
import type { CreateSubscriptionRequest, TenantSubscription } from 'subscription';

export class SubscriptionService {

	static async selectAll(params): Promise<Array<Role>> {
		return await SubscriptionModel.findAllByRDBMS(params);
	}

	static async getAll(): Promise<Array<TenantSubscription>> {
		const subscriptions = await SubscriptionModel.findAll();

		const enhancedSubscriptions = await Promise.all(
			subscriptions.map(async (subscription) => {
				const tenant = await TenantModel.findById(subscription.tenantId);

				return {
					...subscription,
					tenantDetails: {
						tenantCode: tenant?.tenantCode,
						companyName: tenant?.businessName,
						ownerName: tenant?.ownerName,
					},
				};
			})
		);

		return enhancedSubscriptions;
	}

	static async getById(id: string): Promise<TenantSubscription | null> {
		return SubscriptionModel.findById(id);
	}

	static async create(
		data: CreateSubscriptionRequest
	): Promise<TenantSubscription> {
		const validationError = TenantService.validateRequired(data, [
			'tenantId',
			'planId',
		]);
		if (validationError) {
			throw new Error(validationError);
		}

		const tenant = await TenantModel.findById(data.tenantId);
		if (!tenant) {
			throw new Error('Tenant not found');
		}

		const plan = await SubscriptionPlanService.getById(data.planId);
		if (!plan || !plan.isActive) {
			throw new Error('Subscription plan not found or inactive');
		}

		if (tenant.subscriptionPlan === data.planName) {
			throw new Error('Tenant already subscribe to this plan.');
		}

		const existingSubscription = await SubscriptionModel.findActiveByTenantId(data.tenantId);

		if (existingSubscription.subscriptionId) {
			await SubscriptionModel.update(existingSubscription.subscriptionId, {
				status: 'cancelled',
			})
		}

		const subscriptionData = SubscriptionModel.buildSubscriptionData(data);
		const newSubscription = await SubscriptionModel.create(subscriptionData);

		const now = new Date();
		await TenantModel.update(data.tenantId, {
			subscriptionPlan: plan.name,
			subscriptionStatus: 'ACTIVE',
			status: 'active',
			activatedAt: now,
		});

		return newSubscription;
	}

	static async update(
		id: string,
		data: Partial<TenantSubscription>
	): Promise<TenantSubscription | null> {
		const existingSubscription = await SubscriptionModel.findById(id);
		if (!existingSubscription) {
			return null;
		}

		const numUpdated = await SubscriptionModel.update(id, data);
		if (numUpdated === 0) {
			return null;
		}

		return SubscriptionModel.findById(id);
	}

	static async delete(id: string): Promise<boolean> {
		const numDeleted = await SubscriptionModel.delete(id);
		return numDeleted > 0;
	}

	static async getByStatus(status: string): Promise<TenantSubscription[]> {
		return SubscriptionModel.findByStatus(status);
	}

	static async getByClientUuid(
		clientUuid: string
	): Promise<TenantSubscription[]> {
		return SubscriptionModel.findByTenantId(clientUuid);
	}

	static async getByPlanId(planId: string): Promise<TenantSubscription[]> {
		return SubscriptionModel.findByPlanId(planId);
	}

	static async cancel(id: string): Promise<TenantSubscription | null> {
		const subscription = await SubscriptionModel.findById(id);
		if (!subscription) {
			return null;
		}

		const cancelData = {
			status: 'cancelled',
			ends_at: new Date().toISOString(),
			autoRenew: false,
			cancelled_at: new Date().toISOString(),
		};

		await SubscriptionModel.update(id, cancelData as any);

		await TenantModel.update(subscription.tenantId, {
			subscriptionStatus: 'CANCELLED',
		});

		return SubscriptionModel.findById(id);
	}

	static async reactivate(id: string): Promise<TenantSubscription | null> {
		const subscription = await SubscriptionModel.findById(id);
		if (!subscription) {
			return null;
		}

		const plan = await SubscriptionPlanService.getById(subscription.planId);
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


		const reactivateData = {
			status: 'active',
			startsAt: now.toISOString(),
			ends_at: endDate ? endDate.toISOString() : undefined,
			autoRenew: true,
			cancelled_at: undefined,
		};

		await SubscriptionModel.update(id, reactivateData as any);

		await TenantModel.update(subscription.tenantId, {
			subscriptionStatus: 'ACTIVE',
			status: 'active',
		});

		return SubscriptionModel.findById(id);
	}

	static async processPayment(
		id: string,
		paymentData: { amount: number; paymentMethod: string }
	): Promise<TenantSubscription | null> {
		const subscription = await SubscriptionModel.findById(id);
		if (!subscription) {
			return null;
		}

		const now = new Date();
		const paymentProcessData = {
			last_payment_date: now.toISOString(),
			paymentMethod: paymentData.paymentMethod,
			status: 'active',
		};

		const plan = await SubscriptionPlanService.getById(subscription.planId);
		if (plan) {
			let nextPaymentDate: Date | null = null;
			if (plan.monthlyPrice) {
				nextPaymentDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			}

			if (plan.yearlyPrice) {

				nextPaymentDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
			}

			if (nextPaymentDate) {
				(paymentProcessData as any).next_payment_date = nextPaymentDate.toISOString();
				(paymentProcessData as any).ends_at = nextPaymentDate.toISOString();
			}
		}

		await SubscriptionModel.update(id, paymentProcessData as any);
		return SubscriptionModel.findById(id);
	}

	static async getExpiring(days = 30): Promise<TenantSubscription[]> {
		return SubscriptionModel.findExpiring(days);
	}

	static async bulkUpdate(
		ids: string[],
		updateData: Partial<TenantSubscription>
	): Promise<TenantSubscription[]> {
		const updatedSubscriptions: TenantSubscription[] = [];

		for (const id of ids) {
			try {
				await SubscriptionModel.update(id, updateData);
				const updated = await SubscriptionModel.findById(id);
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
		return SubscriptionModel.getStats();
	}
}