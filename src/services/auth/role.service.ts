import { RoleModel } from "../../models/role.model";
import { RolePermissionModel } from "../../models/role-permission.model";
import { BranchModel } from "../../models/branch.model";
import { ValidationError } from '../../utils/errors';
import { PermissionModel } from "../../models/permission.model";
import { CreateRoleRequest, Permission, Role } from "role-permission";
import prisma from '../../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../../utils/pagination.utils';

export interface RoleAuthContext {
    tenantId: string;
    branchId?: string | null;
}

export class RoleService {
    /**
     * Roles visible to a tenant: system roles (global), the tenant's own
     * tenant-wide custom roles (branchId null), and custom roles scoped to
     * the requester's own branch. Never trusts a client-supplied tenantId/
     * branchId for scoping.
     */
    private static buildScopeWhere(auth: RoleAuthContext): any {
        return {
            OR: [
                { isSystemRole: true },
                { tenantId: auth.tenantId, branchId: null },
                { tenantId: auth.tenantId, branchId: auth.branchId ?? undefined },
            ],
        };
    }

    private static assertOwnership(role: Role, auth: RoleAuthContext): void {
        if (role.isSystemRole) {
            return;
        }

        if (role.tenantId !== auth.tenantId) {
            throw new Error('Tenant does not own this role');
        }
    }

    private static async assertBranchOwnership(branchId: string | null | undefined, auth: RoleAuthContext): Promise<void> {
        if (!branchId) {
            return;
        }

        const branch = await BranchModel.findById(branchId);
        if (!branch || branch.tenantId !== auth.tenantId) {
            throw new Error('Tenant does not own this branch');
        }
    }

    static async getAllRoles(query: any = {}, auth: RoleAuthContext): Promise<Role[]> {
        try {
            const conditions: any = { ...this.buildScopeWhere(auth) };

            if (query.isSystemRole !== undefined) {
                conditions.isSystemRole = query.isSystemRole === 'true';
            }

            if (query.isActive !== undefined) {
                conditions.isActive = query.isActive === 'true';
            }

            if (query.name) {
                conditions.name = query.name;
            }

            return await RoleModel.findAll(conditions);
        } catch (error: any) {
            throw new Error(`Failed to retrieve roles: ${error.message}`);
        }
    }

    static async listRoles(
        query: any = {},
        pagination: PaginationParams,
        auth: RoleAuthContext,
    ): Promise<PaginatedResult<Role>> {
        try {
            const where: any = { ...this.buildScopeWhere(auth) };
            if (query.isSystemRole !== undefined) where.isSystemRole = query.isSystemRole === 'true';
            if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
            if (query.name) where.name = query.name;

            const [roles, total] = await Promise.all([
                prisma.role.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.role.count({ where }),
            ]);

            return {
                data: roles as unknown as Role[],
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error: any) {
            throw new Error(`Failed to retrieve roles: ${error.message}`);
        }
    }

    static async getRoleById(id: string, auth: RoleAuthContext): Promise<Role> {
        if (!id) {
            throw new Error('Role ID is required');
        }

        const role = await RoleModel.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }

        this.assertOwnership(role, auth);

        return role;
    }

    static async createRole(data: CreateRoleRequest, auth: RoleAuthContext): Promise<Role> {
        const validationError = ValidationError.validateRequired(data, ['name', 'displayName']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!/^[a-z_]+$/.test(data.name)) {
            throw new Error('Role name must contain only lowercase letters and underscores');
        }

        if (!data.branchId) {
            throw new Error('Missing required field: branchId');
        }

        await this.assertBranchOwnership(data.branchId, auth);

        const roleData = RoleModel.buildRoleData({
            ...data,
            tenantId: auth.tenantId,
        });
        return RoleModel.create(roleData);
    }

    static async updateRole(id: string, data: Partial<Role>, auth: RoleAuthContext): Promise<Role> {
        if (!id) {
            throw new Error('Role ID is required');
        }

        const existingRole = await RoleModel.findById(id);
        if (!existingRole) {
            throw new Error('Role not found');
        }

        if (existingRole.isSystemRole) {
            throw new Error('System roles cannot be modified');
        }

        this.assertOwnership(existingRole, auth);

        const protectedFields = ['uuid', 'tenantId', 'isSystemRole', 'createdAt'];
        const updateData = { ...data };

        protectedFields.forEach(field => {
            if (field in updateData) {
                delete updateData[field as keyof typeof updateData];
            }
        });

        if (updateData.name && !/^[a-z_]+$/.test(updateData.name)) {
            throw new Error('Role name must contain only lowercase letters and underscores');
        }

        if ('branchId' in updateData) {
            await this.assertBranchOwnership(updateData.branchId, auth);
        }

        const numUpdated = await RoleModel.update(id, updateData);
        if (numUpdated === 0) {
            throw new Error('Failed to update role');
        }

        const updatedRole = await RoleModel.findById(id);
        if (!updatedRole) {
            throw new Error('Failed to retrieve updated role');
        }

        return updatedRole;
    }

    static async deleteRole(id: string, auth: RoleAuthContext): Promise<{ status: boolean }> {
        if (!id) {
            throw new Error('Role ID is required');
        }

        const existingRole = await RoleModel.findById(id);
        if (!existingRole) {
            throw new Error('Role not found');
        }

        if (existingRole.isSystemRole) {
            throw new Error('System roles cannot be deleted');
        }

        this.assertOwnership(existingRole, auth);

        await RolePermissionModel.deleteByRoleId(existingRole.roleId);

        const numDeleted = await RoleModel.delete(id);
        if (numDeleted === 0) {
            throw new Error('Failed to delete role');
        }

        return { status: true };
    }

    static async getSystemRoles(): Promise<Role[]> {
        return await RoleModel.findBySystemRole(true);
    }

    static async getActiveRoles(auth: RoleAuthContext): Promise<Role[]> {
        return await RoleModel.findAll({ ...this.buildScopeWhere(auth), isActive: true });
    }

    static async updateRoleStatus(id: string, isActive: boolean, auth: RoleAuthContext): Promise<Role> {
        if (!id) {
            throw new Error('Role ID is required');
        }

        const existingRole = await RoleModel.findById(id);
        if (!existingRole) {
            throw new Error('Role not found');
        }

        if (existingRole.isSystemRole && !isActive) {
            throw new Error('System roles cannot be deactivated');
        }

        return await this.updateRole(id, { isActive: isActive }, auth);
    }

    static async getRolePermissions(roleId: string): Promise<Permission[]> {
        if (!roleId) {
            throw new Error('Role ID is required');
        }

        const role = await RoleModel.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        const rolePermissions = await RolePermissionModel.findByRoleId(role.roleId);
        const permissions: Permission[] = [];

        for (const rp of rolePermissions) {
            const permission = await PermissionModel.findById(rp.permissionId);
            if (permission) {
                permissions.push(permission);
            }
        }

        return permissions;
    }

    static async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<{ assigned: number }> {
        if (!roleId || !permissionIds || permissionIds.length === 0) {
            throw new Error('Role ID and permission IDs are required');
        }

        const role = await RoleModel.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        let assignedCount = 0;

        for (const permissionId of permissionIds) {
            const permission = await PermissionModel.findById(permissionId);
            if (!permission) {
                throw new Error(`Permission with Id ${permissionId} not found`);
            }

            const exists = await RolePermissionModel.findByRoleAndPermissionId(role.roleId, permissionId);
            if (!exists) {
                await RolePermissionModel.create({
                    roleId: role.roleId,
                    permissionId: permissionId
                });
                assignedCount++;
            }
        }

        return { assigned: assignedCount };
    }

    static async removePermissionFromRole(roleId: string, permissionUuid: string): Promise<{ status: boolean }> {
        if (!roleId || !permissionUuid) {
            throw new Error('Role ID and permission UUID are required');
        }

        const role = await RoleModel.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        const permission = await PermissionModel.findById(permissionUuid);
        if (!permission) {
            throw new Error('Permission not found');
        }

        const numDeleted = await RolePermissionModel.deleteByRoleAndPermissionId(role.roleId, permissionUuid);
        if (numDeleted === 0) {
            throw new Error('Role permission assignment not found');
        }

        return { status: true };
    }
}
