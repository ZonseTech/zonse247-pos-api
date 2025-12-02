import { PrismaClient } from "../generated/prisma/client";
import bcrypt from 'bcryptjs';

export async function seedUser(prisma: PrismaClient) {
    console.log('📝 Seeding user...');

    const hashedPassword = await bcrypt.hash('admin', 10);

    await prisma.users.upsert({
        where: { user_id: '-1' },
        update: {},
        create: {
            user_id: '-1',
            username: 'admin',
            fullname: 'System Admin',
            password: hashedPassword,
            tenant_id: '-1',
            branch_id: '-1',
            role_id: 'super-admin',
            email: 'admin@example.com',
            status: 'active',
            accessible_shops: ['*'],
            allowed_workstations: ['*'],
        },
    });

    console.log('✅ User seeded');
}