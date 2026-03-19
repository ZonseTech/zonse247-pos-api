import { Request, Response } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { SupplierReturnService } from '../services/inventory/supplier-return.service';
import { ProcurementAuditService } from '../services/procurement-audit.service';

export class SupplierReturnController extends BaseController {
    /**
     * Create a supplier return in DRAFT status.
     */
    static async createSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const sr = await SupplierReturnService.createSupplierReturn(
                req.body,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId
            );

            await ProcurementAuditService.logCreate(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'SupplierReturn', sr.id, sr.returnNumber,
                { supplierId: sr.supplierId, itemCount: sr.items.length, totalAmount: sr.totalAmount }
            );

            BaseController.sendResponse(res, 201, true, 'Supplier return created successfully', sr);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create supplier return', undefined, error.message);
        }
    }

    /**
     * Update a DRAFT supplier return.
     */
    static async updateSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            const sr = await SupplierReturnService.updateSupplierReturn(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );
            BaseController.sendResponse(res, 200, true, 'Supplier return updated successfully', sr);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update supplier return', undefined, error.message);
        }
    }

    /**
     * Approve a DRAFT supplier return (DRAFT → APPROVED).
     */
    static async approveSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            const sr = await SupplierReturnService.approveSupplierReturn(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body?.notes
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'approve', 'SupplierReturn', sr.id, sr.returnNumber,
                'DRAFT', 'APPROVED'
            );

            BaseController.sendResponse(res, 200, true, 'Supplier return approved successfully', sr);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to approve supplier return', undefined, error.message);
        }
    }

    /**
     * Ship an APPROVED supplier return (APPROVED → SHIPPED).
     */
    static async shipSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            const sr = await SupplierReturnService.shipSupplierReturn(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body?.notes
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'ship', 'SupplierReturn', sr.id, sr.returnNumber,
                'APPROVED', 'SHIPPED'
            );

            BaseController.sendResponse(res, 200, true, 'Supplier return shipped successfully', sr);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to ship supplier return', undefined, error.message);
        }
    }

    /**
     * Complete a supplier return (APPROVED|SHIPPED → COMPLETED).
     * Stock impact happens here: inventory reduced, WAC adjusted, credit note generated.
     */
    static async completeSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            const sr = await SupplierReturnService.completeSupplierReturn(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.auth.userId,
                req.body?.notes
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'complete', 'SupplierReturn', sr.id, sr.returnNumber,
                sr.status === 'COMPLETED' ? 'APPROVED/SHIPPED' : 'APPROVED/SHIPPED', 'COMPLETED',
                { totalAmount: sr.totalAmount, itemCount: sr.items.length }
            );

            BaseController.sendResponse(res, 200, true, 'Supplier return completed — stock adjusted, credit note generated', sr);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to complete supplier return', undefined, error.message);
        }
    }

    /**
     * Cancel a supplier return (DRAFT|APPROVED → CANCELLED).
     */
    static async cancelSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            const sr = await SupplierReturnService.cancelSupplierReturn(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body?.notes
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'cancel', 'SupplierReturn', sr.id, sr.returnNumber,
                'DRAFT/APPROVED', 'CANCELLED'
            );

            BaseController.sendResponse(res, 200, true, 'Supplier return cancelled', sr);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to cancel supplier return', undefined, error.message);
        }
    }

    /**
     * Get a single supplier return.
     */
    static async getSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            const sr = await SupplierReturnService.getSupplierReturnById(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            if (!sr) {
                BaseController.sendNotFound(res, 'Supplier return not found');
                return;
            }
            BaseController.sendSuccess(res, 'Supplier return retrieved successfully', sr);
        } catch (error: any) {
            BaseController.sendServerError(res, 'Failed to retrieve supplier return', error.message);
        }
    }

    /**
     * List supplier returns with filters.
     */
    static async listSupplierReturns(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const result = await SupplierReturnService.listSupplierReturns(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.query as any
            );
            BaseController.sendSuccess(res, 'Supplier returns retrieved successfully', result);
        } catch (error: any) {
            BaseController.sendServerError(res, 'Failed to list supplier returns', error.message);
        }
    }

    /**
     * Delete a DRAFT supplier return (soft delete).
     */
    static async deleteSupplierReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierReturnId } = req.params;
            await SupplierReturnService.deleteSupplierReturn(
                supplierReturnId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendSuccess(res, 'Supplier return deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete supplier return', undefined, error.message);
        }
    }

    // ─── Credit Note Endpoints ─────────────────────────────────────

    /**
     * Apply a credit note to a supplier invoice.
     */
    static async applyCreditNote(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { creditNoteId } = req.params;
            const cn = await SupplierReturnService.applyCreditNote(
                creditNoteId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );

            await ProcurementAuditService.logPayment(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'SupplierCreditNote', cn.id, cn.creditNoteNumber,
                cn.amount,
                { appliedToInvoiceId: cn.appliedToInvoiceId, supplierId: cn.supplierId }
            );

            BaseController.sendSuccess(res, 'Credit note applied to invoice successfully', cn);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to apply credit note', undefined, error.message);
        }
    }

    /**
     * List credit notes with filters.
     */
    static async listCreditNotes(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const result = await SupplierReturnService.listCreditNotes(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.query as any
            );
            BaseController.sendSuccess(res, 'Credit notes retrieved successfully', result);
        } catch (error: any) {
            BaseController.sendServerError(res, 'Failed to list credit notes', error.message);
        }
    }
}
