import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CreatePurchaseOrderInput,
    UpdatePurchaseOrderInput,
    ReceivePurchaseOrderInput,
    PurchaseOrderWithItems,
} from '../../models/purchase-order.model';
import { GoodsReceiptService } from './goods-receipt.service';
import type { PurchaseOrderStatus } from '../../databases/prisma/generated/prisma/enums';

// ─── Shared Includes ───────────────────────────────────────────────

const VARIANT_SELECT = {
    id: true,
    variantName: true,
    sku: true,
    product: { select: { id: true, name: true } },
};

const SUPPLIER_SELECT = { id: true, name: true };

const REQUISITION_SELECT = { id: true, requisitionNumber: true };

const PO_INCLUDE = {
    items: {
        where: { deletedAt: null },
        include: { variant: { select: VARIANT_SELECT } },
    },
    supplier: { select: SUPPLIER_SELECT },
    requisition: { select: REQUISITION_SELECT },
};

export class PurchaseOrderService {
    /**
     * Create a purchase order (DRAFT status — no stock impact).
     * Can optionally link to an approved requisition and copy its quantities.
     */
    static async createPurchaseOrder(
        data: CreatePurchaseOrderInput,
        tenantId: string,
        branchId: string
    ): Promise<PurchaseOrderWithItems> {
        return await prisma.$transaction(async (tx) => {
            // If linked to a requisition, validate it exists and is approved
            if (data.requisitionId) {
                const requisition = await tx.purchaseRequisition.findFirst({
                    where: {
                        id: data.requisitionId,
                        tenantId,
                        branchId,
                        deletedAt: null,
                    },
                });

                if (!requisition) {
                    throw new Error('Requisition not found');
                }
                if (requisition.status !== 'APPROVED' && requisition.status !== 'PARTIALLY_APPROVED') {
                    throw new Error('Only APPROVED or PARTIALLY_APPROVED requisitions can be linked to a PO');
                }
            }

            const poNumber = await this.generatePONumber(tenantId, branchId, tx);

            const purchaseOrder = await tx.purchaseOrder.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    branchId,
                    supplierId: data.supplierId,
                    requisitionId: data.requisitionId || null,
                    poNumber,
                    status: 'DRAFT',
                    expectedDeliveryDate: data.expectedDeliveryDate
                        ? new Date(data.expectedDeliveryDate)
                        : undefined,
                    notes: data.notes,
                    createdBy: data.createdBy,
                    items: {
                        create: data.items.map((item) => ({
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            variantId: item.variantId,
                            orderedQuantity: item.orderedQuantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.orderedQuantity * item.unitPrice,
                            notes: item.notes,
                        })),
                    },
                },
                include: PO_INCLUDE,
            });

            return this.mapPurchaseOrder(purchaseOrder);
        });
    }

    /**
     * Create a PO directly from an approved requisition.
     * Copies approved quantities from the requisition items.
     * Requires supplierId and item-level unitPrice mappings.
     */
    static async createFromRequisition(
        requisitionId: string,
        supplierId: string,
        itemPrices: { variantId: string; unitPrice: number }[],
        tenantId: string,
        branchId: string,
        createdBy: string,
        options?: { expectedDeliveryDate?: string; notes?: string }
    ): Promise<PurchaseOrderWithItems> {
        return await prisma.$transaction(async (tx) => {
            const requisition = await tx.purchaseRequisition.findFirst({
                where: { id: requisitionId, tenantId, branchId, deletedAt: null },
                include: { items: { where: { deletedAt: null } } },
            });

            if (!requisition) {
                throw new Error('Requisition not found');
            }
            if (requisition.status !== 'APPROVED' && requisition.status !== 'PARTIALLY_APPROVED') {
                throw new Error('Only APPROVED or PARTIALLY_APPROVED requisitions can generate a PO');
            }

            // Build PO items from approved requisition items
            const poItems = requisition.items
                .filter((item) => (item.approvedQuantity ?? 0) > 0)
                .map((item) => {
                    const priceEntry = itemPrices.find((p) => p.variantId === item.variantId);
                    if (!priceEntry) {
                        throw new Error(`Unit price required for variant ${item.variantId}`);
                    }
                    const qty = item.approvedQuantity ?? item.requestedQuantity;
                    return {
                        id: uuidv4(),
                        tenantId,
                        branchId,
                        variantId: item.variantId,
                        orderedQuantity: qty,
                        unitPrice: priceEntry.unitPrice,
                        totalPrice: qty * priceEntry.unitPrice,
                    };
                });

            if (poItems.length === 0) {
                throw new Error('No approved items found on the requisition');
            }

            const poNumber = await this.generatePONumber(tenantId, branchId, tx);

            const purchaseOrder = await tx.purchaseOrder.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    branchId,
                    supplierId,
                    requisitionId,
                    poNumber,
                    status: 'DRAFT',
                    expectedDeliveryDate: options?.expectedDeliveryDate
                        ? new Date(options.expectedDeliveryDate)
                        : undefined,
                    notes: options?.notes,
                    createdBy,
                    items: { create: poItems },
                },
                include: PO_INCLUDE,
            });

            return this.mapPurchaseOrder(purchaseOrder);
        });
    }

    /**
     * Update a DRAFT purchase order (supplier, dates, notes, items).
     * Replaces all items when items array is provided.
     */
    static async updatePurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string,
        data: UpdatePurchaseOrderInput
    ): Promise<PurchaseOrderWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseOrder.findFirst({
                where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Purchase order not found');
            }
            if (existing.status !== 'DRAFT') {
                throw new Error('Only DRAFT purchase orders can be updated');
            }

            // Replace items if provided
            if (data.items) {
                await tx.purchaseOrderItem.updateMany({
                    where: { purchaseOrderId, tenantId },
                    data: { deletedAt: new Date() },
                });

                for (const item of data.items) {
                    await tx.purchaseOrderItem.create({
                        data: {
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            purchaseOrderId,
                            variantId: item.variantId,
                            orderedQuantity: item.orderedQuantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.orderedQuantity * item.unitPrice,
                            notes: item.notes,
                        },
                    });
                }
            }

            const updated = await tx.purchaseOrder.update({
                where: { id: purchaseOrderId },
                data: {
                    ...(data.supplierId && { supplierId: data.supplierId }),
                    ...(data.expectedDeliveryDate !== undefined && {
                        expectedDeliveryDate: data.expectedDeliveryDate
                            ? new Date(data.expectedDeliveryDate)
                            : null,
                    }),
                    ...(data.notes !== undefined && { notes: data.notes }),
                    version: { increment: 1 },
                },
                include: PO_INCLUDE,
            });

            return this.mapPurchaseOrder(updated);
        });
    }

    /**
     * Send a DRAFT PO to the supplier (DRAFT → SENT).
     * No stock impact — just a status transition.
     */
    static async sendPurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<PurchaseOrderWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseOrder.findFirst({
                where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Purchase order not found');
            }
            if (existing.status !== 'DRAFT') {
                throw new Error('Only DRAFT purchase orders can be sent');
            }

            const updated = await tx.purchaseOrder.update({
                where: { id: purchaseOrderId },
                data: {
                    status: 'SENT',
                    version: { increment: 1 },
                },
                include: PO_INCLUDE,
            });

            return this.mapPurchaseOrder(updated);
        });
    }

    /**
     * Receive a purchase order (Step 3: "Receive 95 good, 5 damaged").
     * Only SENT or PARTIALLY_RECEIVED POs can be received.
     * Updates inventory and creates stock movements.
     */
    static async receivePurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string,
        data: ReceivePurchaseOrderInput
    ): Promise<PurchaseOrderWithItems> {
        await GoodsReceiptService.quickReceive(purchaseOrderId, tenantId, branchId, data.receivedBy, data.items);

        const updated = await this.getPurchaseOrderById(purchaseOrderId, tenantId, branchId);
        if (!updated) throw new Error('Purchase order not found after receiving');
        return updated;
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
            where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
            include: PO_INCLUDE,
        });

        if (!po) return null;

        return this.mapPurchaseOrder(po);
    }

    /**
     * List purchase orders with filtering and pagination.
     */
    static async listPurchaseOrders(
        tenantId: string,
        branchId: string,
        options?: {
            status?: PurchaseOrderStatus;
            supplierId?: string;
            requisitionId?: string;
            dateFrom?: Date;
            dateTo?: Date;
            page?: number;
            limit?: number;
        }
    ): Promise<{ orders: PurchaseOrderWithItems[]; total: number; totalPages: number }> {
        const page = Number(options?.page) || 1;
        const limit = Number(options?.limit) || 50;
        const skip = (page - 1) * limit;

        const dateFrom = options?.dateFrom;
        const dateTo = options?.dateTo;
        // Treat dateTo as inclusive of the whole day when it carries no time component.
        const dateToInclusive = dateTo
            ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999)
            : undefined;

        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.supplierId && { supplierId: options.supplierId }),
            ...(options?.requisitionId && { requisitionId: options.requisitionId }),
            ...((dateFrom || dateToInclusive) && {
                orderDate: {
                    ...(dateFrom && { gte: dateFrom }),
                    ...(dateToInclusive && { lte: dateToInclusive }),
                },
            }),
        };

        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                include: PO_INCLUDE,
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
     * Cancel a purchase order (only DRAFT or SENT).
     */
    static async cancelPurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
        });

        if (!po) {
            throw new Error('Purchase order not found');
        }

        if (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED' || po.isLocked) {
            throw new Error('Cannot cancel a received or locked purchase order');
        }

        if (po.status === 'CANCELLED') {
            throw new Error('Purchase order is already cancelled');
        }

        await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: {
                status: 'CANCELLED',
                isLocked: true,
                version: { increment: 1 },
            },
        });
    }

    /**
     * Soft-delete a purchase order and its items.
     * Only DRAFT or CANCELLED POs can be deleted.
     */
    static async deletePurchaseOrder(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseOrder.findFirst({
                where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Purchase order not found');
            }

            if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
                throw new Error('Only DRAFT or CANCELLED purchase orders can be deleted');
            }

            const now = new Date();

            await tx.purchaseOrderItem.updateMany({
                where: { purchaseOrderId, tenantId, deletedAt: null },
                data: { deletedAt: now },
            });

            await tx.purchaseOrder.update({
                where: { id: purchaseOrderId },
                data: { deletedAt: now },
            });
        });
    }

    /**
     * Generate PO number
     */
    private static async generatePONumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');

        const prefix = `PO-${year}${month}`;

        // poNumber is only unique per tenant (unique_tenant_po_number), not per branch, so the
        // sequence must be counted across the whole tenant — branch-scoping this lookup causes
        // every branch to independently generate "PO-YYYYMM-0001" first, colliding with each
        // other under that tenant-wide constraint.
        const lastPO = await db.purchaseOrder.findFirst({
            where: {
                tenantId,
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
     * Helper: Map purchase order from Prisma result to typed interface.
     */
    private static mapPurchaseOrder(po: any): PurchaseOrderWithItems {
        return {
            id: po.id,
            purchaseOrderId: po.id,
            tenantId: po.tenantId,
            branchId: po.branchId,
            supplierId: po.supplierId,
            requisitionId: po.requisitionId,
            poNumber: po.poNumber,
            status: po.status,
            orderDate: po.orderDate,
            expectedDeliveryDate: po.expectedDeliveryDate,
            receivedAt: po.receivedAt,
            notes: po.notes,
            createdBy: po.createdBy,
            receivedBy: po.receivedBy,
            isLocked: po.isLocked,
            version: po.version,
            deletedAt: po.deletedAt,
            createdAt: po.createdAt,
            updatedAt: po.updatedAt,
            items: (po.items || []).map((item: any) => ({
                id: item.id,
                purchaseOrderId: item.purchaseOrderId,
                tenantId: item.tenantId,
                branchId: item.branchId,
                variantId: item.variantId,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.receivedQuantity,
                damagedQuantity: item.damagedQuantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                notes: item.notes,
                version: item.version,
                deletedAt: item.deletedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                variant: item.variant,
            })),
            supplier: po.supplier,
            requisition: po.requisition,
        };
    }
}
