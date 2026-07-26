import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ReportService } from '../services/report.service';
import { AuthRequest } from '../lib/express.type';

interface ReportParams {
    tenantId: string;
    branchId: string;
    startDate?: string;
    endDate?: string;
}

export class ReportController extends BaseController {
    /**
     * Extract common report parameters from request
     */
    private static getReportParams(req: Request & AuthRequest): ReportParams {
        return {
            tenantId: req.auth.tenantId,
            branchId: (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
        };
    }

    /**
     * Get report summary
     * GET /reports/summary
     */
    static async getSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const summary = await ReportService.getSummary(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Report summary retrieved successfully', summary);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve report summary', undefined, error.message);
        }
    }

    /**
     * Get total sales report (hourly, weekly, monthly)
     * GET /reports/total-sales
     */
    static async getTotalSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getTotalSales(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Total sales report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve total sales report', undefined, error.message);
        }
    }

    /**
     * Get net profit report (hourly, weekly, monthly)
     * GET /reports/net-profit
     */
    static async getNetProfit(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getNetProfit(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Net profit report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve net profit report', undefined, error.message);
        }
    }

    /**
     * Get receipt count report (hourly, weekly, monthly)
     * GET /reports/receipt-count
     */
    static async getReceiptCount(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getReceiptCount(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Receipt count report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve receipt count report', undefined, error.message);
        }
    }

    /**
     * Get payment modes report
     * GET /reports/payment-modes
     */
    static async getPaymentModes(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getPaymentModes(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Payment modes report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve payment modes report', undefined, error.message);
        }
    }

    /**
     * Get top stocks report
     * GET /reports/top-stocks
     */
    static async getTopStocks(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getTopStocks(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Top stocks report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve top stocks report', undefined, error.message);
        }
    }

    /**
     * Get top categories report
     * GET /reports/top-categories
     */
    static async getTopCategories(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getTopCategories(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Top categories report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve top categories report', undefined, error.message);
        }
    }

    /**
     * Get approved expenses report (hourly, weekly, monthly)
     * GET /reports/expenses-trend
     */
    static async getExpensesTrend(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getExpensesTrend(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Expenses trend report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve expenses trend report', undefined, error.message);
        }
    }

    /**
     * Get approved expenses grouped by category
     * GET /reports/expenses-by-category
     */
    static async getExpensesByCategory(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getExpensesByCategory(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Expenses by category report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve expenses by category report', undefined, error.message);
        }
    }
}
