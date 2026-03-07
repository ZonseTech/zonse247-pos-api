import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { Category, CategoryFilters } from 'categoty';
import { CategoryUncheckedCreateInput } from 'src/databases/prisma/generated/prisma/models';

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

    static async findById(id: string): Promise<Category | null> {
        try {
            return await prisma.category.findUnique({
                where: { categoryId: id },
            }) as unknown as Category | null;
        } catch (error) {
            throw new Error(`Error finding category by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    static buildCategoryData(data: CategoryUncheckedCreateInput): Category {
        const now = new Date();
        return {
            categoryId: data.categoryId || uuidv4(),
            name: data.name,
            description: data.description,
            color: data.color,
            isDefault: data.isDefault,
            tenantId: data.tenantId,
            branchId: data.branchId,
            terminalId: data.terminalId || null,
            userId: data.userId,
            createdAt: now,
            updatedAt: now,
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
}