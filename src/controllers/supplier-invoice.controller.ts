import { Request, Response } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { SupplierInvoiceService } from '../services/inventory/supplier-invoice.service';
import { ProcurementAuditService } from '../services/procurement-audit.service';

const VALID_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED'] as const;
type InvoiceStatus = (typeof VALID_STATUSES)[number];

export class SupplierInvoiceController extends BaseController {
    /**
     * Create a supplier invoice.
     */
    static async createInvoice(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const invoice = await SupplierInvoiceService.createSupplierInvoice(
                req.body,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            await ProcurementAuditService.logCreate(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'SupplierInvoice', invoice.id, invoice.invoiceNumber,
                { supplierId: invoice.supplierId, purchaseOrderId: invoice.purchaseOrderId, totalAmount: invoice.totalAmount }
            );

            BaseController.sendResponse(res, 201, true, 'Supplier invoice created successfully', invoice);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create supplier invoice', undefined, error.message);
        }
    }

    /**
     * Update a PENDING invoice.
     */
    static async updateInvoice(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params;
            const invoice = await SupplierInvoiceService.updateSupplierInvoice(
                invoiceId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );
            BaseController.sendResponse(res, 200, true, 'Supplier invoice updated successfully', invoice);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update supplier invoice', undefined, error.message);
        }
    }

    /**
     * 3-way match for a purchase order.
     */
    static async threeWayMatch(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { purchaseOrderId } = req.params;
            const results = await SupplierInvoiceService.threeWayMatch(
                purchaseOrderId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            const allMatch = results.every((r) => r.match);

            BaseController.sendResponse(res, 200, true, 'Three-way match completed', {
                purchaseOrderId,
                allMatch,
                items: results,
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to perform three-way match', undefined, error.message);
        }
    }

    /**
     * Cancel a PENDING invoice.
     */
    static async cancelInvoice(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params;
            await SupplierInvoiceService.cancelSupplierInvoice(
                invoiceId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'cancel', 'SupplierInvoice', invoiceId as string, invoiceId as string,
                'PENDING', 'CANCELLED'
            );

            BaseController.sendResponse(res, 200, true, 'Supplier invoice cancelled successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to cancel supplier invoice', undefined, error.message);
        }
    }

    /**
     * Mark a PENDING invoice as DISPUTED.
     */
    static async disputeInvoice(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params;
            const invoice = await SupplierInvoiceService.disputeSupplierInvoice(
                invoiceId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body?.reason
            );

            await ProcurementAuditService.logStatusChange(
                { tenantId: req.auth.tenantId, branchId: req.auth.activeBranchId || req.auth.branchId, userId: req.auth.userId },
                'dispute', 'SupplierInvoice', invoice.id, invoice.invoiceNumber,
                'PENDING', 'DISPUTED',
                { reason: req.body?.reason }
            );

            BaseController.sendResponse(res, 200, true, 'Supplier invoice marked as disputed', invoice);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to dispute supplier invoice', undefined, error.message);
        }
    }

    /**
     * Get invoice by ID.
     */
    static async getInvoice(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params;
            const invoice = await SupplierInvoiceService.getSupplierInvoiceById(
                invoiceId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            if (!invoice) {
                BaseController.sendResponse(res, 404, false, 'Supplier invoice not found');
                return;
            }
            BaseController.sendResponse(res, 200, true, 'Supplier invoice retrieved successfully', invoice);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get supplier invoice', undefined, error.message);
        }
    }

    /**
     * List invoices with filtering and pagination.
     */
    static async listInvoices(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, supplierId, purchaseOrderId, page, limit } = req.query;

            const validatedStatus = status && VALID_STATUSES.includes(status as InvoiceStatus)
                ? (status as InvoiceStatus)
                : undefined;

            if (status && !validatedStatus) {
                BaseController.sendResponse(res, 400, false, `Invalid status. Valid values are: ${VALID_STATUSES.join(', ')}`);
                return;
            }

            const result = await SupplierInvoiceService.listSupplierInvoices(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    status: validatedStatus,
                    supplierId: supplierId as string,
                    purchaseOrderId: purchaseOrderId as string,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Supplier invoices retrieved successfully', {
                invoices: result.invoices,
                pagination: {
                    currentPage: page ? parseInt(page as string) : 1,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage: limit ? parseInt(limit as string) : 50,
                },
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list supplier invoices', undefined, error.message);
        }
    }

    /**
     * Get outstanding balance for a supplier.
     */
    static async getSupplierBalance(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierId } = req.params;
            const balance = await SupplierInvoiceService.getSupplierBalance(
                supplierId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 200, true, 'Supplier balance retrieved successfully', balance);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get supplier balance', undefined, error.message);
        }
    }

    /**
     * Soft-delete an invoice (PENDING / CANCELLED only).
     */
    static async deleteInvoice(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params;
            await SupplierInvoiceService.deleteSupplierInvoice(
                invoiceId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );
            BaseController.sendResponse(res, 200, true, 'Supplier invoice deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete supplier invoice', undefined, error.message);
        }
    }
}
