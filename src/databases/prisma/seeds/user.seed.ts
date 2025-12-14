import { PrismaClient } from "../generated/prisma/client";
import bcrypt from 'bcryptjs';

export async function seedUser(prisma: PrismaClient) {
    console.log('📝 Seeding user...');

    const hashedPassword = await bcrypt.hash('admin', parseInt(process.env.BCRYPT_SALT_ROUNDS));

    await prisma.user.upsert({
        where: { userId: '-1' },
        update: {},
        create: {
            userId: '-1',
            username: 'admin',
            fullname: 'System Admin',
            password: hashedPassword,
            tenantId: '-1',
            branchId: '-1',
            roleId: 'super-admin',
            email: 'admin@example.com',
            status: 'active',
            accessibleShops: ['*'],
            allowedWorkstations: ['*'],
        },
    });

    console.log('✅ User seeded');
}