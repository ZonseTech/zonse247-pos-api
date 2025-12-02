import { PrismaClient } from "../../generated/prisma/client";

export async function seedBranch(prisma: PrismaClient) {
    console.log('📝 Seeding branch...');

    await prisma.branches.upsert({
        where: { branch_id: '-1' },
        update: {},
        create: {
            branch_id: '-1',
            tenant_id: '-1',
            branch_name: 'Default Branch',
            branch_code: 'BR001',
            address_line_1: '123 Main Street',
            city: 'Lilongwe',
            district: 'Lilongwe Urban',
            phone_number: '+265999000111',
            email: 'branch@example.com',
            status: 'active',
        },
    });

    console.log('✅ Branch seeded');
}