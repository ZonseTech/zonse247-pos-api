export interface Resource {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  type: ResourceType;
  isAvailable: boolean;
  version: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ResourceType = 'STAFF' | 'VEHICLE' | 'TOOL' | 'TEST_EQUIPMENT' | 'OTHER';

export interface CreateResourceDto {
  name: string;
  type: ResourceType;
  isAvailable?: boolean;
}

export interface UpdateResourceDto {
  name?: string;
  type?: ResourceType;
  isAvailable?: boolean;
}

export interface ResourceFilters {
  tenantId: string;
  branchId: string;
}
