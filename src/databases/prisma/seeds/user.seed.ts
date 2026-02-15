import { PrismaClient } from "../generated/mysql/client";
import bcrypt from 'bcryptjs';
import { getConfig } from '../../../config/app.config';

export async function seedUser(prisma: PrismaClient) {
    console.log('📝 Seeding user...');

    const config = getConfig();
    const hashedPassword = await bcrypt.hash('admin', config.bcryptSaltRounds);

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
            accessibleBranches: ['*'],
            allowedTerminals: ['*'],
        },
    });

    console.log('✓ User seeded');
}