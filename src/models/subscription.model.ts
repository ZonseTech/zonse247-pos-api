import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { TABLE_NAMES } from '../databases/local/tables';

export class SubscriptionModel {

    static async findAll(): Promise<ClientSubscription[]> {
        return sealDBModel.findAll(TABLE_NAMES.CLIENT_SUBSCRIPTIONS);
    }

    static async findByUuid(uuid: string): Promise<ClientSubscription | null> {
        return sealDBModel.findById(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, uuid);
    }

    static async findByStatus(status: string): Promise<ClientSubscription[]> {
        return sealDBModel.find(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, { status });
    }

    static async findByPlanId(planId: string): Promise<ClientSubscription[]> {
        return sealDBModel.find(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, { planId });
    }

    static async update(uuid: string, data: Partial<ClientSubscription>): Promise<number> {
        return sealDBModel.update(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, uuid, data);
    }

    static async delete(uuid: string): Promise<number> {
        return sealDBModel.delete(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, uuid);
    }

    static async findExpiring(days: number): Promise<ClientSubscription[]> {
        const allSubscriptions = await sealDBModel.findAll(TABLE_NAMES.CLIENT_SUBSCRIPTIONS);
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);

        return allSubscriptions.filter(subscription => {
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
        const allSubscriptions = await sealDBModel.findAll(TABLE_NAMES.CLIENT_SUBSCRIPTIONS);

        const stats = {
            total: allSubscriptions.length,
            active: 0,
            cancelled: 0,
            expired: 0,
            pastDue: 0,
            monthlyRevenue: 0,
            annualRevenue: 0
        };

        const allPlans = await sealDBModel.findAll(TABLE_NAMES.SUBSCRIPTION_PLANS);
        const plansMap = new Map(allPlans.map(plan => [plan.uuid, plan]));

        for (const subscription of allSubscriptions) {
            switch (subscription.status) {
                case 'active':
                    if (subscription.endsAt && new Date(subscription.endsAt) < now) {
                        stats.expired++;
                    } else {
                        stats.active++;

                        const plan = plansMap.get(subscription.planId);
                        if (plan) {
                            if (plan.billingCycle === 'monthly') {
                                stats.monthlyRevenue += plan.price || 0;
                                stats.annualRevenue += (plan.price || 0) * 12;
                            } else if (plan.billingCycle === 'yearly') {
                                stats.annualRevenue += plan.price || 0;
                                stats.monthlyRevenue += (plan.price || 0) / 12;
                            }
                        }
                    }
                    break;
                case 'cancelled':
                    stats.cancelled++;
                    break;
                case 'expired':
                    stats.expired++;
                    break;
                case 'pastDue':
                    stats.pastDue++;
                    break;
            }
        }

        return stats;
    }

    static async findActivePlans(): Promise<SubscriptionPlan[]> {
        return sealDBModel.find(TABLE_NAMES.SUBSCRIPTION_PLANS, { is_active: true });
    }

    static async findById(id: string): Promise<SubscriptionPlan | null> {
        return sealDBModel.findById(TABLE_NAMES.SUBSCRIPTION_PLANS, id);
    }

    static async findActiveByClientUuid(clientUuid: string): Promise<ClientSubscription> {
        return sealDBModel.findById(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, { clientUuid, status: 'active' });
    }

    static async findByClientUuid(clientUuid: string): Promise<ClientSubscription[]> {
        return sealDBModel.find(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, { clientUuid });
    }

    static async create(subscriptionData: Omit<ClientSubscription, 'uuid'>): Promise<ClientSubscription> {
        return sealDBModel.insert(TABLE_NAMES.CLIENT_SUBSCRIPTIONS, subscriptionData);
    }

    static buildSubscriptionData(
        clientUuid: string,
        planId: string,
        plan: SubscriptionPlan,
        paymentMethod?: string,
        autoRenew = true
    ): Omit<ClientSubscription, 'id'> {
        const now = new Date();
        let endDate: Date | null = null;
        let nextPaymentDate: Date | null = null;

        switch (plan.billingCycle) {
            case 'monthly':
                endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                nextPaymentDate = new Date(endDate);
                break;
            case 'yearly':
                endDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
                nextPaymentDate = new Date(endDate);
                break;
            case 'lifetime':
                endDate = null;
                nextPaymentDate = null;
                break;
            default:
                endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                nextPaymentDate = new Date(endDate);
        }

        return {
            uuid: uuidv4(),
            clientUuid,
            planId,
            status: 'active',
            startsAt: now.toISOString(),
            endsAt: endDate ? endDate.toISOString() : undefined,
            autoRenew,
            maxShops: plan.maxShops || 1,
            paymentMethod: paymentMethod || '',
            lastPaymentDate: now.toISOString(),
            nextPaymentDate: nextPaymentDate ? nextPaymentDate.toISOString() : undefined
        };
    }
}