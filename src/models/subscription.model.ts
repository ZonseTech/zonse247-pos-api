import { v4 as uuidv4 } from 'uuid';
import type { Role } from 'role-permission';
import { ValidationParams } from 'on-boarding';
import prisma from '../databases/prisma/client';
import { TenantSubscription } from 'subscription';
import { TenantSubscriptionCreateInput } from '../databases/prisma/generated/prisma/models';
import { EnumTenantSubscriptionStatusNullableFilter } from '../databases/prisma/generated/prisma/commonInputTypes';

export class SubscriptionModel {
	static async findAllByRDBMS(conditions: ValidationParams): Promise<Role[]> {
		try {
			return await prisma.tenantSubscription.findMany({
				where: {
					tenantId: conditions.tenantId,
				},
			}) as unknown as Role[];
		} catch (error) {
			throw new Error(
				`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findAll(): Promise<TenantSubscription[]> {
		try {
			return await prisma.tenantSubscription.findMany() as unknown as TenantSubscription[];
		} catch (error) {
			throw new Error(
				`Error finding subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findById(tenantSubscriptionId: string): Promise<TenantSubscription | null> {
		try {
			return await prisma.tenantSubscription.findUnique({
				where: { tenantSubscriptionId }
			}) as unknown as TenantSubscription | null;
		} catch (error) {
			throw new Error(
				`Error finding subscription by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findByStatus(status: EnumTenantSubscriptionStatusNullableFilter): Promise<TenantSubscription[]> {
		try {
			return await prisma.tenantSubscription.findMany({
				where: { status }
			}) as unknown as TenantSubscription[];
		} catch (error) {
			throw new Error(
				`Error finding subscriptions by status: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findByPlanId(subscriptionPlanId: string): Promise<TenantSubscription[]> {
		try {
			return await prisma.tenantSubscription.findMany({
				where: { subscriptionPlanId }
			}) as unknown as TenantSubscription[];
		} catch (error) {
			throw new Error(
				`Error finding subscriptions by plan ID: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findByTenantId(tenantId: string): Promise<TenantSubscription[]> {
		try {
			return await prisma.tenantSubscription.findMany({
				where: { tenantId }
			}) as unknown as TenantSubscription[];
		} catch (error) {
			throw new Error(
				`Error finding subscriptions by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async findActiveByTenantId(tenantId: string): Promise<TenantSubscription | null> {
		try {
			return await prisma.tenantSubscription.findFirst({
				where: {
					tenantId,
					status: 'active'
				}
			}) as unknown as TenantSubscription | null;
		} catch (error) {
			throw new Error(
				`Error finding active subscription by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async create(subscriptionData: TenantSubscriptionCreateInput): Promise<TenantSubscription> {
		try {
			return await prisma.tenantSubscription.create({
				data: subscriptionData
			}) as unknown as TenantSubscription;
		} catch (error) {
			throw new Error(
				`Error creating subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async update(tenantSubscriptionId: string, data: Partial<TenantSubscription>): Promise<number> {
		try {
			await prisma.tenantSubscription.update({
				where: { tenantSubscriptionId },
				data: {
					...data,
					updatedAt: new Date()
				}
			});
			return 1;
		} catch (error) {
			throw new Error(
				`Error updating subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async delete(uuid: string): Promise<number> {
		try {
			await prisma.tenantSubscription.delete({
				where: { tenantSubscriptionId: uuid }
			});
			return 1;
		} catch (error) {
			throw new Error(
				`Error deleting subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static async count(conditions: any = {}): Promise<number> {
		try {
			return await prisma.tenantSubscription.count({
				where: conditions
			});
		} catch (error) {
			console.error('Error counting subscriptions:', error);
			throw error;
		}
	}

	static async findExpiring(days: number): Promise<TenantSubscription[]> {
		try {
			const expirationDate = new Date();
			expirationDate.setDate(expirationDate.getDate() + days);
			const now = new Date();

			return await prisma.tenantSubscription.findMany({
				where: {
					status: 'active',
					endsAt: {
						lte: expirationDate,
						gt: now
					}
				}
			}) as unknown as TenantSubscription[];
		} catch (error) {
			throw new Error(
				`Error finding expiring subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
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
		try {
			const now = new Date();

			const [total, active, cancelled, expired, pastDue] = await Promise.all([
				prisma.tenantSubscription.count(),
				prisma.tenantSubscription.count({
					where: {
						status: 'active',
						OR: [
							{ endsAt: null },
							{ endsAt: { gte: now } }
						]
					}
				}),
				prisma.tenantSubscription.count({ where: { status: 'cancelled' } }),
				prisma.tenantSubscription.count({
					where: {
						OR: [
							{ status: 'expired' },
							{
								status: 'active',
								endsAt: { lt: now }
							}
						]
					}
				}),
				prisma.tenantSubscription.count({ where: { status: 'past_due' } })
			]);

			return {
				total,
				active,
				cancelled,
				expired,
				pastDue,
				monthlyRevenue: 0,
				annualRevenue: 0,
			};
		} catch (error) {
			throw new Error(
				`Error getting subscription stats: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	static buildSubscriptionData(
		data: any
	) {
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
			tenantId: data.tenantId,
			subscriptionPlanId: data.subscriptionPlanId,
			autoRenew: data.autoRenew || false,
			paymentMethod: data.paymentMethod || '',
			status: 'active',
			startsAt: now.toISOString(),
			endsAt: endDate.toISOString() || undefined,
			lastPaymentDate: now.toISOString(),
			nextPaymentDate: nextPaymentDate.toISOString() || undefined,
			maxBranches: 1,
			tenantSubscriptionId: uuidv4(),

		};
	}

	static async findRenewableSubscriptions(): Promise<TenantSubscription[]> {
		try {
			const now = new Date();
			const renewalWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

			return await prisma.tenantSubscription.findMany({
				where: {
					autoRenew: true,
					status: 'active',
					endsAt: {
						lte: renewalWindow,
						gt: now
					}
				}
			}) as unknown as TenantSubscription[];
		} catch (error) {
			throw new Error(
				`Error finding renewable subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}