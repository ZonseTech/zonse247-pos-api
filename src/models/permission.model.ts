import { v4 as uuidv4 } from 'uuid';
import { ValidationParams } from 'on-boarding';
import type { Permission } from 'role-permission';
import { PermissionScope } from '../utils/enums';
import prisma from '../databases/prisma/client';
import { EnumPermissionScopeNullableFilter } from '../databases/prisma/generated/prisma/commonInputTypes';

export class PermissionModel {

    static async findAllByRDBMS(_: ValidationParams): Promise<Permission[]> {
        try {
            return await prisma.permission.findMany() as unknown as Permission[];
        } catch (error) {
            throw new Error(
                `Error finding permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(conditions: any = {}): Promise<Permission[]> {
        try {
            return await prisma.permission.findMany({
                where: conditions
            }) as unknown as Permission[];
        } catch (error) {
            throw new Error(`Error finding permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(permissionId: string): Promise<Permission | null> {
        try {
            return await prisma.permission.findUnique({
                where: { permissionId }
            }) as unknown as Permission | null;
        } catch (error) {
            throw new Error(`Error finding permission by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByName(name: string): Promise<Permission | null> {
        try {
            return await prisma.permission.findFirst({
                where: { name }
            }) as unknown as Permission | null;
        } catch (error) {
            throw new Error(`Error finding permission by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByCategory(category: string): Promise<Permission[]> {
        try {
            return await prisma.permission.findMany({
                where: { category }
            }) as unknown as Permission[];
        } catch (error) {
            throw new Error(`Error finding permissions by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByScope(scope: EnumPermissionScopeNullableFilter): Promise<Permission[]> {
        try {
            return await prisma.permission.findMany({
                where: { scope }
            }) as unknown as Permission[];
        } catch (error) {
            throw new Error(`Error finding permissions by scope: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findSystemPermissions(isSystemPermission: boolean): Promise<Permission[]> {
        try {
            return await prisma.permission.findMany({
                where: { isSystemPermission }
            }) as unknown as Permission[];
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
            return await prisma.permission.create({
                data: permissionData
            }) as unknown as Permission;
        } catch (error) {
            throw new Error(`Error creating permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<Permission>): Promise<number> {
        try {
            await prisma.permission.update({
                where: { permissionId: id },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                }
            });
            return 1; // Return 1 to indicate successful update
        } catch (error) {
            throw new Error(`Error updating permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            await prisma.permission.delete({
                where: { permissionId: id }
            });
            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.permission.count({
                where: conditions
            });
        } catch (error) {
            throw new Error(`Error counting permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}