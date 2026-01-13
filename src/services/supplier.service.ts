import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';
import { CreateSupplierInput, UpdateSupplierInput, Supplier } from '../models/supplier.model';

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
        includeInactive = false,
        page = 1,
        perPage = 50
    ): Promise<{ suppliers: Supplier[]; total: number; totalPages: number }> {
        const skip = (page - 1) * perPage;

        const where = {
            tenantId,
            branchId,
            isActive: includeInactive ? undefined : true,
        };

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: perPage,
            }),
            prisma.supplier.count({ where }),
        ]);

        const totalPages = Math.ceil(total / perPage);

        return {
            suppliers: suppliers.map((s) => this.mapSupplier(s)),
            total,
            totalPages,
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
