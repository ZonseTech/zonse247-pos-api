import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { BranchSubscription } from 'subscription';
import { BranchSubscriptionUncheckedCreateInput } from '../databases/prisma/generated/prisma/models';

export class BranchSubscriptionModel {
    static async findAll(): Promise<BranchSubscription[]> {
        try {
            return await prisma.branchSubscription.findMany({
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription[];
        } catch (error) {
            throw new Error(
                `Error finding subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findById(branchSubscriptionId: string): Promise<BranchSubscription | null> {
        try {
            return await prisma.branchSubscription.findUnique({
                where: { branchSubscriptionId },
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription | null;
        } catch (error) {
            throw new Error(
                `Error finding subscription by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findByStatus(status: 'active' | 'cancelled' | 'expired' | 'past_due'): Promise<BranchSubscription[]> {
        try {
            return await prisma.branchSubscription.findMany({
                where: { status },
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription[];
        } catch (error) {
            throw new Error(
                `Error finding subscriptions by status: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findByPlanId(subscriptionPlanId: string): Promise<BranchSubscription[]> {
        try {
            return await prisma.branchSubscription.findMany({
                where: { subscriptionPlanId },
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription[];
        } catch (error) {
            throw new Error(
                `Error finding subscriptions by plan ID: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async create(subscriptionData: BranchSubscriptionUncheckedCreateInput): Promise<BranchSubscription> {
        try {
            return await prisma.branchSubscription.create({
                data: subscriptionData,
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription;
        } catch (error) {
            throw new Error(
                `Error creating subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async update(branchSubscriptionId: string, data: Partial<BranchSubscription>): Promise<BranchSubscription> {
        try {
            return await prisma.branchSubscription.update({
                where: { branchSubscriptionId },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription;
        } catch (error) {
            throw new Error(
                `Error updating subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async delete(branchSubscriptionId: string): Promise<number> {
        try {
            await prisma.branchSubscription.delete({
                where: { branchSubscriptionId }
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
            return await prisma.branchSubscription.count({
                where: conditions
            });
        } catch (error) {
            console.error('Error counting subscriptions:', error);
            throw error;
        }
    }

    static async findExpiring(days: number): Promise<BranchSubscription[]> {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + days);
            const now = new Date();

            return await prisma.branchSubscription.findMany({
                where: {
                    status: 'active',
                    endsAt: {
                        lte: expirationDate,
                        gt: now
                    }
                },
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription[];
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
                prisma.branchSubscription.count(),
                prisma.branchSubscription.count({
                    where: {
                        status: 'active',
                        OR: [
                            { endsAt: null },
                            { endsAt: { gte: now } }
                        ]
                    }
                }),
                prisma.branchSubscription.count({ where: { status: 'cancelled' } }),
                prisma.branchSubscription.count({
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
                prisma.branchSubscription.count({ where: { status: 'past_due' } })
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

    static buildSubscriptionData(data: {
        subscriptionPlanId: string;
        subscriptionMonths?: number;
        autoRenew?: boolean;
        paymentMethod?: string;
    }): BranchSubscriptionUncheckedCreateInput {
        const now = new Date();
        const months = data.subscriptionMonths ?? 1;
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + months);
        const nextPaymentDate = new Date(endDate);

        return {
            branchSubscriptionId: uuidv4(),
            subscriptionPlanId: data.subscriptionPlanId,
            autoRenew: data.autoRenew ?? false,
            paymentMethod: data.paymentMethod ?? null,
            status: 'active',
            startsAt: now,
            endsAt: endDate,
            lastPaymentDate: now,
            nextPaymentDate: nextPaymentDate,
            synced: 0,
        };
    }

    static async findRenewableSubscriptions(): Promise<BranchSubscription[]> {
        try {
            const now = new Date();
            const renewalWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

            return await prisma.branchSubscription.findMany({
                where: {
                    autoRenew: true,
                    status: 'active',
                    endsAt: {
                        lte: renewalWindow,
                        gt: now
                    }
                },
                include: {
                    subscriptionPlan: true
                }
            }) as unknown as BranchSubscription[];
        } catch (error) {
            throw new Error(
                `Error finding renewable subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Create or update subscription (for offline sync)
     * SubscriptionPlan must already exist (synced separately)
     */
    static async createOrUpdate(subscriptionData: any): Promise<{ subscription: BranchSubscription; created: boolean }> {
        try {
            const existingSubscription = await this.findById(subscriptionData.branchSubscriptionId);

            if (existingSubscription) {
                const updated = await this.update(subscriptionData.branchSubscriptionId, {
                    status: subscriptionData.status || existingSubscription.status,
                    startsAt: subscriptionData.startsAt ? new Date(subscriptionData.startsAt) : existingSubscription.startsAt,
                    endsAt: subscriptionData.endsAt ? new Date(subscriptionData.endsAt) : existingSubscription.endsAt,
                    autoRenew: subscriptionData.autoRenew ?? existingSubscription.autoRenew,
                    paymentMethod: subscriptionData.paymentMethod,
                    lastPaymentDate: subscriptionData.lastPaymentDate ? new Date(subscriptionData.lastPaymentDate) : null,
                    nextPaymentDate: subscriptionData.nextPaymentDate ? new Date(subscriptionData.nextPaymentDate) : null
                });
                return { subscription: updated, created: false };
            }

            const subscription = await this.create({
                branchSubscriptionId: subscriptionData.branchSubscriptionId,
                subscriptionPlanId: subscriptionData.subscriptionPlanId,
                status: subscriptionData.status || 'active',
                startsAt: subscriptionData.startsAt ? new Date(subscriptionData.startsAt) : new Date(),
                endsAt: subscriptionData.endsAt ? new Date(subscriptionData.endsAt) : null,
                autoRenew: subscriptionData.autoRenew ?? true,
                paymentMethod: subscriptionData.paymentMethod || null,
                lastPaymentDate: subscriptionData.lastPaymentDate ? new Date(subscriptionData.lastPaymentDate) : null,
                nextPaymentDate: subscriptionData.nextPaymentDate ? new Date(subscriptionData.nextPaymentDate) : null,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return { subscription, created: true };
        } catch (error) {
            throw new Error(
                `Error in createOrUpdate subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
