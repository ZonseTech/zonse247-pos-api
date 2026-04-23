import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { CreateResourceDto, UpdateResourceDto } from '../types/resource.types';

interface CreateResourceData extends CreateResourceDto {
  tenantId: string;
  branchId: string;
}

export class ResourceModel {
  static async findByTenantAndBranch(tenantId: string, branchId: string) {
    return await prisma.resource.findMany({
      where: { tenantId, branchId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return await prisma.resource.findUnique({
      where: { id },
    });
  }

  static async create(data: CreateResourceData) {
    return await prisma.resource.create({
      data: {
        id: uuidv4(),
        name: data.name,
        type: data.type,
        isAvailable: data.isAvailable ?? true,
        tenantId: data.tenantId,
        branchId: data.branchId,
      },
    });
  }

  static async update(id: string, data: UpdateResourceDto) {
    await prisma.resource.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return 1;
  }

  static async softDelete(id: string) {
    await prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return 1;
  }

  static async count(tenantId: string, branchId: string) {
    return await prisma.resource.count({
      where: { tenantId, branchId, deletedAt: null },
    });
  }
}
