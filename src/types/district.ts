export interface District {
    id?: number;
    districtId: string;
    name: string;
    region: string;
    code: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateDistrictDto {
    name: string;
    region: string;
    code: string;
    isActive?: boolean;
}

export interface UpdateDistrictDto {
    name?: string;
    region?: string;
    code?: string;
    isActive?: boolean;
}

export interface DistrictFilters {
    region?: string;
    isActive?: boolean;
}

export type MalawiRegion = 'Northern' | 'Central' | 'Southern';
