import { Request, Response } from 'express';
import { formatCurrency } from '../utils';
import { AnalyticsModel } from '../models/analytics.model';
import { AuthRequest } from '../lib/express.type';

export class AnalyticsController {
    // Helper method to extract tenant context from authenticated request
    private static getAuthContext(req: Request & AuthRequest) {
        return {
            tenantId: req.auth?.tenantId || '',
            branchId: req.auth?.branchId || '',
            userId: req.auth?.userId || ''
        };
    }

    // GET /monthly-sales/:monthYear
    static async getMonthlySales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = AnalyticsController.getAuthContext(req);
            const monthYear = req.params.monthYear as string;
            const [year, month] = monthYear.split('-').map(Number);

            const salesData = await AnalyticsModel.getMonthlySalesData(
                auth.tenantId,
                auth.branchId,
                year,
                month
            );

            res.json(salesData);
        } catch (error) {
            console.error('Error fetching monthly sales data:', error);
            res.status(500).json({
                error: 'Failed to fetch monthly sales data',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // GET /transactions/:limit/:offset
    static async getTransactions(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = AnalyticsController.getAuthContext(req);
            const limit = parseInt(req.params.limit as string);
            const offset = parseInt(req.params.offset as string) || 0;
            const includeItems = req.query.includeItems === 'true';

            const result = await AnalyticsModel.getUserTransactions(
                auth.tenantId,
                auth.branchId,
                limit,
                offset,
                includeItems
            );

            res.json(result);
        } catch (error) {
            console.error('Error fetching user transactions:', error);
            res.status(500).json({
                error: 'Failed to fetch user transactions',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // GET /top-products
    static async getTopProducts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = AnalyticsController.getAuthContext(req);
            const topProducts = await AnalyticsModel.getTopProducts(auth.tenantId, auth.branchId);
            res.json(topProducts);
        } catch (error) {
            console.error('Error fetching top products:', error);
            res.status(500).json({
                error: 'Failed to fetch top products',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // GET /counts
    static async getCounts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = AnalyticsController.getAuthContext(req);
            const dashboardCounts = await AnalyticsModel.getDashboardCounts(auth.tenantId, auth.branchId);

            const formattedCounts = {
                ...dashboardCounts,
                totalSales: formatCurrency(parseFloat(dashboardCounts.totalSales)),
            };

            res.json(formattedCounts);
        } catch (error) {
            console.error('Error fetching dashboard counts:', error);
            res.status(500).json({
                error: 'Failed to fetch dashboard counts',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // GET /transaction/:transactionId/items
    static async getTransactionItems(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = AnalyticsController.getAuthContext(req);
            const transactionId = req.params.transactionId as string;
            const result = await AnalyticsModel.getTransactionItems(transactionId, auth.tenantId, auth.branchId);

            if (!result.transaction) {
                res.status(404).json({
                    error: 'Transaction not found',
                });
                return;
            }

            res.json(result);
        } catch (error) {
            console.error('Error fetching transaction items:', error);
            res.status(500).json({
                error: 'Failed to fetch transaction items',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // GET /transaction/:transactionId/details
    static async getTransactionDetails(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const auth = AnalyticsController.getAuthContext(req);
            const transactionId = req.params.transactionId as string;
            const result = await AnalyticsModel.getTransactionDetails(transactionId, auth.tenantId, auth.branchId);

            if (!result.transaction) {
                res.status(404).json({
                    error: 'Transaction not found',
                });
                return;
            }

            res.json(result);
        } catch (error) {
            console.error('Error fetching transaction details:', error);
            res.status(500).json({
                error: 'Failed to fetch transaction details',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
