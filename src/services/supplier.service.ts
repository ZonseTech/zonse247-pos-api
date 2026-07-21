import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';
import { CreateSupplierInput, UpdateSupplierInput, Supplier, SupplierProductHistoryItem } from '../models/supplier.model';

export class SupplierService {
    /**
     * Create a new supplier
     */
    static async createSupplier(data: CreateSupplierInput, tenantId: string, branchId: string): Promise<Supplier> {
        const supplier = await prisma.supplier.create({
            data: {
                id: uuidv4(),
                tenantId,
                branchId,
                name: data.name,
                contactPerson: data.contactPerson,
                email: data.email,
                phone: data.phone,
                address: data.address,
                taxId: data.taxId,
                paymentTerms: data.paymentTerms || 'CASH_ON_DELIVERY',
                creditLimit: data.creditLimit || 0,
                status: data.status || 'ACTIVE',
            },
        });

        return this.mapSupplier(supplier);
    }

    /**
     * Get supplier by ID
     */
    static async getSupplierById(
        supplierId: string,
        tenantId: string,
        branchId: string
    ): Promise<Supplier | null> {
        const supplier = await prisma.supplier.findFirst({
            where: {
                id: supplierId,
                tenantId,
                branchId,
            },
        });

        if (!supplier) return null;

        return this.mapSupplier(supplier);
    }

    /**
     * List all suppliers for a branch
     */
    static async listSuppliers(
        tenantId: string,
        branchId: string,
        options: {
            includeInactive?: boolean;
            search?: string;
            status?: string;
            startDate?: string;
            endDate?: string;
            skip: number;
            limit: number;
        },
    ): Promise<{ suppliers: Supplier[]; total: number }> {
        const where: any = {
            tenantId,
            branchId,
        };

        if (!options.includeInactive) {
            where.isActive = true;
        }

        if (options.status) {
            where.status = options.status;
        }

        if (options.search) {
            where.OR = [
                { name: { contains: options.search } },
                { contactPerson: { contains: options.search } },
                { email: { contains: options.search } },
                { phone: { contains: options.search } },
            ];
        }

        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) {
                where.createdAt.gte = new Date(options.startDate);
            }
            if (options.endDate) {
                const end = new Date(options.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: options.skip,
                take: options.limit,
            }),
            prisma.supplier.count({ where }),
        ]);

        return {
            suppliers: suppliers.map((s) => this.mapSupplier(s)),
            total,
        };
    }

    /**
     * Update supplier
     */
    static async updateSupplier(
        supplierId: string,
        tenantId: string,
        branchId: string,
        data: UpdateSupplierInput
    ): Promise<Supplier> {
        const supplier = await prisma.supplier.update({
            where: {
                id: supplierId,
                tenantId,
                branchId,
            },
            data: {
                name: data.name,
                contactPerson: data.contactPerson,
                email: data.email,
                phone: data.phone,
                address: data.address,
                taxId: data.taxId,
                paymentTerms: data.paymentTerms,
                creditLimit: data.creditLimit,
                status: data.status,
                isActive: data.isActive,
            },
        });

        return this.mapSupplier(supplier);
    }

    /**
     * Delete (deactivate) supplier
     */
    static async deleteSupplier(
        supplierId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        await prisma.supplier.update({
            where: {
                id: supplierId,
                tenantId,
                branchId,
            },
            data: {
                isActive: false,
            },
        });
    }

    /**
     * Products historically supplied by this supplier, aggregated from purchase order history.
     * One row per variant: total ordered/received quantity, and the most recent unit price/order date.
     */
    static async getSupplierProductHistory(
        supplierId: string,
        tenantId: string,
        branchId: string,
    ): Promise<SupplierProductHistoryItem[]> {
        const items = await prisma.purchaseOrderItem.findMany({
            where: {
                tenantId,
                branchId,
                deletedAt: null,
                purchaseOrder: {
                    supplierId,
                    deletedAt: null,
                    status: { not: 'CANCELLED' },
                },
            },
            include: {
                purchaseOrder: { select: { orderDate: true, poNumber: true } },
                variant: {
                    select: {
                        id: true,
                        variantName: true,
                        sku: true,
                        unit: true,
                        product: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { purchaseOrder: { orderDate: 'desc' } },
        });

        const grouped = new Map<string, SupplierProductHistoryItem>();

        for (const item of items) {
            const orderDate = item.purchaseOrder.orderDate;
            const existing = grouped.get(item.variantId);

            if (!existing) {
                grouped.set(item.variantId, {
                    variantId: item.variantId,
                    productId: item.variant.product.id,
                    productName: item.variant.product.name,
                    variantName: item.variant.variantName,
                    sku: item.variant.sku,
                    unit: item.variant.unit,
                    totalOrdered: item.orderedQuantity,
                    totalReceived: item.receivedQuantity,
                    lastUnitPrice: Number(item.unitPrice),
                    lastOrderDate: orderDate,
                    lastPoNumber: item.purchaseOrder.poNumber,
                    orderCount: 1,
                });
                continue;
            }

            existing.totalOrdered += item.orderedQuantity;
            existing.totalReceived += item.receivedQuantity;
            existing.orderCount += 1;
            if (orderDate > existing.lastOrderDate) {
                existing.lastUnitPrice = Number(item.unitPrice);
                existing.lastOrderDate = orderDate;
                existing.lastPoNumber = item.purchaseOrder.poNumber;
            }
        }

        return Array.from(grouped.values()).sort(
            (a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime(),
        );
    }

    /**
     * Helper: Map supplier
     */
    private static mapSupplier(supplier: any): Supplier {
        return {
            id: supplier.id,
            tenantId: supplier.tenantId,
            branchId: supplier.branchId,
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            taxId: supplier.taxId,
            paymentTerms: supplier.paymentTerms,
            creditLimit: Number(supplier.creditLimit),
            status: supplier.status,
            isActive: supplier.isActive,
            createdAt: supplier.createdAt,
            updatedAt: supplier.updatedAt,
        };
    }
}
