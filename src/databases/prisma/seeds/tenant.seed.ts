import { PrismaClient } from "../generated/mysql/client";

export async function seedTenant(prisma: PrismaClient) {
    console.log('📝 Seeding tenant...');

    const offlinePlan = await prisma.subscriptionPlan.findFirst({
        where: { planCode: 'OFFLINE' }
    });

    if (!offlinePlan) {
        throw new Error('Offline subscription plan not found. Please run seedSubscriptionPlans first.');
    }

    await prisma.tenant.upsert({
        where: { tenantId: '-1' },
        update: {},
        create: {
            tenantId: '-1',
            tenantCode: 'DEFAULT_CLIENT',
            businessName: 'Default Company',
            tradingName: 'Default Trading Name',
            tin: '000000000',
            businessType: 'PRODUCT_BASED',
            ownerName: 'System Administrator',
            email: 'admin@example.com',
            phoneNumber: '+1234567890',
            address: '123 Business Street',
            country: 'MW',
            status: 'active',
            verificationToken: 'invalid',
        },
    });

    // Create a default branch subscription
    const existingSubscription = await prisma.branchSubscription.findFirst({
        where: {
            subscriptionPlanId: offlinePlan.subscriptionPlanId
        }
    });

    let branchSubscriptionId: string;
    if (!existingSubscription) {
        const newSubscription = await prisma.branchSubscription.create({
            data: {
                branchSubscriptionId: 'default-subscription',
                subscriptionPlanId: offlinePlan.subscriptionPlanId,
                status: 'active',
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                autoRenew: true,
            }
        });
        branchSubscriptionId = newSubscription.branchSubscriptionId;
        console.log('✓ Created branch subscription (Offline Plan)');
    } else {
        branchSubscriptionId = existingSubscription.branchSubscriptionId;
        console.log('✓ Branch subscription already exists');
    }

    // Create a default branch with the subscription
    await prisma.branch.upsert({
        where: { branchId: '-1' },
        update: { branchSubscriptionId },
        create: {
            branchId: '-1',
            tenantId: '-1',
            branchCode: 'DEFAULT',
            branchName: 'Default Branch',
            branchSubscriptionId,
        }
    });

    console.log('✓ Tenant and default branch seeded');
}