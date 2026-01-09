import { PrinterModel, PrintJobModel } from '../models/printer.model';
import {
    Printer,
    PrintJob,
    CreatePrintJobRequest,
    PrintJobStatus,
    PrintJobType,
    PrintReceiptRequest,
    PrintLabelRequest
} from '../types/printer';
import { PrintContentService } from './print-content.service';

export class PrintJobService {
    /**
     * Create a print job
     */
    static async createPrintJob(
        data: CreatePrintJobRequest,
        tenantId: string,
        branchId: string
    ): Promise<PrintJob> {
        // Verify printer exists
        const printer = await PrinterModel.findById(data.printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        if (!printer.isActive) {
            throw new Error('Printer is not active');
        }

        return PrintJobModel.create({ ...data, tenantId, branchId });
    }

    /**
     * Execute a print job
     */
    static async executePrintJob(printJobId: string): Promise<PrintJob | null> {
        const printJob = await PrintJobModel.findById(printJobId);
        if (!printJob) {
            throw new Error('Print job not found');
        }

        if (printJob.status !== 'PENDING') {
            throw new Error(`Print job is not in pending status (current: ${printJob.status})`);
        }

        // Update status to printing
        await PrintJobModel.updateStatus(printJobId, PrintJobStatus.PRINTING);

        try {
            const printer = await PrinterModel.findById(printJob.printerId);
            if (!printer) {
                throw new Error('Printer not found');
            }

            // Execute print based on content type
            const success = await this.sendToPrinter(printer, printJob);

            if (success) {
                await PrinterModel.incrementPrintJobCount(printer.printerId);
                return PrintJobModel.updateStatus(printJobId, PrintJobStatus.COMPLETED);
            } else {
                return PrintJobModel.updateStatus(printJobId, PrintJobStatus.FAILED, 'Print execution failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return PrintJobModel.updateStatus(printJobId, PrintJobStatus.FAILED, errorMessage);
        }
    }

    /**
     * Send data to printer (implementation placeholder)
     */
    private static async sendToPrinter(printer: Printer, printJob: PrintJob): Promise<boolean> {
        // In production, implement actual printing using appropriate libraries
        // Examples:
        // - node-thermal-printer for thermal receipt printers
        // - escpos for ESC/POS printers
        // - node-printer for system printers
        // - Raw socket for network printers

        console.log(`[Print Job ${printJob.printJobId}] Sending to printer ${printer.printerName}`);
        console.log(`Content type: ${printJob.contentType}`);
        console.log(`Copies: ${printJob.copies}`);

        // Simulate successful print
        return true;
    }

    /**
     * Print a receipt
     */
    static async printReceipt(
        request: PrintReceiptRequest,
        tenantId: string,
        branchId: string,
        userId?: string
    ): Promise<PrintJob> {
        // Get the printer to use
        let printer: Printer | null = null;

        if (request.printerId) {
            printer = await PrinterModel.findById(request.printerId, tenantId, branchId);
        } else {
            printer = await PrinterModel.findDefaultPrinter(branchId, 'receipt');
        }

        if (!printer) {
            throw new Error('No receipt printer available');
        }

        // Generate receipt content based on saleId, transactionId, or orderId
        const content = await PrintContentService.generateReceiptContent(request);

        const printJobData: CreatePrintJobRequest = {
            printerId: printer.printerId,
            jobType: PrintJobType.RECEIPT,
            jobTitle: `Receipt - ${request.saleId || request.transactionId || request.orderId || 'Unknown'}`,
            content,
            contentType: 'ESC_POS',
            copies: request.copies || 1,
            priority: 8, // High priority for receipts
            userId,
            referenceId: request.saleId || request.transactionId || request.orderId,
            referenceType: request.saleId ? 'SALE' : request.transactionId ? 'TRANSACTION' : 'ORDER'
        };

        const printJob = await PrintJobModel.create({ ...printJobData, tenantId, branchId });

        // Execute immediately
        await this.executePrintJob(printJob.printJobId);

        return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
    }

    /**
     * Print a label
     */
    static async printLabel(
        request: PrintLabelRequest,
        tenantId: string,
        branchId: string,
        userId?: string
    ): Promise<PrintJob> {
        // Get the printer to use
        let printer: Printer | null = null;

        if (request.printerId) {
            printer = await PrinterModel.findById(request.printerId, tenantId, branchId);
        } else {
            printer = await PrinterModel.findDefaultPrinter(branchId, 'label');
        }

        if (!printer) {
            throw new Error('No label printer available');
        }

        // Generate label content
        const content = await PrintContentService.generateLabelContent({
            ...request,
            tenantId,
            branchId
        });

        const printJobData: CreatePrintJobRequest = {
            printerId: printer.printerId,
            jobType: PrintJobType.LABEL,
            jobTitle: `Label - Product ${request.productId}`,
            content,
            contentType: 'ZPL', // Zebra Programming Language or similar
            copies: request.quantity,
            priority: 5,
            userId,
            referenceId: request.productId,
            referenceType: 'PRODUCT'
        };

        const printJob = await PrintJobModel.create({ ...printJobData, tenantId, branchId });

        // Execute immediately
        await this.executePrintJob(printJob.printJobId);

        return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
    }

    /**
     * Print test page
     */
    static async printTestPage(
        printerId: string,
        tenantId: string,
        branchId?: string,
        userId?: string
    ): Promise<PrintJob> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        const content = PrintContentService.generateTestPageContent(printer);

        const printJobData: CreatePrintJobRequest = {
            printerId: printer.printerId,
            jobType: PrintJobType.TEST_PAGE,
            jobTitle: `Test Page - ${printer.printerName}`,
            content,
            contentType: 'ESC_POS',
            copies: 1,
            priority: 10, // Highest priority for test pages
            userId
        };

        const printJob = await PrintJobModel.create({
            ...printJobData,
            tenantId: printer.tenantId,
            branchId: printer.branchId
        });

        await this.executePrintJob(printJob.printJobId);

        return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
    }

    /**
     * Get print job by ID
     */
    static async getPrintJobById(printJobId: string): Promise<PrintJob | null> {
        return PrintJobModel.findById(printJobId);
    }

    /**
     * Get print job history for a printer
     */
    static async getPrintJobHistory(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<PrintJob[]> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        return PrintJobModel.findByPrinterId(printerId);
    }

    /**
     * Get pending print jobs for a branch
     */
    static async getPendingPrintJobs(branchId: string): Promise<PrintJob[]> {
        return PrintJobModel.findPending(branchId);
    }

    /**
     * Cancel a print job
     */
    static async cancelPrintJob(printJobId: string): Promise<PrintJob | null> {
        const printJob = await PrintJobModel.findById(printJobId);
        if (!printJob) {
            throw new Error('Print job not found');
        }

        if (printJob.status !== 'PENDING') {
            throw new Error('Only pending print jobs can be cancelled');
        }

        return PrintJobModel.updateStatus(printJobId, PrintJobStatus.CANCELLED);
    }

    /**
     * Retry a failed print job
     */
    static async retryPrintJob(printJobId: string): Promise<PrintJob | null> {
        const printJob = await PrintJobModel.findById(printJobId);
        if (!printJob) {
            throw new Error('Print job not found');
        }

        if (printJob.status !== 'FAILED') {
            throw new Error('Only failed print jobs can be retried');
        }

        // Reset status to pending and clear error
        await PrintJobModel.updateStatus(printJobId, PrintJobStatus.PENDING);

        // Execute the job again
        return this.executePrintJob(printJobId);
    }

    /**
     * Clean up old print jobs
     */
    static async cleanupOldPrintJobs(daysOld = 30): Promise<number> {
        return PrintJobModel.deleteOldJobs(daysOld);
    }

    /**
     * Get print job statistics for a printer
     */
    static async getPrintJobStats(
        printerId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        total: number;
        completed: number;
        failed: number;
        cancelled: number;
        pending: number;
    }> {
        const jobs = await PrintJobModel.findByPrinterId(printerId);

        const filteredJobs = jobs.filter(job => {
            if (startDate && new Date(job.createdAt) < startDate) return false;
            if (endDate && new Date(job.createdAt) > endDate) return false;
            return true;
        });

        return {
            total: filteredJobs.length,
            completed: filteredJobs.filter(j => j.status === 'COMPLETED').length,
            failed: filteredJobs.filter(j => j.status === 'FAILED').length,
            cancelled: filteredJobs.filter(j => j.status === 'CANCELLED').length,
            pending: filteredJobs.filter(j => j.status === 'PENDING').length
        };
    }
}
