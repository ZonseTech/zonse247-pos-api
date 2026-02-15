import { PrismaClient } from "../generated/mysql/client";

export async function seedCategories(prisma: PrismaClient) {
    console.log('📝 Seeding categories...');

    await prisma.category.upsert({
        where: { categoryId: '-1' },
        update: {},
        create: {
            categoryId: '-1',
            tenantId: '-1',
            branchId: '-1',
            terminalId: '-1',
            userId: '-1',
            name: 'Consumables',
        },
    });

    console.log('✓ Categories seeded');
}