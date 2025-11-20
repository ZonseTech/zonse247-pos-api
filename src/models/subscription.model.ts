import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { TENANT_SUBSCRIPTIONS_TABLE } from '../databases/local/tables';
import { mysqlPool } from '../config/db';
import { ValidationParams } from 'on-boarding';
import type { Role } from 'role-permission';
import { CreateSubscriptionRequest, TenantSubscription } from 'subscription';

export class SubscriptionModel {
	static async findAllByRDBMS(conditions: ValidationParams): Promise<Role[]> {
		try {
			const connection = await mysqlPool.getConnection();
			const [rows] = await connection.execute(`SELECT * FROM ${TENANT_SUBSCRIPTIONS_TABLE} WHERE tenant_id=${conditions.tenantId}`);
			const records = rows as any[];

			return records
		} catch (error) {
			throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	static async findAll(): Promise<TenantSubscription[]> {
		return sealDBModel.findAll(TENANT_SUBSCRIPTIONS_TABLE);
	}

	static async findById(subscriptionId: string): Promise<TenantSubscription | null> {
		return sealDBModel.findById(TENANT_SUBSCRIPTIONS_TABLE, { subscriptionId });
	}

	static async findByStatus(status: string): Promise<TenantSubscription[]> {
		return sealDBModel.find(TENANT_SUBSCRIPTIONS_TABLE, { status });
	}

	static async findByPlanId(planId: string): Promise<TenantSubscription[]> {
		return sealDBModel.find(TENANT_SUBSCRIPTIONS_TABLE, { planId });
	}

	static async findByTenantId(tenantId: string): Promise<TenantSubscription[]> {
		return sealDBModel.find(TENANT_SUBSCRIPTIONS_TABLE, { tenantId });
	}

	static async findActiveByTenantId(tenantId: string): Promise<TenantSubscription | null> {
		const subscriptions = await sealDBModel.find(TENANT_SUBSCRIPTIONS_TABLE, {
			tenantId,
			status: 'active'
		});
		return subscriptions.length > 0 ? subscriptions[0] : null;
	}

	static async create(subscriptionData: Omit<TenantSubscription, 'id'>): Promise<TenantSubscription> {
		const subscriptionWithId = {
			...subscriptionData,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return sealDBModel.insert(TENANT_SUBSCRIPTIONS_TABLE, subscriptionWithId);
	}

	static async update(subscriptionId: string, data: Partial<TenantSubscription>): Promise<number> {
		const updateData = {
			...data,
			updated_at: new Date(),
		};

		return sealDBModel.update(TENANT_SUBSCRIPTIONS_TABLE, { subscriptionId }, updateData);
	}

	static async delete(uuid: string): Promise<number> {
		return sealDBModel.delete(TENANT_SUBSCRIPTIONS_TABLE, uuid);
	}

	static async count(conditions: any = {}): Promise<number> {
		try {
			return await sealDBModel.count(TENANT_SUBSCRIPTIONS_TABLE, conditions);
		} catch (error) {
			console.error('Error counting payment methods:', error);
			throw error;
		}
	}

	static async findExpiring(days: number): Promise<TenantSubscription[]> {
		const allSubscriptions = await this.findAll();
		const expirationDate = new Date();
		expirationDate.setDate(expirationDate.getDate() + days);

		return allSubscriptions.filter((subscription) => {
			if (!subscription.endsAt || subscription.status !== 'active') return false;

			const endDate = new Date(subscription.endsAt);
			return endDate <= expirationDate && endDate > new Date();
		});
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
		const now = new Date();
		const allSubscriptions = await this.findAll();

		const stats = {
			total: allSubscriptions.length,
			active: 0,
			cancelled: 0,
			expired: 0,
			pastDue: 0,
			monthlyRevenue: 0,
			annualRevenue: 0,
		};

		for (const subscription of allSubscriptions) {
			switch (subscription.status) {
				case 'active':
					if (subscription.endsAt && new Date(subscription.endsAt) < now) {
						stats.expired++;
					} else {
						stats.active++;
					}
					break;
				case 'cancelled':
					stats.cancelled++;
					break;
				case 'expired':
					stats.expired++;
					break;
				case 'past_due':
					stats.pastDue++;
					break;
			}
		}

		return stats;
	}

	static buildSubscriptionData(
		data: CreateSubscriptionRequest
	): Omit<TenantSubscription, 'id'> {
		const now = new Date();
		let endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
		let nextPaymentDate = new Date(endDate);

		if (data.billingCycle === 'monthly') {
			endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			nextPaymentDate = new Date(endDate);
		}

		if (data.billingCycle === 'yearly') {
			endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
			nextPaymentDate = new Date(endDate);
		}

		return {
			...data,
			status: 'active',
			startsAt: now.toISOString(),
			endsAt: endDate.toISOString() || undefined,
			lastPaymentDate: now.toISOString(),
			nextPaymentDate: nextPaymentDate.toISOString() || undefined,
			maxBranches: 1,
			subscriptionId: uuidv4(),
		};
	}

	static async getSubscriptionsCountByPlan(): Promise<{ [planId: string]: number }> {
		const allSubscriptions = await this.findAll();
		const countByPlan: { [planId: string]: number } = {};

		for (const subscription of allSubscriptions) {
			countByPlan[subscription.planId] = (countByPlan[subscription.planId] || 0) + 1;
		}

		return countByPlan;
	}

	static async findRenewableSubscriptions(): Promise<TenantSubscription[]> {
		const allSubscriptions = await this.findAll();
		const now = new Date();
		const renewalWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

		return allSubscriptions.filter(subscription =>
			subscription.autoRenew &&
			subscription.status === 'active' &&
			subscription.endsAt &&
			new Date(subscription.endsAt) <= renewalWindow &&
			new Date(subscription.endsAt) > now
		);
	}
}