import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CreateSupplierReturnInput,
    UpdateSupplierReturnInput,
    SupplierReturnWithItems,
    SupplierCreditNote,
    ApplySupplierCreditNoteInput,
} from '../../models/supplier-return.model';
import { StockMovementService } from './stock-movement.service';

type SupplierReturnStatus = 'DRAFT' | 'APPROVED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
type CreditNoteStatus = 'PENDING' | 'APPLIED' | 'CANCELLED';

// ─── Shared Includes ───────────────────────────────────────────────

const VARIANT_SELECT = {
    id: true,
    variantName: true,
    sku: true,
    product: { select: { id: true, name: true } },
};

const RETURN_INCLUDE = {
    items: {
        where: { deletedAt: null },
        include: {
            variant: { select: VARIANT_SELECT },
        },
    },
    supplier: { select: { id: true, name: true } },
    purchaseOrder: { select: { id: true, poNumber: true } },
    goodsReceipt: { select: { id: true, receiptNumber: true } },
    returnedByUser: { select: { userId: true, fullname: true } },
    creditNotes: { where: { deletedAt: null } },
};

// ─── Service ───────────────────────────────────────────────────────

export class SupplierReturnService {
    /**
     * Create a supplier return in DRAFT status.
     * Items carry the original purchase cost from the GRN for proper inventory valuation.
     */
    static async createSupplierReturn(
        data: CreateSupplierReturnInput,
        tenantId: string,
        branchId: string,
        returnedBy: string
    ): Promise<SupplierReturnWithItems> {
        return await prisma.$transaction(async (tx) => {
            // Validate supplier exists
            const supplier = await tx.supplier.findFirst({
                where: { id: data.supplierId, tenantId, deletedAt: null },
            });
            if (!supplier) {
                throw new Error('Supplier not found');
            }

            // If linked to a PO, validate it
            if (data.purchaseOrderId) {
                const po = await tx.purchaseOrder.findFirst({
                    where: { id: data.purchaseOrderId, tenantId, branchId, deletedAt: null },
                });
                if (!po) {
                    throw new Error('Purchase order not found');
                }
                if (po.supplierId !== data.supplierId) {
                    throw new Error('Purchase order belongs to a different supplier');
                }
            }

            // If linked to a GRN, validate it is POSTED
            if (data.goodsReceiptId) {
                const grn = await tx.goodsReceipt.findFirst({
                    where: { id: data.goodsReceiptId, tenantId, branchId, deletedAt: null },
                });
                if (!grn) {
                    throw new Error('Goods receipt not found');
                }
                if (grn.status !== 'POSTED') {
                    throw new Error('Only POSTED goods receipts can be returned');
                }
            }

            // Validate each item — ensure unit cost is from the GRN
            for (const item of data.items) {
                if (item.goodsReceiptItemId) {
                    const grnItem = await tx.goodsReceiptItem.findFirst({
                        where: { id: item.goodsReceiptItemId, deletedAt: null },
                    });
                    if (!grnItem) {
                        throw new Error(`Goods receipt item ${item.goodsReceiptItemId} not found`);
                    }
                    if (item.returnQuantity > grnItem.receivedQuantity) {
                        throw new Error(
                            `Return quantity (${item.returnQuantity}) exceeds received quantity (${grnItem.receivedQuantity}) for GRN item`
                        );
                    }
                }

                // Validate variant exists
                const variant = await tx.productVariant.findFirst({
                    where: { id: item.variantId, deletedAt: null },
                });
                if (!variant) {
                    throw new Error(`Product variant ${item.variantId} not found`);
                }
            }

            const returnNumber = await this.generateReturnNumber(tenantId, branchId, tx);

            // Calculate total
            const totalAmount = data.items.reduce(
                (sum, item) => sum + item.returnQuantity * item.unitCost,
                0
            );

            // Create the return header
            const supplierReturnId = uuidv4();
            await tx.supplierReturn.create({
                data: {
                    id: supplierReturnId,
                    tenantId,
                    branchId,
                    supplierId: data.supplierId,
                    purchaseOrderId: data.purchaseOrderId || null,
                    goodsReceiptId: data.goodsReceiptId || null,
                    returnNumber,
                    status: 'DRAFT',
                    returnDate: new Date(),
                    returnedBy,
                    reason: data.reason || null,
                    notes: data.notes || null,
                    totalAmount,
                },
            });

            // Create return items
            for (const item of data.items) {
                await tx.supplierReturnItem.create({
                    data: {
                        id: uuidv4(),
                        supplierReturnId,
                        goodsReceiptItemId: item.goodsReceiptItemId || null,
                        variantId: item.variantId,
                        tenantId,
                        branchId,
                        returnQuantity: item.returnQuantity,
                        unitCost: item.unitCost,
                        totalCost: item.returnQuantity * item.unitCost,
                        reason: item.reason || null,
                        notes: item.notes || null,
                    },
                });
            }

            const result = await tx.supplierReturn.findUnique({
                where: { id: supplierReturnId },
                include: RETURN_INCLUDE,
            });

            return this.mapSupplierReturn(result);
        });
    }

    /**
     * Update a DRAFT supplier return (items and metadata only).
     */
    static async updateSupplierReturn(
        supplierReturnId: string,
        tenantId: string,
        branchId: string,
        data: UpdateSupplierReturnInput
    ): Promise<SupplierReturnWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.supplierReturn.findFirst({
                where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
            });
            if (!existing) {
                throw new Error('Supplier return not found');
            }
            if (existing.status !== 'DRAFT') {
                throw new Error('Only DRAFT supplier returns can be updated');
            }

            // Update items if provided
            if (data.items) {
                // Soft-delete old items
                await tx.supplierReturnItem.updateMany({
                    where: { supplierReturnId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });

                // Recreate items
                for (const item of data.items) {
                    await tx.supplierReturnItem.create({
                        data: {
                            id: uuidv4(),
                            supplierReturnId,
                            goodsReceiptItemId: item.goodsReceiptItemId || null,
                            variantId: item.variantId,
                            tenantId,
                            branchId,
                            returnQuantity: item.returnQuantity,
                            unitCost: item.unitCost,
                            totalCost: item.returnQuantity * item.unitCost,
                            reason: item.reason || null,
                            notes: item.notes || null,
                        },
                    });
                }
            }

            // Calculate new total
            const activeItems = await tx.supplierReturnItem.findMany({
                where: { supplierReturnId, deletedAt: null },
            });
            const totalAmount = activeItems.reduce(
                (sum: number, item: any) => sum + Number(item.unitCost) * item.returnQuantity,
                0
            );

            await tx.supplierReturn.update({
                where: { id: supplierReturnId },
                data: {
                    reason: data.reason !== undefined ? data.reason : undefined,
                    notes: data.notes !== undefined ? data.notes : undefined,
                    totalAmount,
                    version: { increment: 1 },
                },
            });

            const result = await tx.supplierReturn.findUnique({
                where: { id: supplierReturnId },
                include: RETURN_INCLUDE,
            });
            return this.mapSupplierReturn(result);
        });
    }

    /**
     * Approve a DRAFT supplier return (DRAFT → APPROVED).
     * No stock impact yet — goods haven't left the warehouse.
     */
    static async approveSupplierReturn(
        supplierReturnId: string,
        tenantId: string,
        branchId: string,
        notes?: string
    ): Promise<SupplierReturnWithItems> {
        return await prisma.$transaction(async (tx) => {
            const sr = await tx.supplierReturn.findFirst({
                where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
            });
            if (!sr) {
                throw new Error('Supplier return not found');
            }
            if (sr.status !== 'DRAFT') {
                throw new Error('Only DRAFT supplier returns can be approved');
            }

            await tx.supplierReturn.update({
                where: { id: supplierReturnId },
                data: {
                    status: 'APPROVED',
                    notes: notes || sr.notes,
                    version: { increment: 1 },
                },
            });

            const result = await tx.supplierReturn.findUnique({
                where: { id: supplierReturnId },
                include: RETURN_INCLUDE,
            });
            return this.mapSupplierReturn(result);
        });
    }

    /**
     * Ship an APPROVED supplier return (APPROVED → SHIPPED).
     * No stock impact — goods are in transit.
     */
    static async shipSupplierReturn(
        supplierReturnId: string,
        tenantId: string,
        branchId: string,
        notes?: string
    ): Promise<SupplierReturnWithItems> {
        return await prisma.$transaction(async (tx) => {
            const sr = await tx.supplierReturn.findFirst({
                where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
            });
            if (!sr) {
                throw new Error('Supplier return not found');
            }
            if (sr.status !== 'APPROVED') {
                throw new Error('Only APPROVED supplier returns can be shipped');
            }

            await tx.supplierReturn.update({
                where: { id: supplierReturnId },
                data: {
                    status: 'SHIPPED',
                    notes: notes || sr.notes,
                    version: { increment: 1 },
                },
            });

            const result = await tx.supplierReturn.findUnique({
                where: { id: supplierReturnId },
                include: RETURN_INCLUDE,
            });
            return this.mapSupplierReturn(result);
        });
    }

    /**
     * Complete a supplier return (APPROVED|SHIPPED → COMPLETED).
     * 
     * THIS is where the stock impact happens:
     * 1. For each item, create a RETURN_TO_SUPPLIER stock movement with the original purchase cost
     * 2. Reduce inventory quantities and adjust WAC at actual GRN cost
     * 3. Generate a supplier credit note for the total return amount
     */
    static async completeSupplierReturn(
        supplierReturnId: string,
        tenantId: string,
        branchId: string,
        completedBy: string,
        notes?: string
    ): Promise<SupplierReturnWithItems> {
        return await prisma.$transaction(async (tx) => {
            const sr = await tx.supplierReturn.findFirst({
                where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
                include: {
                    items: { where: { deletedAt: null } },
                },
            });
            if (!sr) {
                throw new Error('Supplier return not found');
            }
            if (sr.status !== 'APPROVED' && sr.status !== 'SHIPPED') {
                throw new Error('Only APPROVED or SHIPPED supplier returns can be completed');
            }

            // ── 1. Process each return item: stock movement + inventory reduction ──

            for (const item of sr.items) {
                if (item.returnQuantity <= 0) continue;

                // Find inventory record for this variant
                const inventory = await tx.inventory.findFirst({
                    where: { tenantId, branchId, variantId: item.variantId, deletedAt: null },
                });

                if (!inventory) {
                    throw new Error(
                        `Inventory record not found for variant ${item.variantId}. Cannot process return.`
                    );
                }

                const unitCost = Number(item.unitCost);

                // Record RETURN_TO_SUPPLIER movement — this will:
                // - Decrease inventory quantity
                // - Adjust WAC by removing value at the original purchase cost
                // - Consume FIFO/LIFO cost layers for non-WAC items
                await StockMovementService.recordReturnToSupplier(
                    {
                        tenantId,
                        branchId,
                        inventoryId: inventory.id,
                        quantity: item.returnQuantity,
                        unitCost,
                        referenceId: supplierReturnId,
                        notes: `Supplier return ${sr.returnNumber} — returned ${item.returnQuantity} units at cost ${unitCost}`,
                        movedBy: completedBy,
                    },
                    tx
                );
            }

            // ── 2. Generate a supplier credit note ──

            const creditNoteNumber = await this.generateCreditNoteNumber(tenantId, branchId, tx);
            const totalAmount = Number(sr.totalAmount);

            await tx.supplierCreditNote.create({
                data: {
                    id: uuidv4(),
                    supplierReturnId,
                    tenantId,
                    branchId,
                    supplierId: sr.supplierId,
                    creditNoteNumber,
                    creditNoteDate: new Date(),
                    amount: totalAmount,
                    status: 'PENDING',
                    notes: `Auto-generated credit note for supplier return ${sr.returnNumber}`,
                },
            });

            // ── 3. Mark return as COMPLETED ──

            await tx.supplierReturn.update({
                where: { id: supplierReturnId },
                data: {
                    status: 'COMPLETED',
                    notes: notes || sr.notes,
                    version: { increment: 1 },
                },
            });

            const result = await tx.supplierReturn.findUnique({
                where: { id: supplierReturnId },
                include: RETURN_INCLUDE,
            });
            return this.mapSupplierReturn(result);
        });
    }

    /**
     * Cancel a DRAFT or APPROVED supplier return.
     * COMPLETED returns cannot be cancelled (stock already adjusted).
     */
    static async cancelSupplierReturn(
        supplierReturnId: string,
        tenantId: string,
        branchId: string,
        notes?: string
    ): Promise<SupplierReturnWithItems> {
        return await prisma.$transaction(async (tx) => {
            const sr = await tx.supplierReturn.findFirst({
                where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
            });
            if (!sr) {
                throw new Error('Supplier return not found');
            }
            if (sr.status === 'COMPLETED') {
                throw new Error('COMPLETED supplier returns cannot be cancelled — stock has already been adjusted');
            }
            if (sr.status === 'CANCELLED') {
                throw new Error('Supplier return is already cancelled');
            }

            await tx.supplierReturn.update({
                where: { id: supplierReturnId },
                data: {
                    status: 'CANCELLED',
                    notes: notes || sr.notes,
                    version: { increment: 1 },
                },
            });

            const result = await tx.supplierReturn.findUnique({
                where: { id: supplierReturnId },
                include: RETURN_INCLUDE,
            });
            return this.mapSupplierReturn(result);
        });
    }

    /**
     * Apply a credit note to a supplier invoice (reduces balance due).
     */
    static async applyCreditNote(
        creditNoteId: string,
        tenantId: string,
        branchId: string,
        data: ApplySupplierCreditNoteInput
    ): Promise<SupplierCreditNote> {
        return await prisma.$transaction(async (tx) => {
            const cn = await tx.supplierCreditNote.findFirst({
                where: { id: creditNoteId, tenantId, branchId, deletedAt: null },
            });
            if (!cn) {
                throw new Error('Credit note not found');
            }
            if (cn.status !== 'PENDING') {
                throw new Error('Only PENDING credit notes can be applied');
            }

            // Validate the target invoice
            const invoice = await tx.supplierInvoice.findFirst({
                where: { id: data.invoiceId, tenantId, branchId, deletedAt: null },
            });
            if (!invoice) {
                throw new Error('Supplier invoice not found');
            }
            if (invoice.supplierId !== cn.supplierId) {
                throw new Error('Credit note and invoice belong to different suppliers');
            }

            const creditAmount = Number(cn.amount);
            const currentBalanceDue = Number(invoice.balanceDue);

            if (creditAmount > currentBalanceDue) {
                throw new Error(
                    `Credit note amount (${creditAmount}) exceeds invoice balance due (${currentBalanceDue})`
                );
            }

            // Apply: reduce invoice balance
            await tx.supplierInvoice.update({
                where: { id: data.invoiceId },
                data: {
                    amountPaid: { increment: creditAmount },
                    balanceDue: { decrement: creditAmount },
                    version: { increment: 1 },
                },
            });

            // Check if invoice is now fully paid
            const updatedInvoice = await tx.supplierInvoice.findUnique({
                where: { id: data.invoiceId },
            });
            if (updatedInvoice && Number(updatedInvoice.balanceDue) <= 0) {
                await tx.supplierInvoice.update({
                    where: { id: data.invoiceId },
                    data: { status: 'PAID', version: { increment: 1 } },
                });
            } else if (updatedInvoice && Number(updatedInvoice.amountPaid) > 0) {
                await tx.supplierInvoice.update({
                    where: { id: data.invoiceId },
                    data: { status: 'PARTIALLY_PAID', version: { increment: 1 } },
                });
            }

            // Mark credit note as APPLIED
            await tx.supplierCreditNote.update({
                where: { id: creditNoteId },
                data: {
                    status: 'APPLIED',
                    appliedToInvoiceId: data.invoiceId,
                    notes: data.notes || cn.notes,
                    version: { increment: 1 },
                },
            });

            const result = await tx.supplierCreditNote.findUnique({
                where: { id: creditNoteId },
                include: {
                    supplierReturn: true,
                    appliedToInvoice: { select: { id: true, invoiceNumber: true } },
                },
            });

            return this.mapCreditNote(result);
        });
    }

    // ─── Read Operations ───────────────────────────────────────────

    /**
     * Get a single supplier return by ID.
     */
    static async getSupplierReturnById(
        supplierReturnId: string,
        tenantId: string,
        branchId: string
    ): Promise<SupplierReturnWithItems | null> {
        const result = await prisma.supplierReturn.findFirst({
            where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
            include: RETURN_INCLUDE,
        });
        return result ? this.mapSupplierReturn(result) : null;
    }

    /**
     * List supplier returns with filters and pagination.
     */
    static async listSupplierReturns(
        tenantId: string,
        branchId: string,
        options?: {
            status?: SupplierReturnStatus;
            supplierId?: string;
            purchaseOrderId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ data: SupplierReturnWithItems[]; total: number; page: number; limit: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = { tenantId, branchId, deletedAt: null };
        if (options?.status) where.status = options.status;
        if (options?.supplierId) where.supplierId = options.supplierId;
        if (options?.purchaseOrderId) where.purchaseOrderId = options.purchaseOrderId;

        const [data, total] = await Promise.all([
            prisma.supplierReturn.findMany({
                where,
                include: RETURN_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            prisma.supplierReturn.count({ where }),
        ]);

        return {
            data: data.map((r: any) => this.mapSupplierReturn(r)),
            total,
            page,
            limit,
        };
    }

    /**
     * List credit notes with filters.
     */
    static async listCreditNotes(
        tenantId: string,
        branchId: string,
        options?: {
            status?: CreditNoteStatus;
            supplierId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ data: SupplierCreditNote[]; total: number; page: number; limit: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = { tenantId, branchId, deletedAt: null };
        if (options?.status) where.status = options.status;
        if (options?.supplierId) where.supplierId = options.supplierId;

        const [data, total] = await Promise.all([
            prisma.supplierCreditNote.findMany({
                where,
                include: {
                    supplierReturn: true,
                    appliedToInvoice: { select: { id: true, invoiceNumber: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            prisma.supplierCreditNote.count({ where }),
        ]);

        return {
            data: data.map((cn: any) => this.mapCreditNote(cn)),
            total,
            page,
            limit,
        };
    }

    /**
     * Soft-delete a DRAFT supplier return.
     */
    static async deleteSupplierReturn(
        supplierReturnId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        const sr = await prisma.supplierReturn.findFirst({
            where: { id: supplierReturnId, tenantId, branchId, deletedAt: null },
        });
        if (!sr) {
            throw new Error('Supplier return not found');
        }
        if (sr.status !== 'DRAFT') {
            throw new Error('Only DRAFT supplier returns can be deleted');
        }

        const now = new Date();
        await prisma.$transaction([
            prisma.supplierReturnItem.updateMany({
                where: { supplierReturnId, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.supplierReturn.update({
                where: { id: supplierReturnId },
                data: { deletedAt: now, version: { increment: 1 } },
            }),
        ]);
    }

    // ─── Number Generators ─────────────────────────────────────────

    private static async generateReturnNumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');

        const prefix = `SR-${year}${month}`;

        const last = await db.supplierReturn.findFirst({
            where: { tenantId, branchId, returnNumber: { startsWith: prefix } },
            orderBy: { returnNumber: 'desc' },
        });

        let sequence = 1;
        if (last) {
            const lastSeq = parseInt(last.returnNumber.split('-').pop() || '0');
            sequence = lastSeq + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    private static async generateCreditNoteNumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');

        const prefix = `CN-${year}${month}`;

        const last = await db.supplierCreditNote.findFirst({
            where: { tenantId, branchId, creditNoteNumber: { startsWith: prefix } },
            orderBy: { creditNoteNumber: 'desc' },
        });

        let sequence = 1;
        if (last) {
            const lastSeq = parseInt(last.creditNoteNumber.split('-').pop() || '0');
            sequence = lastSeq + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    // ─── Mappers ───────────────────────────────────────────────────

    private static mapSupplierReturn(sr: any): SupplierReturnWithItems {
        return {
            id: sr.id,
            tenantId: sr.tenantId,
            branchId: sr.branchId,
            supplierId: sr.supplierId,
            purchaseOrderId: sr.purchaseOrderId,
            goodsReceiptId: sr.goodsReceiptId,
            returnNumber: sr.returnNumber,
            status: sr.status,
            returnDate: sr.returnDate,
            returnedBy: sr.returnedBy,
            reason: sr.reason,
            notes: sr.notes,
            totalAmount: Number(sr.totalAmount),
            version: sr.version,
            deletedAt: sr.deletedAt,
            createdAt: sr.createdAt,
            updatedAt: sr.updatedAt,
            items: (sr.items || []).map((item: any) => ({
                id: item.id,
                supplierReturnId: item.supplierReturnId,
                goodsReceiptItemId: item.goodsReceiptItemId,
                variantId: item.variantId,
                tenantId: item.tenantId,
                branchId: item.branchId,
                returnQuantity: item.returnQuantity,
                unitCost: Number(item.unitCost),
                totalCost: Number(item.totalCost),
                reason: item.reason,
                notes: item.notes,
                version: item.version,
                deletedAt: item.deletedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                variant: item.variant,
            })),
            supplier: sr.supplier,
            purchaseOrder: sr.purchaseOrder,
            goodsReceipt: sr.goodsReceipt,
            returnedByUser: sr.returnedByUser,
            creditNotes: (sr.creditNotes || []).map((cn: any) => this.mapCreditNote(cn)),
        };
    }

    private static mapCreditNote(cn: any): SupplierCreditNote {
        return {
            id: cn.id,
            supplierReturnId: cn.supplierReturnId,
            tenantId: cn.tenantId,
            branchId: cn.branchId,
            supplierId: cn.supplierId,
            creditNoteNumber: cn.creditNoteNumber,
            creditNoteDate: cn.creditNoteDate,
            amount: Number(cn.amount),
            status: cn.status,
            appliedToInvoiceId: cn.appliedToInvoiceId,
            notes: cn.notes,
            version: cn.version,
            deletedAt: cn.deletedAt,
            createdAt: cn.createdAt,
            updatedAt: cn.updatedAt,
            supplierReturn: cn.supplierReturn,
            appliedToInvoice: cn.appliedToInvoice,
        };
    }
}
