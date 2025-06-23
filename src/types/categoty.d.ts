interface Category {
    uuid: string;
    name: string;
    description?: string;
    clientUuid: string;
    shopUuid: string;
    userUuid: string;
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
    clientUuid: string;
    shopUuid: string;
}


interface CreateCategoryRequest {
    name: string;
    description: string;
    color: string;
    clientUuid: string;
    shopUuid: string;
    userUuid: string;
}

interface UpdateCategoryDto {
    name?: string;
    synced?: number;
    description?: string;
    color?: string;
}

interface CategoryFilters {
    clientUuid: string;
    shopUuid: string;
}