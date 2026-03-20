import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CreateSupplierInvoiceInput,
    UpdateSupplierInvoiceInput,
    SupplierInvoiceWithItems,
    ThreeWayMatchResult,
} from '../../models/supplier-invoice.model';

type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED';

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
};

const INVOICE_INCLUDE = {
    items: {
        where: { deletedAt: null },
        include: {
            variant: { select: VARIANT_SELECT },
            purchaseOrderItem: { select: PO_ITEM_SELECT },
        },
    },
    supplier: { select: { id: true, name: true } },
    purchaseOrder: { select: { id: true, poNumber: true } },
};

// ─── Service ───────────────────────────────────────────────────────

export class SupplierInvoiceService {
    /**
     * Create a supplier invoice.
     * Validates:
     *   - Invoice number unique per tenant/branch
     *   - If linked to a PO, PO must exist and belong to the same supplier
     *   - Invoiced quantity cannot exceed received quantity (3-way match guard)
     */
    static async createSupplierInvoice(
        data: CreateSupplierInvoiceInput,
        tenantId: string,
        branchId: string
    ): Promise<SupplierInvoiceWithItems> {
        return await prisma.$transaction(async (tx) => {
            // Validate supplier exists
            const supplier = await tx.supplier.findFirst({
                where: { id: data.supplierId, tenantId, deletedAt: null },
            });
            if (!supplier) {
                throw new Error('Supplier not found');
            }

            // Check unique invoice number
            const existingInvoice = await tx.supplierInvoice.findFirst({
                where: {
                    tenantId,
                    branchId,
                    invoiceNumber: data.invoiceNumber,
                    deletedAt: null,
                },
            });
            if (existingInvoice) {
                throw new Error(`Invoice number ${data.invoiceNumber} already exists`);
            }

            // If linked to a PO, validate it
            if (data.purchaseOrderId) {
                const po = await tx.purchaseOrder.findFirst({
                    where: {
                        id: data.purchaseOrderId,
                        tenantId,
                        branchId,
                        deletedAt: null,
                    },
                });
                if (!po) {
                    throw new Error('Purchase order not found');
                }
                if (po.supplierId !== data.supplierId) {
                    throw new Error('Purchase order belongs to a different supplier');
                }
            }

            // Validate each item — enforce invoiced qty ≤ received qty when linked to PO items
            for (const item of data.items) {
                if (item.purchaseOrderItemId) {
                    const poItem = await tx.purchaseOrderItem.findFirst({
                        where: {
                            id: item.purchaseOrderItemId,
                            tenantId,
                            branchId,
                            deletedAt: null,
                        },
                    });
                    if (!poItem) {
                        throw new Error(`PO item ${item.purchaseOrderItemId} not found`);
                    }
                    if (poItem.variantId !== item.variantId) {
                        throw new Error(`Variant mismatch for PO item ${item.purchaseOrderItemId}`);
                    }

                    // Sum already-invoiced quantity for this PO item (across all non-cancelled invoices)
                    const previouslyInvoiced = await tx.supplierInvoiceItem.aggregate({
                        where: {
                            purchaseOrderItemId: item.purchaseOrderItemId,
                            deletedAt: null,
                            supplierInvoice: {
                                status: { notIn: ['CANCELLED'] },
                                deletedAt: null,
                            },
                        },
                        _sum: { quantity: true },
                    });

                    const alreadyInvoiced = previouslyInvoiced._sum.quantity || 0;
                    const totalAfterThis = alreadyInvoiced + item.quantity;

                    // Cannot invoice more than received
                    if (totalAfterThis > poItem.receivedQuantity) {
                        throw new Error(
                            `Over-invoicing not allowed for PO item ${item.purchaseOrderItemId}. ` +
                            `Received: ${poItem.receivedQuantity}, Already invoiced: ${alreadyInvoiced}, ` +
                            `Attempting: ${item.quantity}`
                        );
                    }
                }
            }

            // Calculate line totals and invoice totals
            const lineItems = data.items.map((item) => {
                const itemTax = item.taxAmount ?? (item.taxRate ? item.quantity * item.unitPrice * (item.taxRate / 100) : 0);
                const itemDiscount = item.discountAmount ?? 0;
                const lineTotal = item.quantity * item.unitPrice + itemTax - itemDiscount;

                return {
                    id: uuidv4(),
                    tenantId,
                    branchId,
                    purchaseOrderItemId: item.purchaseOrderItemId || null,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate ?? 0,
                    taxAmount: itemTax,
                    discountAmount: itemDiscount,
                    totalPrice: lineTotal,
                    notes: item.notes,
                };
            });

            const computedSubtotal = lineItems.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
            const computedTax = data.taxAmount ?? lineItems.reduce((sum, i) => sum + Number(i.taxAmount), 0);
            const computedDiscount = data.discountAmount ?? lineItems.reduce((sum, i) => sum + Number(i.discountAmount), 0);
            const totalAmount = (data.subtotal ?? computedSubtotal) + computedTax - computedDiscount;

            const invoice = await tx.supplierInvoice.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    branchId,
                    supplierId: data.supplierId,
                    purchaseOrderId: data.purchaseOrderId || null,
                    invoiceNumber: data.invoiceNumber,
                    invoiceDate: new Date(data.invoiceDate),
                    dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    status: 'PENDING',
                    subtotal: data.subtotal ?? computedSubtotal,
                    taxAmount: computedTax,
                    discountAmount: computedDiscount,
                    totalAmount,
                    amountPaid: 0,
                    balanceDue: totalAmount,
                    notes: data.notes,
                    items: { create: lineItems },
                },
                include: INVOICE_INCLUDE,
            });

            // ── Update PO item invoiced_quantity summaries ──
            await this.refreshInvoicedQuantities(tx, data.items, tenantId, branchId);

            return this.mapInvoice(invoice);
        });
    }

    /**
     * Update a PENDING invoice (due date, tax/discount, notes, items).
     * Replaces all items when items array is provided.
     */
    static async updateSupplierInvoice(
        invoiceId: string,
        tenantId: string,
        branchId: string,
        data: UpdateSupplierInvoiceInput
    ): Promise<SupplierInvoiceWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.supplierInvoice.findFirst({
                where: { id: invoiceId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Supplier invoice not found');
            }
            if (existing.status !== 'PENDING') {
                throw new Error('Only PENDING invoices can be updated');
            }

            // Replace items if provided
            if (data.items) {
                // Validate items
                for (const item of data.items) {
                    if (item.purchaseOrderItemId) {
                        const poItem = await tx.purchaseOrderItem.findFirst({
                            where: { id: item.purchaseOrderItemId, tenantId, branchId, deletedAt: null },
                        });
                        if (!poItem) {
                            throw new Error(`PO item ${item.purchaseOrderItemId} not found`);
                        }
                        if (poItem.variantId !== item.variantId) {
                            throw new Error(`Variant mismatch for PO item ${item.purchaseOrderItemId}`);
                        }

                        // Over-invoicing check (exclude current invoice's items)
                        const previouslyInvoiced = await tx.supplierInvoiceItem.aggregate({
                            where: {
                                purchaseOrderItemId: item.purchaseOrderItemId,
                                supplierInvoiceId: { not: invoiceId },
                                deletedAt: null,
                                supplierInvoice: {
                                    status: { notIn: ['CANCELLED'] },
                                    deletedAt: null,
                                },
                            },
                            _sum: { quantity: true },
                        });

                        const alreadyInvoiced = previouslyInvoiced._sum.quantity || 0;
                        if (alreadyInvoiced + item.quantity > poItem.receivedQuantity) {
                            throw new Error(
                                `Over-invoicing not allowed for PO item ${item.purchaseOrderItemId}. ` +
                                `Received: ${poItem.receivedQuantity}, Other invoices: ${alreadyInvoiced}, ` +
                                `Attempting: ${item.quantity}`
                            );
                        }
                    }
                }

                // Soft-delete existing items
                await tx.supplierInvoiceItem.updateMany({
                    where: { supplierInvoiceId: invoiceId, tenantId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });

                // Create new items
                const lineItems = data.items.map((item) => {
                    const itemTax = item.taxAmount ?? (item.taxRate ? item.quantity * item.unitPrice * (item.taxRate / 100) : 0);
                    const itemDiscount = item.discountAmount ?? 0;
                    const lineTotal = item.quantity * item.unitPrice + itemTax - itemDiscount;

                    return {
                        id: uuidv4(),
                        tenantId,
                        branchId,
                        supplierInvoiceId: invoiceId,
                        purchaseOrderItemId: item.purchaseOrderItemId || null,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate ?? 0,
                        taxAmount: itemTax,
                        discountAmount: itemDiscount,
                        totalPrice: lineTotal,
                        notes: item.notes,
                    };
                });

                for (const lineItem of lineItems) {
                    await tx.supplierInvoiceItem.create({ data: lineItem });
                }

                // Recalculate totals
                const computedSubtotal = lineItems.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
                const computedTax = data.taxAmount ?? lineItems.reduce((sum, i) => sum + Number(i.taxAmount), 0);
                const computedDiscount = data.discountAmount ?? lineItems.reduce((sum, i) => sum + Number(i.discountAmount), 0);
                const totalAmount = computedSubtotal + computedTax - computedDiscount;
                const amountPaid = Number(existing.amountPaid);

                const updated = await tx.supplierInvoice.update({
                    where: { id: invoiceId },
                    data: {
                        subtotal: computedSubtotal,
                        taxAmount: computedTax,
                        discountAmount: computedDiscount,
                        totalAmount,
                        balanceDue: totalAmount - amountPaid,
                        ...(data.dueDate !== undefined && {
                            dueDate: data.dueDate ? new Date(data.dueDate) : null,
                        }),
                        ...(data.notes !== undefined && { notes: data.notes }),
                        version: { increment: 1 },
                    },
                    include: INVOICE_INCLUDE,
                });

                // ── Refresh PO item invoiced_quantity summaries after item replacement ──
                await this.refreshInvoicedQuantities(tx, data.items, tenantId, branchId);

                return this.mapInvoice(updated);
            }

            // No items replacement — just header updates
            const updateData: any = { version: { increment: 1 } };
            if (data.dueDate !== undefined) {
                updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
            }
            if (data.notes !== undefined) {
                updateData.notes = data.notes;
            }
            if (data.taxAmount !== undefined) {
                updateData.taxAmount = data.taxAmount;
                const sub = Number(existing.subtotal);
                const disc = data.discountAmount ?? Number(existing.discountAmount);
                const total = sub + data.taxAmount - disc;
                updateData.totalAmount = total;
                updateData.balanceDue = total - Number(existing.amountPaid);
            }
            if (data.discountAmount !== undefined) {
                updateData.discountAmount = data.discountAmount;
                const sub = Number(existing.subtotal);
                const tax = data.taxAmount ?? Number(existing.taxAmount);
                const total = sub + tax - data.discountAmount;
                updateData.totalAmount = total;
                updateData.balanceDue = total - Number(existing.amountPaid);
            }

            const updated = await tx.supplierInvoice.update({
                where: { id: invoiceId },
                data: updateData,
                include: INVOICE_INCLUDE,
            });

            return this.mapInvoice(updated);
        });
    }

    /**
     * 3-way match: Compare ordered vs received vs invoiced for a PO.
     * Returns per-item match status and discrepancy details.
     */
    static async threeWayMatch(
        purchaseOrderId: string,
        tenantId: string,
        branchId: string
    ): Promise<ThreeWayMatchResult[]> {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: purchaseOrderId, tenantId, branchId, deletedAt: null },
            include: {
                items: {
                    where: { deletedAt: null },
                    include: {
                        goodsReceiptItems: {
                            where: {
                                deletedAt: null,
                                goodsReceipt: { status: 'POSTED', deletedAt: null },
                            },
                        },
                        supplierInvoiceItems: {
                            where: {
                                deletedAt: null,
                                supplierInvoice: {
                                    status: { notIn: ['CANCELLED'] },
                                    deletedAt: null,
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!po) {
            throw new Error('Purchase order not found');
        }

        return po.items.map((poItem) => {
            const orderedQty = poItem.orderedQuantity;
            const receivedQty = poItem.goodsReceiptItems.reduce(
                (sum, gri) => sum + gri.receivedQuantity,
                0
            );
            const invoicedQty = poItem.supplierInvoiceItems.reduce(
                (sum, sii) => sum + sii.quantity,
                0
            );

            const discrepancies: string[] = [];

            if (receivedQty !== orderedQty) {
                discrepancies.push(
                    `Received (${receivedQty}) ≠ Ordered (${orderedQty})`
                );
            }
            if (invoicedQty !== receivedQty) {
                discrepancies.push(
                    `Invoiced (${invoicedQty}) ≠ Received (${receivedQty})`
                );
            }
            if (invoicedQty > receivedQty) {
                discrepancies.push(
                    `Over-invoiced: invoiced ${invoicedQty} but only received ${receivedQty}`
                );
            }

            return {
                purchaseOrderItemId: poItem.id,
                variantId: poItem.variantId,
                orderedQuantity: orderedQty,
                receivedQuantity: receivedQty,
                invoicedQuantity: invoicedQty,
                match: discrepancies.length === 0,
                discrepancies,
            };
        });
    }

    /**
     * Cancel a PENDING invoice.
     */
    static async cancelSupplierInvoice(
        invoiceId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.supplierInvoice.findFirst({
                where: { id: invoiceId, tenantId, branchId, deletedAt: null },
                include: {
                    items: {
                        where: { deletedAt: null },
                        select: { purchaseOrderItemId: true, quantity: true },
                    },
                },
            });

            if (!existing) {
                throw new Error('Supplier invoice not found');
            }
            if (existing.status !== 'PENDING') {
                throw new Error('Only PENDING invoices can be cancelled');
            }

            await tx.supplierInvoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'CANCELLED',
                    balanceDue: 0,
                    version: { increment: 1 },
                },
            });

            // ── Refresh PO item invoiced_quantity summaries after cancel ──
            const poItemIds = existing.items
                .filter((i): i is typeof i & { purchaseOrderItemId: string } => Boolean(i.purchaseOrderItemId))
                .map((i) => i.purchaseOrderItemId);

            for (const poItemId of [...new Set(poItemIds)]) {
                const aggregated = await tx.supplierInvoiceItem.aggregate({
                    where: {
                        purchaseOrderItemId: poItemId,
                        deletedAt: null,
                        supplierInvoice: {
                            status: { notIn: ['CANCELLED'] },
                            deletedAt: null,
                        },
                    },
                    _sum: { quantity: true },
                });

                await tx.purchaseOrderItem.update({
                    where: { id: poItemId },
                    data: {
                        invoicedQuantity: aggregated._sum.quantity || 0,
                        version: { increment: 1 },
                    },
                });
            }
        });
    }

    /**
     * Mark a PENDING invoice as DISPUTED.
     */
    static async disputeSupplierInvoice(
        invoiceId: string,
        tenantId: string,
        branchId: string,
        reason?: string
    ): Promise<SupplierInvoiceWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.supplierInvoice.findFirst({
                where: { id: invoiceId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Supplier invoice not found');
            }
            if (existing.status !== 'PENDING') {
                throw new Error('Only PENDING invoices can be disputed');
            }

            const updated = await tx.supplierInvoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'DISPUTED',
                    ...(reason && { notes: `[DISPUTED] ${reason}${existing.notes ? '\n' + existing.notes : ''}` }),
                    version: { increment: 1 },
                },
                include: INVOICE_INCLUDE,
            });

            return this.mapInvoice(updated);
        });
    }

    /**
     * Get a single invoice by ID.
     */
    static async getSupplierInvoiceById(
        invoiceId: string,
        tenantId: string,
        branchId: string
    ): Promise<SupplierInvoiceWithItems | null> {
        const invoice = await prisma.supplierInvoice.findFirst({
            where: { id: invoiceId, tenantId, branchId, deletedAt: null },
            include: INVOICE_INCLUDE,
        });

        if (!invoice) return null;
        return this.mapInvoice(invoice);
    }

    /**
     * List invoices with filtering and pagination.
     */
    static async listSupplierInvoices(
        tenantId: string,
        branchId: string,
        options?: {
            status?: InvoiceStatus;
            supplierId?: string;
            purchaseOrderId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ invoices: SupplierInvoiceWithItems[]; total: number; totalPages: number }> {
        const page = Number(options?.page) || 1;
        const limit = Number(options?.limit) || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.supplierId && { supplierId: options.supplierId }),
            ...(options?.purchaseOrderId && { purchaseOrderId: options.purchaseOrderId }),
        };

        const [invoices, total] = await Promise.all([
            prisma.supplierInvoice.findMany({
                where,
                include: INVOICE_INCLUDE,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.supplierInvoice.count({ where }),
        ]);

        return {
            invoices: invoices.map((inv) => this.mapInvoice(inv)),
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Soft-delete a PENDING or CANCELLED invoice and its items.
     */
    static async deleteSupplierInvoice(
        invoiceId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.supplierInvoice.findFirst({
                where: { id: invoiceId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Supplier invoice not found');
            }
            if (existing.status !== 'PENDING' && existing.status !== 'CANCELLED') {
                throw new Error('Only PENDING or CANCELLED invoices can be deleted');
            }

            const now = new Date();

            await tx.supplierInvoiceItem.updateMany({
                where: { supplierInvoiceId: invoiceId, tenantId, deletedAt: null },
                data: { deletedAt: now },
            });

            await tx.supplierInvoice.update({
                where: { id: invoiceId },
                data: { deletedAt: now },
            });
        });
    }

    /**
     * Get outstanding balance for a supplier (sum of balanceDue across active invoices).
     */
    static async getSupplierBalance(
        supplierId: string,
        tenantId: string,
        branchId: string
    ): Promise<{ totalOutstanding: number; invoiceCount: number }> {
        const result = await prisma.supplierInvoice.aggregate({
            where: {
                supplierId,
                tenantId,
                branchId,
                deletedAt: null,
                status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
            _sum: { balanceDue: true },
            _count: true,
        });

        return {
            totalOutstanding: Number(result._sum.balanceDue || 0),
            invoiceCount: result._count,
        };
    }

    // ─── Private Helpers ───────────────────────────────────────────

    /**
     * After creating/updating invoice items, re-aggregate invoiced_quantity
     * on each referenced PO item from all non-cancelled invoices.
     */
    private static async refreshInvoicedQuantities(
        tx: any,
        items: { purchaseOrderItemId?: string; quantity: number }[],
        _tenantId: string,
        _branchId: string
    ): Promise<void> {
        const poItemIds = items
            .filter((i): i is typeof i & { purchaseOrderItemId: string } => Boolean(i.purchaseOrderItemId))
            .map((i) => i.purchaseOrderItemId);

        for (const poItemId of [...new Set(poItemIds)]) {
            const aggregated = await tx.supplierInvoiceItem.aggregate({
                where: {
                    purchaseOrderItemId: poItemId,
                    deletedAt: null,
                    supplierInvoice: {
                        status: { notIn: ['CANCELLED'] },
                        deletedAt: null,
                    },
                },
                _sum: { quantity: true },
            });

            await tx.purchaseOrderItem.update({
                where: { id: poItemId },
                data: {
                    invoicedQuantity: aggregated._sum.quantity || 0,
                    version: { increment: 1 },
                },
            });
        }
    }

    /**
     * Map Prisma result to typed interface.
     */
    private static mapInvoice(inv: any): SupplierInvoiceWithItems {
        return {
            id: inv.id,
            tenantId: inv.tenantId,
            branchId: inv.branchId,
            supplierId: inv.supplierId,
            purchaseOrderId: inv.purchaseOrderId,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            status: inv.status,
            subtotal: Number(inv.subtotal),
            taxAmount: Number(inv.taxAmount),
            discountAmount: Number(inv.discountAmount),
            totalAmount: Number(inv.totalAmount),
            amountPaid: Number(inv.amountPaid),
            balanceDue: Number(inv.balanceDue),
            notes: inv.notes,
            version: inv.version,
            deletedAt: inv.deletedAt,
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt,
            items: (inv.items || []).map((item: any) => ({
                id: item.id,
                supplierInvoiceId: item.supplierInvoiceId,
                purchaseOrderItemId: item.purchaseOrderItemId,
                variantId: item.variantId,
                tenantId: item.tenantId,
                branchId: item.branchId,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                taxRate: item.taxRate != null ? Number(item.taxRate) : null,
                taxAmount: Number(item.taxAmount),
                discountAmount: Number(item.discountAmount),
                totalPrice: Number(item.totalPrice),
                notes: item.notes,
                version: item.version,
                deletedAt: item.deletedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                variant: item.variant,
                purchaseOrderItem: item.purchaseOrderItem,
            })),
            supplier: inv.supplier,
            purchaseOrder: inv.purchaseOrder,
        };
    }
}
