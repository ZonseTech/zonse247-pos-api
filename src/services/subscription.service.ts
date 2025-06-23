import { ClientService } from "./client.service";
import { ClientModel } from "../models/client.model";
import { SubscriptionModel } from "../models/subscription.model";

export class SubscriptionService {

    static async getAll(): Promise<ClientSubscription[]> {
        const subscriptions = await SubscriptionModel.findAll()

        const enhancedSubscriptions = await Promise.all(
            subscriptions.map(async (subscription) => {
                const client = await ClientModel.findById(subscription.clientUuid);

                return {
                    ...subscription,
                    clientDetails: {
                        clientCode: client?.clientCode,
                        companyName: client?.companyName,
                        ownerName: client?.ownerName
                    }
                };
            })
        );

        return enhancedSubscriptions
    }

    static async getById(id: string): Promise<ClientSubscription | null> {
        return SubscriptionModel.findByUuid(id);
    }

    static async create(data: Omit<ClientSubscription, 'uuid' | 'createdAt' | 'updatedAt'>): Promise<ClientSubscription> {
        const validationError = ClientService.validateRequired(data, ['clientUuid', 'planId']);
        if (validationError) {
            throw new Error(validationError);
        }

        const client = await ClientModel.findByClientUuid(data.clientUuid);
        if (!client) {
            throw new Error('Client not found');
        }

        /* const plan = await SubscriptionModel.findById(data.planId);
        if (!plan || !plan.isActive) {
            throw new Error('Subscription plan not found or inactive');
        } */

        const existingSubscriptions = await SubscriptionModel.findActiveByClientUuid(data.clientUuid);
        if (existingSubscriptions) {
            throw new Error('Client already has an active subscription');
        }

        const subscriptionData = {
            ...data,
            status: data.status || 'active',
            startsAt: data.startsAt || new Date().toISOString(),
            autoRenew: data.autoRenew !== undefined ? data.autoRenew : true
        };

        const newSubscription = await SubscriptionModel.create(subscriptionData);

        await ClientModel.update(data.clientUuid, {
            subscriptionStatus: 'active',
            status: 'active',
            activatedAt: new Date().toISOString()
        });

        return newSubscription;
    }

    static async update(id: string, data: Partial<ClientSubscription>): Promise<ClientSubscription | null> {
        const existingSubscription = await SubscriptionModel.findByUuid(id);
        if (!existingSubscription) {
            return null;
        }

        const numUpdated = await SubscriptionModel.update(id, data);
        if (numUpdated === 0) {
            return null;
        }

        return SubscriptionModel.findByUuid(id);
    }

    static async delete(id: string): Promise<boolean> {
        const numDeleted = await SubscriptionModel.delete(id);
        return numDeleted > 0;
    }

    static async getByStatus(status: string): Promise<ClientSubscription[]> {
        return SubscriptionModel.findByStatus(status);
    }

    static async getByClientUuid(clientUuid: string): Promise<ClientSubscription[]> {
        return SubscriptionModel.findByClientUuid(clientUuid);
    }

    static async getByPlanId(planId: string): Promise<ClientSubscription[]> {
        return SubscriptionModel.findByPlanId(planId);
    }

    static async cancel(id: string): Promise<ClientSubscription | null> {
        const subscription = await SubscriptionModel.findByUuid(id);
        if (!subscription) {
            return null;
        }

        const cancelData = {
            status: 'cancelled',
            ends_at: new Date().toISOString(),
            autoRenew: false,
            cancelled_at: new Date().toISOString()
        };

        await SubscriptionModel.update(id, cancelData as any);

        await ClientModel.update(subscription.clientUuid, {
            subscriptionStatus: 'cancelled'
        });

        return SubscriptionModel.findByUuid(id);
    }

    static async reactivate(id: string): Promise<ClientSubscription | null> {
        const subscription = await SubscriptionModel.findByUuid(id);
        if (!subscription) {
            return null;
        }

        const plan = await SubscriptionModel.findById(subscription.planId);
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        const now = new Date();
        let endDate: Date | null = null;

        switch (plan.billingCycle) {
            case 'monthly':
                endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                break;
            case 'yearly':
                endDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
                break;
            case 'lifetime':
                endDate = null;
                break;
            default:
                endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        }

        const reactivateData = {
            status: 'active',
            startsAt: now.toISOString(),
            ends_at: endDate ? endDate.toISOString() : undefined,
            autoRenew: true,
            cancelled_at: undefined
        };

        await SubscriptionModel.update(id, reactivateData as any);

        await ClientModel.update(subscription.clientUuid, {
            subscriptionStatus: 'active',
            status: 'active'
        });

        return SubscriptionModel.findByUuid(id);
    }

    static async processPayment(id: string, paymentData: { amount: number; paymentMethod: string }): Promise<ClientSubscription | null> {
        const subscription = await SubscriptionModel.findByUuid(id);
        if (!subscription) {
            return null;
        }

        const now = new Date();
        const paymentProcessData = {
            last_payment_date: now.toISOString(),
            paymentMethod: paymentData.paymentMethod,
            status: 'active'
        };

        const plan = await SubscriptionModel.findById(subscription.planId);
        if (plan) {
            let nextPaymentDate: Date | null = null;
            switch (plan.billingCycle) {
                case 'monthly':
                    nextPaymentDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                    break;
                case 'yearly':
                    nextPaymentDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
                    break;
                case 'lifetime':
                    nextPaymentDate = null;
                    break;
            }

            if (nextPaymentDate) {
                (paymentProcessData as any).next_payment_date = nextPaymentDate.toISOString();
                (paymentProcessData as any).ends_at = nextPaymentDate.toISOString();
            }
        }

        await SubscriptionModel.update(id, paymentProcessData as any);
        return SubscriptionModel.findByUuid(id);
    }

    static async getExpiring(days: number = 30): Promise<ClientSubscription[]> {
        return SubscriptionModel.findExpiring(days);
    }

    static async bulkUpdate(ids: string[], updateData: Partial<ClientSubscription>): Promise<ClientSubscription[]> {
        const updatedSubscriptions: ClientSubscription[] = [];

        for (const id of ids) {
            try {
                await SubscriptionModel.update(id, updateData);
                const updated = await SubscriptionModel.findByUuid(id);
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

    static async getActivePlans(): Promise<SubscriptionPlan[]> {
        return SubscriptionModel.findActivePlans();
    }

    static async createSubscription(data: CreateSubscriptionRequest): Promise<ClientSubscription> {
        const validationError = ClientService.validateRequired(data, ['clientUuid', 'planId']);
        if (validationError) {
            throw new Error(validationError);
        }

        const client = await ClientModel.findById(data.clientUuid);
        if (!client) {
            throw new Error('Client not found');
        }

        const plan = await SubscriptionModel.findById(data.planId);
        if (!plan || !plan.isActive) {
            throw new Error('Subscription plan not found or inactive');
        }

        const existingSubscriptions = await SubscriptionModel.findActiveByClientUuid(data.clientUuid);
        if (existingSubscriptions) {
            throw new Error('Client already has an active subscription');
        }

        const subscriptionData = SubscriptionModel.buildSubscriptionData(
            data.clientUuid,
            data.planId,
            plan,
            data.paymentMethod,
            data.autoRenew
        );

        const newSubscription = await SubscriptionModel.create(subscriptionData);

        const now = new Date();
        await ClientModel.update(data.clientUuid, {
            subscriptionStatus: 'active',
            status: 'active',
            activatedAt: now.toISOString()
        });

        return newSubscription;
    }
}