import { RoleModel } from "../models/role.model";
import { RolePermissionModel } from "../models/role-permission.model";
import { TenantService } from "./tenant.service";
import { PermissionModel } from "../models/permission.model";
import { CreateRoleRequest, Permission, Role } from "role-permission";

export class RoleService {
    static async getAllRoles(query: any = {}): Promise<Role[]> {
        try {
            const conditions: any = {};

            if (query.tenantId) {
                conditions.tenantId = query.tenantId;
            }

            if (query.branchId) {
                conditions.branchId = query.branchId;
            }

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

    static async getRoleById(id: string): Promise<Role> {
        if (!id) {
            throw new Error('Role ID is required');
        }

        const role = await RoleModel.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }

        return role;
    }

    static async createRole(data: CreateRoleRequest): Promise<Role> {
        const validationError = TenantService.validateRequired(data, ['name', 'displayName']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!/^[a-z_]+$/.test(data.name)) {
            throw new Error('Role name must contain only lowercase letters and underscores');
        }

        const roleData = RoleModel.buildRoleData(data);
        return RoleModel.create(roleData);
    }

    static async updateRole(id: string, data: Partial<Role>): Promise<Role> {
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

    static async deleteRole(id: string): Promise<{ status: boolean }> {
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

    static async getActiveRoles(): Promise<Role[]> {
        return await RoleModel.findByActive(true);
    }

    static async updateRoleStatus(id: string, isActive: boolean): Promise<Role> {
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

        return await this.updateRole(id, { isActive: isActive });
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