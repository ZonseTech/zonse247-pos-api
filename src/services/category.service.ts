import { CategoryModel } from "../models/category.model";
import { InventoryModel } from "../models/inventory.model";

export class CategoryService {
    static async getAllCategories(filters: CategoryFilters): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByClientUuidAndShopUuid(filters.clientUuid, filters.shopUuid);
            return await this.enrichCategoriesWithItemCount(categories, { clientUuid: filters.clientUuid, shopUuid: filters.shopUuid });
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
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid,
                userUuid: user.userUuid,
            };

            const validationErrors = CategoryModel.validateCreateRequest(createRequest);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const existingCategories = await CategoryModel.findByClientUuidAndName(
                user.clientUuid,
                categoryData.name.trim()
            );

            const duplicateInShop = existingCategories.find(cat => cat.shopUuid === user.shopUuid);
            if (duplicateInShop) {
                throw new Error('Category with this name already exists in the shop');
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
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid
            });

            if (!existingCategory) {
                throw new Error('Category not found or access denied');
            }

            if (updateData.name && updateData.name.trim() !== existingCategory.name) {
                const existingCategories = await CategoryModel.findByClientUuidAndName(
                    user.clientUuid,
                    updateData.name.trim()
                );

                const duplicateInShop = existingCategories.find(
                    cat => cat.shopUuid === user.shopUuid && cat.uuid !== categoryId
                );
                if (duplicateInShop) {
                    throw new Error('Category with this name already exists in the shop');
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
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid
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
                category.clientUuid !== filters.clientUuid ||
                category.shopUuid !== filters.shopUuid) {
                return null;
            }

            const enrichedCategories = await this.enrichCategoriesWithItemCount([category], filters);
            return enrichedCategories[0] || null;
        } catch (error) {
            console.error('Error fetching category by ID:', error);
            throw new Error('Failed to fetch category');
        }
    }

    static async getCategoriesByClient(clientUuid: string): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByClientUuid(clientUuid);
            return await this.enrichCategoriesWithItemCount(categories, { clientUuid });
        } catch (error) {
            console.error('Error fetching categories by client:', error);
            throw new Error('Failed to fetch categories by client');
        }
    }

    static async getCategoriesByShop(shopUuid: string): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findByShopUuid(shopUuid);
            return await this.enrichCategoriesWithItemCount(categories, { shopUuid });
        } catch (error) {
            console.error('Error fetching categories by shop:', error);
            throw new Error('Failed to fetch categories by shop');
        }
    }

    static async searchCategoriesByName(
        name: string,
        filters: CategoryFilters
    ): Promise<Category[]> {
        try {
            const allCategories = await CategoryModel.findByClientUuidAndShopUuid(
                filters.clientUuid,
                filters.shopUuid
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
            const allCategories = await CategoryModel.findByClientUuidAndShopUuid(
                filters.clientUuid,
                filters.shopUuid
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
            const allCategories = await CategoryModel.findByClientUuidAndShopUuid(
                filters.clientUuid,
                filters.shopUuid
            );

            const filteredCategories = allCategories.filter(category => category.color === color);
            return await this.enrichCategoriesWithItemCount(filteredCategories, filters);
        } catch (error) {
            console.error('Error fetching categories by color:', error);
            throw new Error('Failed to fetch categories by color');
        }
    }

    static async getUnsyncedCategories(clientUuid: string): Promise<Category[]> {
        try {
            const categories = await CategoryModel.findUnsyncedByClient(clientUuid);
            return await this.enrichCategoriesWithItemCount(categories, { clientUuid });
        } catch (error) {
            console.error('Error fetching unsynced categories:', error);
            throw new Error('Failed to fetch unsynced categories');
        }
    }

    static async markCategoryAsSynced(categoryId: string, user: AuthenticatedUser): Promise<void> {
        try {
            const category = await this.getCategoryById(categoryId, {
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid
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
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid
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
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid
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
                clientUuid: user.clientUuid,
                shopUuid: user.shopUuid
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
                clientUuid: filters.clientUuid,
                shopUuid: filters.shopUuid
            } as AuthenticatedUser;

            const products = await InventoryModel.findActive(authFilter);

            const categoryItemCounts = new Map<string, number>();

            products.forEach(product => {
                if (product.categoryUuid) {
                    const currentCount = categoryItemCounts.get(product.categoryUuid) || 0;
                    categoryItemCounts.set(product.categoryUuid, currentCount + 1);
                }
            });

            return categories.map(category => ({
                ...category,
                itemCount: categoryItemCounts.get(category.uuid) || 0
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
        categoryUuids: string[],
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const products = await InventoryModel.findActive(user);
            const categoryItemCounts = new Map<string, number>();

            products.forEach(product => {
                if (product.categoryUuid && categoryUuids.includes(product.categoryUuid)) {
                    const currentCount = categoryItemCounts.get(product.categoryUuid) || 0;
                    categoryItemCounts.set(product.categoryUuid, currentCount + 1);
                }
            });

            const updatePromises = categoryUuids.map(async (categoryUuid) => {
                const itemCount = categoryItemCounts.get(categoryUuid) || 0;
                return CategoryModel.update(categoryUuid, { itemCount });
            });

            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error syncing category item counts:', error);
            throw new Error('Failed to sync category item counts');
        }
    }
}