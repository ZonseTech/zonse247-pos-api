import { PrismaClient } from "../generated/mysql/client";
import { SubscriptionPlan } from "../../../types/subscription";

const plans: Array<SubscriptionPlan & { planCode: string }> = [
    {
        planId: 'offline',
        planCode: 'OFFLINE',
        name: 'Offline (Free)',
        displayName: 'Offline',
        description: 'Best for small stores that prefer full offline functionality — no cloud or MRA link.',
        monthlyPrice: 0,
        yearlyPrice: 0,
        color: 'gray',
        isActive: true,
        maxBranches: 1,
        features: [
            { name: 'Terminals', included: false },
            { name: 'Basic Inventory Management', included: true },
            { name: 'Advanced Inventory Management', included: false },
            { name: 'Sales Reports', included: true },
            { name: 'Detailed Sales Analytics', included: false },
            { name: 'Customer Management', included: true },
            { name: 'Offline Access', included: true },
            { name: 'Cloud Backup (Optional - MK10,000/month)', included: false },
            { name: 'MRA Integration (Optional - MK35,000/month)', included: false },
            { name: 'Multiple Locations', included: false },
            { name: 'Advanced Analytics', included: false },
            { name: 'API Access', included: false },
            { name: 'Custom Branding', included: false },
            { name: 'Phone Support', included: true },
        ],
        limits: {
            terminals: 1,
            users: 1,
            products: 500,
            storage: 'Local Only',
        },
        notes: 'Completely free and works offline. Cloud or MRA integration available when you upgrade.',
    },
    {
        planId: 'cloud',
        planCode: 'CLOUD_POS',
        name: 'Cloud POS',
        displayName: 'Cloud POS',
        description: 'For businesses that need cloud sync, remote access, and automatic backups.',
        monthlyPrice: 14000,
        yearlyPrice: 140000,
        color: 'blue',
        popular: true,
        isActive: true,
        maxBranches: 3,
        features: [
            { name: 'Terminals', included: true },
            { name: 'Basic Inventory Management', included: true },
            { name: 'Advanced Inventory Management', included: true },
            { name: 'Detailed Sales Analytics', included: true },
            { name: 'Sales Reports', included: true },
            { name: 'Customer Management', included: true },
            { name: 'Cloud Backup & Sync', included: true },
            { name: 'Offline Access (Sync Later)', included: true },
            { name: 'Multiple Locations', included: true },
            { name: 'Advanced Analytics', included: true },
            { name: 'API Access', included: true },
            { name: 'Custom Branding', included: false },
            { name: 'Email Support', included: true },
            { name: 'Phone Support', included: true },
        ],
        limits: {
            terminals: 1,
            users: 2,
            products: 2000,
            storage: '5GB Cloud',
        },
        notes: 'Includes cloud hosting and sync support for MK10,000/month. Data is backed up securely online.',
    },
    {
        planId: 'cloud-mra',
        planCode: 'CLOUD_MRA',
        name: 'Cloud + MRA Linked',
        displayName: 'Cloud + MRA',
        description: 'Connects your POS to the Malawi Revenue Authority for automated compliance reporting.',
        monthlyPrice: 35000,
        yearlyPrice: 350000,
        color: 'green',
        isActive: true,
        maxBranches: 5,
        features: [
            { name: 'Terminals', included: true },
            { name: 'Basic Inventory Management', included: true },
            { name: 'Advanced Inventory Management', included: true },
            { name: 'Detailed Sales Analytics', included: true },
            { name: 'Customer Management', included: true },
            { name: 'Sales Reports', included: true },
            { name: 'Customer Loyalty Program', included: true },
            { name: 'MRA Integration', included: true },
            { name: 'Cloud Backup & Sync', included: true },
            { name: 'Offline Access (Sync Later)', included: true },
            { name: 'Multiple Locations', included: true },
            { name: 'API Access', included: true },
            { name: 'Email Support', included: true },
            { name: 'Phone Support', included: true },
        ],
        limits: {
            terminals: 3,
            users: 5,
            products: 5000,
            storage: '20GB Cloud',
        },
        notes: 'Integrates directly with MRA and includes full cloud hosting for MK35,000/month.',
    },
];

export async function seedSubscriptionPlans(prisma: PrismaClient) {
    console.log('🌱 Seeding subscription plans...');

    try {
        for (const plan of plans) {
            const existingPlan = await prisma.subscriptionPlan.findUnique({
                where: { planCode: plan.planCode },
            });

            if (existingPlan) {
                await prisma.subscriptionPlan.update({
                    where: { planCode: plan.planCode },
                    data: {
                        name: plan.name,
                        description: plan.description,
                        monthlyPrice: plan.monthlyPrice,
                        yearlyPrice: plan.yearlyPrice,
                        color: plan.color,
                        isPopular: plan.popular || false,
                        isActive: plan.isActive,
                        features: plan.features as any,
                        limits: plan.limits as any,
                        notes: plan.notes,
                    },
                });
                console.log(`✓ Updated subscription plan: ${plan.name}`);
            } else {
                await prisma.subscriptionPlan.create({
                    data: {
                        subscriptionPlanId: plan.planId,
                        planCode: plan.planCode,
                        name: plan.name,
                        description: plan.description,
                        monthlyPrice: plan.monthlyPrice,
                        yearlyPrice: plan.yearlyPrice,
                        color: plan.color,
                        isPopular: plan.popular || false,
                        isActive: plan.isActive,
                        features: plan.features as any,
                        limits: plan.limits as any,
                        notes: plan.notes,
                    },
                });
                console.log(`✓ Created subscription plan: ${plan.name}`);
            }
        }

        console.log('✓ Subscription plans seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding subscription plans:', error);
        throw error;
    }
}
