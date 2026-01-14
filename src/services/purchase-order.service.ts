import { v4 as uuidv4 } from 'uuid';
import { PurchaseOrderStatus } from '../databases/prisma/generated/prisma/client';
import { prisma } from '../databases/prisma/client';
import {
    CreatePurchaseOrderInput,
    ReceivePurchaseOrderInput,
    PurchaseOrderWithItems,
} from '../models/purchase-order.model';
import { StockMovementService } from './stock-movement.service';

export class PurchaseOrderService {
    /**
     * Create a purchase order (Step 2 in the flow: "Order 100 bags → stock still = 0")
     */
    static async createPurchaseOrder(data: CreatePurchaseOrderInput, tenantId: string, branchId: string): Promise<PurchaseOrderWithItems> {
        const poNumber = await this.generatePONumber(tenantId, branchId);

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                id: uuidv4(),
                tenantId,
                branchId,
                supplierId: data.supplierId,
                poNumber,
                expectedDeliveryDate: data.expectedDeliveryDate
                    ? new Date(data.expectedDeliveryDate)
                    : undefined,
                notes: data.notes,
                createdBy: data.createdBy,
                items: {
                    create: data.items.map((item) => ({
                        id: uuidv4(),
                        productId: item.productId,
                        orderedQuantity: item.orderedQuantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.orderedQuantity * item.unitPrice,
                    })),
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
                supplier: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return this.mapPurchaseOrder(purchaseOrder);
    }

    /**
     * Receive a purchase order (Step 3: "Receive 95 good, 5 damaged")
     * This updates inventory and creates stock movements
     */
    static async receivePurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string,
        data: ReceivePurchaseOrderInput
    ): Promise<PurchaseOrderWithItems> {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findFirst({
                where: {
                    id: purchaseOrderId,
                    tenantId,
                    branchId,
                },
                include: {
                    items: true,
                },
            });

            if (!po) {
                throw new Error('Purchase order not found');
            }

            if (po.status === 'RECEIVED' || po.isLocked) {
                throw new Error('Purchase order already received or locked');
            }

            for (const receivedItem of data.items) {
                const poItem = po.items.find((i) => i.productId === receivedItem.productId);
                if (!poItem) {
                    throw new Error(`Product ${receivedItem.productId} not found in purchase order`);
                }

                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: {
                        receivedQuantity: receivedItem.receivedQuantity,
                        damagedQuantity: receivedItem.damagedQuantity,
                    },
                });

                let inventory = await tx.inventory.findFirst({
                    where: {
                        tenantId,
                        branchId,
                        productId: receivedItem.productId,
                    },
                });

                if (!inventory) {
                    inventory = await tx.inventory.create({
                        data: {
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            productId: receivedItem.productId,
                            availableQuantity: 0,
                            reservedQuantity: 0,
                            damagedQuantity: 0,
                            averageCost: 0,
                            lastPurchaseCost: 0,
                        },
                    });
                }

                const unitCost = Number(poItem.unitPrice);
                const receivedQty = receivedItem.receivedQuantity;
                const damagedQty = receivedItem.damagedQuantity;

                if (receivedQty > 0) {
                    const currentAvailable = inventory.availableQuantity;
                    const currentAvgCost = Number(inventory.averageCost);

                    const newAvgCost =
                        currentAvailable > 0
                            ? (currentAvailable * currentAvgCost + receivedQty * unitCost) /
                            (currentAvailable + receivedQty)
                            : unitCost;

                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: {
                            availableQuantity: { increment: receivedQty },
                            averageCost: newAvgCost,
                            lastPurchaseCost: unitCost,
                            lastRestockedAt: new Date(),
                        },
                    });

                    await StockMovementService.recordMovement(
                        {
                            tenantId,
                            branchId,
                            inventoryId: inventory.id,
                            movementType: 'PURCHASE_RECEIPT',
                            quantity: receivedQty,
                            referenceType: 'PURCHASE_ORDER',
                            referenceId: purchaseOrderId,
                            unitCost,
                            notes: `Received from PO ${po.poNumber}`,
                            movedBy: data.receivedBy,
                        },
                        tx
                    );
                }

                if (damagedQty > 0) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: {
                            damagedQuantity: { increment: damagedQty },
                        },
                    });

                    await StockMovementService.recordMovement(
                        {
                            tenantId,
                            branchId,
                            inventoryId: inventory.id,
                            movementType: 'DAMAGE',
                            quantity: damagedQty,
                            referenceType: 'PURCHASE_ORDER',
                            referenceId: purchaseOrderId,
                            unitCost,
                            notes: `Damaged items from PO ${po.poNumber}`,
                            movedBy: data.receivedBy,
                        },
                        tx
                    );
                }
            }

            const allItemsReceived = data.items.every((item) => {
                const poItem = po.items.find((i) => i.productId === item.productId);
                return poItem && item.receivedQuantity + item.damagedQuantity === poItem.orderedQuantity;
            });

            const status: PurchaseOrderStatus = allItemsReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

            const updatedPO = await tx.purchaseOrder.update({
                where: { id: purchaseOrderId },
                data: {
                    status,
                    receivedAt: new Date(),
                    receivedBy: data.receivedBy,
                    isLocked: allItemsReceived,
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
                    supplier: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            return this.mapPurchaseOrder(updatedPO);
        });
    }

    /**
     * Get purchase order by ID
     */
    static async getPurchaseOrderById(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<PurchaseOrderWithItems | null> {
        const po = await prisma.purchaseOrder.findFirst({
            where: {
                id: purchaseOrderId,
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
                supplier: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!po) return null;

        return this.mapPurchaseOrder(po);
    }

    /**
     * List purchase orders
     */
    static async listPurchaseOrders(
        tenantId: string,
        branchId: string,
        options?: {
            status?: PurchaseOrderStatus;
            supplierId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ orders: PurchaseOrderWithItems[]; total: number; totalPages: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
            status: options?.status,
            supplierId: options?.supplierId,
        };

        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
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
                    supplier: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { orderDate: 'desc' },
            }),
            prisma.purchaseOrder.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            orders: orders.map((po) => this.mapPurchaseOrder(po)),
            total,
            totalPages,
        };
    }

    /**
     * Cancel a purchase order
     */
    static async cancelPurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        const po = await prisma.purchaseOrder.findFirst({
            where: {
                id: purchaseOrderId,
                tenantId,
                branchId,
            },
        });

        if (!po) {
            throw new Error('Purchase order not found');
        }

        if (po.status === 'RECEIVED' || po.isLocked) {
            throw new Error('Cannot cancel a received or locked purchase order');
        }

        await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: {
                status: 'CANCELLED',
                isLocked: true,
            },
        });
    }

    /**
     * Generate PO number
     */
    private static async generatePONumber(tenantId: string, branchId: string): Promise<string> {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');

        const prefix = `PO-${year}${month}`;

        const lastPO = await prisma.purchaseOrder.findFirst({
            where: {
                tenantId,
                branchId,
                poNumber: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                poNumber: 'desc',
            },
        });

        let sequence = 1;
        if (lastPO) {
            const lastSequence = parseInt(lastPO.poNumber.split('-').pop() || '0');
            sequence = lastSequence + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    /**
     * Helper: Map purchase order
     */
    private static mapPurchaseOrder(po: any): PurchaseOrderWithItems {
        return {
            id: po.id,
            purchaseOrderId: po.id,
            tenantId: po.tenantId,
            branchId: po.branchId,
            supplierId: po.supplierId,
            poNumber: po.poNumber,
            status: po.status,
            orderDate: po.orderDate,
            expectedDeliveryDate: po.expectedDeliveryDate,
            receivedAt: po.receivedAt,
            notes: po.notes,
            createdBy: po.createdBy,
            receivedBy: po.receivedBy,
            isLocked: po.isLocked,
            createdAt: po.createdAt,
            updatedAt: po.updatedAt,
            items: po.items.map((item: any) => ({
                id: item.id,
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.receivedQuantity,
                damagedQuantity: item.damagedQuantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                notes: item.notes,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                product: item.product,
            })),
            supplier: po.supplier,
        };
    }
}
