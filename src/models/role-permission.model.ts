import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from "../databases/local";
import { ROLE_PERMISSIONS_DB } from "../databases/local/tables";

export class RolePermissionModel {
    static async findAll(conditions: any = {}): Promise<RolePermission[]> {
        try {
            return await sealDBModel.find(ROLE_PERMISSIONS_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<Role | null> {
        try {
            return await sealDBModel.findById<Role>(ROLE_PERMISSIONS_DB, id);
        } catch (error) {
            throw new Error(`Error finding role permission by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleUuid(roleUuid: string): Promise<RolePermission[]> {
        try {
            return await sealDBModel.find(ROLE_PERMISSIONS_DB, { roleUuid: roleUuid });
        } catch (error) {
            throw new Error(`Error finding role permissions by role UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByPermissionUuid(permissionUuid: string): Promise<RolePermission[]> {
        try {
            return await sealDBModel.find(ROLE_PERMISSIONS_DB, { permissionUuid: permissionUuid });
        } catch (error) {
            throw new Error(`Error finding role permissions by permission UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleAndPermissionUuid(roleUuid: string, permissionUuid: string): Promise<RolePermission | null> {
        try {
            const results = await sealDBModel.find(ROLE_PERMISSIONS_DB, {
                roleUuid: roleUuid,
                permissionUuid: permissionUuid
            });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            throw new Error(`Error finding role permission by role and permission UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildRolePermissionData(data: Partial<RolePermission>): RolePermission {
        const now = new Date();
        return {
            uuid: uuidv4(),
            roleUuid: data.roleUuid!,
            permissionUuid: data.permissionUuid!,
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

    static async deleteByRoleUuid(roleUuid: string): Promise<number> {
        try {
            const rolePermissions = await this.findByRoleUuid(roleUuid);
            let deletedCount = 0;

            for (const rp of rolePermissions) {
                if (rp.roleUuid) {
                    const deleted = await sealDBModel.delete(ROLE_PERMISSIONS_DB, rp.roleUuid.toString());
                    deletedCount += deleted;
                }
            }

            return deletedCount;
        } catch (error) {
            throw new Error(`Error deleting role permissions by role UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByPermissionUuid(permissionUuid: string): Promise<number> {
        try {
            const rolePermissions = await this.findByPermissionUuid(permissionUuid);
            let deletedCount = 0;

            for (const rp of rolePermissions) {
                if (rp.permissionUuid) {
                    const deleted = await sealDBModel.delete(ROLE_PERMISSIONS_DB, rp.uuid.toString());
                    deletedCount += deleted;
                }
            }

            return deletedCount;
        } catch (error) {
            throw new Error(`Error deleting role permissions by permission UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async deleteByRoleAndPermissionUuid(roleUuid: string, permissionUuid: string): Promise<number> {
        try {
            const rolePermission = await this.findByRoleAndPermissionUuid(roleUuid, permissionUuid);

            if (!rolePermission || !rolePermission.roleUuid || !rolePermission.permissionUuid) {
                return 0;
            }

            return await sealDBModel.delete(ROLE_PERMISSIONS_DB, rolePermission.uuid.toString());
        } catch (error) {
            throw new Error(`Error deleting role permission by role and permission UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
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