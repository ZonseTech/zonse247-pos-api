import { Category, CategoryFilters, UpdateCategoryDto } from "categoty";
import { CategoryModel } from "../models/category.model";
import { InventoryModel } from "../models/inventory.model";
import { AuthenticatedUser } from "auth";
import { CategoryUncheckedCreateInput } from "src/databases/prisma/generated/prisma/models";
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';

export class CategoryService {

    static async selectAll(params): Promise<Array<Category>> {
        return await CategoryModel.findAll(params)
    }

    static async getAllCategories(filters: CategoryFilters): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByTenantIdAndBranchId(filters.tenantId, filters.branchId);
            return await this.enrichCategoriesWithItemCount(categories, { tenantId: filters.tenantId, branchId: filters.branchId });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch categories');
        }
    }

    static async listCategories(
        filters: CategoryFilters,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<Category>> {
        try {
            const where: any = {
                tenantId: filters.tenantId,
                branchId: filters.branchId,
            };

            const [categories, total] = await Promise.all([
                prisma.category.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.category.count({ where }),
            ]);

            const enriched = await this.enrichCategoriesWithItemCount(
                categories as unknown as Category[],
                { tenantId: filters.tenantId, branchId: filters.branchId },
            );

            return {
                data: enriched,
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch categories');
        }
    }

    static async createCategory(
        categoryData: {
            name: string;
            description?: string;
            color?: string;
            isDefault?: boolean;
        },
        user: AuthenticatedUser
    ): Promise<Category> {
        const createRequest = {
            name: categoryData.name,
            description: categoryData.description,
            color: categoryData.color,
            isDefault: categoryData.isDefault,
            tenantId: user.tenantId,
            branchId: user.branchId,
            userId: user.userId,
        };

        const existingCategories = await CategoryModel.findByTenantIdAndName(
            user.tenantId,
            categoryData.name.trim()
        );

        const duplicateInBranch = existingCategories.find(cat => cat.branchId === user.branchId);
        if (duplicateInBranch) {
            throw new Error('Category with this name already exists in the branch');
        }

        const newCategory = CategoryModel.buildCategoryData(createRequest as CategoryUncheckedCreateInput);
        return await CategoryModel.create(newCategory);
    }

    static async updateCategory(
        categoryId: string,
        updateData: UpdateCategoryDto,
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const existingCategory = await this.getCategoryById(categoryId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!existingCategory) {
                throw new Error('Category not found or access denied');
            }

            if (updateData.name && updateData.name.trim() !== existingCategory.name) {
                const existingCategories = await CategoryModel.findByTenantIdAndName(
                    user.tenantId,
                    updateData.name.trim()
                );

                const duplicateInBranch = existingCategories.find(
                    cat => cat.branchId === user.branchId && cat.categoryId !== categoryId
                );
                if (duplicateInBranch) {
                    throw new Error('Category with this name already exists in the branch');
                }
            }

            const updatedCount = await CategoryModel.update(categoryId, updateData as any);
            if (updatedCount === 0) {
                throw new Error('Failed to update category - no rows affected');
            }
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to update category');
        }
    }

    static async deleteCategory(
        categoryId: string,
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const existingCategory = await this.getCategoryById(categoryId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!existingCategory) {
                throw new Error('Category not found or access denied');
            }

            // TODO: Add check for related entities (products, etc.)
            // const relatedProducts = await ProductModel.findByCategoryId(categoryId);
            // if (relatedProducts.length > 0) {
            //     throw new Error('Cannot delete category with associated products');
            // }

            const deletedCount = await CategoryModel.delete(categoryId);
            if (deletedCount === 0) {
                throw new Error('Failed to delete category - no rows affected');
            }
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete category');
        }
    }

    static async getCategoryById(
        categoryId: string,
        filters: CategoryFilters
    ): Promise<Category | null> {
        try {
            const category = await CategoryModel.findById(categoryId);

            if (!category ||
                category.tenantId !== filters.tenantId ||
                category.branchId !== filters.branchId) {
                return null;
            }

            const enrichedCategories = await this.enrichCategoriesWithItemCount([category], filters);
            return enrichedCategories[0] || null;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch category');
        }
    }

    private static async enrichCategoriesWithItemCount(
        categories: Category[],
        filters: Partial<CategoryFilters>
    ): Promise<Category[]> {
        try {
            const authFilter = {
                tenantId: filters.tenantId,
                branchId: filters.branchId
            } as AuthenticatedUser;

            const products = await InventoryModel.findActive(authFilter);

            const categoryItemCounts = new Map<string, number>();

            products.forEach(product => {
                if (product.categoryId) {
                    const currentCount = categoryItemCounts.get(product.categoryId) || 0;
                    categoryItemCounts.set(product.categoryId, currentCount + 1);
                }
            });

            return categories.map(category => ({
                ...category,
                itemCount: categoryItemCounts.get(category.categoryId) || 0
            }));
        } catch (error) {
            return categories.map(category => ({
                ...category,
                itemCount: 0
            }));
        }
    }

    static async syncCategoryItemCounts(
        categoryIds: string[],
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const products = await InventoryModel.findActive(user);
            const categoryItemCounts = new Map<string, number>();

            products.forEach(product => {
                if (product.categoryId && categoryIds.includes(product.categoryId)) {
                    const currentCount = categoryItemCounts.get(product.categoryId) || 0;
                    categoryItemCounts.set(product.categoryId, currentCount + 1);
                }
            });

            const updatePromises = categoryIds.map(async (categoryId) => {
                const itemCount = categoryItemCounts.get(categoryId) || 0;
                return CategoryModel.update(categoryId, { itemCount });
            });

            await Promise.all(updatePromises);
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to sync category item counts');
        }
    }
}