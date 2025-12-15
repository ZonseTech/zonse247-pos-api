import { PrismaClient } from "../generated/prisma/client";

export async function seedRoles(prisma: PrismaClient) {
    console.log('📝 Seeding roles...');

    const roles = [
        {
            roleId: 'super-admin',
            name: 'super_admin',
            displayName: 'Super Administrator',
            description: 'System super administrator with full access',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'admin',
            name: 'admin',
            displayName: 'Administrator',
            description: 'Shop administrator with full shop access',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'manager',
            name: 'manager',
            displayName: 'Manager',
            description: 'Shop manager with limited administrative access',
            isSystemRole: true,
            isActive: true,
        },
        {
            roleId: 'cashier',
            name: 'cashier',
            displayName: 'Cashier',
            description: 'Basic cashier role for sales operations',
            isSystemRole: true,
            isActive: true,
        },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { roleId: role.roleId },
            update: role,
            create: role,
        });
    }

    console.log('✓ Roles seeded');
}