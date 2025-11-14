import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { ROLES_DB } from '../databases/local/tables';
import { mysqlPool } from '../config/db';

export class RoleModel {
    static async findAllByRDBMS(conditions: ValidationParams): Promise<Role[]> {
        try {
            const connection = await mysqlPool.getConnection();
            const [rows] = await connection.execute(`SELECT * FROM ${ROLES_DB} WHERE tenant_id=${conditions.tenantId}`);
            const records = rows as any[];

            return records
        } catch (error) {
            throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async selectAll(conditions: any = {}): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findAll(conditions: any = {}): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(roleId: string): Promise<Role | null> {
        try {
            return await sealDBModel.findById<Role>(ROLES_DB, { roleId });
        } catch (error) {
            throw new Error(`Error finding role by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByClientUuid(clientUuid: string): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, { clientUuid: clientUuid });
        } catch (error) {
            throw new Error(`Error finding roles by client ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByBranchId(shopUuid: string): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, { shopUuid: shopUuid });
        } catch (error) {
            throw new Error(`Error finding roles by shop ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByClientUuidAndName(clientUuid: string, name: string): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, {
                clientUuid: clientUuid,
                name: name
            });
        } catch (error) {
            throw new Error(`Error finding role by client ID and name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findBySystemRole(isSystemRole: boolean): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, { isSystemRole: isSystemRole });
        } catch (error) {
            throw new Error(`Error finding system roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByActive(isActive: boolean): Promise<Role[]> {
        try {
            return await sealDBModel.find(ROLES_DB, { isActive: isActive });
        } catch (error) {
            throw new Error(`Error finding active roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildRoleData(data: CreateRoleRequest): Role {
        const now = new Date();
        return {
            roleId: uuidv4(),
            tenantId: data.tenantId,
            branchId: data.branchId || null,
            name: data.name,
            displayName: data.displayName,
            description: data.description || null,
            isSystemRole: data.isSystemRole,
            isActive: data.isActive !== undefined ? data.isActive : true,
            createdAt: now,
            updatedAt: now
        };
    }

    static async create(roleData: Role): Promise<Role> {
        try {
            return await sealDBModel.insert(ROLES_DB, roleData);
        } catch (error) {
            throw new Error(`Error creating role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<Role>): Promise<number> {
        try {
            return await sealDBModel.update(ROLES_DB, id, updateData);
        } catch (error) {
            throw new Error(`Error updating role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            return await sealDBModel.delete(ROLES_DB, id);
        } catch (error) {
            throw new Error(`Error deleting role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(ROLES_DB, conditions);
        } catch (error) {
            throw new Error(`Error counting roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}