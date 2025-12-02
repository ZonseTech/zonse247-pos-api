import { PrismaClient } from "../../generated/prisma/client";

const PERMISSIONS = [
    // User Management
    { id: 'users.view', name: 'users.view', display: 'View Users', category: 'Users', scope: 'shop' },
    { id: 'users.create', name: 'users.create', display: 'Create Users', category: 'Users', scope: 'shop' },
    { id: 'users.update', name: 'users.update', display: 'Update Users', category: 'Users', scope: 'shop' },
    { id: 'users.delete', name: 'users.delete', display: 'Delete Users', category: 'Users', scope: 'shop' },

    // Product Management
    { id: 'products.view', name: 'products.view', display: 'View Products', category: 'Products', scope: 'shop' },
    { id: 'products.create', name: 'products.create', display: 'Create Products', category: 'Products', scope: 'shop' },
    { id: 'products.update', name: 'products.update', display: 'Update Products', category: 'Products', scope: 'shop' },
    { id: 'products.delete', name: 'products.delete', display: 'Delete Products', category: 'Products', scope: 'shop' },

    // Sales
    { id: 'sales.create', name: 'sales.create', display: 'Create Sales', category: 'Sales', scope: 'workstation' },
    { id: 'sales.view', name: 'sales.view', display: 'View Sales', category: 'Sales', scope: 'shop' },
    { id: 'sales.refund', name: 'sales.refund', display: 'Process Refunds', category: 'Sales', scope: 'shop' },

    // Reports
    { id: 'reports.sales', name: 'reports.sales', display: 'View Sales Reports', category: 'Reports', scope: 'shop' },
    { id: 'reports.inventory', name: 'reports.inventory', display: 'View Inventory Reports', category: 'Reports', scope: 'shop' },
];

export async function seedPermissions(prisma: PrismaClient) {
    console.log('📝 Seeding permissions...');

    for (const perm of PERMISSIONS) {
        await prisma.permissions.upsert({
            where: { permission_id: perm.id },
            update: {},
            create: {
                permission_id: perm.id,
                name: perm.name,
                display_name: perm.display,
                description: `Permission to ${perm.display}`,
                category: perm.category,
                scope: perm.scope as any,
            },
        });
    }

    console.log('✅ Permissions seeded');
}