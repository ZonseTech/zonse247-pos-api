import { PrismaClient } from "../../generated/prisma/client";

const ROLE_PERMISSION_MAP = {
    'super-admin': [
        'users.view', 'users.create', 'users.update', 'users.delete',
        'products.view', 'products.create', 'products.update', 'products.delete',
        'sales.create', 'sales.view', 'sales.refund',
        'reports.sales', 'reports.inventory',
    ],
    'admin': [
        'users.view', 'users.create', 'users.update',
        'products.view', 'products.create', 'products.update',
        'sales.create', 'sales.view', 'sales.refund',
        'reports.sales', 'reports.inventory',
    ],
    'manager': [
        'users.view',
        'products.view', 'products.update',
        'sales.create', 'sales.view',
        'reports.sales', 'reports.inventory',
    ],
    'cashier': [
        'products.view',
        'sales.create',
    ],
};

export async function seedRolePermissions(prisma: PrismaClient) {
    console.log('📝 Seeding role permissions...');

    for (const [role_id, permissionIds] of Object.entries(ROLE_PERMISSION_MAP)) {
        for (const permission_id of permissionIds) {
            const role_permission_id = `${role_id}-${permission_id}`;

            await prisma.role_permissions.upsert({
                where: { role_permission_id },
                update: {},
                create: {
                    role_permission_id,
                    role_id,
                    permission_id,
                },
            });
        }
    }

    console.log('✅ Role permissions seeded');
}