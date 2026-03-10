import { Request, Response } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { PurchaseOrderService } from '../services/inventory/purchase-order.service';
import { PurchaseOrderStatus } from '../databases/prisma/generated/prisma/client';

export class PurchaseOrderController extends BaseController {
    /**
     * Create a purchase order
     */
    static async createPurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const data = {
                ...req.body,
                createdBy: req.auth?.userId,
            };
            const purchaseOrder = await PurchaseOrderService.createPurchaseOrder(data, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);
            BaseController.sendResponse(
                res,
                201,
                true,
                'Purchase order created successfully',
                purchaseOrder
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to create purchase order',
                undefined,
                error.message
            );
        }
    }

    /**
     * Receive a purchase order
     */
    static async receivePurchaseOrder(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;

            const data = {
                ...req.body,
                receivedBy: req.auth?.userId,
            };

            const purchaseOrder = await PurchaseOrderService.receivePurchaseOrder(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                data
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Purchase order received successfully',
                purchaseOrder
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to receive purchase order',
                undefined,
                error.message
            );
        }
    }

    /**
     * Get purchase order by ID
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

            BaseController.sendResponse(
                res,
                200,
                true,
                'Purchase order retrieved successfully',
                purchaseOrder
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to get purchase order',
                undefined,
                error.message
            );
        }
    }

    /**
     * List purchase orders
     */
    static async listPurchaseOrders(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, supplierId, page, limit } = req.query;

            // Validate status if provided
            const validStatuses = Object.values(PurchaseOrderStatus);
            const validatedStatus = status && validStatuses.includes(status as PurchaseOrderStatus)
                ? (status as PurchaseOrderStatus)
                : undefined;

            if (status && !validatedStatus) {
                BaseController.sendResponse(
                    res,
                    400,
                    false,
                    `Invalid status. Valid values are: ${validStatuses.join(', ')}`
                );
                return;
            }

            const result = await PurchaseOrderService.listPurchaseOrders(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    status: validatedStatus,
                    supplierId: supplierId as string,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Purchase orders retrieved successfully',
                {
                    orders: result.orders,
                    pagination: {
                        currentPage: page ? parseInt(page as string) : 1,
                        totalPages: result.totalPages,
                        totalItems: result.total,
                        itemsPerPage: limit ? parseInt(limit as string) : 50
                    }
                }
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to list purchase orders',
                undefined,
                error.message
            );
        }
    }

    /**
     * Cancel a purchase order
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
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to cancel purchase order',
                undefined,
                error.message
            );
        }
    }
}
