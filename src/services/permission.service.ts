import { TenantService } from "./tenant.service";
import { RolePermissionModel } from "../models/role-permission.model";
import { PermissionModel } from "../models/permission.model";
import { CreatePermissionRequest, Permission } from "role-permission";
import type { PermissionScopeType } from "../utils/enums";

export class PermissionService {

    static async selectAll(params): Promise<Array<Permission>> {
        return await PermissionModel.findAllByRDBMS(params);
    }

    static async getAllPermissions(query: any = {}): Promise<Permission[]> {
        try {
            const conditions: any = {};

            if (query.category) {
                conditions.category = query.category;
            }

            if (query.scope) {
                conditions.scope = query.scope;
            }

            if (query.isSystemPermission !== undefined) {
                conditions.isSystemPermission = query.isSystemPermission === 'true';
            }

            if (query.name) {
                conditions.name = query.name;
            }

            return await PermissionModel.findAll(conditions);
        } catch (error: any) {
            throw new Error(`Failed to retrieve permissions: ${error.message}`);
        }
    }

    static async getPermissionById(id: string): Promise<Permission> {
        if (!id) {
            throw new Error('Permission ID is required');
        }

        const permission = await PermissionModel.findById(id);
        if (!permission) {
            throw new Error('Permission not found');
        }

        return permission;
    }

    static async createPermission(data: CreatePermissionRequest): Promise<Permission> {
        const validationError = TenantService.validateRequired(data, ['name', 'displayName', 'category']);
        if (validationError) {
            throw new Error(validationError);
        }

        if (!/^[a-z_]+$/.test(data.name)) {
            throw new Error('Permission name must contain only lowercase letters and underscores');
        }

        const existingPermissions = await PermissionModel.findByName(data.name);
        if (existingPermissions) {
            throw new Error('Permission name already exists');
        }

        if (data.scope && !this.isValidScope(data.scope as PermissionScopeType)) {
            throw new Error('Invalid permission scope');
        }

        const permissionData = PermissionModel.buildPermissionData(data);
        return PermissionModel.create(permissionData);
    }

    static async updatePermission(id: string, data: Partial<Permission>): Promise<Permission> {
        if (!id) {
            throw new Error('Permission ID is required');
        }

        const existingPermission = await PermissionModel.findById(id);
        if (!existingPermission) {
            throw new Error('Permission not found');
        }

        if (existingPermission.isSystemPermission) {
            throw new Error('System permissions cannot be modified');
        }

        const protectedFields = ['uuid', 'isSystemPermission', 'created_at'];
        const updateData = { ...data };

        protectedFields.forEach(field => {
            if (field in updateData) {
                delete updateData[field as keyof typeof updateData];
            }
        });

        if (updateData.name && !/^[a-z_]+$/.test(updateData.name)) {
            throw new Error('Permission name must contain only lowercase letters and underscores');
        }

        if (updateData.name && updateData.name !== existingPermission.name) {
            const existingPermissions = await PermissionModel.findByName(updateData.name);
            if (existingPermissions) {
                throw new Error('Permission name already exists');
            }
        }

        if (updateData.scope && !this.isValidScope(updateData.scope as PermissionScopeType)) {
            throw new Error('Invalid permission scope');
        }

        const numUpdated = await PermissionModel.update(id, updateData);
        if (numUpdated === 0) {
            throw new Error('Failed to update permission');
        }

        const updatedPermission = await PermissionModel.findById(id);
        if (!updatedPermission) {
            throw new Error('Failed to retrieve updated permission');
        }

        return updatedPermission;
    }

    static async deletePermission(id: string): Promise<{ status: boolean }> {
        if (!id) {
            throw new Error('Permission ID is required');
        }

        const existingPermission = await PermissionModel.findById(id);
        if (!existingPermission) {
            throw new Error('Permission not found');
        }

        if (existingPermission.isSystemPermission) {
            throw new Error('System permissions cannot be deleted');
        }

        await RolePermissionModel.deleteByPermissionId(existingPermission.permissionId);

        const numDeleted = await PermissionModel.delete(id);
        if (numDeleted === 0) {
            throw new Error('Failed to delete permission');
        }

        return { status: true };
    }

    static async getPermissionsByCategory(category: string): Promise<Permission[]> {
        if (!category) {
            throw new Error('Category is required');
        }

        return await PermissionModel.findByCategory(category);
    }

    static async getPermissionsByScope(scope: PermissionScopeType): Promise<Permission[]> {
        if (!scope || !this.isValidScope(scope)) {
            throw new Error('Valid scope is required');
        }

        return await PermissionModel.findByScope(scope);
    }

    static async getSystemPermissions(): Promise<Permission[]> {
        return await PermissionModel.findSystemPermissions(true);
    }

    static async getPermissionCategories(): Promise<string[]> {
        const permissions = await PermissionModel.findAll();
        const categories = new Set<string>();

        permissions.forEach(permission => {
            if (permission.category) {
                categories.add(permission.category);
            }
        });

        return Array.from(categories).sort();
    }

    static async getPermissionScopes(): Promise<PermissionScopeType[]> {
        const permissions = await PermissionModel.findAll();
        const scopes = new Set<PermissionScopeType>();

        permissions.forEach(permission => {
            if (permission.scope) {
                scopes.add(permission.scope as PermissionScopeType);
            }
        });

        return Array.from(scopes).sort();
    }

    static async getPermissionByName(name: string): Promise<Permission | null> {
        if (!name) {
            throw new Error('Permission name is required');
        }

        return await PermissionModel.findByName(name);
    }

    static async searchPermissions(searchTerm: string): Promise<Permission[]> {
        if (!searchTerm) {
            throw new Error('Search term is required');
        }

        const allPermissions = await PermissionModel.findAll();
        const searchLower = searchTerm.toLowerCase();

        return allPermissions.filter(permission =>
            permission.name.toLowerCase().includes(searchLower) ||
            permission.displayName.toLowerCase().includes(searchLower) ||
            (permission.description && permission.description.toLowerCase().includes(searchLower)) ||
            permission.category.toLowerCase().includes(searchLower)
        );
    }

    private static isValidScope(scope: PermissionScopeType): boolean {
        const validScopes: PermissionScopeType[] = ['client', 'shop', 'user'] as any;
        return validScopes.includes(scope);
    }

    static async getPermissionsWithRoleCount(): Promise<Array<Permission & { role_count: number }>> {
        const permissions = await PermissionModel.findAll();
        const permissionsWithCount = [];

        for (const permission of permissions) {
            const rolePermissions = await RolePermissionModel.findByPermissionId(permission.permissionId);
            permissionsWithCount.push({
                ...permission,
                role_count: rolePermissions.length
            });
        }

        return permissionsWithCount;
    }
}