import { SaleStatus } from '../databases/prisma/generated/prisma/client';
import { prisma } from '../databases/prisma/client';
import { CreateSaleInput, SaleWithItems, VoidSaleInput } from '../models/sale.model';
import { StockMovementService } from './stock-movement.service';

export class SaleService {
    /**
     * Create a sale (Step 4: "Sell 10 bags → stock = 85")
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
            const changeAmount = data.amountPaid - totalAmount;

            if (changeAmount < 0) {
                throw new Error('Insufficient payment amount');
            }

            const sale = await tx.sale.create({
                data: {
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
                    amountPaid: data.amountPaid,
                    changeAmount,
                    paymentMethodId: data.paymentMethodId,
                    status: 'COMPLETED',
                    notes: data.notes,
                    items: {
                        create: itemsWithCost.map(({ inventoryId: _inventoryId, ...item }) => item),
                    },
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
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ): Promise<{ sales: SaleWithItems[]; total: number; totalPages: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
            status: options?.status,
            userId: options?.userId,
            terminalId: options?.terminalId,
            saleDate: {
                gte: options?.startDate,
                lte: options?.endDate,
            },
        };

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
        };
    }
}
