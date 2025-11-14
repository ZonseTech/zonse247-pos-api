import { Request, Response } from 'express';
import { formatCurrency } from '../utils';
import { AnalyticsModel } from '../models/analytics.model';

export class AnalyticsController {
    // GET /monthly-sales/:userUuid/:monthYear
    static async getMonthlySales(req: Request, res: Response): Promise<void> {
        try {
            const userUuid = req.params.userUuid;
            const monthYear = req.params.monthYear;
            const [year, month] = monthYear.split('-').map(Number);

            const salesData = await AnalyticsModel.getMonthlySalesData(
                userUuid,
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

    // GET /transactions/:userUuid/:limit/:offset
    static async getTransactions(req: Request, res: Response): Promise<void> {
        try {
            const userUuid = req.params.userUuid;
            const limit = parseInt(req.params.limit);
            const offset = parseInt(req.params.offset) || 0;
            const includeItems = req.query.includeItems === 'true';

            const result = await AnalyticsModel.getUserTransactions(
                userUuid,
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
    static async getTopProducts(req: Request, res: Response): Promise<void> {
        try {
            const topProducts = await AnalyticsModel.getTopProducts();
            res.json(topProducts);
        } catch (error) {
            console.error('Error fetching top products:', error);
            res.status(500).json({
                error: 'Failed to fetch top products',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // GET /counts/:userUuid
    static async getCounts(req: Request, res: Response): Promise<void> {
        try {
            const userUuid = req.params.userUuid;
            const dashboardCounts = await AnalyticsModel.getDashboardCounts(userUuid);

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
    static async getTransactionItems(req: Request, res: Response): Promise<void> {
        try {
            const transactionId = req.params.transactionId;
            const result = await AnalyticsModel.getTransactionItems(transactionId);

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
    static async getTransactionDetails(req: Request, res: Response): Promise<void> {
        try {
            const transactionId = req.params.transactionId;
            const result = await AnalyticsModel.getTransactionDetails(transactionId);

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
