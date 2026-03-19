import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../lib/express.type';
import { BaseController } from './base.controller';
import { SupplierPaymentService } from '../services/inventory';
import { ProcurementAuditService } from '../services/procurement-audit.service';

export class SupplierPaymentController extends BaseController {
    /**
     * POST /supplier-payments
     * Record a payment with allocations to one or more invoices.
     */
    static async createPayment(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const payment = await SupplierPaymentService.createSupplierPayment(
                req.body,
                tenantId,
                branchId
            );

            await ProcurementAuditService.logPayment(
                { tenantId, branchId, userId: req.auth.userId },
                'pay', payment.id, payment.paymentNumber,
                { amount: payment.amount, supplierId: payment.supplierId, allocations: payment.allocations.length }
            );

            BaseController.sendResponse(res, 201, true, 'Supplier payment recorded', payment);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /supplier-payments/:paymentId/void
     * Void a completed payment — reverses all invoice allocations.
     */
    static async voidPayment(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { paymentId } = req.params as { paymentId: string };

            await SupplierPaymentService.voidSupplierPayment(
                paymentId,
                tenantId,
                branchId,
                req.body.reason
            );

            await ProcurementAuditService.logPayment(
                { tenantId, branchId, userId: req.auth.userId },
                'void', paymentId, paymentId,
                { reason: req.body.reason }
            );

            BaseController.sendResponse(res, 200, true, 'Supplier payment voided');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /supplier-payments/:paymentId
     */
    static async getPayment(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { paymentId } = req.params as { paymentId: string };

            const payment = await SupplierPaymentService.getSupplierPaymentById(
                paymentId,
                tenantId,
                branchId
            );

            if (!payment) {
                BaseController.sendResponse(res, 404, false, 'Payment not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Payment retrieved', payment);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /supplier-payments
     */
    static async listPayments(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const result = await SupplierPaymentService.listSupplierPayments(
                tenantId,
                branchId,
                req.query as any
            );

            BaseController.sendResponse(res, 200, true, 'Payments listed', result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /supplier-payments/invoice/:invoiceId
     * List payments allocated to a specific invoice.
     */
    static async getPaymentsForInvoice(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { invoiceId } = req.params as { invoiceId: string };

            const payments = await SupplierPaymentService.getPaymentsForInvoice(
                invoiceId,
                tenantId,
                branchId
            );

            BaseController.sendResponse(res, 200, true, 'Invoice payments retrieved', payments);
        } catch (error) {
            next(error);
        }
    }
}
