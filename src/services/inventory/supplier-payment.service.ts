import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CreateSupplierPaymentInput,
    SupplierPaymentWithAllocations,
} from '../../models/supplier-payment.model';

type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

// ─── Shared Includes ───────────────────────────────────────────────

const ALLOCATION_INCLUDE = {
    invoice: {
        select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            amountPaid: true,
            balanceDue: true,
            status: true,
        },
    },
};

const PAYMENT_INCLUDE = {
    allocations: {
        where: { deletedAt: null },
        include: ALLOCATION_INCLUDE,
    },
    supplier: { select: { id: true, name: true } },
};

// ─── Service ───────────────────────────────────────────────────────

export class SupplierPaymentService {
    /**
     * Record a supplier payment with allocations to one or more invoices.
     *
     * In a single transaction:
     *   1. Validate supplier and each invoice
     *   2. Enforce: payment amount === sum of allocations
     *   3. Enforce: each allocation ≤ invoice balance_due
     *   4. Create payment + allocations
     *   5. Update each invoice (amount_paid, balance_due, status)
     */
    static async createSupplierPayment(
        data: CreateSupplierPaymentInput,
        tenantId: string,
        branchId: string
    ): Promise<SupplierPaymentWithAllocations> {
        return await prisma.$transaction(async (tx) => {
            // Validate supplier
            const supplier = await tx.supplier.findFirst({
                where: { id: data.supplierId, tenantId, deletedAt: null },
            });
            if (!supplier) {
                throw new Error('Supplier not found');
            }

            // Validate: payment amount must equal sum of allocations
            const totalAllocated = data.allocations.reduce(
                (sum, a) => sum + a.allocatedAmount,
                0
            );
            // Use tolerance for floating-point comparison
            if (Math.abs(data.amount - totalAllocated) > 0.01) {
                throw new Error(
                    `Payment amount (${data.amount}) must equal sum of allocations (${totalAllocated})`
                );
            }

            // Validate each invoice and allocation amount
            for (const alloc of data.allocations) {
                const invoice = await tx.supplierInvoice.findFirst({
                    where: {
                        id: alloc.invoiceId,
                        tenantId,
                        branchId,
                        supplierId: data.supplierId,
                        deletedAt: null,
                    },
                });

                if (!invoice) {
                    throw new Error(`Invoice ${alloc.invoiceId} not found or does not belong to this supplier`);
                }

                if (invoice.status === 'CANCELLED') {
                    throw new Error(`Cannot allocate payment to cancelled invoice ${invoice.invoiceNumber}`);
                }
                if (invoice.status === 'PAID') {
                    throw new Error(`Invoice ${invoice.invoiceNumber} is already fully paid`);
                }

                const balanceDue = Number(invoice.balanceDue);
                if (alloc.allocatedAmount > balanceDue + 0.01) {
                    throw new Error(
                        `Allocation (${alloc.allocatedAmount}) exceeds balance due (${balanceDue}) ` +
                        `on invoice ${invoice.invoiceNumber}`
                    );
                }
            }

            // Generate payment number
            const paymentNumber = await this.generatePaymentNumber(tenantId, branchId, tx);

            // Create payment
            const payment = await tx.supplierPayment.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    branchId,
                    supplierId: data.supplierId,
                    paymentNumber,
                    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    reference: data.reference,
                    status: 'COMPLETED',
                    notes: data.notes,
                    allocations: {
                        create: data.allocations.map((alloc) => ({
                            id: uuidv4(),
                            tenantId,
                            branchId,
                            invoiceId: alloc.invoiceId,
                            allocatedAmount: alloc.allocatedAmount,
                            notes: alloc.notes,
                        })),
                    },
                },
                include: PAYMENT_INCLUDE,
            });

            // Update each invoice: increase amount_paid, decrease balance_due, set status
            for (const alloc of data.allocations) {
                const invoice = await tx.supplierInvoice.findFirst({
                    where: { id: alloc.invoiceId, deletedAt: null },
                });

                if (!invoice) {
                    throw new Error(`Invoice ${alloc.invoiceId} not found`);
                }

                const newAmountPaid = Number(invoice.amountPaid) + alloc.allocatedAmount;
                const newBalanceDue = Number(invoice.totalAmount) - newAmountPaid;

                let newStatus: string;
                if (newBalanceDue <= 0.01) {
                    newStatus = 'PAID';
                } else if (newAmountPaid > 0) {
                    newStatus = 'PARTIALLY_PAID';
                } else {
                    newStatus = invoice.status;
                }

                await tx.supplierInvoice.update({
                    where: { id: alloc.invoiceId },
                    data: {
                        amountPaid: newAmountPaid,
                        balanceDue: Math.max(newBalanceDue, 0),
                        status: newStatus,
                        version: { increment: 1 },
                    },
                });
            }

            return this.mapPayment(payment);
        });
    }

    /**
     * Void/cancel a COMPLETED payment — reverses all allocations.
     * Restores invoice balances and transitions statuses back.
     */
    static async voidSupplierPayment(
        paymentId: string,
        tenantId: string,
        branchId: string,
        reason?: string
    ): Promise<void> {
        return await prisma.$transaction(async (tx) => {
            const payment = await tx.supplierPayment.findFirst({
                where: { id: paymentId, tenantId, branchId, deletedAt: null },
                include: { allocations: { where: { deletedAt: null } } },
            });

            if (!payment) {
                throw new Error('Payment not found');
            }
            if (payment.status === 'CANCELLED' || payment.status === 'REFUNDED') {
                throw new Error('Payment is already voided or refunded');
            }

            // Reverse each allocation on the corresponding invoice
            for (const alloc of payment.allocations) {
                const invoice = await tx.supplierInvoice.findFirst({
                    where: { id: alloc.invoiceId, deletedAt: null },
                });

                if (!invoice) {
                    throw new Error(`Invoice ${alloc.invoiceId} has been deleted — cannot reverse allocation`);
                }

                const restoredAmountPaid = Math.max(
                    Number(invoice.amountPaid) - Number(alloc.allocatedAmount),
                    0
                );
                const restoredBalanceDue = Number(invoice.totalAmount) - restoredAmountPaid;

                let restoredStatus: string;
                if (restoredAmountPaid <= 0.01) {
                    restoredStatus = 'PENDING';
                } else {
                    restoredStatus = 'PARTIALLY_PAID';
                }

                await tx.supplierInvoice.update({
                    where: { id: alloc.invoiceId },
                    data: {
                        amountPaid: restoredAmountPaid,
                        balanceDue: Math.max(restoredBalanceDue, 0),
                        status: restoredStatus,
                        version: { increment: 1 },
                    },
                });

                // Soft-delete the allocation
                await tx.supplierPaymentAllocation.update({
                    where: { id: alloc.id },
                    data: { deletedAt: new Date() },
                });
            }

            // Mark payment as cancelled
            await tx.supplierPayment.update({
                where: { id: paymentId },
                data: {
                    status: 'CANCELLED',
                    notes: reason
                        ? `[VOIDED] ${reason}${payment.notes ? '\n' + payment.notes : ''}`
                        : payment.notes,
                    version: { increment: 1 },
                },
            });
        });
    }

    /**
     * Get a single payment by ID.
     */
    static async getSupplierPaymentById(
        paymentId: string,
        tenantId: string,
        branchId: string
    ): Promise<SupplierPaymentWithAllocations | null> {
        const payment = await prisma.supplierPayment.findFirst({
            where: { id: paymentId, tenantId, branchId, deletedAt: null },
            include: PAYMENT_INCLUDE,
        });

        if (!payment) return null;
        return this.mapPayment(payment);
    }

    /**
     * List payments with filtering and pagination.
     */
    static async listSupplierPayments(
        tenantId: string,
        branchId: string,
        options?: {
            status?: PaymentStatus;
            supplierId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ payments: SupplierPaymentWithAllocations[]; total: number; totalPages: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.supplierId && { supplierId: options.supplierId }),
        };

        const [payments, total] = await Promise.all([
            prisma.supplierPayment.findMany({
                where,
                include: PAYMENT_INCLUDE,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.supplierPayment.count({ where }),
        ]);

        return {
            payments: payments.map((p) => this.mapPayment(p)),
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * List payments for a specific invoice.
     */
    static async getPaymentsForInvoice(
        invoiceId: string,
        tenantId: string,
        branchId: string
    ): Promise<SupplierPaymentWithAllocations[]> {
        const allocations = await prisma.supplierPaymentAllocation.findMany({
            where: {
                invoiceId,
                tenantId,
                branchId,
                deletedAt: null,
                payment: { deletedAt: null },
            },
            select: { paymentId: true },
        });

        const paymentIds = [...new Set(allocations.map((a) => a.paymentId))];

        if (paymentIds.length === 0) return [];

        const payments = await prisma.supplierPayment.findMany({
            where: { id: { in: paymentIds }, deletedAt: null },
            include: PAYMENT_INCLUDE,
            orderBy: { paymentDate: 'desc' },
        });

        return payments.map((p) => this.mapPayment(p));
    }

    // ─── Private Helpers ───────────────────────────────────────────

    /**
     * Generate sequential payment number: PAY-YYYYMM-0001
     */
    private static async generatePaymentNumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `PAY-${year}${month}`;

        const last = await db.supplierPayment.findFirst({
            where: {
                tenantId,
                branchId,
                paymentNumber: { startsWith: prefix },
            },
            orderBy: { paymentNumber: 'desc' },
        });

        let sequence = 1;
        if (last) {
            const lastSeq = parseInt(last.paymentNumber.split('-').pop() || '0');
            sequence = lastSeq + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    /**
     * Map Prisma result to typed interface.
     */
    private static mapPayment(payment: any): SupplierPaymentWithAllocations {
        return {
            id: payment.id,
            tenantId: payment.tenantId,
            branchId: payment.branchId,
            supplierId: payment.supplierId,
            paymentNumber: payment.paymentNumber,
            paymentDate: payment.paymentDate,
            amount: Number(payment.amount),
            paymentMethod: payment.paymentMethod,
            reference: payment.reference,
            status: payment.status,
            notes: payment.notes,
            version: payment.version,
            deletedAt: payment.deletedAt,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            allocations: (payment.allocations || []).map((alloc: any) => ({
                id: alloc.id,
                tenantId: alloc.tenantId,
                branchId: alloc.branchId,
                paymentId: alloc.paymentId,
                invoiceId: alloc.invoiceId,
                allocatedAmount: Number(alloc.allocatedAmount),
                allocatedDate: alloc.allocatedDate,
                notes: alloc.notes,
                version: alloc.version,
                deletedAt: alloc.deletedAt,
                createdAt: alloc.createdAt,
                updatedAt: alloc.updatedAt,
                invoice: alloc.invoice
                    ? {
                        id: alloc.invoice.id,
                        invoiceNumber: alloc.invoice.invoiceNumber,
                        totalAmount: Number(alloc.invoice.totalAmount),
                        amountPaid: Number(alloc.invoice.amountPaid),
                        balanceDue: Number(alloc.invoice.balanceDue),
                        status: alloc.invoice.status,
                    }
                    : undefined,
            })),
            supplier: payment.supplier,
        };
    }
}
