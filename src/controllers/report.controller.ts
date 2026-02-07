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
     * Get gross profit report (hourly, weekly, monthly)
     * GET /reports/gross-profit
     */
    static async getGrossProfit(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { tenantId, branchId, startDate, endDate } = this.getReportParams(req);
            const report = await ReportService.getGrossProfit(tenantId, branchId, startDate, endDate);
            BaseController.sendResponse(res, 200, true, 'Gross profit report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve gross profit report', undefined, error.message);
        }
    }
}
