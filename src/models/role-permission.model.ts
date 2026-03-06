/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 as uuidv4 } from 'uuid';
import { ValidationParams } from 'on-boarding';
import type { RolePermission } from 'role-permission';
import prisma from '../databases/prisma/client';

export class RolePermissionModel {
    static async findAllByRDBMS(_: ValidationParams): Promise<RolePermission[]> {
        try {
            return await prisma.rolePermission.findMany() as unknown as RolePermission[];
        } catch (error) {
            throw new Error(
                `Error finding role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(conditions: any = {}): Promise<RolePermission[]> {
        try {
            return await prisma.rolePermission.findMany({
                where: conditions
            }) as unknown as RolePermission[];
        } catch (error) {
            throw new Error(`Error finding role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<RolePermission | null> {
        try {
            return await prisma.rolePermission.findUnique({
                where: { rolePermissionId: id }
            }) as unknown as RolePermission | null;
        } catch (error) {
            throw new Error(`Error finding role permission by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleId(roleId: string): Promise<RolePermission[]> {
        try {
            return await prisma.rolePermission.findMany({
                where: { roleId }
            }) as unknown as RolePermission[];
        } catch (error) {
            throw new Error(`Error finding role permissions by role Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByPermissionId(permissionId: string): Promise<RolePermission[]> {
        try {
            return await prisma.rolePermission.findMany({
                where: { permissionId }
            }) as unknown as RolePermission[];
        } catch (error) {
            throw new Error(`Error finding role permissions by permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleAndPermissionId(roleId: string, permissionId: string): Promise<RolePermission | null> {
        try {
            return await prisma.rolePermission.findFirst({
                where: {
                    roleId,
                    permissionId
                }
            }) as unknown as RolePermission | null;
        } catch (error) {
            throw new Error(`Error finding role permission by role and permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildRolePermissionData(data: Partial<RolePermission>): RolePermission {
        const now = new Date();
        return {
            rolePermissionId: uuidv4(),
            roleId: data.roleId,
            permissionId: data.permissionId,
            createdAt: data.createdAt || now
        };
    }

    static async create(rolePermissionData: Partial<RolePermission>): Promise<RolePermission> {
        try {
            const data = this.buildRolePermissionData(rolePermissionData);
            return await prisma.rolePermission.create({
                data
            }) as unknown as RolePermission;
        } catch (error) {
            throw new Error(`Error creating role permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            await prisma.rolePermission.delete({
                where: { rolePermissionId: id }
            });
            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting role permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByRoleId(roleId: string): Promise<number> {
        try {
            const result = await prisma.rolePermission.deleteMany({
                where: { roleId }
            });
            return result.count;
        } catch (error) {
            throw new Error(`Error deleting role permissions by role Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByPermissionId(permissionId: string): Promise<number> {
        try {
            const result = await prisma.rolePermission.deleteMany({
                where: { permissionId }
            });
            return result.count;
        } catch (error) {
            throw new Error(`Error deleting role permissions by permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByRoleAndPermissionId(roleId: string, permissionId: string): Promise<number> {
        try {
            const result = await prisma.rolePermission.deleteMany({
                where: {
                    roleId,
                    permissionId
                }
            });
            return result.count;
        } catch (error) {
            throw new Error(`Error deleting role permission by role and permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.rolePermission.count({
                where: conditions
            });
        } catch (error) {
            throw new Error(`Error counting role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Optimized query to get all permission names for a role in a single query
     * Uses join to fetch permissions directly - efficient for 100+ permissions
     */
    static async findPermissionsByRoleId(roleId: string): Promise<string[]> {
        try {
            const rolePermissions = await prisma.rolePermission.findMany({
                where: { roleId },
                include: {
                    permission: {
                        select: {
                            name: true
                        }
                    }
                }
            });

            return rolePermissions
                .filter(rp => rp.permission?.name)
                .map(rp => rp.permission!.name);
        } catch (error) {
            throw new Error(`Error finding permissions by role Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Bulk create role-permission mappings
     * Skips duplicates automatically
     */
    static async bulkCreateForRole(roleId: string, permissionIds: string[]): Promise<number> {
        try {
            let created = 0;
            for (const permissionId of permissionIds) {
                const exists = await this.findByRoleAndPermissionId(roleId, permissionId);
                if (!exists) {
                    await this.create({ roleId, permissionId });
                    created++;
                }
            }
            return created;
        } catch (error) {
            throw new Error(`Error bulk creating role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}