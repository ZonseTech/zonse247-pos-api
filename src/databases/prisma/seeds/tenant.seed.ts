import { PrismaClient } from "../generated/prisma/client";

export async function seedTenant(prisma: PrismaClient) {
    console.log('📝 Seeding tenant...');

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

    console.log('✅ Tenant seeded');
}