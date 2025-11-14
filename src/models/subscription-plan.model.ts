import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { SUBSCRIPTION_PLANS_TABLE } from '../databases/local/tables';
import { mysqlPool } from '../config/db';

export class SubscriptionPlanModel {

	static async findAllByRDBMS(conditions: ValidationParams): Promise<Role[]> {
		try {
			const connection = await mysqlPool.getConnection();
			const [rows] = await connection.execute(`SELECT * FROM ${SUBSCRIPTION_PLANS_TABLE} WHERE tenant_id=${conditions.tenantId}`);
			const records = rows as any[];

			return records
		} catch (error) {
			throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	static async findAll(): Promise<SubscriptionPlan[]> {
		return sealDBModel.findAll(SUBSCRIPTION_PLANS_TABLE);
	}

	static async findById(id: string): Promise<SubscriptionPlan | null> {
		return sealDBModel.findById(SUBSCRIPTION_PLANS_TABLE, { planId: id });
	}

	static async findActivePlans(): Promise<SubscriptionPlan[]> {
		return sealDBModel.find(SUBSCRIPTION_PLANS_TABLE, {
			isActive: true,
		});
	}

	static async findByBillingCycle(billingCycle: string): Promise<SubscriptionPlan[]> {
		return sealDBModel.find(SUBSCRIPTION_PLANS_TABLE, { billingCycle });
	}

	static async create(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
		const planWithId = {
			...planData,
			id: uuidv4(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return sealDBModel.insert(SUBSCRIPTION_PLANS_TABLE, planWithId);
	}

	static async update(id: string, data: Partial<SubscriptionPlan>): Promise<number> {
		const updateData = {
			...data,
			updatedAt: new Date(),
		};

		return sealDBModel.update(SUBSCRIPTION_PLANS_TABLE, { planId: id }, updateData);
	}

	static async delete(id: string): Promise<number> {
		return sealDBModel.delete(SUBSCRIPTION_PLANS_TABLE, { planId: id });
	}

	static async toggleStatus(id: string): Promise<number> {
		const plan = await this.findById(id);
		if (!plan) {
			throw new Error('Subscription plan not found');
		}

		return this.update(id, { isActive: !plan.isActive });
	}

	static async validatePlan(planId: string): Promise<boolean> {
		const plan = await this.findById(planId);
		return !!(plan && plan.isActive);
	}

	static async getPlanPrice(planId: string): Promise<number> {
		const plan = await this.findById(planId);
		if (!plan) {
			throw new Error('Subscription plan not found');
		}
		return plan.monthlyPrice || plan.yearlyPrice;
	}

	static async getPlansByFeature(feature: PlanFeature): Promise<SubscriptionPlan[]> {
		const allPlans = await this.findAll();
		return allPlans.filter(plan =>
			plan.features.includes(feature) && plan.isActive
		);
	}
}