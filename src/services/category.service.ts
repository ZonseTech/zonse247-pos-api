import { Category, CategoryFilters, CreateCategoryRequest, UpdateCategoryDto } from "categoty";
import { CategoryModel } from "../models/category.model";
import { InventoryModel } from "../models/inventory.model";
import { AuthenticatedUser } from "auth";

export class CategoryService {

    static async selectAll(params): Promise<Array<Category>> {
        return await CategoryModel.findAllByRDBMS(params)
    }

    static async getAllCategories(filters: CategoryFilters): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByTenantIdAndBranchId(filters.tenantId, filters.branchId);
            return await this.enrichCategoriesWithItemCount(categories, { tenantId: filters.tenantId, branchId: filters.branchId });
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw new Error('Failed to fetch categories');
        }
    }

    static async createCategory(
        categoryData: {
            name: string;
            description?: string;
            color?: string;
        },
        user: AuthenticatedUser
    ): Promise<Category> {
        try {
            const createRequest: CreateCategoryRequest = {
                name: categoryData.name,
                description: categoryData.description,
                color: categoryData.color,
                tenantId: user.tenantId,
                branchId: user.branchId,
                userId: user.userId,
            };

            const validationErrors = CategoryModel.validateCreateRequest(createRequest);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const existingCategories = await CategoryModel.findByTenantIdAndName(
                user.tenantId,
                categoryData.name.trim()
            );

            const duplicateInBranch = existingCategories.find(cat => cat.branchId === user.branchId);
            if (duplicateInBranch) {
                throw new Error('Category with this name already exists in the branch');
            }

            const newCategory = CategoryModel.buildCategoryData(createRequest);
            return await CategoryModel.create(newCategory);
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    static async updateCategory(
        categoryId: string,
        updateData: UpdateCategoryDto,
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const validationErrors = CategoryModel.validateUpdateRequest(updateData);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

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
            console.error('Error updating category:', error);
            throw error;
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
            console.error('Error deleting category:', error);
            throw error;
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
            console.error('Error fetching category by ID:', error);
            throw new Error('Failed to fetch category');
        }
    }

    static async getCategoriesByTenant(tenantId: string): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByTenantId(tenantId);
            return await this.enrichCategoriesWithItemCount(categories, { tenantId });
        } catch (error) {
            console.error('Error fetching categories by tenant:', error);
            throw new Error('Failed to fetch categories by tenant');
        }
    }

    static async getCategoriesByBranch(branchId: string): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByBranchId(branchId);
            return await this.enrichCategoriesWithItemCount(categories, { branchId });
        } catch (error) {
            console.error('Error fetching categories by branch:', error);
            throw new Error('Failed to fetch categories by branch');
        }
    }

    static async searchCategoriesByName(
        name: string,
        filters: CategoryFilters
    ): Promise<Category[]> {
        try {
            const allCategories = await CategoryModel.findByTenantIdAndBranchId(
                filters.tenantId,
                filters.branchId
            );

            const filteredCategories = allCategories.filter(category =>
                category.name.toLowerCase().includes(name.toLowerCase())
            );

            return await this.enrichCategoriesWithItemCount(filteredCategories, filters);
        } catch (error) {
            console.error('Error searching categories by name:', error);
            throw new Error('Failed to search categories');
        }
    }

    static async searchCategoriesByDescription(
        description: string,
        filters: CategoryFilters
    ): Promise<Category[]> {
        try {
            const allCategories = await CategoryModel.findByTenantIdAndBranchId(
                filters.tenantId,
                filters.branchId
            );

            const filteredCategories = allCategories.filter(category =>
                category.description &&
                category.description.toLowerCase().includes(description.toLowerCase())
            );

            return await this.enrichCategoriesWithItemCount(filteredCategories, filters);
        } catch (error) {
            console.error('Error searching categories by description:', error);
            throw new Error('Failed to search categories by description');
        }
    }

    static async getCategoriesByColor(
        color: string,
        filters: CategoryFilters
    ): Promise<Category[]> {
        try {
            const allCategories = await CategoryModel.findByTenantIdAndBranchId(
                filters.tenantId,
                filters.branchId
            );

            const filteredCategories = allCategories.filter(category => category.color === color);
            return await this.enrichCategoriesWithItemCount(filteredCategories, filters);
        } catch (error) {
            console.error('Error fetching categories by color:', error);
            throw new Error('Failed to fetch categories by color');
        }
    }

    static async getUnsyncedCategories(tenantId: string): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findUnsyncedByTenant(tenantId);
            return await this.enrichCategoriesWithItemCount(categories, { tenantId });
        } catch (error) {
            console.error('Error fetching unsynced categories:', error);
            throw new Error('Failed to fetch unsynced categories');
        }
    }

    static async markCategoryAsSynced(categoryId: string, user: AuthenticatedUser): Promise<void> {
        try {
            const category = await this.getCategoryById(categoryId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!category) {
                throw new Error('Category not found or access denied');
            }

            const updatedCount = await CategoryModel.markAsSynced(categoryId);
            if (updatedCount === 0) {
                throw new Error('Failed to mark category as synced');
            }
        } catch (error) {
            console.error('Error marking category as synced:', error);
            throw error;
        }
    }

    static async markCategoryAsUnsynced(categoryId: string, user: AuthenticatedUser): Promise<void> {
        try {
            const category = await this.getCategoryById(categoryId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!category) {
                throw new Error('Category not found or access denied');
            }

            const updatedCount = await CategoryModel.markAsUnsynced(categoryId);
            if (updatedCount === 0) {
                throw new Error('Failed to mark category as unsynced');
            }
        } catch (error) {
            console.error('Error marking category as unsynced:', error);
            throw error;
        }
    }

    static async getCategoryCount(filters?: Partial<CategoryFilters>): Promise<number> {
        try {
            const conditions = filters ? { ...filters } : {};
            return await CategoryModel.count(conditions);
        } catch (error) {
            console.error('Error getting category count:', error);
            throw new Error('Failed to get category count');
        }
    }

    static async bulkMarkAsSynced(categoryIds: string[], user: AuthenticatedUser): Promise<void> {
        try {
            const results = await Promise.allSettled(
                categoryIds.map(id => this.markCategoryAsSynced(id, user))
            );

            const failures = results.filter(result => result.status === 'rejected');
            if (failures.length > 0) {
                console.warn(`Failed to sync ${failures.length} out of ${categoryIds.length} categories`);
            }
        } catch (error) {
            console.error('Error in bulk sync operation:', error);
            throw new Error('Failed to complete bulk sync operation');
        }
    }

    static async validateCategoryAccess(
        categoryId: string,
        user: AuthenticatedUser
    ): Promise<boolean> {
        try {
            const category = await this.getCategoryById(categoryId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });
            return category !== null;
        } catch (error) {
            console.error('Error validating category access:', error);
            return false;
        }
    }

    static async updateCategoryItemCount(
        categoryId: string,
        itemCount: number,
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const category = await this.getCategoryById(categoryId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!category) {
                throw new Error('Category not found or access denied');
            }

            const updatedCount = await CategoryModel.update(categoryId, { itemCount });
            if (updatedCount === 0) {
                throw new Error('Failed to update category item count');
            }
        } catch (error) {
            console.error('Error updating category item count:', error);
            throw error;
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
            console.error('Error enriching categories with item count:', error);
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
            console.error('Error syncing category item counts:', error);
            throw new Error('Failed to sync category item counts');
        }
    }
}