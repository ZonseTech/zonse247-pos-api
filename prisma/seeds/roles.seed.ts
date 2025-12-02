import { PrismaClient } from "../../generated/prisma/client";

export async function seedRoles(prisma: PrismaClient) {
    console.log('📝 Seeding roles...');

    const roles = [
        {
            role_id: 'super-admin',
            name: 'super_admin',
            display_name: 'Super Administrator',
            description: 'System super administrator with full access',
            is_system_role: true,
            is_active: true,
        },
        {
            role_id: 'admin',
            name: 'admin',
            display_name: 'Administrator',
            description: 'Shop administrator with full shop access',
            is_system_role: true,
            is_active: true,
        },
        {
            role_id: 'manager',
            name: 'manager',
            display_name: 'Manager',
            description: 'Shop manager with limited administrative access',
            is_system_role: true,
            is_active: true,
        },
        {
            role_id: 'cashier',
            name: 'cashier',
            display_name: 'Cashier',
            description: 'Basic cashier role for sales operations',
            is_system_role: true,
            is_active: true,
        },
    ];

    for (const role of roles) {
        await prisma.roles.upsert({
            where: { role_id: role.role_id },
            update: role,
            create: role,
        });
    }

    console.log('✅ Roles seeded');
}