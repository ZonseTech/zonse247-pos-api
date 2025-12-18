import { PrismaClient } from "../generated/prisma/client";

export async function seedCustomers(prisma: PrismaClient) {
    console.log('📝 Seeding customers...');

    await prisma.customer.upsert({
        where: { customerId: '-1' },
        update: {},
        create: {
            customerId: '-1',
            tenantId: '-1',
            branchId: '-1',
            userId: '-1',
            name: 'Walk-in Customer',
        },
    });

    console.log('✓ Customers seeded');
}