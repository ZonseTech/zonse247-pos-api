import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { TransactionToSaleMigrationService } from '../services/transaction-to-sale-migration.service';
import { AuthRequest } from '../lib/express.type';

export class TransactionMigrationController extends BaseController {
    /**
     * Get migration status - how many transactions have been migrated
     * GET /api/sales/migration/status
     */
    static async getMigrationStatus(
        req: Request & AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const status = await TransactionToSaleMigrationService.getMigrationStatus(
                tenantId,
                branchId
            );

            BaseController.sendResponse(res, 200, true, 'Migration status retrieved', status);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get migration status', undefined, error.message);
        }
    }

    /**
     * Trigger migration of transactions to sales
     * POST /api/sales/migration/run
     * Body: { dryRun?: boolean, batchSize?: number }
     */
    static async runMigration(
        req: Request & AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const { dryRun = true, batchSize = 100 } = req.body;

            const result = await TransactionToSaleMigrationService.migrateTransactionsToSales(
                tenantId,
                branchId,
                { dryRun, batchSize }
            );

            const message = dryRun
                ? `Dry run completed. ${result.migrated} transactions would be migrated.`
                : `Migration completed. ${result.migrated} transactions migrated.`;

            BaseController.sendResponse(res, 200, true, message, result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to run migration', undefined, error.message);
        }
    }

    /**
     * Get unified sales data (combines sales + legacy transactions)
     * GET /api/sales/migration/unified
     */
    static async getUnifiedSales(
        req: Request & AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const startDate = req.query.startDate
                ? new Date(req.query.startDate as string)
                : undefined;
            const endDate = req.query.endDate
                ? new Date(req.query.endDate as string)
                : undefined;

            const result = await TransactionToSaleMigrationService.getUnifiedSalesData(
                tenantId,
                branchId,
                { page, limit, startDate, endDate }
            );

            BaseController.sendResponse(res, 200, true, 'Unified sales data retrieved', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get unified sales', undefined, error.message);
        }
    }

    /**
     * Get unified summary (totals from both systems)
     * GET /api/sales/migration/unified/summary
     */
    static async getUnifiedSummary(
        req: Request & AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const tenantId = req.auth.tenantId;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const startDate = req.query.startDate
                ? new Date(req.query.startDate as string)
                : undefined;
            const endDate = req.query.endDate
                ? new Date(req.query.endDate as string)
                : undefined;

            const summary = await TransactionToSaleMigrationService.getUnifiedSummary(
                tenantId,
                branchId,
                { startDate, endDate }
            );

            BaseController.sendResponse(res, 200, true, 'Unified summary retrieved', summary);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get unified summary', undefined, error.message);
        }
    }
}
