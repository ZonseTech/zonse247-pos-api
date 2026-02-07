import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ReportService } from '../services/report.service';
import { AuthRequest } from '../lib/express.type';

export class ReportController extends BaseController {
    /**
     * Get report summary
     * GET /reports/summary
     */
    static async getSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;

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
            const tenantId = req.auth.tenantId;
            const branchId = (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;

            const report = await ReportService.getTotalSales(tenantId, branchId, startDate, endDate);

            BaseController.sendResponse(res, 200, true, 'Total sales report retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve total sales report', undefined, error.message);
        }
    }
}
