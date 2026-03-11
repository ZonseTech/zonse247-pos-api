/**
 * Print Jobs Controller
 * Handles print job management operations
 */

import { Response } from 'express';
import { BaseController } from '../base.controller';
import { PrinterService } from '../../services/printer/printer.service';
import { PrintJobService } from '../../services/printer/print-job.service';
import { AuthenticatedRequest, handleError } from './printer.helpers';

/**
 * PrintJobsController - Print job management
 */
export class PrintJobsController extends BaseController {
    /**
     * Get print job history
     * GET /printers/jobs/:id/history
     */
    static async getPrintJobHistory(req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> {
        try {
            const printJobs = await PrinterService.getPrintJobHistory(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );

            BaseController.sendSuccess(res, 'Print job history retrieved successfully', {
                printJobs,
                count: printJobs.length
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Get pending print jobs
     * GET /printers/jobs/pending
     */
    static async getPendingPrintJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const printJobs = await PrinterService.getPendingPrintJobs(req.auth.branchId);
            BaseController.sendSuccess(res, 'Pending print jobs retrieved successfully', {
                printJobs,
                count: printJobs.length
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Cancel a print job
     * POST /printers/jobs/:jobId/cancel
     */
    static async cancelPrintJob(req: AuthenticatedRequest<{ jobId: string }>, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.cancelPrintJob(req.params.jobId);

            if (!printJob) {
                BaseController.sendResponse(res, 404, false, 'Print job not found');
                return;
            }

            BaseController.sendSuccess(res, 'Print job cancelled successfully', { printJob });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Retry a failed print job
     * POST /printers/jobs/:jobId/retry
     */
    static async retryPrintJob(req: AuthenticatedRequest<{ jobId: string }>, res: Response): Promise<void> {
        try {
            const printJob = await PrintJobService.retryPrintJob(req.params.jobId);

            if (!printJob) {
                BaseController.sendResponse(res, 404, false, 'Print job not found');
                return;
            }

            BaseController.sendSuccess(res, 'Print job retry initiated', { printJob });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Cleanup old print jobs
     * DELETE /printers/jobs/cleanup
     */
    static async cleanupPrintJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const daysOld = parseInt(req.query.daysOld as string) || 30;
            const deletedCount = await PrinterService.cleanupOldPrintJobs(daysOld);

            BaseController.sendSuccess(res, `Cleaned up ${deletedCount} old print jobs`, { deletedCount });
        } catch (error) {
            handleError(res, error);
        }
    }
}

export default PrintJobsController;
