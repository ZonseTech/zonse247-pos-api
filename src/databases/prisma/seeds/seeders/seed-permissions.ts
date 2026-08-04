import { PrismaClient } from "../../generated/mysql/client";
import { APP_PERMISSIONS } from "../definitions/permissions";

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
    console.log("📝 Seeding permissions...");

    for (const permission of APP_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { permissionId: permission.permissionId },
            update: {
                name: permission.name,
                displayName: permission.displayName,
                description: permission.description,
                category: permission.category,
                scope: permission.scope as any,
            },
            create: {
                permissionId: permission.permissionId,
                name: permission.name,
                displayName: permission.displayName,
                description: permission.description,
                category: permission.category,
                scope: permission.scope as any,
            },
        });
    }

    console.log(`✓ ${APP_PERMISSIONS.length} permissions created or updated successfully`);
}
