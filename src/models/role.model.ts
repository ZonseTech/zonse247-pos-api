import { v4 as uuidv4 } from 'uuid';
import { ValidationParams } from 'on-boarding';
import type { CreateRoleRequest, Role } from 'role-permission';
import prisma from '../databases/prisma/client';

export class RoleModel {
    static async findAllByRDBMS(_: ValidationParams): Promise<Role[]> {
        try {
            return await prisma.role.findMany() as unknown as Role[];
        } catch (error) {
            throw new Error(
                `Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async selectAll(conditions: any = {}): Promise<Role[]> {
        try {
            return await prisma.role.findMany({
                where: conditions
            }) as unknown as Role[];
        } catch (error) {
            throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findAll(conditions: any = {}): Promise<Role[]> {
        try {
            return await prisma.role.findMany({
                where: conditions
            }) as unknown as Role[];
        } catch (error) {
            throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(roleId: string): Promise<Role | null> {
        try {
            return await prisma.role.findUnique({
                where: { roleId }
            }) as unknown as Role | null;
        } catch (error) {
            throw new Error(`Error finding role by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findBySystemRole(isSystemRole: boolean): Promise<Role[]> {
        try {
            return await prisma.role.findMany({
                where: { isSystemRole }
            }) as unknown as Role[];
        } catch (error) {
            throw new Error(`Error finding system roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByActive(isActive: boolean): Promise<Role[]> {
        try {
            return await prisma.role.findMany({
                where: { isActive }
            }) as unknown as Role[];
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
            return await prisma.role.create({
                data: roleData
            }) as unknown as Role;
        } catch (error) {
            throw new Error(`Error creating role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<Role>): Promise<number> {
        try {
            await prisma.role.update({
                where: { roleId: id },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                }
            });
            return 1; // Return 1 to indicate successful update
        } catch (error) {
            throw new Error(`Error updating role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            await prisma.role.delete({
                where: { roleId: id }
            });
            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.role.count({
                where: conditions
            });
        } catch (error) {
            throw new Error(`Error counting roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}