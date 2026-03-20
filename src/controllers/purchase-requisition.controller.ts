import { Request, Response } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { PurchaseRequisitionService } from '../services/inventory/purchase-requisition.service';
import { ProcurementAuditService } from '../services/procurement-audit.service';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED'] as const;
type RequisitionStatus = (typeof VALID_STATUSES)[number];

export class PurchaseRequisitionController extends BaseController {
    static async createRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const requisition = await PurchaseRequisitionService.createRequisition(
                req.body,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId
            );
            BaseController.sendResponse(res, 201, true, 'Purchase requisition created successfully', requisition);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create purchase requisition', undefined, error.message);
        }
    }

    static async updateRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.params;
            const requisition = await PurchaseRequisitionService.updateRequisition(
                requisitionId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );
            BaseController.sendResponse(res, 200, true, 'Purchase requisition updated successfully', requisition);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update purchase requisition', undefined, error.message);
        }
    }

    static async approveRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.params;
            const requisition = await PurchaseRequisitionService.approveRequisition(
                requisitionId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId,
                req.body
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'approve', 'PurchaseRequisition', requisition.id, requisition.requisitionNumber,
                'PENDING', requisition.status
            );

            BaseController.sendResponse(res, 200, true, 'Purchase requisition approved successfully', requisition);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to approve purchase requisition', undefined, error.message);
        }
    }

    static async rejectRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.params;
            const requisition = await PurchaseRequisitionService.rejectRequisition(
                requisitionId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId,
                req.body
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'reject', 'PurchaseRequisition', requisition.id, requisition.requisitionNumber,
                'PENDING', 'REJECTED',
                { reason: req.body?.rejectedReason }
            );

            BaseController.sendResponse(res, 200, true, 'Purchase requisition rejected successfully', requisition);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to reject purchase requisition', undefined, error.message);
        }
    }

    static async cancelRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.params;
            await PurchaseRequisitionService.cancelRequisition(
                requisitionId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'cancel', 'PurchaseRequisition', requisitionId as string, requisitionId as string,
                'PENDING/APPROVED', 'CANCELLED'
            );

            BaseController.sendResponse(res, 200, true, 'Purchase requisition cancelled successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to cancel purchase requisition', undefined, error.message);
        }
    }

    static async getRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.params;
            const requisition = await PurchaseRequisitionService.getRequisitionById(
                requisitionId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            if (!requisition) {
                BaseController.sendResponse(res, 404, false, 'Purchase requisition not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Purchase requisition retrieved successfully', requisition);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get purchase requisition', undefined, error.message);
        }
    }

    static async listRequisitions(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, requestedBy, page, limit } = req.query;

            const validStatuses = VALID_STATUSES;
            const validatedStatus = status && validStatuses.includes(status as RequisitionStatus)
                ? (status as RequisitionStatus)
                : undefined;

            if (status && !validatedStatus) {
                BaseController.sendResponse(res, 400, false, `Invalid status. Valid values are: ${validStatuses.join(', ')}`);
                return;
            }

            const result = await PurchaseRequisitionService.listRequisitions(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    status: validatedStatus,
                    requestedBy: requestedBy as string,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Purchase requisitions retrieved successfully', {
                requisitions: result.requisitions,
                pagination: {
                    currentPage: page ? parseInt(page as string) : 1,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage: limit ? parseInt(limit as string) : 50,
                },
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list purchase requisitions', undefined, error.message);
        }
    }

    static async deleteRequisition(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.params;
            await PurchaseRequisitionService.deleteRequisition(
                requisitionId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 200, true, 'Purchase requisition deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete purchase requisition', undefined, error.message);
        }
    }
}
