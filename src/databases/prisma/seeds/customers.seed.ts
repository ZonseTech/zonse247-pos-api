import { PrismaClient } from "../generated/prisma/client";

export async function seedCustomers(prisma: PrismaClient) {
    console.log('📝 Seeding customers...');

    await prisma.customers.upsert({
        where: { customer_id: '-1' },
        update: {},
        create: {
            customer_id: '-1',
            tenant_id: '-1',
            branch_id: '-1',
            user_id: '-1',
            name: 'Walk-in Customer',
        },
    });

    console.log('✅ Customers seeded');
}