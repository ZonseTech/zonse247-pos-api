import { prisma } from '../databases/prisma/client';

export class ParkedSalesService {
    /**
     * Park a sale (create a parked sale)
     */
    static async parkSale(
        data: any,
        tenantId: string,
        branchId: string
    ): Promise<any> {
        // Map items with proper field names matching ParkedSaleItem schema
        const items = (data.items || []).map((item: any) => ({
            tenantId,
            branchId,
            productId: item.productId,
            categoryId: item.categoryId || null,
            name: item.name || item.productName || 'Unknown Product',
            barcode: item.barcode || null,
            sku: item.sku || null,
            unit: item.unit || null,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price || 0,
            sellPrice: item.sellPrice || item.unitPrice || item.price || 0,
            purchasePrice: item.purchasePrice || item.costPrice || 0,
            discount: item.discount || item.discountAmount || 0,
            taxAmount: item.taxAmount || item.tax || 0,
            subtotal: item.subtotal || ((item.quantity || 1) * (item.unitPrice || item.sellPrice || item.price || 0)),
        }));

        // Calculate totals from items if not provided
        const totalItems = data.totalItems || items.length;
        const subtotal = data.subtotal || items.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
        const taxAmount = data.taxAmount || items.reduce((sum: number, item: any) => sum + Number(item.taxAmount || 0), 0);
        const discountAmount = data.discountAmount || items.reduce((sum: number, item: any) => sum + Number(item.discount || 0), 0);

        // Handle otherCharges as array of objects or as a number
        let otherCharges = 0;
        if (Array.isArray(data.otherCharges)) {
            otherCharges = data.otherCharges.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0);
        } else if (typeof data.otherCharges === 'number') {
            otherCharges = data.otherCharges;
        }

        const totalAmount = data.totalAmount || data.total || (subtotal + taxAmount + otherCharges - discountAmount);

        const parkedSale = await prisma.parkedSale.create({
            data: {
                tenantId,
                branchId,
                userId: data.userId,
                terminalId: data.terminalId || null,
                customerId: data.customerId || null,
                reference: data.reference || `PARK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                subtotal,
                taxAmount,
                discountAmount,
                otherCharges,
                totalAmount,
                totalItems,
                status: 'PARKED',
                notes: data.notes || null,
                items: {
                    create: items,
                },
            },
            include: {
                items: true,
            },
        });

        return parkedSale;
    }

    /**
     * List all parked sales
     */
    static async listParkedSales(
        tenantId: string,
        branchId: string,
        options?: {
            userId?: string;
            terminalId?: string;
            status?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ parkedSales: any[]; total: number; totalPages: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
        };

        if (options?.userId) {
            where.userId = options.userId;
        }

        if (options?.terminalId) {
            where.terminalId = options.terminalId;
        }

        if (options?.status) {
            where.status = options.status;
        }

        const [parkedSales, total] = await Promise.all([
            prisma.parkedSale.findMany({
                where,
                include: {
                    items: true,
                },
                skip,
                take: limit,
                orderBy: { parkedAt: 'desc' },
            }),
            prisma.parkedSale.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            parkedSales,
            total,
            totalPages,
        };
    }

    /**
     * Get a parked sale by ID
     */
    static async getParkedSaleById(
        parkedSaleId: string,
        tenantId: string,
        branchId: string
    ): Promise<any | null> {
        const parkedSale = await prisma.parkedSale.findFirst({
            where: {
                id: parkedSaleId,
                tenantId,
                branchId,
            },
            include: {
                items: true,
            },
        });

        return parkedSale;
    }

    /**
     * Update a parked sale
     */
    static async updateParkedSale(
        parkedSaleId: string,
        tenantId: string,
        branchId: string,
        data: any
    ): Promise<any> {
        // First verify it exists and belongs to tenant/branch
        const existing = await prisma.parkedSale.findFirst({
            where: {
                id: parkedSaleId,
                tenantId,
                branchId,
            },
        });

        if (!existing) {
            throw new Error('Parked sale not found');
        }

        // Update the parked sale
        const { items: _items, ...updateData } = data;

        const updatedSale = await prisma.parkedSale.update({
            where: { id: parkedSaleId },
            data: updateData,
            include: {
                items: true,
            },
        });

        return updatedSale;
    }

    /**
     * Resume a parked sale
     * Returns the parked sale data so it can be loaded into POS
     */
    static async resumeParkedSale(
        parkedSaleId: string,
        tenantId: string,
        branchId: string
    ): Promise<any> {
        // First get the parked sale with items
        const parkedSale = await prisma.parkedSale.findFirst({
            where: {
                id: parkedSaleId,
                tenantId,
                branchId,
            },
            include: {
                items: true,
            },
        });

        if (!parkedSale) {
            throw new Error('Parked sale not found');
        }

        // Update status to resumed
        await prisma.parkedSale.update({
            where: { id: parkedSaleId },
            data: {
                status: 'RESUMED',
                resumedAt: new Date(),
            },
        });

        return parkedSale;
    }

    /**
     * Delete a parked sale
     */
    static async deleteParkedSale(
        parkedSaleId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        // First verify it exists and belongs to tenant/branch
        const existing = await prisma.parkedSale.findFirst({
            where: {
                id: parkedSaleId,
                tenantId,
                branchId,
            },
        });

        if (!existing) {
            throw new Error('Parked sale not found');
        }

        // Delete items first, then the parked sale
        await prisma.parkedSaleItem.deleteMany({
            where: { parkedSaleId },
        });

        await prisma.parkedSale.delete({
            where: { id: parkedSaleId },
        });
    }

    /**
     * Get parked sales count
     */
    static async getParkedSalesCount(
        tenantId: string,
        branchId: string,
        options?: {
            userId?: string;
            terminalId?: string;
        }
    ): Promise<{ total: number; byStatus: Record<string, number> }> {
        const where: any = {
            tenantId,
            branchId,
        };

        if (options?.userId) {
            where.userId = options.userId;
        }

        if (options?.terminalId) {
            where.terminalId = options.terminalId;
        }

        const [total, parkedCount, resumedCount, cancelledCount, completedCount, expiredCount] = await Promise.all([
            prisma.parkedSale.count({ where }),
            prisma.parkedSale.count({ where: { ...where, status: 'PARKED' } }),
            prisma.parkedSale.count({ where: { ...where, status: 'RESUMED' } }),
            prisma.parkedSale.count({ where: { ...where, status: 'CANCELLED' } }),
            prisma.parkedSale.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.parkedSale.count({ where: { ...where, status: 'EXPIRED' } }),
        ]);

        return {
            total,
            byStatus: {
                parked: parkedCount,
                resumed: resumedCount,
                cancelled: cancelledCount,
                completed: completedCount,
                expired: expiredCount,
            },
        };
    }
}
