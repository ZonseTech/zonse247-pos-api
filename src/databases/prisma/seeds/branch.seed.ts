import { PrismaClient } from "../generated/prisma/client";

export async function seedBranch(prisma: PrismaClient) {
    console.log('📝 Seeding branch...');

    await prisma.branch.upsert({
        where: { branchId: '-1' },
        update: {},
        create: {
            branchId: '-1',
            tenantId: '-1',
            branchName: 'Default Branch',
            branchCode: 'BR001',
            addressLine1: '123 Main Street',
            city: 'Lilongwe',
            district: 'Lilongwe Urban',
            phoneNumber: '+265999000111',
            email: 'branch@example.com',
            status: 'active',
        },
    });

    console.log('✓ Branch seeded');
}