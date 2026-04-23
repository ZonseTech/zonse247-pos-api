import prisma from '../databases/prisma/client';
import { ResourceModel } from '../models/resource.model';
import { buildPaginationMeta } from '../utils/pagination.utils';
import { CreateResourceDto, UpdateResourceDto, ResourceFilters } from '../types/resource.types';

interface PaginationParams {
  skip: number;
  limit: number;
  page: number;
}

interface UserContext {
  tenantId: string;
  branchId: string;
}

export class ResourceService {
  static async listResources(filters: ResourceFilters, pagination: PaginationParams) {
    const where = {
      tenantId: filters.tenantId,
      branchId: filters.branchId,
      deletedAt: null,
    };

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.resource.count({ where }),
    ]);

    return {
      data: resources,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  static async getResourceById(id: string, filters: ResourceFilters) {
    const resource = await ResourceModel.findById(id);
    if (
      !resource ||
      resource.tenantId !== filters.tenantId ||
      resource.branchId !== filters.branchId ||
      resource.deletedAt
    ) {
      return null;
    }
    return resource;
  }

  static async createResource(data: CreateResourceDto, user: UserContext) {
    return await ResourceModel.create({
      name: data.name,
      type: data.type,
      isAvailable: data.isAvailable,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
  }

  static async updateResource(id: string, data: UpdateResourceDto, filters: ResourceFilters) {
    const existing = await this.getResourceById(id, filters);
    if (!existing) {
      throw new Error('Resource not found or access denied');
    }

    const updateData: UpdateResourceDto = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;

    await ResourceModel.update(id, updateData);
  }

  static async deleteResource(id: string, filters: ResourceFilters) {
    const existing = await this.getResourceById(id, filters);
    if (!existing) {
      throw new Error('Resource not found or access denied');
    }

    await ResourceModel.softDelete(id);
  }
}
