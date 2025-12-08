import { RoleModel } from "../models/role.model";
import { TenantService } from "./tenant.service";
import { PermissionModel } from "../models/permission.model";
import { RolePermissionModel } from "../models/role-permission.model";
import { BulkRolePermissionRequest, CreateRolePermissionRequest, Permission, Role, RolePermission } from "role-permission";

export class RolePermissionService {

    static async selectAll(params): Promise<Array<RolePermission>> {
        return await RolePermissionModel.findAllByRDBMS(params);
    }

    static async getAllRolePermissions(query: any = {}): Promise<RolePermission[]> {
        try {
            const conditions: any = {};

            if (query.roleId) {
                conditions.roleId = query.roleId;
            }

            if (query.permissionId) {
                conditions.permissionId = query.permissionId;
            }

            return await RolePermissionModel.findAll(conditions);
        } catch (error: any) {
            throw new Error(`Failed to retrieve role permissions: ${error.message}`);
        }
    }

    static async createRolePermission(data: CreateRolePermissionRequest): Promise<RolePermission> {
        const validationError = TenantService.validateRequired(data, ['roleId', 'permissionId']);
        if (validationError) {
            throw new Error(validationError);
        }

        const role = await RoleModel.findById(data.roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        const permission = await PermissionModel.findById(data.permissionId);
        if (!permission) {
            throw new Error('Permission not found');
        }

        const existingAssignment = await RolePermissionModel.findByRoleAndPermissionId(data.roleId, data.permissionId);
        if (existingAssignment) {
            throw new Error('Role permission assignment already exists');
        }

        return RolePermissionModel.create(data);
    }

    static async deleteRolePermission(id: string): Promise<{ status: boolean }> {
        if (!id) {
            throw new Error('Role permission ID is required');
        }

        const existingRolePermission = await RolePermissionModel.findById(id);
        if (!existingRolePermission) {
            throw new Error('Role permission not found');
        }

        const numDeleted = await RolePermissionModel.delete(id);
        if (numDeleted === 0) {
            throw new Error('Failed to delete role permission');
        }

        return { status: true };
    }

    static async bulkAssignPermissions(data: BulkRolePermissionRequest): Promise<{ assigned: number, skipped: number }> {
        const validationError = TenantService.validateRequired(data, ['roleId', 'permissionIds']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!Array.isArray(data.permissionIds) || data.permissionIds.length === 0) {
            throw new Error('Permission UUIDs must be a non-empty array');
        }

        const role = await RoleModel.findById(data.roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        let assignedCount = 0;
        let skippedCount = 0;

        for (const permissionId of data.permissionIds) {
            const permission = await PermissionModel.findById(permissionId);
            if (!permission) {
                throw new Error(`Permission with UUID ${permissionId} not found`);
            }

            const existingAssignment = await RolePermissionModel.findByRoleAndPermissionId(data.roleId, permissionId);
            if (existingAssignment) {
                skippedCount++;
                continue;
            }

            await RolePermissionModel.create({
                roleId: data.roleId,
                permissionId: permissionId
            });
            assignedCount++;
        }

        return { assigned: assignedCount, skipped: skippedCount };
    }

    static async bulkRemovePermissions(data: BulkRolePermissionRequest): Promise<{ removed: number, notFound: number }> {
        const validationError = TenantService.validateRequired(data, ['roleUuid', 'permissionUuids']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!Array.isArray(data.permissionIds) || data.permissionIds.length === 0) {
            throw new Error('Permission UUIDs must be a non-empty array');
        }

        const role = await RoleModel.findById(data.roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        let removedCount = 0;
        let notFoundCount = 0;

        for (const permissionUuid of data.permissionIds) {
            const numDeleted = await RolePermissionModel.deleteByRoleAndPermissionId(data.roleId, permissionUuid);
            if (numDeleted > 0) {
                removedCount++;
            } else {
                notFoundCount++;
            }
        }

        return { removed: removedCount, notFound: notFoundCount };
    }

    static async getRolePermissionsByRoleUuid(roleUuid: string): Promise<RolePermission[]> {
        if (!roleUuid) {
            throw new Error('Role UUID is required');
        }

        return await RolePermissionModel.findByRoleId(roleUuid);
    }

    static async getRolePermissionsByPermissionUuid(permissionUuid: string): Promise<RolePermission[]> {
        if (!permissionUuid) {
            throw new Error('Permission UUID is required');
        }

        return await RolePermissionModel.findByPermissionId(permissionUuid);
    }

    static async checkRolePermissionExists(roleUuid: string, permissionUuid: string): Promise<boolean> {
        if (!roleUuid || !permissionUuid) {
            throw new Error('Role UUID and Permission UUID are required');
        }

        const assignment = await RolePermissionModel.findByRoleAndPermissionId(roleUuid, permissionUuid);
        return !!assignment;
    }

    static async getRolePermissionsWithDetails(roleUuid: string): Promise<Array<RolePermission & { role?: Role, permission?: Permission }>> {
        if (!roleUuid) {
            throw new Error('Role UUID is required');
        }

        const rolePermissions = await RolePermissionModel.findByRoleId(roleUuid);
        const detailedRolePermissions = [];

        for (const rp of rolePermissions) {
            const role = await RoleModel.findById(rp.roleId);
            const permission = await PermissionModel.findById(rp.permissionId);

            detailedRolePermissions.push({
                ...rp,
                role,
                permission
            });
        }

        return detailedRolePermissions;
    }

    static async getPermissionRolesWithDetails(permissionUuid: string): Promise<Array<RolePermission & { role?: Role, permission?: Permission }>> {
        if (!permissionUuid) {
            throw new Error('Permission UUID is required');
        }

        const rolePermissions = await RolePermissionModel.findByPermissionId(permissionUuid);
        const detailedRolePermissions = [];

        for (const rp of rolePermissions) {
            const role = await RoleModel.findById(rp.roleId);
            const permission = await PermissionModel.findById(rp.permissionId);

            detailedRolePermissions.push({
                ...rp,
                role,
                permission
            });
        }

        return detailedRolePermissions;
    }

    static async syncRolePermissions(roleId: string, permissionIds: string[]): Promise<{ added: number, removed: number }> {
        if (!roleId) {
            throw new Error('Role UUID is required');
        }

        if (!Array.isArray(permissionIds)) {
            throw new Error('Permission UUIDs must be an array');
        }

        const role = await RoleModel.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        const currentRolePermissions = await RolePermissionModel.findByRoleId(roleId);
        const currentPermissionIds = currentRolePermissions.map(rp => rp.permissionId);

        const permissionsToAdd = permissionIds.filter(id => !currentPermissionIds.includes(id));
        const permissionsToRemove = currentPermissionIds.filter(id => !permissionIds.includes(id));

        let addedCount = 0;
        let removedCount = 0;

        for (const permissionId of permissionsToAdd) {
            const permission = await PermissionModel.findById(permissionId);
            if (!permission) {
                throw new Error(`Permission with UUID ${permissionId} not found`);
            }

            await RolePermissionModel.create({
                roleId: roleId,
                permissionId: permissionId
            });
            addedCount++;
        }

        for (const permissionId of permissionsToRemove) {
            const numDeleted = await RolePermissionModel.deleteByRoleAndPermissionId(roleId, permissionId);
            if (numDeleted > 0) {
                removedCount++;
            }
        }

        return { added: addedCount, removed: removedCount };
    }
}