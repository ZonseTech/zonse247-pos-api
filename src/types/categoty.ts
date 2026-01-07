export type Category = {
    categoryId: string;
    name: string;
    description?: string;
    tenantId: string;
    branchId: string;
    terminalId?: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
    itemCount?: number;
    color?: string;
    isDefault?: boolean;
    synced?: 1 | 0;
}

export interface CreateCategoryDto {
    name: string;
    color: string;
    description: string;
    isDefault?: boolean;
}

export interface CategoryFilters {
    tenantId: string;
    branchId: string;
}


export interface CreateCategoryRequest {
    name: string;
    description: string;
    color: string;
    isDefault?: boolean;
    tenantId: string;
    branchId: string;
    userId: string;
}

export interface UpdateCategoryDto {
    name?: string;
    synced?: number;
    description?: string;
    color?: string;
    isDefault?: boolean;
}

export interface CategoryFilters {
    tenantId: string;
    branchId: string;
}