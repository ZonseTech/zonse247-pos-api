import { Request, Response } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { GoodsReceiptService } from '../services/inventory/goods-receipt.service';
import { ProcurementAuditService } from '../services/procurement-audit.service';

const VALID_STATUSES = ['DRAFT', 'VERIFIED', 'POSTED', 'CANCELLED'] as const;
type GRNStatus = (typeof VALID_STATUSES)[number];

export class GoodsReceiptController extends BaseController {
    /**
     * Create a GRN in DRAFT status against a PO.
     */
    static async createGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const grn = await GoodsReceiptService.createGoodsReceipt(
                req.body,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId
            );

            await ProcurementAuditService.logCreate(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'GoodsReceipt', grn.id, grn.receiptNumber,
                { purchaseOrderId: grn.purchaseOrderId, itemCount: grn.items.length }
            );

            BaseController.sendResponse(res, 201, true, 'Goods receipt created successfully', grn);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create goods receipt', undefined, error.message);
        }
    }

    /**
     * Update a DRAFT GRN.
     */
    static async updateGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { goodsReceiptId } = req.params;
            const grn = await GoodsReceiptService.updateGoodsReceipt(
                goodsReceiptId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );
            BaseController.sendResponse(res, 200, true, 'Goods receipt updated successfully', grn);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update goods receipt', undefined, error.message);
        }
    }

    /**
     * Verify a DRAFT GRN (DRAFT → VERIFIED).
     */
    static async verifyGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { goodsReceiptId } = req.params;
            const grn = await GoodsReceiptService.verifyGoodsReceipt(
                goodsReceiptId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body?.notes
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'verify', 'GoodsReceipt', grn.id, grn.receiptNumber,
                'DRAFT', 'VERIFIED'
            );

            BaseController.sendResponse(res, 200, true, 'Goods receipt verified successfully', grn);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to verify goods receipt', undefined, error.message);
        }
    }

    /**
     * Post a VERIFIED GRN (VERIFIED → POSTED). Updates stock.
     */
    static async postGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { goodsReceiptId } = req.params;
            const grn = await GoodsReceiptService.postGoodsReceipt(
                goodsReceiptId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId,
                req.body?.notes
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'post', 'GoodsReceipt', grn.id, grn.receiptNumber,
                'VERIFIED', 'POSTED',
                { purchaseOrderId: grn.purchaseOrderId, itemCount: grn.items.length }
            );

            BaseController.sendResponse(res, 200, true, 'Goods receipt posted successfully — stock updated', grn);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to post goods receipt', undefined, error.message);
        }
    }

    /**
     * Cancel a GRN (DRAFT or VERIFIED only).
     */
    static async cancelGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { goodsReceiptId } = req.params;
            await GoodsReceiptService.cancelGoodsReceipt(
                goodsReceiptId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'cancel', 'GoodsReceipt', goodsReceiptId as string, goodsReceiptId as string,
                'DRAFT/VERIFIED', 'CANCELLED'
            );

            BaseController.sendResponse(res, 200, true, 'Goods receipt cancelled successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to cancel goods receipt', undefined, error.message);
        }
    }

    /**
     * Get GRN by ID.
     */
    static async getGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { goodsReceiptId } = req.params;
            const grn = await GoodsReceiptService.getGoodsReceiptById(
                goodsReceiptId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            if (!grn) {
                BaseController.sendResponse(res, 404, false, 'Goods receipt not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Goods receipt retrieved successfully', grn);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get goods receipt', undefined, error.message);
        }
    }

    /**
     * List GRNs with filtering and pagination.
     */
    static async listGoodsReceipts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, purchaseOrderId, page, limit } = req.query;

            const validatedStatus = status && VALID_STATUSES.includes(status as GRNStatus)
                ? (status as GRNStatus)
                : undefined;

            if (status && !validatedStatus) {
                BaseController.sendResponse(res, 400, false, `Invalid status. Valid values are: ${VALID_STATUSES.join(', ')}`);
                return;
            }

            const result = await GoodsReceiptService.listGoodsReceipts(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    status: validatedStatus,
                    purchaseOrderId: purchaseOrderId as string,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Goods receipts retrieved successfully', {
                receipts: result.receipts,
                pagination: {
                    currentPage: page ? parseInt(page as string) : 1,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage: limit ? parseInt(limit as string) : 50,
                },
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list goods receipts', undefined, error.message);
        }
    }

    /**
     * Soft-delete a GRN (DRAFT or CANCELLED only).
     */
    static async deleteGoodsReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { goodsReceiptId } = req.params;
            await GoodsReceiptService.deleteGoodsReceipt(
                goodsReceiptId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 200, true, 'Goods receipt deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete goods receipt', undefined, error.message);
        }
    }
}
