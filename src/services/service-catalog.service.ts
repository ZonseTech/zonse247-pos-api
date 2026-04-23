import prisma from '../databases/prisma/client';
import { buildPaginationMeta } from '../utils/pagination.utils';

interface PaginationParams {
  skip: number;
  limit: number;
  page: number;
}

interface ServiceFilters {
  isActive?: boolean;
  categoryId?: string;
  pricingType?: string;
  search?: string;
}

interface CreateServiceData {
  name: string;
  description?: string | null;
  sku?: string | null;
  pricingType?: string;
  basePrice?: number | null;
  durationMinutes?: number | null;
  categoryId?: string | null;
  isTaxable?: boolean;
  taxRate?: number | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

interface UpdateServiceData {
  name?: string;
  description?: string | null;
  sku?: string | null;
  pricingType?: string;
  basePrice?: number | null;
  durationMinutes?: number | null;
  categoryId?: string | null;
  isTaxable?: boolean;
  taxRate?: number | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ==========================================
// Service Catalog Service
// ==========================================
export class ServiceCatalogService {
  /**
   * Create a new service
   */
  static async createService(data: CreateServiceData, tenantId: string, branchId: string) {
    // Check for duplicate name within tenant+branch
    const existing = await prisma.service.findFirst({
      where: { tenantId, branchId, name: data.name, deletedAt: null },
    });

    if (existing) {
      throw new Error(`Service with name "${data.name}" already exists`);
    }

    return prisma.service.create({
      data: {
        tenantId,
        branchId,
        name: data.name,
        description: data.description ?? null,
        sku: data.sku ?? null,
        pricingType: (data.pricingType as any) ?? 'FIXED',
        basePrice: data.basePrice ?? 0,
        durationMinutes: data.durationMinutes ?? null,
        categoryId: data.categoryId ?? null,
        isTaxable: data.isTaxable ?? true,
        taxRate: data.taxRate ?? 0,
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * List services with pagination and filtering
   */
  static async listServices(tenantId: string, branchId: string, filters: ServiceFilters, pagination: PaginationParams) {
    const where: any = { tenantId, branchId, deletedAt: null };

    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.pricingType) where.pricingType = filters.pricingType;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { sku: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: { select: { categoryId: true, name: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.service.count({ where }),
    ]);

    return { data, pagination: buildPaginationMeta(total, pagination.page, pagination.limit) };
  }

  /**
   * Get a single service by ID
   */
  static async getServiceById(id: string, tenantId: string, branchId: string) {
    return prisma.service.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
      include: { category: { select: { categoryId: true, name: true } } },
    });
  }

  /**
   * Update a service
   */
  static async updateService(id: string, tenantId: string, branchId: string, data: UpdateServiceData) {
    const service = await prisma.service.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
    });

    if (!service) throw new Error('Service not found');

    // Check duplicate name if name changed
    if (data.name && data.name !== service.name) {
      const dup = await prisma.service.findFirst({
        where: { tenantId, branchId, name: data.name, deletedAt: null, id: { not: id } },
      });
      if (dup) throw new Error(`Service with name "${data.name}" already exists`);
    }

    return prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.pricingType !== undefined && { pricingType: data.pricingType as any }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.isTaxable !== undefined && { isTaxable: data.isTaxable }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        version: { increment: 1 },
      },
      include: { category: { select: { categoryId: true, name: true } } },
    });
  }

  /**
   * Get summary/analytics for the service catalog
   */
  static async getSummary(tenantId: string, branchId: string, filters: ServiceFilters) {
    const where: any = { tenantId, branchId, deletedAt: null };

    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.pricingType) where.pricingType = filters.pricingType;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { sku: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [services, activeCount, inactiveCount, priceAgg, durationAgg, byPricingType, byCategory] = await Promise.all([
      // Total count with filters
      prisma.service.count({ where }),
      // Active count (intersect with filters)
      prisma.service.count({ where: { ...where, isActive: true } }),
      // Inactive count
      prisma.service.count({ where: { ...where, isActive: false } }),
      // Price aggregation (basePrice has default 0, so no null check needed)
      prisma.service.aggregate({
        where,
        _avg: { basePrice: true },
        _max: { basePrice: true },
        _min: { basePrice: true },
      }),
      // Duration aggregation (only for services with duration set)
      prisma.service.aggregate({
        where: { ...where, NOT: { durationMinutes: null } },
        _avg: { durationMinutes: true },
        _max: { durationMinutes: true },
        _min: { durationMinutes: true },
      }),
      // Group by pricing type
      prisma.service.groupBy({
        by: ['pricingType'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Group by category (raw query for category name)
      prisma.service.groupBy({
        by: ['categoryId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    // Fetch category names for the grouped results
    const categoryIds = byCategory.map((c) => c.categoryId).filter((id): id is string => id !== null);

    const categories = categoryIds.length
      ? await prisma.category.findMany({
          where: { categoryId: { in: categoryIds } },
          select: { categoryId: true, name: true },
        })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.categoryId, c.name]));

    // Count services with zero price (basePrice defaults to 0, so null check not applicable)
    const servicesWithNoPrice = await prisma.service.count({ where: { ...where, basePrice: 0 } });
    const servicesWithNoDuration = await prisma.service.count({ where: { ...where, durationMinutes: null } });

    return {
      totalServices: services,
      activeServices: activeCount,
      inactiveServices: inactiveCount,
      pricing: {
        averagePrice: priceAgg._avg.basePrice ? Number(priceAgg._avg.basePrice) : 0,
        highestPrice: priceAgg._max.basePrice ? Number(priceAgg._max.basePrice) : 0,
        lowestPrice: priceAgg._min.basePrice ? Number(priceAgg._min.basePrice) : 0,
        servicesWithNoPrice,
      },
      byPricingType: byPricingType.map((g) => ({
        pricingType: g.pricingType,
        count: g._count.id,
      })),
      byCategory: byCategory.map((g) => ({
        categoryId: g.categoryId,
        categoryName: g.categoryId ? (categoryMap.get(g.categoryId) ?? 'Unknown') : 'Uncategorized',
        count: g._count.id,
      })),
      duration: {
        averageDurationMin: durationAgg._avg.durationMinutes ? Math.round(durationAgg._avg.durationMinutes) : 0,
        shortestDurationMin: durationAgg._min.durationMinutes ?? 0,
        longestDurationMin: durationAgg._max.durationMinutes ?? 0,
        servicesWithNoDuration,
      },
    };
  }

  /**
   * Soft-delete a service
   */
  static async deleteService(id: string, tenantId: string, branchId: string) {
    const service = await prisma.service.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
    });

    if (!service) throw new Error('Service not found');

    return prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
