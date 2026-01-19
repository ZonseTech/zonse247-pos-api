import { v4 as uuidv4 } from 'uuid';
import { SaleStatus } from '../databases/prisma/generated/prisma/client';
import { prisma } from '../databases/prisma/client';
import { CreateSaleInput, SaleWithItems, VoidSaleInput } from '../models/sale.model';
import { StockMovementService } from './stock-movement.service';

export class SaleService {
    /**
     * Create a sale with support for multiple payment methods
     * (Step 4: "Sell 10 bags → stock = 85")
     */
    static async createSale(data: CreateSaleInput, tenantId: string, branchId: string): Promise<SaleWithItems> {
        return await prisma.$transaction(async (tx) => {
            let subtotal = 0;
            const itemsWithCost = [];
            const saleNumber = await this.generateSaleNumber(tenantId, branchId, tx);

            for (const item of data.items) {
                const product = await tx.product.findFirst({
                    where: {
                        id: item.productId,
                        tenantId: tenantId,
                        branchId: branchId,
                        isActive: true,
                    },
                    include: {
                        inventories: true,
                    },
                });

                if (!product) {
                    throw new Error(`Product ${item.productId} not found or inactive`);
                }

                const inventory = product.inventories?.[0];
                if (!inventory) {
                    throw new Error(`No inventory record for product ${product.name}`);
                }

                if (inventory.trackInventory && !inventory.allowNegativeStock) {
                    if (inventory.availableQuantity < item.quantity) {
                        throw new Error(
                            `Insufficient stock for ${product.name}. Available: ${inventory.availableQuantity}, Requested: ${item.quantity}`
                        );
                    }
                }

                const itemSubtotal = item.quantity * item.unitPrice;
                const itemTax = item.taxAmount || 0;
                const itemDiscount = item.discountAmount || 0;
                const itemTotal = itemSubtotal + itemTax - itemDiscount;

                subtotal += itemSubtotal;

                itemsWithCost.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    unitCost: Number(inventory.averageCost),
                    subtotal: itemSubtotal,
                    taxAmount: itemTax,
                    discountAmount: itemDiscount,
                    totalAmount: itemTotal,
                    inventoryId: inventory.id,
                });
            }

            const taxAmount = data.taxAmount || 0;
            const discountAmount = data.discountAmount || 0;
            const totalAmount = subtotal + taxAmount - discountAmount;

            // Calculate total paid from multiple payments or single payment
            let totalPaid = data.amountPaid;
            if (data.payments && data.payments.length > 0) {
                totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
            }

            const changeAmount = totalPaid - totalAmount;

            if (changeAmount < 0) {
                throw new Error(`Insufficient payment amount. Total: ${totalAmount}, Paid: ${totalPaid}`);
            }

            // Create the sale
            const sale = await tx.sale.create({
                data: {
                    id: uuidv4(),
                    tenantId: tenantId,
                    branchId: branchId,
                    saleNumber,
                    customerId: data.customerId,
                    terminalId: data.terminalId,
                    userId: data.userId,
                    subtotal,
                    taxAmount,
                    discountAmount,
                    totalAmount,
                    amountPaid: totalPaid,
                    changeAmount,
                    // Keep paymentMethodId for backward compatibility (first payment method or single)
                    paymentMethodId: data.payments?.[0]?.paymentMethodId || data.paymentMethodId,
                    status: 'COMPLETED',
                    notes: data.notes,
                    items: {
                        create: itemsWithCost.map(({ inventoryId: _inventoryId, ...item }) => ({
                            id: uuidv4(),
                            ...item
                        })),
                    },
                    // Create multiple payments if provided
                    ...(data.payments && data.payments.length > 0 && {
                        payments: {
                            create: data.payments.map((payment) => ({
                                id: uuidv4(),
                                paymentMethodId: payment.paymentMethodId,
                                amount: payment.amount,
                                reference: payment.reference,
                                providerId: payment.providerId,
                                providerRef: payment.providerRef,
                                notes: payment.notes,
                                status: 'COMPLETED',
                            })),
                        },
                    }),
                },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                    payments: {
                        include: {
                            paymentMethod: {
                                select: {
                                    methodId: true,
                                    name: true,
                                    icon: true,
                                },
                            },
                        },
                    },
                },
            });

            for (const item of itemsWithCost) {
                await tx.inventory.update({
                    where: { id: item.inventoryId },
                    data: {
                        availableQuantity: { decrement: item.quantity },
                        lastSoldAt: new Date(),
                    },
                });

                await StockMovementService.recordMovement(
                    {
                        tenantId: tenantId,
                        branchId: branchId,
                        inventoryId: item.inventoryId,
                        movementType: 'SALE',
                        quantity: item.quantity,
                        referenceType: 'SALE',
                        referenceId: sale.id,
                        unitCost: item.unitCost,
                        notes: `Sale ${saleNumber}`,
                        movedBy: data.userId,
                    },
                    tx
                );
            }

            return this.mapSale(sale);
        });
    }

    /**
     * Get sale by ID
     */
    static async getSaleById(
        saleId: string,
        tenantId: string,
        branchId: string
    ): Promise<SaleWithItems | null> {
        const sale = await prisma.sale.findFirst({
            where: {
                id: saleId,
                tenantId,
                branchId,
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
                payments: {
                    include: {
                        paymentMethod: {
                            select: {
                                methodId: true,
                                name: true,
                                icon: true,
                            },
                        },
                    },
                },
                paymentMethod: {
                    select: {
                        methodId: true,
                        name: true,
                        icon: true,
                    },
                },
                terminal: {
                    select: {
                        terminalId: true,
                        terminalLabel: true,
                        terminalCode: true,
                    },
                },
                user: {
                    select: {
                        userId: true,
                        fullname: true,
                        username: true,
                    },
                },
                customer: {
                    select: {
                        customerId: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        if (!sale) return null;

        return this.mapSale(sale);
    }

    /**
     * List sales
     */
    static async listSales(
        tenantId: string,
        branchId: string,
        options?: {
            status?: SaleStatus;
            userId?: string;
            terminalId?: string;
            paymentMethodId?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
            includeItems?: boolean;
            search?: string;
        }
    ): Promise<{ sales: SaleWithItems[]; total: number; totalPages: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
        };

        // Apply status filter
        if (options?.status) {
            where.status = options.status;
        }

        // Apply userId filter
        if (options?.userId) {
            where.userId = options.userId;
        }

        // Apply terminalId filter
        if (options?.terminalId) {
            where.terminalId = options.terminalId;
        }

        // Apply paymentMethodId filter
        if (options?.paymentMethodId) {
            where.paymentMethodId = options.paymentMethodId;
        }

        // Handle date filtering - adjust endDate to include the entire day
        if (options?.startDate && options?.endDate) {
            const endOfDay = new Date(options.endDate);
            endOfDay.setHours(23, 59, 59, 999);

            where.saleDate = {
                gte: options.startDate,
                lte: endOfDay,
            };
        } else if (options?.startDate) {
            where.saleDate = { gte: options.startDate };
        } else if (options?.endDate) {
            const endOfDay = new Date(options.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            where.saleDate = { lte: endOfDay };
        }

        // Apply search filter
        if (options?.search) {
            where.OR = [
                { saleNumber: { contains: options.search } },
                { notes: { contains: options.search } },
                {
                    customer: {
                        name: { contains: options.search }
                    }
                },
                {
                    user: {
                        OR: [
                            { fullname: { contains: options.search } },
                            { username: { contains: options.search } },
                        ]
                    }
                },
            ];
        }

        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                    payments: {
                        include: {
                            paymentMethod: {
                                select: {
                                    methodId: true,
                                    name: true,
                                    icon: true,
                                },
                            },
                        },
                    },
                    paymentMethod: {
                        select: {
                            methodId: true,
                            name: true,
                            icon: true,
                        },
                    },
                    terminal: {
                        select: {
                            terminalId: true,
                            terminalLabel: true,
                            terminalCode: true,
                        },
                    },
                    user: {
                        select: {
                            userId: true,
                            fullname: true,
                            username: true,
                        },
                    },
                    customer: {
                        select: {
                            customerId: true,
                            name: true,
                            phone: true,
                            email: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { saleDate: 'desc' },
            }),
            prisma.sale.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            sales: sales.map((s) => this.mapSale(s)),
            total,
            totalPages,
        };
    }

    /**
     * Void a sale (reverses inventory)
     */
    static async voidSale(
        saleId: string,
        tenantId: string,
        branchId: string,
        data: VoidSaleInput
    ): Promise<SaleWithItems> {
        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findFirst({
                where: {
                    id: saleId,
                    tenantId,
                    branchId,
                },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    inventories: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!sale) {
                throw new Error('Sale not found');
            }

            if (sale.isVoided) {
                throw new Error('Sale already voided');
            }

            for (const item of sale.items) {
                const inventory = item.product.inventories?.[0];
                if (!inventory) continue;

                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        availableQuantity: { increment: item.quantity },
                    },
                });

                await StockMovementService.recordMovement(
                    {
                        tenantId,
                        branchId,
                        inventoryId: inventory.id,
                        movementType: 'RETURN',
                        quantity: item.quantity,
                        referenceType: 'SALE',
                        referenceId: saleId,
                        unitCost: Number(item.unitCost),
                        notes: `Void sale ${sale.saleNumber}: ${data.voidReason}`,
                        movedBy: data.voidedBy,
                    },
                    tx
                );
            }

            const voidedSale = await tx.sale.update({
                where: { id: saleId },
                data: {
                    isVoided: true,
                    voidedAt: new Date(),
                    voidedBy: data.voidedBy,
                    voidReason: data.voidReason,
                    status: 'VOIDED',
                },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                },
            });

            return this.mapSale(voidedSale);
        });
    }

    /**
     * Generate sale number
     */
    private static async generateSaleNumber(
        tenantId: string,
        branchId: string,
        tx: any
    ): Promise<string> {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        const prefix = `SALE-${year}${month}${day}`;

        const lastSale = await tx.sale.findFirst({
            where: {
                tenantId,
                branchId,
                saleNumber: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                saleNumber: 'desc',
            },
        });

        let sequence = 1;
        if (lastSale) {
            const lastSequence = parseInt(lastSale.saleNumber.split('-').pop() || '0');
            sequence = lastSequence + 1;
        }

        return `${prefix}-${String(sequence).padStart(5, '0')}`;
    }

    /**
     * Helper: Map sale
     */
    private static mapSale(sale: any): SaleWithItems {
        return {
            id: sale.id,
            tenantId: sale.tenantId,
            branchId: sale.branchId,
            saleNumber: sale.saleNumber,
            customerId: sale.customerId,
            terminalId: sale.terminalId,
            userId: sale.userId,
            subtotal: Number(sale.subtotal),
            taxAmount: Number(sale.taxAmount),
            discountAmount: Number(sale.discountAmount),
            totalAmount: Number(sale.totalAmount),
            amountPaid: Number(sale.amountPaid),
            changeAmount: Number(sale.changeAmount),
            paymentMethodId: sale.paymentMethodId,
            status: sale.status,
            saleDate: sale.saleDate,
            notes: sale.notes,
            isVoided: sale.isVoided,
            voidedAt: sale.voidedAt,
            voidedBy: sale.voidedBy,
            voidReason: sale.voidReason,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            items: sale.items.map((item: any) => ({
                id: item.id,
                saleId: item.saleId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                unitCost: Number(item.unitCost),
                subtotal: Number(item.subtotal),
                taxAmount: Number(item.taxAmount),
                discountAmount: Number(item.discountAmount),
                totalAmount: Number(item.totalAmount),
                createdAt: item.createdAt,
                product: item.product,
            })),
            // Include payments if available
            payments: sale.payments?.map((payment: any) => ({
                id: payment.id,
                saleId: payment.saleId,
                paymentMethodId: payment.paymentMethodId,
                amount: Number(payment.amount),
                reference: payment.reference,
                providerId: payment.providerId,
                providerRef: payment.providerRef,
                status: payment.status,
                processedAt: payment.processedAt,
                notes: payment.notes,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                paymentMethod: payment.paymentMethod,
            })),
            // Include relations for display
            paymentMethod: sale.paymentMethod,
            terminal: sale.terminal,
            user: sale.user,
            customer: sale.customer,
        };
    }

    /**
     * Get sales summary with filters
     * Returns: Total Sales, Total Voided, Net Sales, Total Count
     */
    static async getSalesSummary(
        tenantId: string,
        branchId: string,
        filters: {
            startDate?: Date;
            endDate?: Date;
            status?: string;
            paymentMethodId?: string;
            userId?: string;
            terminalId?: string;
        }
    ): Promise<{
        totalSales: number;
        totalVoided: number;
        netSales: number;
        totalCount: number;
        completedCount: number;
        voidedCount: number;
        refundedCount: number;
    }> {
        const where: any = {
            tenantId,
            branchId,
        };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.paymentMethodId) {
            where.paymentMethodId = filters.paymentMethodId;
        }

        if (filters.userId) {
            where.userId = filters.userId;
        }

        if (filters.terminalId) {
            where.terminalId = filters.terminalId;
        }

        // Handle date filtering
        if (filters.startDate && filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);

            where.saleDate = {
                gte: filters.startDate,
                lte: endOfDay,
            };
        } else if (filters.startDate) {
            where.saleDate = { gte: filters.startDate };
        } else if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            where.saleDate = { lte: endOfDay };
        }

        const sales = await prisma.sale.findMany({
            where,
            select: {
                totalAmount: true,
                status: true,
                isVoided: true,
            },
        });

        let totalSales = 0;
        let totalVoided = 0;
        let completedCount = 0;
        let voidedCount = 0;
        let refundedCount = 0;

        for (const sale of sales) {
            const amount = Number(sale.totalAmount) || 0;

            if (sale.status === 'VOIDED' || sale.isVoided) {
                totalVoided += amount;
                voidedCount++;
            } else if (sale.status === 'REFUNDED') {
                totalVoided += amount;
                refundedCount++;
            } else {
                totalSales += amount;
                completedCount++;
            }
        }

        const netSales = totalSales - totalVoided;

        return {
            totalSales: Math.round(totalSales * 100) / 100,
            totalVoided: Math.round(totalVoided * 100) / 100,
            netSales: Math.round(netSales * 100) / 100,
            totalCount: sales.length,
            completedCount,
            voidedCount,
            refundedCount,
        };
    }

    // ==========================================
    // PARKED SALES (HOLD ORDERS) METHODS
    // ==========================================

    /**
     * Park a sale (create a hold order)
     */
    static async parkSale(
        data: any,
        tenantId: string,
        branchId: string
    ): Promise<any> {
        const holdOrder = await prisma.holdOrder.create({
            data: {
                itemId: data.itemId,
                reference: data.reference,
                total: data.total || 0,
                totalItems: data.totalItems || 0,
                date: data.date ? new Date(data.date) : new Date(),
                status: 'hold',
                userId: data.userId,
                till: data.till,
                tenantId,
                branchId,
                items: {
                    create: (data.items || []).map((item: any) => ({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity || 1,
                        price: item.price || 0,
                        subtotal: item.subtotal || 0,
                        sku: item.sku,
                        barcode: item.barcode,
                        unit: item.unit,
                        discount: item.discount || 0,
                        tax: item.tax || 0,
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        return holdOrder;
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
            where.till = options.terminalId;
        }

        if (options?.status) {
            where.status = options.status;
        }

        const [parkedSales, total] = await Promise.all([
            prisma.holdOrder.findMany({
                where,
                include: {
                    items: true,
                },
                skip,
                take: limit,
                orderBy: { date: 'desc' },
            }),
            prisma.holdOrder.count({ where }),
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
        holdOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<any | null> {
        const holdOrder = await prisma.holdOrder.findFirst({
            where: {
                id: holdOrderId,
                tenantId,
                branchId,
            },
            include: {
                items: true,
            },
        });

        return holdOrder;
    }

    /**
     * Update a parked sale
     */
    static async updateParkedSale(
        holdOrderId: string,
        tenantId: string,
        branchId: string,
        data: any
    ): Promise<any> {
        // First verify it exists and belongs to tenant/branch
        const existing = await prisma.holdOrder.findFirst({
            where: {
                id: holdOrderId,
                tenantId,
                branchId,
            },
        });

        if (!existing) {
            throw new Error('Parked sale not found');
        }

        // Update the hold order
        const { items: _items, ...updateData } = data;

        const updatedOrder = await prisma.holdOrder.update({
            where: { id: holdOrderId },
            data: updateData,
            include: {
                items: true,
            },
        });

        return updatedOrder;
    }

    /**
     * Resume a parked sale (delete the hold order)
     * Returns the hold order data so it can be loaded into POS
     */
    static async resumeParkedSale(
        holdOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<any> {
        // First get the hold order with items
        const holdOrder = await prisma.holdOrder.findFirst({
            where: {
                id: holdOrderId,
                tenantId,
                branchId,
            },
            include: {
                items: true,
            },
        });

        if (!holdOrder) {
            throw new Error('Parked sale not found');
        }

        // Update status to resumed
        await prisma.holdOrder.update({
            where: { id: holdOrderId },
            data: { status: 'resumed' },
        });

        return holdOrder;
    }

    /**
     * Delete a parked sale
     */
    static async deleteParkedSale(
        holdOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        // First verify it exists and belongs to tenant/branch
        const existing = await prisma.holdOrder.findFirst({
            where: {
                id: holdOrderId,
                tenantId,
                branchId,
            },
        });

        if (!existing) {
            throw new Error('Parked sale not found');
        }

        // Delete items first, then the hold order
        await prisma.holdOrderItem.deleteMany({
            where: { holdOrderId },
        });

        await prisma.holdOrder.delete({
            where: { id: holdOrderId },
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
            where.till = options.terminalId;
        }

        const [total, holdCount, resumedCount, cancelledCount, completedCount, expiredCount] = await Promise.all([
            prisma.holdOrder.count({ where }),
            prisma.holdOrder.count({ where: { ...where, status: 'hold' } }),
            prisma.holdOrder.count({ where: { ...where, status: 'resumed' } }),
            prisma.holdOrder.count({ where: { ...where, status: 'cancelled' } }),
            prisma.holdOrder.count({ where: { ...where, status: 'completed' } }),
            prisma.holdOrder.count({ where: { ...where, status: 'expired' } }),
        ]);

        return {
            total,
            byStatus: {
                hold: holdCount,
                resumed: resumedCount,
                cancelled: cancelledCount,
                completed: completedCount,
                expired: expiredCount,
            },
        };
    }
}
