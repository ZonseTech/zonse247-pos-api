import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from "../databases/local";
import { ROLE_PERMISSIONS_DB } from "../databases/local/tables";
import { ValidationParams } from 'on-boarding';
import type { RolePermission } from 'role-permission';
import prisma from '../databases/prisma/client';

export class RolePermissionModel {
    static async findAllByRDBMS(_: ValidationParams): Promise<RolePermission[]> {
        try {
            return await prisma.role_permissions.findMany({
                where: {
                },
            }) as unknown as Array<RolePermission>
        } catch (error) {
            throw new Error(
                `Error finding role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(conditions: any = {}): Promise<RolePermission[]> {
        try {
            return await sealDBModel.find(ROLE_PERMISSIONS_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<RolePermission | null> {
        try {
            return await sealDBModel.findById<RolePermission>(ROLE_PERMISSIONS_DB, id);
        } catch (error) {
            throw new Error(`Error finding role permission by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleId(roleId: string): Promise<RolePermission[]> {
        try {
            return await sealDBModel.find(ROLE_PERMISSIONS_DB, { roleId: roleId });
        } catch (error) {
            throw new Error(`Error finding role permissions by role Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByPermissionId(permissionId: string): Promise<RolePermission[]> {
        try {
            return await sealDBModel.find(ROLE_PERMISSIONS_DB, { permissionId: permissionId });
        } catch (error) {
            throw new Error(`Error finding role permissions by permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleAndPermissionId(roleId: string, permissionId: string): Promise<RolePermission | null> {
        try {
            const results = await sealDBModel.find(ROLE_PERMISSIONS_DB, {
                roleId: roleId,
                permissionId: permissionId
            });
            return results.length > 0 ? results[0] : null;
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
            return await sealDBModel.insert(ROLE_PERMISSIONS_DB, data);
        } catch (error) {
            throw new Error(`Error creating role permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            return await sealDBModel.delete(ROLE_PERMISSIONS_DB, id);
        } catch (error) {
            throw new Error(`Error deleting role permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByRoleId(roleId: string): Promise<number> {
        try {
            const rolePermissions = await this.findByRoleId(roleId);
            let deletedCount = 0;

            for (const rp of rolePermissions) {
                if (rp.roleId) {
                    const deleted = await sealDBModel.delete(ROLE_PERMISSIONS_DB, rp.roleId.toString());
                    deletedCount += deleted;
                }
            }

            return deletedCount;
        } catch (error) {
            throw new Error(`Error deleting role permissions by role Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByPermissionId(permissionId: string): Promise<number> {
        try {
            const rolePermissions = await this.findByPermissionId(permissionId);
            let deletedCount = 0;

            for (const rp of rolePermissions) {
                if (rp.permissionId) {
                    const deleted = await sealDBModel.delete(ROLE_PERMISSIONS_DB, rp.roleId.toString());
                    deletedCount += deleted;
                }
            }

            return deletedCount;
        } catch (error) {
            throw new Error(`Error deleting role permissions by permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByRoleAndPermissionId(roleId: string, permissionId: string): Promise<number> {
        try {
            const rolePermission = await this.findByRoleAndPermissionId(roleId, permissionId);

            if (!rolePermission || !rolePermission.roleId || !rolePermission.permissionId) {
                return 0;
            }

            return await sealDBModel.delete(ROLE_PERMISSIONS_DB, rolePermission.rolePermissionId.toString());
        } catch (error) {
            throw new Error(`Error deleting role permission by role and permission Id: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(ROLE_PERMISSIONS_DB, conditions);
        } catch (error) {
            throw new Error(`Error counting role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}