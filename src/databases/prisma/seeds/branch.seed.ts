import { PrismaClient } from "../generated/mysql/client";

export async function seedBranch(prisma: PrismaClient) {
    console.log('📝 Seeding branch...');

    // First, find the Lilongwe district to get its ID
    const lilongweDistrict = await prisma.district.findFirst({
        where: { code: 'LIL' }
    });

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
            districtId: lilongweDistrict?.districtId || null,
            location: 'Area 47',
            businessType: 'PRODUCT_BASED',
            phoneNumber: '+265999000111',
            email: 'branch@example.com',
            status: 'active',
        },
    });

    console.log('✓ Branch seeded');
}