import { RoleModel } from "../models/role.model";
import { RolePermissionModel } from "../models/role-permission.model";
import { ClientService } from "./client.service";
import { PermissionModel } from "../models/permission.model";

export class RoleService {

    static async getAllRoles(query: any = {}): Promise<Role[]> {
        try {
            const conditions: any = {};

            if (query.clientUuid) {
                conditions.clientUuid = query.clientUuid;
            }

            if (query.shopUuid) {
                conditions.shopUuid = query.shopUuid;
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
        const validationError = ClientService.validateRequired(data, ['name', 'displayName']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!/^[a-z_]+$/.test(data.name)) {
            throw new Error('Role name must contain only lowercase letters and underscores');
        }

        const existingRoles = await RoleModel.findByClientUuidAndName(data.clientUuid, data.name);
        if (existingRoles.length > 0) {
            throw new Error('Role name already exists for this client');
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

        const protectedFields = ['uuid', 'clientUuid', 'isSystemRole', 'createdAt'];
        const updateData = { ...data };

        protectedFields.forEach(field => {
            if (field in updateData) {
                delete updateData[field as keyof typeof updateData];
            }
        });

        if (updateData.name && !/^[a-z_]+$/.test(updateData.name)) {
            throw new Error('Role name must contain only lowercase letters and underscores');
        }

        if (updateData.name && updateData.name !== existingRole.name) {
            const existingRoles = await RoleModel.findByClientUuidAndName(existingRole.clientUuid, updateData.name);
            if (existingRoles.length > 0) {
                throw new Error('Role name already exists for this client');
            }
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

        await RolePermissionModel.deleteByRoleUuid(existingRole.uuid);

        const numDeleted = await RoleModel.delete(id);
        if (numDeleted === 0) {
            throw new Error('Failed to delete role');
        }

        return { status: true };
    }

    static async getRolesByClientUuid(clientUuid: string): Promise<Role[]> {
        if (!clientUuid) {
            throw new Error('Client ID is required');
        }

        return await RoleModel.findByClientUuid(clientUuid);
    }

    static async getRolesByShopUuid(shopUuid: string): Promise<Role[]> {
        if (!shopUuid) {
            throw new Error('Shop ID is required');
        }

        return await RoleModel.findByShopUuid(shopUuid);
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

        const rolePermissions = await RolePermissionModel.findByRoleUuid(role.uuid);
        const permissions: Permission[] = [];

        for (const rp of rolePermissions) {
            const permission = await PermissionModel.findByUuid(rp.permissionUuid);
            if (permission) {
                permissions.push(permission);
            }
        }

        return permissions;
    }

    static async assignPermissionsToRole(roleId: string, permissionUuids: string[]): Promise<{ assigned: number }> {
        if (!roleId || !permissionUuids || permissionUuids.length === 0) {
            throw new Error('Role ID and permission UUIDs are required');
        }

        const role = await RoleModel.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        let assignedCount = 0;

        for (const permissionUuid of permissionUuids) {
            const permission = await PermissionModel.findByUuid(permissionUuid);
            if (!permission) {
                throw new Error(`Permission with UUID ${permissionUuid} not found`);
            }

            const exists = await RolePermissionModel.findByRoleAndPermissionUuid(role.uuid, permissionUuid);
            if (!exists) {
                await RolePermissionModel.create({
                    roleUuid: role.uuid,
                    permissionUuid: permissionUuid
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

        const permission = await PermissionModel.findByUuid(permissionUuid);
        if (!permission) {
            throw new Error('Permission not found');
        }

        const numDeleted = await RolePermissionModel.deleteByRoleAndPermissionUuid(role.uuid, permissionUuid);
        if (numDeleted === 0) {
            throw new Error('Role permission assignment not found');
        }

        return { status: true };
    }

    static async getRoleByName(clientUuid: string, name: string): Promise<Role | null> {
        if (!clientUuid || !name) {
            throw new Error('Client ID and role name are required');
        }

        const roles = await RoleModel.findByClientUuidAndName(clientUuid, name);
        return roles.length > 0 ? roles[0] : null;
    }
}