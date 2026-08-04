import { PrismaClient } from "../../generated/mysql/client";
import { DEFAULT_ROLE_DEFINITIONS } from "../definitions/role-definitions";

function validateRoleDefinitions(): void {
    for (const role of DEFAULT_ROLE_DEFINITIONS) {
        if (role.permissionIds.length === 0) {
            throw new Error(`Role ${role.roleId} has no permissions assigned`);
        }
    }
}

export async function seedRolePermissions(prisma: PrismaClient): Promise<void> {
    console.log("📝 Seeding role permissions...");

    validateRoleDefinitions();

    const roleIds = DEFAULT_ROLE_DEFINITIONS.map(role => role.roleId);
    const permissionIds = [...new Set(DEFAULT_ROLE_DEFINITIONS.flatMap(role => role.permissionIds))];

    const [existingRoles, existingPermissions] = await Promise.all([
        prisma.role.findMany({
            where: { roleId: { in: roleIds } },
            select: { roleId: true },
        }),
        prisma.permission.findMany({
            where: { permissionId: { in: permissionIds } },
            select: { permissionId: true },
        }),
    ]);

    const existingRoleIdSet = new Set(existingRoles.map(role => role.roleId));
    const existingPermissionIdSet = new Set(
        existingPermissions.map(permission => permission.permissionId),
    );

    const missingRoles = roleIds.filter(roleId => !existingRoleIdSet.has(roleId));
    if (missingRoles.length > 0) {
        throw new Error(
            `Missing roles before seeding role permissions: ${missingRoles.join(", ")}`,
        );
    }

    const missingPermissions = permissionIds.filter(
        permissionId => !existingPermissionIdSet.has(permissionId),
    );
    if (missingPermissions.length > 0) {
        throw new Error(
            `Missing permissions before seeding role permissions: ${missingPermissions.join(", ")}`,
        );
    }

    const existingRolePermissions = await prisma.rolePermission.findMany({
        where: {
            roleId: {
                in: roleIds,
            },
        },
        select: {
            roleId: true,
            permissionId: true,
        },
    });

    const existingByRole: Record<string, Set<string>> = {};
    existingRolePermissions.forEach(({ roleId, permissionId }) => {
        if (!existingByRole[roleId]) {
            existingByRole[roleId] = new Set();
        }
        existingByRole[roleId].add(permissionId);
    });

    let totalUpserted = 0;
    let totalDeleted = 0;

    for (const role of DEFAULT_ROLE_DEFINITIONS) {
        const desiredPermissionSet = new Set(role.permissionIds);

        console.log(`  → Syncing ${desiredPermissionSet.size} permissions for ${role.roleId}...`);

        for (const permissionId of desiredPermissionSet) {
            const rolePermissionId = `${role.roleId}-${permissionId}`;

            await prisma.rolePermission.upsert({
                where: { rolePermissionId },
                update: {
                    roleId: role.roleId,
                    permissionId,
                },
                create: {
                    rolePermissionId,
                    roleId: role.roleId,
                    permissionId,
                },
            });
            totalUpserted++;
        }

        const currentPermissionSet = existingByRole[role.roleId] ?? new Set<string>();
        const stalePermissionIds = [...currentPermissionSet].filter(
            permissionId => !desiredPermissionSet.has(permissionId),
        );

        if (stalePermissionIds.length > 0) {
            const { count } = await prisma.rolePermission.deleteMany({
                where: {
                    roleId: role.roleId,
                    permissionId: {
                        in: stalePermissionIds,
                    },
                },
            });
            totalDeleted += count;
        }
    }

    console.log(
        `✓ Role permissions synced (${totalUpserted} upserted, ${totalDeleted} stale removed across ${DEFAULT_ROLE_DEFINITIONS.length} roles)`,
    );
}
