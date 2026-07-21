import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { DashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../lib/express.type';
import { DashboardFilters } from '../types/dashboard';

export class DashboardController extends BaseController {
    /**
     * Extract common dashboard filters from request
     */
    private static getFilters(req: Request & AuthRequest): DashboardFilters {
        return {
            tenantId: req.auth.tenantId,
            branchId: (req.query.branchId as string) || req.auth.activeBranchId || req.auth.branchId,
        };
    }

    /**
     * Get dashboard summary (revenue, sales count, gross profit, deltas)
     * GET /dashboard/summary
     */
    static async getSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const summary = await DashboardService.getSummary(this.getFilters(req));
            BaseController.sendResponse(res, 200, true, 'Dashboard summary retrieved successfully', summary);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve dashboard summary', undefined, error.message);
        }
    }

    /**
     * Get revenue trend for the last 7 days
     * GET /dashboard/revenue-trend
     */
    static async getRevenueTrend(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const report = await DashboardService.getRevenueTrend(this.getFilters(req));
            BaseController.sendResponse(res, 200, true, 'Revenue trend retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve revenue trend', undefined, error.message);
        }
    }

    /**
     * Get today's revenue grouped by payment method
     * GET /dashboard/payment-methods
     */
    static async getPaymentMethodsBreakdown(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const report = await DashboardService.getPaymentMethodsBreakdown(this.getFilters(req));
            BaseController.sendResponse(res, 200, true, 'Payment methods breakdown retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve payment methods breakdown', undefined, error.message);
        }
    }

    /**
     * Get the top 10 best-selling products
     * GET /dashboard/top-products
     */
    static async getTopSellingProducts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const report = await DashboardService.getTopSellingProducts(this.getFilters(req));
            BaseController.sendResponse(res, 200, true, 'Top selling products retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve top selling products', undefined, error.message);
        }
    }

    /**
     * Get the most recent sales
     * GET /dashboard/recent-sales
     */
    static async getRecentSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const report = await DashboardService.getRecentSales(this.getFilters(req));
            BaseController.sendResponse(res, 200, true, 'Recent sales retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve recent sales', undefined, error.message);
        }
    }

    /**
     * Get inventory items at or below their reorder point
     * GET /dashboard/low-stock
     */
    static async getLowStockAlerts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const report = await DashboardService.getLowStockAlerts(this.getFilters(req));
            BaseController.sendResponse(res, 200, true, 'Low stock alerts retrieved successfully', report);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to retrieve low stock alerts', undefined, error.message);
        }
    }
}
