interface Category {
    categoryId: string;
    name: string;
    description?: string;
    tenantId: string;
    branchId: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
    itemCount?: number;
    color?: string;
    synced?: 1 | 0;
}

interface CreateCategoryDto {
    name: string;
    color: string;
    description: string;
}

interface UpdateCategoryDto {
    name?: string;
    color: string;
    description: string;
}

interface CategoryFilters {
    tenantId: string;
    branchId: string;
}


interface CreateCategoryRequest {
    name: string;
    description: string;
    color: string;
    tenantId: string;
    branchId: string;
    userId: string;
}

interface UpdateCategoryDto {
    name?: string;
    synced?: number;
    description?: string;
    color?: string;
}

interface CategoryFilters {
    tenantId: string;
    branchId: string;
}