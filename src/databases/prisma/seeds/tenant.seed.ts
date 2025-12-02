import { PrismaClient } from "../generated/prisma/client";

export async function seedTenant(prisma: PrismaClient) {
    console.log('📝 Seeding tenant...');

    await prisma.tenants.upsert({
        where: { tenant_id: '-1' },
        update: {},
        create: {
            tenant_id: '-1',
            tenant_code: 'DEFAULT_CLIENT',
            business_name: 'Default Company',
            trading_name: 'Default Trading Name',
            tin: '000000000',
            business_type: 'PRODUCT_BASED',
            owner_name: 'System Administrator',
            email: 'admin@example.com',
            phone_number: '+1234567890',
            address: '123 Business Street',
            country: 'MW',
            auth_key: `default-auth-key-${Date.now()}`,
            status: 'active',
            subscription_status: 'TRIAL',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('✅ Tenant seeded');
}