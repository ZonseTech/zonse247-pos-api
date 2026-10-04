import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CreateGoodsReceiptInput,
    UpdateGoodsReceiptInput,
    GoodsReceiptWithItems,
} from '../../models/goods-receipt.model';
import { StockMovementService } from './stock-movement.service';

type GRNStatus = 'DRAFT' | 'VERIFIED' | 'POSTED' | 'CANCELLED';

// ─── Shared Includes ───────────────────────────────────────────────

const VARIANT_SELECT = {
    id: true,
    variantName: true,
    sku: true,
    product: { select: { id: true, name: true } },
};

const PO_ITEM_SELECT = {
    id: true,
    orderedQuantity: true,
    receivedQuantity: true,
    damagedQuantity: true,
};

const USER_SELECT = { userId: true, fullname: true };

const GRN_INCLUDE = {
    items: {
        where: { deletedAt: null },
        include: {
            variant: { select: VARIANT_SELECT },
            purchaseOrderItem: { select: PO_ITEM_SELECT },
        },
    },
    purchaseOrder: {
        select: {
            id: true,
            poNumber: true,
            supplierId: true,
            supplier: { select: { id: true, name: true } },
        },
    },
    receivedByUser: { select: USER_SELECT },
};

// ─── Service ───────────────────────────────────────────────────────

export class GoodsReceiptService {
    /**
     * Create a Goods Receipt Note in DRAFT status against a PO.
     * Multiple GRNs per PO allowed (partial deliveries).
     * No stock impact at this stage.
     */
    static async createGoodsReceipt(
        data: CreateGoodsReceiptInput,
        tenantId: string,
        branchId: string,
        receivedBy: string
    ): Promise<GoodsReceiptWithItems> {
        return await prisma.$transaction((tx) => this._createStep(tx, data, tenantId, branchId, receivedBy));
    }

    private static async _createStep(
        tx: any,
        data: CreateGoodsReceiptInput,
        tenantId: string,
        branchId: string,
        receivedBy: string
    ): Promise<GoodsReceiptWithItems> {
        {
            // Validate the PO exists and is in a receivable state
            const po = await tx.purchaseOrder.findFirst({
                where: { id: data.purchaseOrderId, tenantId, branchId, deletedAt: null },
                include: { items: { where: { deletedAt: null } } },
            });

            if (!po) {
                throw new Error('Purchase order not found');
            }
            if (po.status === 'DRAFT') {
                throw new Error('Cannot create GRN for a DRAFT purchase order — send it first');
            }
            if (po.status === 'CANCELLED') {
                throw new Error('Cannot create GRN for a cancelled purchase order');
            }
            if (po.isLocked) {
                throw new Error('Purchase order is locked — all items already received');
            }

            // Validate each item against the PO
            for (const item of data.items) {
                const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
                if (!poItem) {
                    throw new Error(`PO item ${item.purchaseOrderItemId} not found on this purchase order`);
                }
                if (poItem.variantId !== item.variantId) {
                    throw new Error(`Variant mismatch for PO item ${item.purchaseOrderItemId}`);
                }

                // Check over-receipt: total received across all GRNs must not exceed ordered qty
                const previouslyReceived = await tx.goodsReceiptItem.aggregate({
                    where: {
                        purchaseOrderItemId: item.purchaseOrderItemId,
                        deletedAt: null,
                        goodsReceipt: {
                            status: { not: 'CANCELLED' },
                            deletedAt: null,
                        },
                    },
                    _sum: { receivedQuantity: true },
                });

                const alreadyReceived = previouslyReceived._sum.receivedQuantity || 0;
                const totalAfterThis = alreadyReceived + item.receivedQuantity;

                if (totalAfterThis > poItem.orderedQuantity) {
                    throw new Error(
                        `Over-receipt not allowed for PO item ${item.purchaseOrderItemId}. ` +
                        `Ordered: ${poItem.orderedQuantity}, Already received: ${alreadyReceived}, ` +
                        `Attempting: ${item.receivedQuantity}`
                    );
                }
            }

            const receiptNumber = await this.generateReceiptNumber(tenantId, branchId, tx);

            const grn = await tx.goodsReceipt.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    branchId,
                    purchaseOrderId: data.purchaseOrderId,
                    receiptNumber,
                    status: 'DRAFT',
                    receivedBy,
                    notes: data.notes,
                    items: {
                        create: data.items.map((item) => ({
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            purchaseOrderItemId: item.purchaseOrderItemId,
                            variantId: item.variantId,
                            receivedQuantity: item.receivedQuantity,
                            rejectedQuantity: item.rejectedQuantity || 0,
                            rejectionReason: item.rejectionReason,
                            unitCost: item.unitCost,
                            totalCost: item.receivedQuantity * item.unitCost,
                            notes: item.notes,
                        })),
                    },
                },
                include: GRN_INCLUDE,
            });

            return this.mapGoodsReceipt(grn);
        }
    }

    /**
     * Update a DRAFT GRN (notes and/or items).
     * Replaces all items when items array is provided.
     */
    static async updateGoodsReceipt(
        goodsReceiptId: string,
        tenantId: string,
        branchId: string,
        data: UpdateGoodsReceiptInput
    ): Promise<GoodsReceiptWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.goodsReceipt.findFirst({
                where: { id: goodsReceiptId, tenantId, branchId, deletedAt: null },
                include: { purchaseOrder: { include: { items: { where: { deletedAt: null } } } } },
            });

            if (!existing) {
                throw new Error('Goods receipt not found');
            }
            if (existing.status !== 'DRAFT') {
                throw new Error('Only DRAFT goods receipts can be updated');
            }

            // Replace items if provided
            if (data.items) {
                const po = existing.purchaseOrder;

                // Validate items against PO
                for (const item of data.items) {
                    const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
                    if (!poItem) {
                        throw new Error(`PO item ${item.purchaseOrderItemId} not found`);
                    }
                    if (poItem.variantId !== item.variantId) {
                        throw new Error(`Variant mismatch for PO item ${item.purchaseOrderItemId}`);
                    }

                    // Over-receipt check (excluding current GRN's items)
                    const previouslyReceived = await tx.goodsReceiptItem.aggregate({
                        where: {
                            purchaseOrderItemId: item.purchaseOrderItemId,
                            goodsReceiptId: { not: goodsReceiptId },
                            deletedAt: null,
                            goodsReceipt: {
                                status: { not: 'CANCELLED' },
                                deletedAt: null,
                            },
                        },
                        _sum: { receivedQuantity: true },
                    });

                    const alreadyReceived = previouslyReceived._sum.receivedQuantity || 0;
                    if (alreadyReceived + item.receivedQuantity > poItem.orderedQuantity) {
                        throw new Error(
                            `Over-receipt not allowed for PO item ${item.purchaseOrderItemId}. ` +
                            `Ordered: ${poItem.orderedQuantity}, Other GRNs received: ${alreadyReceived}, ` +
                            `Attempting: ${item.receivedQuantity}`
                        );
                    }
                }

                // Soft-delete old items, create new ones
                await tx.goodsReceiptItem.updateMany({
                    where: { goodsReceiptId, tenantId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });

                for (const item of data.items) {
                    await tx.goodsReceiptItem.create({
                        data: {
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            goodsReceiptId,
                            purchaseOrderItemId: item.purchaseOrderItemId,
                            variantId: item.variantId,
                            receivedQuantity: item.receivedQuantity,
                            rejectedQuantity: item.rejectedQuantity || 0,
                            rejectionReason: item.rejectionReason,
                            unitCost: item.unitCost,
                            totalCost: item.receivedQuantity * item.unitCost,
                            notes: item.notes,
                        },
                    });
                }
            }

            const updated = await tx.goodsReceipt.update({
                where: { id: goodsReceiptId },
                data: {
                    ...(data.notes !== undefined && { notes: data.notes }),
                    version: { increment: 1 },
                },
                include: GRN_INCLUDE,
            });

            return this.mapGoodsReceipt(updated);
        });
    }

    /**
     * Verify a DRAFT GRN (DRAFT → VERIFIED).
     * Confirms the quantities are correct. No stock impact yet.
     */
    static async verifyGoodsReceipt(
        goodsReceiptId: string,
        tenantId: string,
        branchId: string,
        notes?: string
    ): Promise<GoodsReceiptWithItems> {
        return await prisma.$transaction((tx) => this._verifyStep(tx, goodsReceiptId, tenantId, branchId, notes));
    }

    private static async _verifyStep(
        tx: any,
        goodsReceiptId: string,
        tenantId: string,
        branchId: string,
        notes?: string
    ): Promise<GoodsReceiptWithItems> {
        {
            const existing = await tx.goodsReceipt.findFirst({
                where: { id: goodsReceiptId, tenantId, branchId, deletedAt: null },
                include: { items: { where: { deletedAt: null } } },
            });

            if (!existing) {
                throw new Error('Goods receipt not found');
            }
            if (existing.status !== 'DRAFT') {
                throw new Error('Only DRAFT goods receipts can be verified');
            }
            if (existing.items.length === 0) {
                throw new Error('Cannot verify a goods receipt with no items');
            }

            const updated = await tx.goodsReceipt.update({
                where: { id: goodsReceiptId },
                data: {
                    status: 'VERIFIED',
                    ...(notes !== undefined && { notes }),
                    version: { increment: 1 },
                },
                include: GRN_INCLUDE,
            });

            return this.mapGoodsReceipt(updated);
        }
    }

    /**
     * Post a VERIFIED GRN (VERIFIED → POSTED).
     * THIS is where stock is actually updated:
     *   - Creates StockMovement (PURCHASE_RECEIPT, referenceType=GOODS_RECEIPT)
     *   - Updates Inventory (available_quantity, average_cost, last_purchase_cost)
     *   - Optionally updates PO item received/damaged summaries
     *   - May transition the PO to PARTIALLY_RECEIVED or RECEIVED
     * All in one transaction.
     */
    static async postGoodsReceipt(
        goodsReceiptId: string,
        tenantId: string,
        branchId: string,
        postedBy: string,
        notes?: string
    ): Promise<GoodsReceiptWithItems> {
        return await prisma.$transaction((tx) => this._postStep(tx, goodsReceiptId, tenantId, branchId, postedBy, notes));
    }

    private static async _postStep(
        tx: any,
        goodsReceiptId: string,
        tenantId: string,
        branchId: string,
        postedBy: string,
        notes?: string
    ): Promise<GoodsReceiptWithItems> {
        {
            const grn = await tx.goodsReceipt.findFirst({
                where: { id: goodsReceiptId, tenantId, branchId, deletedAt: null },
                include: {
                    items: { where: { deletedAt: null } },
                    purchaseOrder: { include: { items: { where: { deletedAt: null } } } },
                },
            });

            if (!grn) {
                throw new Error('Goods receipt not found');
            }
            if (grn.status !== 'VERIFIED') {
                throw new Error('Only VERIFIED goods receipts can be posted');
            }

            // ── 1. Process each GRN item: stock movement + inventory ──

            for (const grnItem of grn.items) {
                // receivedQuantity (good) and rejectedQuantity (damaged) are separate counts:
                // both units were physically delivered.
                const deliveredQuantity = grnItem.receivedQuantity + (grnItem.rejectedQuantity || 0);
                if (deliveredQuantity <= 0) continue;

                // Find or create inventory record for this variant
                let inventory = await tx.inventory.findFirst({
                    where: { tenantId, branchId, variantId: grnItem.variantId, deletedAt: null },
                });

                if (!inventory) {
                    // Resolve productId from variant
                    const variant = await tx.productVariant.findFirst({
                        where: { id: grnItem.variantId, deletedAt: null },
                        select: { productId: true },
                    });

                    inventory = await tx.inventory.create({
                        data: {
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            variantId: grnItem.variantId,
                            productId: variant?.productId || grnItem.variantId,
                            availableQuantity: 0,
                            reservedQuantity: 0,
                            damagedQuantity: 0,
                            averageCost: 0,
                            lastPurchaseCost: 0,
                        },
                    });
                }

                const unitCost = Number(grnItem.unitCost);

                // Record PURCHASE_RECEIPT for everything delivered (good + damaged) with GOODS_RECEIPT reference
                await StockMovementService.recordMovement(
                    {
                        tenantId,
                        branchId,
                        inventoryId: inventory.id,
                        movementType: 'PURCHASE_RECEIPT',
                        quantity: deliveredQuantity,
                        referenceType: 'GOODS_RECEIPT' as any,
                        referenceId: goodsReceiptId,
                        unitCost,
                        notes: `GRN ${grn.receiptNumber} — delivered ${deliveredQuantity} units` +
                            (grnItem.rejectedQuantity > 0
                                ? ` (${grnItem.receivedQuantity} good, ${grnItem.rejectedQuantity} damaged)`
                                : ''),
                        movedBy: postedBy,
                    },
                    tx
                );

                // Write off the damaged units just brought in, so available stock nets to receivedQuantity
                if (grnItem.rejectedQuantity > 0) {
                    await StockMovementService.recordDamage(
                        {
                            tenantId,
                            branchId,
                            inventoryId: inventory.id,
                            quantity: grnItem.rejectedQuantity,
                            unitCost,
                            referenceId: goodsReceiptId,
                            notes: `GRN ${grn.receiptNumber} — rejected ${grnItem.rejectedQuantity} units` +
                                (grnItem.rejectionReason ? `: ${grnItem.rejectionReason}` : ''),
                            movedBy: postedBy,
                        },
                        tx
                    );
                }
            }

            // ── 2. Update PO item summaries (received_quantity, damaged_quantity) ──

            for (const grnItem of grn.items) {
                const poItem = grn.purchaseOrder.items.find(
                    (i) => i.id === grnItem.purchaseOrderItemId
                );
                if (!poItem) continue;

                // Aggregate all POSTED GRN items for this PO item
                const aggregated = await tx.goodsReceiptItem.aggregate({
                    where: {
                        purchaseOrderItemId: poItem.id,
                        deletedAt: null,
                        goodsReceipt: {
                            // Include this GRN which is about to be POSTED
                            OR: [
                                { status: 'POSTED', deletedAt: null },
                                { id: goodsReceiptId },
                            ],
                        },
                    },
                    _sum: {
                        receivedQuantity: true,
                        rejectedQuantity: true,
                    },
                });

                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: {
                        receivedQuantity: aggregated._sum.receivedQuantity || 0,
                        damagedQuantity: aggregated._sum.rejectedQuantity || 0,
                        version: { increment: 1 },
                    },
                });
            }

            // ── 3. Determine PO status ──

            const poId = grn.purchaseOrderId;

            // Re-read PO items after updates above
            const updatedPoItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: poId, deletedAt: null },
            });

            const allFullyReceived = updatedPoItems.every(
                (item) => item.receivedQuantity + item.damagedQuantity >= item.orderedQuantity
            );
            const anyReceived = updatedPoItems.some(
                (item) => item.receivedQuantity > 0 || item.damagedQuantity > 0
            );

            let poStatus: string;
            if (allFullyReceived) {
                poStatus = 'RECEIVED';
            } else if (anyReceived) {
                poStatus = 'PARTIALLY_RECEIVED';
            } else {
                poStatus = grn.purchaseOrder.status; // Unchanged
            }

            await tx.purchaseOrder.update({
                where: { id: poId },
                data: {
                    status: poStatus,
                    ...(allFullyReceived && {
                        isLocked: true,
                        receivedAt: new Date(),
                        receivedBy: postedBy,
                    }),
                    version: { increment: 1 },
                },
            });

            // ── 4. Mark GRN as POSTED ──

            const posted = await tx.goodsReceipt.update({
                where: { id: goodsReceiptId },
                data: {
                    status: 'POSTED',
                    ...(notes !== undefined && { notes }),
                    version: { increment: 1 },
                },
                include: GRN_INCLUDE,
            });

            return this.mapGoodsReceipt(posted);
        }
    }

    /**
     * "Quick Receive" a purchase order: creates a GRN and immediately verifies
     * and posts it, all in a single atomic transaction. This is the entry
     * point used by PurchaseOrderService.receivePurchaseOrder so that the
     * one-click "Quick Receive" flow on a PO shares the exact same GRN
     * create/verify/post pipeline (receipt numbering, over-receipt
     * protection, aggregated received-quantity tracking) instead of
     * duplicating inventory-update logic.
     */
    static async quickReceive(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string,
        userId: string,
        items: { variantId: string; receivedQuantity: number; damagedQuantity: number }[]
    ): Promise<GoodsReceiptWithItems> {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findFirst({
                where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
                include: { items: { where: { deletedAt: null } } },
            });

            if (!po) {
                throw new Error('Purchase order not found');
            }

            const grnItems = items.map((item) => {
                const poItem = po.items.find((i: any) => i.variantId === item.variantId);
                if (!poItem) {
                    throw new Error(`Variant ${item.variantId} not found in purchase order`);
                }
                return {
                    purchaseOrderItemId: poItem.id,
                    variantId: item.variantId,
                    receivedQuantity: item.receivedQuantity,
                    rejectedQuantity: item.damagedQuantity,
                    rejectionReason: item.damagedQuantity > 0 ? 'Damaged (Quick Receive)' : undefined,
                    unitCost: Number(poItem.unitPrice),
                };
            });

            const grn = await this._createStep(
                tx,
                { purchaseOrderId, items: grnItems },
                tenantId,
                branchId,
                userId
            );
            await this._verifyStep(tx, grn.id, tenantId, branchId);
            return this._postStep(tx, grn.id, tenantId, branchId, userId);
        });
    }

    /**
     * Cancel a GRN (DRAFT or VERIFIED only — never POSTED).
     */
    static async cancelGoodsReceipt(
        goodsReceiptId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.goodsReceipt.findFirst({
                where: { id: goodsReceiptId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Goods receipt not found');
            }
            if (existing.status === 'POSTED') {
                throw new Error('Cannot cancel a POSTED goods receipt — use a reversal instead');
            }
            if (existing.status === 'CANCELLED') {
                throw new Error('Goods receipt is already cancelled');
            }

            await tx.goodsReceipt.update({
                where: { id: goodsReceiptId },
                data: {
                    status: 'CANCELLED',
                    version: { increment: 1 },
                },
            });
        });
    }

    /**
     * Get a single GRN by ID.
     */
    static async getGoodsReceiptById(
        goodsReceiptId: string,
        tenantId: string,
        branchId: string
    ): Promise<GoodsReceiptWithItems | null> {
        const grn = await prisma.goodsReceipt.findFirst({
            where: { id: goodsReceiptId, tenantId, branchId, deletedAt: null },
            include: GRN_INCLUDE,
        });

        if (!grn) return null;
        return this.mapGoodsReceipt(grn);
    }

    /**
     * List GRNs with filtering and pagination.
     */
    static async listGoodsReceipts(
        tenantId: string,
        branchId: string,
        options?: {
            status?: GRNStatus;
            purchaseOrderId?: string;
            search?: string;
            dateFrom?: Date;
            dateTo?: Date;
            page?: number;
            limit?: number;
        }
    ): Promise<{ receipts: GoodsReceiptWithItems[]; total: number; totalPages: number }> {
        const page = Number(options?.page) || 1;
        const limit = Number(options?.limit) || 50;
        const skip = (page - 1) * limit;

        const dateFrom = options?.dateFrom;
        const dateTo = options?.dateTo;
        // Treat dateTo as inclusive of the whole day when it carries no time component.
        const dateToInclusive = dateTo
            ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999)
            : undefined;

        const search = options?.search?.trim();

        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.purchaseOrderId && { purchaseOrderId: options.purchaseOrderId }),
            ...((dateFrom || dateToInclusive) && {
                receivedAt: {
                    ...(dateFrom && { gte: dateFrom }),
                    ...(dateToInclusive && { lte: dateToInclusive }),
                },
            }),
            ...(search && {
                OR: [
                    { receiptNumber: { contains: search } },
                    { purchaseOrder: { poNumber: { contains: search } } },
                    { purchaseOrder: { supplier: { name: { contains: search } } } },
                ],
            }),
        };

        const [receipts, total] = await Promise.all([
            prisma.goodsReceipt.findMany({
                where,
                include: GRN_INCLUDE,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.goodsReceipt.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            receipts: receipts.map((r) => this.mapGoodsReceipt(r)),
            total,
            totalPages,
        };
    }

    /**
     * Soft-delete a GRN and its items (DRAFT or CANCELLED only).
     */
    static async deleteGoodsReceipt(
        goodsReceiptId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.goodsReceipt.findFirst({
                where: { id: goodsReceiptId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Goods receipt not found');
            }
            if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
                throw new Error('Only DRAFT or CANCELLED goods receipts can be deleted');
            }

            const now = new Date();

            await tx.goodsReceiptItem.updateMany({
                where: { goodsReceiptId, tenantId, deletedAt: null },
                data: { deletedAt: now },
            });

            await tx.goodsReceipt.update({
                where: { id: goodsReceiptId },
                data: { deletedAt: now },
            });
        });
    }

    // ─── Private Helpers ───────────────────────────────────────────

    /**
     * Generate sequential GRN number: GRN-YYYYMM-0001
     */
    private static async generateReceiptNumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `GRN-${year}${month}`;

        const last = await db.goodsReceipt.findFirst({
            where: {
                tenantId,
                branchId,
                receiptNumber: { startsWith: prefix },
            },
            orderBy: { receiptNumber: 'desc' },
        });

        let sequence = 1;
        if (last) {
            const lastSeq = parseInt(last.receiptNumber.split('-').pop() || '0');
            sequence = lastSeq + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    /**
     * Map Prisma result to typed interface.
     */
    private static mapGoodsReceipt(grn: any): GoodsReceiptWithItems {
        return {
            id: grn.id,
            tenantId: grn.tenantId,
            branchId: grn.branchId,
            purchaseOrderId: grn.purchaseOrderId,
            receiptNumber: grn.receiptNumber,
            status: grn.status,
            receivedAt: grn.receivedAt,
            receivedBy: grn.receivedBy,
            notes: grn.notes,
            version: grn.version,
            deletedAt: grn.deletedAt,
            createdAt: grn.createdAt,
            updatedAt: grn.updatedAt,
            items: (grn.items || []).map((item: any) => ({
                id: item.id,
                goodsReceiptId: item.goodsReceiptId,
                purchaseOrderItemId: item.purchaseOrderItemId,
                variantId: item.variantId,
                tenantId: item.tenantId,
                branchId: item.branchId,
                receivedQuantity: item.receivedQuantity,
                rejectedQuantity: item.rejectedQuantity,
                rejectionReason: item.rejectionReason,
                unitCost: Number(item.unitCost),
                totalCost: Number(item.totalCost),
                notes: item.notes,
                version: item.version,
                deletedAt: item.deletedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                variant: item.variant,
                purchaseOrderItem: item.purchaseOrderItem,
            })),
            purchaseOrder: grn.purchaseOrder,
            receivedByUser: grn.receivedByUser,
        };
    }
}
