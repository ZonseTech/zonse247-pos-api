import { v4 as uuidv4 } from 'uuid';
import { ValidationParams } from 'on-boarding';
import { Category, CreateCategoryRequest, UpdateCategoryDto, CategoryFilters } from 'categoty';
import prisma from '../databases/prisma/client';

export class CategoryModel {

    static async findAll(conditions: CategoryFilters): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: {
                    tenantId: conditions.tenantId,
                    branchId: conditions.branchId,
                },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findAllByRDBMS(conditions: ValidationParams): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: {
                    tenantId: conditions.tenantId,
                },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<Category | null> {
        try {
            return await prisma.category.findUnique({
                where: { categoryId: id },
            }) as unknown as Category | null;
        } catch (error) {
            throw new Error(`Error finding category by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByTenantId(tenantId: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: { tenantId },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByBranchId(branchId: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: { branchId },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByTenantIdAndBranchId(tenantId: string, branchId: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: {
                    tenantId,
                    branchId,
                },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by tenant ID and branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByName(name: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: { name },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByTenantIdAndName(tenantId: string, name: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: {
                    tenantId,
                    name,
                },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding category by tenant ID and name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByDescription(description: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: { description },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by description: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByColor(color: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: { color },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by color: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findBySynced(synced: number): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: { synced },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by sync status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUnsyncedByTenant(tenantId: string): Promise<Category[]> {
        try {
            return await prisma.category.findMany({
                where: {
                    tenantId,
                    synced: 0,
                },
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding unsynced categories by tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByItemCountRange(minCount: number, maxCount?: number): Promise<Category[]> {
        try {
            const where: any = {
                itemCount: {
                    gte: minCount,
                },
            };

            if (maxCount !== undefined) {
                where.itemCount.lte = maxCount;
            }

            return await prisma.category.findMany({
                where,
            }) as unknown as Category[];
        } catch (error) {
            throw new Error(`Error finding categories by item count range: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildCategoryData(data: CreateCategoryRequest): Category {
        const now = new Date();
        return {
            categoryId: uuidv4(),
            name: data.name,
            description: data.description,
            color: data.color,
            tenantId: data.tenantId,
            branchId: data.branchId,
            userId: data.userId,
            createdAt: now,
            updatedAt: now,
            synced: 0,
        };
    }

    static async create(categoryData: Category): Promise<Category> {
        try {
            return await prisma.category.create({
                data: categoryData,
            }) as unknown as Category;
        } catch (error) {
            throw new Error(`Error creating category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<Category>): Promise<number> {
        try {
            const dataWithTimestamp = {
                ...updateData,
                updatedAt: new Date(),
                synced: updateData.synced !== undefined ? updateData.synced : 0,
            };

            await prisma.category.update({
                where: { categoryId: id },
                data: dataWithTimestamp,
            });

            return 1; // Return 1 to indicate successful update
        } catch (error) {
            throw new Error(`Error updating category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            await prisma.category.delete({
                where: { categoryId: id },
            });

            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: Partial<Category> = {}): Promise<number> {
        try {
            return await prisma.category.count({
                where: conditions,
            });
        } catch (error) {
            throw new Error(`Error counting categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async markAsSynced(id: string): Promise<number> {
        try {
            return await this.update(id, { synced: 1 });
        } catch (error) {
            throw new Error(`Error marking category as synced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async markAsUnsynced(id: string): Promise<number> {
        try {
            return await this.update(id, { synced: 0 });
        } catch (error) {
            throw new Error(`Error marking category as unsynced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async incrementItemCount(id: string, increment = 1): Promise<number> {
        try {
            const category = await this.findById(id);
            if (!category) {
                throw new Error('Category not found');
            }
            const newCount = (category.itemCount || 0) + increment;
            return await this.update(id, { itemCount: Math.max(0, newCount) });
        } catch (error) {
            throw new Error(`Error incrementing item count: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async decrementItemCount(id: string, decrement = 1): Promise<number> {
        try {
            return await this.incrementItemCount(id, -decrement);
        } catch (error) {
            throw new Error(`Error decrementing item count: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static validateCreateRequest(data: CreateCategoryRequest): string[] {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push('Category name is required');
        }

        if (data.name && data.name.trim().length > 100) {
            errors.push('Category name must be less than 100 characters');
        }

        if (data.description && data.description.length > 500) {
            errors.push('Category description must be less than 500 characters');
        }

        if (data.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.color)) {
            errors.push('Category color must be a valid hex color code (e.g., #FF0000 or #F00)');
        }

        if (!data.tenantId || data.tenantId.trim().length === 0) {
            errors.push('Tenant ID is required');
        }

        if (!data.branchId || data.branchId.trim().length === 0) {
            errors.push('Branch ID is required');
        }

        if (!data.userId || data.userId.trim().length === 0) {
            errors.push('User ID is required');
        }

        return errors;
    }

    static validateUpdateRequest(data: UpdateCategoryDto): string[] {
        const errors: string[] = [];

        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                errors.push('Category name cannot be empty');
            }

            if (data.name && data.name.trim().length > 100) {
                errors.push('Category name must be less than 100 characters');
            }
        }

        if (data.description !== undefined && data.description && data.description.length > 500) {
            errors.push('Category description must be less than 500 characters');
        }

        if (data.color !== undefined && data.color &&
            !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.color)) {
            errors.push('Category color must be a valid hex color code (e.g., #FF0000 or #F00)');
        }

        if (data.synced !== undefined && ![0, 1].includes(data.synced)) {
            errors.push('Synced status must be 0 or 1');
        }

        return errors;
    }
}