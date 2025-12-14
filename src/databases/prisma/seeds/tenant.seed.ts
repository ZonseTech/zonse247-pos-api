import { PrismaClient } from "../generated/prisma/client";

export async function seedTenant(prisma: PrismaClient) {
    console.log('📝 Seeding tenant...');

    // Get the offline plan (should be seeded before this)
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
            authKey: `default-auth-key-${Date.now()}`,
            status: 'active',
            subscriptionStatus: 'TRIAL',
            verificationToken: 'invalid',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    // Create tenant subscription
    const existingSubscription = await prisma.tenantSubscription.findFirst({
        where: {
            tenantId: '-1',
            subscriptionPlanId: offlinePlan.subscriptionPlanId
        }
    });

    if (!existingSubscription) {
        await prisma.tenantSubscription.create({
            data: {
                tenantId: '-1',
                subscriptionPlanId: offlinePlan.subscriptionPlanId,
                status: 'active',
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                autoRenew: true,
                maxShops: 1,
            }
        });
        console.log('✓ Created tenant subscription (Offline Plan)');
    } else {
        console.log('✓ Tenant subscription already exists');
    }

    console.log('✓ Tenant seeded');
}