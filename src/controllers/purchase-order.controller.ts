import { Request, Response } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { PurchaseOrderService } from '../services/inventory/purchase-order.service';
import { ProcurementAuditService } from '../services/procurement-audit.service';

const VALID_STATUSES = ['PENDING', 'DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;
type PurchaseOrderStatus = (typeof VALID_STATUSES)[number];

export class PurchaseOrderController extends BaseController {
    /**
     * Create a purchase order (DRAFT).
     */
    static async createPurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const data = { ...req.body, createdBy: req.auth?.userId };
            const purchaseOrder = await PurchaseOrderService.createPurchaseOrder(
                data,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 201, true, 'Purchase order created successfully', purchaseOrder);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create purchase order', undefined, error.message);
        }
    }

    /**
     * Create a PO from an approved requisition.
     */
    static async createFromRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId, supplierId, itemPrices, expectedDeliveryDate, notes } = req.body;
            const purchaseOrder = await PurchaseOrderService.createFromRequisition(
                requisitionId as string,
                supplierId as string,
                itemPrices,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId,
                { expectedDeliveryDate, notes }
            );
            BaseController.sendResponse(res, 201, true, 'Purchase order created from requisition successfully', purchaseOrder);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create purchase order from requisition', undefined, error.message);
        }
    }

    /**
     * Update a DRAFT purchase order.
     */
    static async updatePurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            const purchaseOrder = await PurchaseOrderService.updatePurchaseOrder(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );
            BaseController.sendResponse(res, 200, true, 'Purchase order updated successfully', purchaseOrder);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update purchase order', undefined, error.message);
        }
    }

    /**
     * Send a DRAFT PO (DRAFT → SENT).
     */
    static async sendPurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            const purchaseOrder = await PurchaseOrderService.sendPurchaseOrder(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'send', 'PurchaseOrder', purchaseOrder.id, purchaseOrder.poNumber,
                'DRAFT', 'SENT'
            );

            BaseController.sendResponse(res, 200, true, 'Purchase order sent successfully', purchaseOrder);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to send purchase order', undefined, error.message);
        }
    }

    /**
     * Receive a purchase order (SENT → RECEIVED / PARTIALLY_RECEIVED).
     */
    static async receivePurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            const data = { ...req.body, receivedBy: req.auth?.userId };
            const purchaseOrder = await PurchaseOrderService.receivePurchaseOrder(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                data
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'receive', 'PurchaseOrder', purchaseOrder.id, purchaseOrder.poNumber,
                'SENT', purchaseOrder.status,
                { itemCount: data.items?.length }
            );

            BaseController.sendResponse(res, 200, true, 'Purchase order received successfully', purchaseOrder);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to receive purchase order', undefined, error.message);
        }
    }

    /**
     * Get purchase order by ID.
     */
    static async getPurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            const purchaseOrder = await PurchaseOrderService.getPurchaseOrderById(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            if (!purchaseOrder) {
                BaseController.sendResponse(res, 404, false, 'Purchase order not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Purchase order retrieved successfully', purchaseOrder);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get purchase order', undefined, error.message);
        }
    }

    /**
     * List purchase orders with filtering and pagination.
     */
    static async listPurchaseOrders(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, supplierId, requisitionId, page, limit } = req.query;

            const validatedStatus = status && VALID_STATUSES.includes(status as PurchaseOrderStatus)
                ? (status as PurchaseOrderStatus)
                : undefined;

            if (status && !validatedStatus) {
                BaseController.sendResponse(res, 400, false, `Invalid status. Valid values are: ${VALID_STATUSES.join(', ')}`);
                return;
            }

            const result = await PurchaseOrderService.listPurchaseOrders(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    status: validatedStatus,
                    supplierId: supplierId as string,
                    requisitionId: requisitionId as string,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Purchase orders retrieved successfully', {
                orders: result.orders,
                pagination: {
                    currentPage: page ? parseInt(page as string) : 1,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage: limit ? parseInt(limit as string) : 50,
                },
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list purchase orders', undefined, error.message);
        }
    }

    /**
     * Cancel a purchase order (DRAFT / SENT → CANCELLED).
     */
    static async cancelPurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            await PurchaseOrderService.cancelPurchaseOrder(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 200, true, 'Purchase order cancelled successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to cancel purchase order', undefined, error.message);
        }
    }

    /**
     * Soft-delete a purchase order (DRAFT / CANCELLED only).
     */
    static async deletePurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            await PurchaseOrderService.deletePurchaseOrder(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 200, true, 'Purchase order deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete purchase order', undefined, error.message);
        }
    }
}
