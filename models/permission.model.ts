import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { PERMISSIONS_DB } from '../databases/local/tables';
import { mysqlPool } from '../config/db';

export enum PermissionScope {
    SYSTEM = 'system',
    CLIENT = 'client',
    SHOP = 'shop'
}

export class PermissionModel {

    static async findAllByRDBMS(conditions: ValidationParams): Promise<Array<Permission>> {
        try {
            const connection = await mysqlPool.getConnection();
            const [rows] = await connection.execute(`SELECT * FROM ${PERMISSIONS_DB} WHERE tenant_id=${conditions.tenantId}`);
            const records = rows as any[];

            return records
        } catch (error) {
            throw new Error(`Error finding permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findAll(conditions: any = {}): Promise<Permission[]> {
        try {
            return await sealDBModel.find(PERMISSIONS_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(permissionId: string): Promise<Permission | null> {
        try {
            return await sealDBModel.findById<Permission>(PERMISSIONS_DB, { permissionId });
        } catch (error) {
            throw new Error(`Error finding permission by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUuid(permissionId: string): Promise<Permission | null> {
        try {
            return await sealDBModel.findById<Permission>(PERMISSIONS_DB, { permissionId });
        } catch (error) {
            throw new Error(`Error finding permission by UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByName(name: string): Promise<Permission | null> {
        try {
            const permissions = await sealDBModel.find(PERMISSIONS_DB, { name });
            return permissions.length > 0 ? permissions[0] : null;
        } catch (error) {
            throw new Error(`Error finding permission by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByCategory(category: string): Promise<Permission[]> {
        try {
            return await sealDBModel.find(PERMISSIONS_DB, { category });
        } catch (error) {
            throw new Error(`Error finding permissions by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByScope(scope: PermissionScope): Promise<Permission[]> {
        try {
            return await sealDBModel.find(PERMISSIONS_DB, { scope });
        } catch (error) {
            throw new Error(`Error finding permissions by scope: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findSystemPermissions(isSystemPermission: boolean): Promise<Permission[]> {
        try {
            return await sealDBModel.find(PERMISSIONS_DB, { isSystemPermission });
        } catch (error) {
            throw new Error(`Error finding system permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildPermissionData(data: Partial<Permission>): Permission {
        const now = new Date();
        return {
            permissionId: data.permissionId || uuidv4(),
            name: data.name,
            displayName: data.displayName,
            description: data.description || null,
            category: data.category,
            scope: data.scope || PermissionScope.CLIENT,
            isSystemPermission: data.isSystemPermission || false,
            createdAt: data.createdAt || now,
            updatedAt: now
        };
    }

    static async create(permissionData: Permission): Promise<Permission> {
        try {
            return await sealDBModel.insert(PERMISSIONS_DB, permissionData);
        } catch (error) {
            throw new Error(`Error creating permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<Permission>): Promise<number> {
        try {
            return await sealDBModel.update(PERMISSIONS_DB, id, updateData);
        } catch (error) {
            throw new Error(`Error updating permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            return await sealDBModel.delete(PERMISSIONS_DB, id);
        } catch (error) {
            throw new Error(`Error deleting permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(PERMISSIONS_DB, conditions);
        } catch (error) {
            throw new Error(`Error counting permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}