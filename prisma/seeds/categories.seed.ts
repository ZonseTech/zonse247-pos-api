import { PrismaClient } from "../../generated/prisma/client";

export async function seedCategories(prisma: PrismaClient) {
    console.log('📝 Seeding categories...');

    await prisma.categories.upsert({
        where: { category_id: '-1' },
        update: {},
        create: {
            category_id: '-1',
            tenant_id: '-1',
            branch_id: '-1',
            user_id: '-1',
            name: 'Consumables',
        },
    });

    console.log('✅ Categories seeded');
}