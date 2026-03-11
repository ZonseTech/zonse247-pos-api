/**
 * Print Queue Controller
 * Handles print queue operations
 */

import { Response } from 'express';
import { BaseController } from '../base.controller';
import { getPrintQueue } from '../../services/printer/print-queue.service';
import { AuthenticatedRequest, handleError } from './printer.helpers';
import { QueueStatusResponseDTO } from '../../types/printer.platform';

/**
 * PrintQueueController - Queue management operations
 */
export class PrintQueueController extends BaseController {
    /**
     * Get queue status
     * GET /printers/queue/status
     */
    static async getQueueStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const queue = getPrintQueue();
            const status = queue.getQueueStatus();

            const response: QueueStatusResponseDTO = {
                success: true,
                message: 'Queue status',
                data: {
                    total: status.total,
                    pending: status.pending,
                    retrying: status.retrying,
                    processing: 0,
                    completed: 0,
                    failed: 0
                }
            };

            BaseController.sendSuccess(res, response.message, response.data);
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Retry all queued jobs
     * POST /printers/queue/retry-all
     */
    static async retryAllQueuedJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const queue = getPrintQueue();
            queue.forceRetryAll();

            BaseController.sendSuccess(res, 'All queued jobs scheduled for retry', queue.getQueueStatus());
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Clear print queue
     * DELETE /printers/queue/clear
     */
    static async clearPrintQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const queue = getPrintQueue();
            queue.clearQueue();

            BaseController.sendSuccess(res, 'Print queue cleared', { queueSize: 0 });
        } catch (error) {
            handleError(res, error);
        }
    }
}

export default PrintQueueController;
