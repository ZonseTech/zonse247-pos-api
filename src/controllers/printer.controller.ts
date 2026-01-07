import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { PrinterService } from "../services/printer.service";
import { AuthRequest } from "../lib/express.type";
import {
    CreatePrinterRequest,
    UpdatePrinterRequest,
    PrinterConfiguration,
    PrinterStatus,
    PrintReceiptRequest,
    PrintLabelRequest,
    PrinterConnectionType
} from "../types/printer";

export class PrinterController extends BaseController {
    /**
     * Create a new printer
     */
    static async createPrinter(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const newPrinter = await PrinterService.createPrinter(
                req.body as CreatePrinterRequest,
                req.auth.tenantId,
                req.auth.branchId
            );
            BaseController.sendCreated(res, 'Printer created successfully', newPrinter);
        } catch (error: any) {
            console.error('Error creating printer:', error);
            let statusCode = 500;
            if (error.message.includes('required')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get all printers
     */
    static async getAllPrinters(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const printers = await PrinterService.getAllPrinters(
                req.query,
                req.auth.tenantId,
                req.auth.branchId
            );
            BaseController.sendSuccess(res, 'Printers retrieved successfully', printers);
        } catch (error: any) {
            console.error('Error retrieving printers:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get printer by ID
     */
    static async getPrinter(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const printer = await PrinterService.getPrinterById(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );
            if (!printer) {
                BaseController.sendResponse(res, 404, false, 'Printer not found');
                return;
            }
            BaseController.sendSuccess(res, 'Printer retrieved successfully', printer);
        } catch (error: any) {
            console.error('Error retrieving printer:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get default printer
     */
    static async getDefaultPrinter(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const printerUse = req.query.use as 'receipt' | 'label' | 'kitchen' | 'report' | undefined;
            const printer = await PrinterService.getDefaultPrinter(req.auth.branchId, printerUse);

            if (!printer) {
                BaseController.sendResponse(res, 404, false, 'No default printer found');
                return;
            }
            BaseController.sendSuccess(res, 'Default printer retrieved successfully', printer);
        } catch (error: any) {
            console.error('Error retrieving default printer:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get printers by terminal
     */
    static async getPrintersByTerminal(req: Request<{ terminalId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const printers = await PrinterService.getPrintersByTerminal(req.params.terminalId);
            BaseController.sendSuccess(res, 'Printers retrieved successfully', printers);
        } catch (error: any) {
            console.error('Error retrieving printers by terminal:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Update a printer
     */
    static async updatePrinter(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const updatedPrinter = await PrinterService.updatePrinter(
                req.params.id,
                req.body as UpdatePrinterRequest,
                req.auth.tenantId,
                req.auth.branchId
            );
            if (!updatedPrinter) {
                BaseController.sendResponse(res, 404, false, 'Printer not found');
                return;
            }
            BaseController.sendSuccess(res, 'Printer updated successfully', updatedPrinter);
        } catch (error: any) {
            console.error('Error updating printer:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Set printer as default
     */
    static async setDefaultPrinter(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const printer = await PrinterService.setDefaultPrinter(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );
            if (!printer) {
                BaseController.sendResponse(res, 404, false, 'Printer not found');
                return;
            }
            BaseController.sendSuccess(res, 'Printer set as default successfully', printer);
        } catch (error: any) {
            console.error('Error setting default printer:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Update printer status
     */
    static async updatePrinterStatus(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, errorMessage } = req.body as { status: PrinterStatus; errorMessage?: string };

            if (!status) {
                BaseController.sendResponse(res, 400, false, 'Status is required');
                return;
            }

            const printer = await PrinterService.updatePrinterStatus(
                req.params.id,
                status,
                req.auth.tenantId,
                req.auth.branchId,
                errorMessage
            );
            if (!printer) {
                BaseController.sendResponse(res, 404, false, 'Printer not found');
                return;
            }
            BaseController.sendSuccess(res, 'Printer status updated successfully', printer);
        } catch (error: any) {
            console.error('Error updating printer status:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Update printer configuration
     */
    static async updatePrinterConfiguration(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const configuration = req.body as Partial<PrinterConfiguration>;

            const printer = await PrinterService.updatePrinterConfiguration(
                req.params.id,
                configuration,
                req.auth.tenantId,
                req.auth.branchId
            );
            if (!printer) {
                BaseController.sendResponse(res, 404, false, 'Printer not found');
                return;
            }
            BaseController.sendSuccess(res, 'Printer configuration updated successfully', printer);
        } catch (error: any) {
            console.error('Error updating printer configuration:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Delete a printer
     */
    static async deletePrinter(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const deleted = await PrinterService.deletePrinter(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );
            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Printer not found');
                return;
            }
            BaseController.sendSuccess(res, 'Printer deleted successfully', { deleted: true });
        } catch (error: any) {
            console.error('Error deleting printer:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Test printer connection
     */
    static async testPrinter(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const result = await PrinterService.testPrinter(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );

            const statusCode = result.success ? 200 : 503;
            BaseController.sendResponse(res, statusCode, result.success, result.message, result);
        } catch (error: any) {
            console.error('Error testing printer:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Discover available printers
     */
    static async discoverPrinters(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const connectionType = req.query.connectionType as PrinterConnectionType | undefined;
            const printers = await PrinterService.discoverPrinters(connectionType);
            BaseController.sendSuccess(res, 'Printer discovery completed', printers);
        } catch (error: any) {
            console.error('Error discovering printers:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Print a receipt
     */
    static async printReceipt(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.printReceipt(
                req.body as PrintReceiptRequest,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );
            BaseController.sendSuccess(res, 'Receipt print job created', printJob);
        } catch (error: any) {
            console.error('Error printing receipt:', error);
            let statusCode = 500;
            if (error.message.includes('not found') || error.message.includes('No receipt printer')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Print a label
     */
    static async printLabel(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.printLabel(
                req.body as PrintLabelRequest,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );
            BaseController.sendSuccess(res, 'Label print job created', printJob);
        } catch (error: any) {
            console.error('Error printing label:', error);
            let statusCode = 500;
            if (error.message.includes('not found') || error.message.includes('No label printer')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Print test page
     */
    static async printTestPage(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.printTestPage(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId,
                req.auth.userId
            );
            BaseController.sendSuccess(res, 'Test page print job created', printJob);
        } catch (error: any) {
            console.error('Error printing test page:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get print job history for a printer
     */
    static async getPrintJobHistory(req: Request<{ id: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const printJobs = await PrinterService.getPrintJobHistory(
                req.params.id,
                req.auth.tenantId,
                req.auth.branchId
            );
            BaseController.sendSuccess(res, 'Print job history retrieved successfully', printJobs);
        } catch (error: any) {
            console.error('Error retrieving print job history:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get pending print jobs
     */
    static async getPendingPrintJobs(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const printJobs = await PrinterService.getPendingPrintJobs(req.auth.branchId);
            BaseController.sendSuccess(res, 'Pending print jobs retrieved successfully', printJobs);
        } catch (error: any) {
            console.error('Error retrieving pending print jobs:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Cancel a print job
     */
    static async cancelPrintJob(req: Request<{ jobId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const printJob = await PrinterService.cancelPrintJob(req.params.jobId);
            if (!printJob) {
                BaseController.sendResponse(res, 404, false, 'Print job not found');
                return;
            }
            BaseController.sendSuccess(res, 'Print job cancelled successfully', printJob);
        } catch (error: any) {
            console.error('Error cancelling print job:', error);
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Only pending')) {
                statusCode = 400;
            }
            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * Cleanup old print jobs
     */
    static async cleanupPrintJobs(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const daysOld = parseInt(req.query.daysOld as string) || 30;
            const deletedCount = await PrinterService.cleanupOldPrintJobs(daysOld);
            BaseController.sendSuccess(res, `Cleaned up ${deletedCount} old print jobs`, { deletedCount });
        } catch (error: any) {
            console.error('Error cleaning up print jobs:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }
}
