import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import {
    CreateRequisitionInput,
    UpdateRequisitionInput,
    ApproveRequisitionInput,
    RejectRequisitionInput,
    PurchaseRequisitionWithItems,
} from '../../models/purchase-requisition.model';

type RequisitionStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'CANCELLED';

// ─── Shared Prisma includes ────────────────────────────────────────

const ITEM_INCLUDE = {
    variant: {
        select: {
            id: true,
            variantName: true,
            sku: true,
            product: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
} as const;

const USER_SELECT = {
    userId: true,
    fullname: true,
} as const;

const REQUISITION_INCLUDE = {
    items: { where: { deletedAt: null }, include: ITEM_INCLUDE },
    requestedByUser: { select: USER_SELECT },
    approvedByUser: { select: USER_SELECT },
} as const;

// ─── Service ───────────────────────────────────────────────────────

export class PurchaseRequisitionService {
    /**
     * Create a purchase requisition.
     * Status defaults to PENDING. No inventory impact.
     */
    static async createRequisition(
        data: CreateRequisitionInput,
        tenantId: string,
        branchId: string,
        requestedBy: string
    ): Promise<PurchaseRequisitionWithItems> {
        const requisitionNumber = await this.generateRequisitionNumber(tenantId, branchId);

        const requisition = await prisma.purchaseRequisition.create({
            data: {
                id: uuidv4(),
                tenantId,
                branchId,
                requisitionNumber,
                requestedBy,
                status: 'PENDING',
                notes: data.notes,
                items: {
                    create: data.items.map((item) => ({
                        id: uuidv4(),
                        tenantId,
                        branchId,
                        variantId: item.variantId,
                        requestedQuantity: item.requestedQuantity,
                        notes: item.notes,
                    })),
                },
            },
            include: REQUISITION_INCLUDE,
        });

        return this.mapRequisition(requisition);
    }

    /**
     * Update a PENDING requisition (notes and/or items).
     * Replaces all items when items array is provided.
     */
    static async updateRequisition(
        requisitionId: string,
        tenantId: string,
        branchId: string,
        data: UpdateRequisitionInput
    ): Promise<PurchaseRequisitionWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseRequisition.findFirst({
                where: { id: requisitionId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Requisition not found');
            }
            if (existing.status !== 'PENDING') {
                throw new Error('Only PENDING requisitions can be updated');
            }

            // If items provided, replace all existing items
            if (data.items) {
                await tx.purchaseRequisitionItem.deleteMany({
                    where: { requisitionId },
                });

                await tx.purchaseRequisitionItem.createMany({
                    data: data.items.map((item) => ({
                        id: uuidv4(),
                        requisitionId,
                        tenantId,
                        branchId,
                        variantId: item.variantId,
                        requestedQuantity: item.requestedQuantity,
                        notes: item.notes,
                    })),
                });
            }

            const updated = await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    notes: data.notes ?? existing.notes,
                    version: { increment: 1 },
                },
                include: REQUISITION_INCLUDE,
            });

            return this.mapRequisition(updated);
        });
    }

    /**
     * Approve a requisition (full or partial).
     * Sets status to APPROVED or PARTIALLY_APPROVED based on quantities.
     */
    static async approveRequisition(
        requisitionId: string,
        tenantId: string,
        branchId: string,
        approvedBy: string,
        data?: ApproveRequisitionInput
    ): Promise<PurchaseRequisitionWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseRequisition.findFirst({
                where: { id: requisitionId, tenantId, branchId, deletedAt: null },
                include: { items: { where: { deletedAt: null } } },
            });

            if (!existing) {
                throw new Error('Requisition not found');
            }
            if (existing.status !== 'PENDING') {
                throw new Error('Only PENDING requisitions can be approved');
            }

            let isPartial = false;

            if (data?.items && data.items.length > 0) {
                // Partial approval — update approved quantities per item
                for (const approvalItem of data.items) {
                    const reqItem = existing.items.find((i) => i.variantId === approvalItem.variantId);
                    if (!reqItem) {
                        throw new Error(`Variant ${approvalItem.variantId} not found in requisition`);
                    }
                    if (approvalItem.approvedQuantity > reqItem.requestedQuantity) {
                        throw new Error(
                            `Approved quantity (${approvalItem.approvedQuantity}) exceeds requested quantity (${reqItem.requestedQuantity}) for variant ${approvalItem.variantId}`
                        );
                    }
                    if (approvalItem.approvedQuantity < reqItem.requestedQuantity) {
                        isPartial = true;
                    }

                    await tx.purchaseRequisitionItem.update({
                        where: { id: reqItem.id },
                        data: { approvedQuantity: approvalItem.approvedQuantity },
                    });
                }

                // Items not in the approval list are treated as zero-approved
                const approvedVariantIds = new Set(data.items.map((i) => i.variantId));
                const unapprovedItems = existing.items.filter((i) => !approvedVariantIds.has(i.variantId));
                if (unapprovedItems.length > 0) {
                    isPartial = true;
                    for (const item of unapprovedItems) {
                        await tx.purchaseRequisitionItem.update({
                            where: { id: item.id },
                            data: { approvedQuantity: 0 },
                        });
                    }
                }
            } else {
                // Full approval — set all approvedQuantity = requestedQuantity
                for (const item of existing.items) {
                    await tx.purchaseRequisitionItem.update({
                        where: { id: item.id },
                        data: { approvedQuantity: item.requestedQuantity },
                    });
                }
            }

            const status: RequisitionStatus = isPartial ? 'PARTIALLY_APPROVED' : 'APPROVED';

            const updated = await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    status,
                    approvedBy,
                    approvedAt: new Date(),
                    version: { increment: 1 },
                },
                include: REQUISITION_INCLUDE,
            });

            return this.mapRequisition(updated);
        });
    }

    /**
     * Reject a requisition.
     */
    static async rejectRequisition(
        requisitionId: string,
        tenantId: string,
        branchId: string,
        rejectedBy: string,
        data?: RejectRequisitionInput
    ): Promise<PurchaseRequisitionWithItems> {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseRequisition.findFirst({
                where: { id: requisitionId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Requisition not found');
            }
            if (existing.status !== 'PENDING') {
                throw new Error('Only PENDING requisitions can be rejected');
            }

            const updated = await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    status: 'REJECTED',
                    rejectedBy,
                    rejectedAt: new Date(),
                    rejectedReason: data?.rejectedReason,
                    version: { increment: 1 },
                },
                include: REQUISITION_INCLUDE,
            });

            return this.mapRequisition(updated);
        });
    }

    /**
     * Cancel a requisition (only PENDING or APPROVED).
     */
    static async cancelRequisition(
        requisitionId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseRequisition.findFirst({
                where: { id: requisitionId, tenantId, branchId, deletedAt: null },
            });

            if (!existing) {
                throw new Error('Requisition not found');
            }
            if (existing.status === 'CANCELLED') {
                throw new Error('Requisition is already cancelled');
            }
            if (existing.status === 'REJECTED') {
                throw new Error('Cannot cancel a rejected requisition');
            }

            await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    status: 'CANCELLED',
                    version: { increment: 1 },
                },
            });
        });
    }

    /**
     * Get a single requisition by ID.
     */
    static async getRequisitionById(
        requisitionId: string,
        tenantId: string,
        branchId: string
    ): Promise<PurchaseRequisitionWithItems | null> {
        const requisition = await prisma.purchaseRequisition.findFirst({
            where: { id: requisitionId, tenantId, branchId, deletedAt: null },
            include: REQUISITION_INCLUDE,
        });

        if (!requisition) return null;
        return this.mapRequisition(requisition);
    }

    /**
     * List requisitions with filtering and pagination.
     */
    static async listRequisitions(
        tenantId: string,
        branchId: string,
        options?: {
            status?: RequisitionStatus;
            requestedBy?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ requisitions: PurchaseRequisitionWithItems[]; total: number; totalPages: number }> {
        const page = Number(options?.page) || 1;
        const limit = Number(options?.limit) || 50;
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            branchId,
            deletedAt: null,
            ...(options?.status && { status: options.status }),
            ...(options?.requestedBy && { requestedBy: options.requestedBy }),
        };

        const [requisitions, total] = await Promise.all([
            prisma.purchaseRequisition.findMany({
                where,
                include: REQUISITION_INCLUDE,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.purchaseRequisition.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            requisitions: requisitions.map((r) => this.mapRequisition(r)),
            total,
            totalPages,
        };
    }

    /**
     * Soft-delete a requisition and its items.
     */
    static async deleteRequisition(
        requisitionId: string,
        tenantId: string,
        branchId: string
    ): Promise<void> {
        const existing = await prisma.purchaseRequisition.findFirst({
            where: { id: requisitionId, tenantId, branchId, deletedAt: null },
        });

        if (!existing) {
            throw new Error('Requisition not found');
        }

        const now = new Date();

        await prisma.$transaction([
            prisma.purchaseRequisitionItem.updateMany({
                where: { requisitionId },
                data: { deletedAt: now },
            }),
            prisma.purchaseRequisition.update({
                where: { id: requisitionId },
                data: { deletedAt: now },
            }),
        ]);
    }

    // ─── Private Helpers ───────────────────────────────────────────

    /**
     * Generate a sequential requisition number: REQ-YYYYMM-0001
     */
    private static async generateRequisitionNumber(tenantId: string, branchId: string, tx?: any): Promise<string> {
        const db = tx || prisma;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `REQ-${year}${month}`;

        const lastReq = await db.purchaseRequisition.findFirst({
            where: {
                tenantId,
                branchId,
                requisitionNumber: { startsWith: prefix },
            },
            orderBy: { requisitionNumber: 'desc' },
        });

        let sequence = 1;
        if (lastReq) {
            const lastSequence = parseInt(lastReq.requisitionNumber.split('-').pop() || '0');
            sequence = lastSequence + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }

    /**
     * Map a Prisma result to a typed response object.
     */
    private static mapRequisition(r: any): PurchaseRequisitionWithItems {
        return {
            id: r.id,
            tenantId: r.tenantId,
            branchId: r.branchId,
            terminalId: r.terminalId,
            requisitionNumber: r.requisitionNumber,
            requestedBy: r.requestedBy,
            status: r.status,
            notes: r.notes,
            approvedAt: r.approvedAt,
            approvedBy: r.approvedBy,
            rejectedAt: r.rejectedAt,
            rejectedBy: r.rejectedBy,
            rejectedReason: r.rejectedReason,
            version: r.version,
            deletedAt: r.deletedAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            items: r.items.map((item: any) => ({
                id: item.id,
                requisitionId: item.requisitionId,
                variantId: item.variantId,
                tenantId: item.tenantId,
                branchId: item.branchId,
                terminalId: item.terminalId,
                requestedQuantity: item.requestedQuantity,
                approvedQuantity: item.approvedQuantity,
                notes: item.notes,
                version: item.version,
                deletedAt: item.deletedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                variant: item.variant,
            })),
            requestedByUser: r.requestedByUser,
            approvedByUser: r.approvedByUser,
        };
    }
}
