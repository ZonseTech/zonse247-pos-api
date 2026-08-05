import { PrismaClient } from "../../generated/mysql/client";
import { DEFAULT_ROLE_DEFINITIONS } from "../definitions/role-definitions";

export async function seedRoles(prisma: PrismaClient): Promise<void> {
    console.log("📝 Seeding roles...");

    for (const role of DEFAULT_ROLE_DEFINITIONS) {
        await prisma.role.upsert({
            where: {
                roleId: role.roleId,
            },
            update: {
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                isSystemRole: role.isSystemRole,
                isActive: role.isActive,
            },
            create: {
                roleId: role.roleId,
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                isSystemRole: role.isSystemRole,
                isActive: role.isActive,
            },
        });
    }

    console.log(
        `✓ ${DEFAULT_ROLE_DEFINITIONS.length} roles created or updated successfully`,
    );
}
