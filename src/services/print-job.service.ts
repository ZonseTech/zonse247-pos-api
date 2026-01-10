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
import { getPrintQueue } from './print-queue.service';
import * as net from 'net';
import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Error types for better handling
export enum PrintErrorType {
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    CONNECTION_REFUSED = 'CONNECTION_REFUSED',
    TIMEOUT = 'TIMEOUT',
    DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
    DEVICE_BUSY = 'DEVICE_BUSY',
    PRINTER_OFFLINE = 'PRINTER_OFFLINE',
    NO_CONTENT = 'NO_CONTENT',
    UNKNOWN = 'UNKNOWN'
}

export interface PrintError {
    type: PrintErrorType;
    message: string;
    hint: string;
    retryable: boolean;
}

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
     * Execute a print job (with optional queue integration)
     */
    static async executePrintJob(printJobId: string, useQueue = false): Promise<PrintJob | null> {
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
                const errorMsg = 'Print execution failed';

                // Add to queue for retry if enabled
                if (useQueue) {
                    const updatedJob = await PrintJobModel.updateStatus(printJobId, PrintJobStatus.PENDING, errorMsg);
                    if (updatedJob) {
                        getPrintQueue().addJob(updatedJob);
                    }
                    return updatedJob;
                }

                return PrintJobModel.updateStatus(printJobId, PrintJobStatus.FAILED, errorMsg);
            }
        } catch (error) {
            const printError = this.parseError(error);
            const errorMessage = `${printError.message}. ${printError.hint}`;

            // Add to queue for retry if error is retryable
            if (useQueue && printError.retryable) {
                const updatedJob = await PrintJobModel.updateStatus(printJobId, PrintJobStatus.PENDING, errorMessage);
                if (updatedJob) {
                    getPrintQueue().addJob(updatedJob);
                    console.log(`[PrintJob] Job ${printJobId} added to retry queue`);
                }
                return updatedJob;
            }

            return PrintJobModel.updateStatus(printJobId, PrintJobStatus.FAILED, errorMessage);
        }
    }

    /**
     * Parse error and provide helpful information
     */
    static parseError(error: unknown): PrintError {
        const message = error instanceof Error ? error.message : String(error);
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('permission denied') || lowerMessage.includes('eacces')) {
            return {
                type: PrintErrorType.PERMISSION_DENIED,
                message: message,
                hint: 'On Linux, add your user to the "dialout" group: sudo usermod -a -G dialout $USER (then log out and back in)',
                retryable: false
            };
        }

        if (lowerMessage.includes('econnrefused') || lowerMessage.includes('connection refused')) {
            return {
                type: PrintErrorType.CONNECTION_REFUSED,
                message: message,
                hint: 'Check if printer is powered on and connected to the network. Verify IP address and port.',
                retryable: true
            };
        }

        if (lowerMessage.includes('etimedout') || lowerMessage.includes('timeout')) {
            return {
                type: PrintErrorType.TIMEOUT,
                message: message,
                hint: 'Printer may be busy or network is slow. Will retry automatically.',
                retryable: true
            };
        }

        if (lowerMessage.includes('enoent') || lowerMessage.includes('not found') || lowerMessage.includes('no such file')) {
            return {
                type: PrintErrorType.DEVICE_NOT_FOUND,
                message: message,
                hint: 'Serial port or device not found. Check cable connections and verify port path.',
                retryable: true
            };
        }

        if (lowerMessage.includes('ebusy') || lowerMessage.includes('resource busy')) {
            return {
                type: PrintErrorType.DEVICE_BUSY,
                message: message,
                hint: 'Device is busy. Another application may be using it. Close other apps and retry.',
                retryable: true
            };
        }

        if (lowerMessage.includes('offline')) {
            return {
                type: PrintErrorType.PRINTER_OFFLINE,
                message: message,
                hint: 'Printer is offline. Check power and connections.',
                retryable: true
            };
        }

        return {
            type: PrintErrorType.UNKNOWN,
            message: message,
            hint: 'An unexpected error occurred. Check printer status and try again.',
            retryable: true
        };
    }

    /**
     * Send data to printer based on connection type
     */
    private static async sendToPrinter(printer: Printer, printJob: PrintJob): Promise<boolean> {
        console.log(`[Print Job ${printJob.printJobId}] Sending to printer ${printer.printerName}`);
        console.log(`Printer type: ${printer.printerType}`);
        console.log(`Connection type: ${printer.connectionType}`);
        console.log(`Content type: ${printJob.contentType}`);
        console.log(`Copies: ${printJob.copies}`);

        const content = printJob.content;
        if (!content) {
            throw new Error('Print job has no content');
        }

        // Check if this is a standard printer (laser/inkjet) that should use CUPS
        const useCups = this.shouldUseCups(printer, printJob);

        if (useCups) {
            console.log(`[Print Job ${printJob.printJobId}] Using CUPS for ${printer.printerType} printer`);
            return this.sendToCupsPrinter(printer, printJob);
        }

        // Convert string content to Buffer for ESC/POS printers
        const data = Buffer.from(content, 'binary');

        // Send to printer based on connection type
        for (let copy = 0; copy < (printJob.copies || 1); copy++) {
            let success = false;

            switch (printer.connectionType) {
                case 'NETWORK':
                case 'WIFI':
                    success = await this.sendToNetworkPrinter(printer, data);
                    break;
                case 'USB':
                    success = await this.sendToUSBPrinter(printer, data);
                    break;
                case 'SERIAL':
                    success = await this.sendToSerialPrinter(printer, data);
                    break;
                case 'BLUETOOTH':
                    // Bluetooth printing is typically handled by client apps
                    console.warn('Bluetooth printing should be handled by client applications');
                    success = false;
                    break;
                default:
                    throw new Error(`Unsupported connection type: ${printer.connectionType}`);
            }

            if (!success) {
                return false;
            }

            // Small delay between copies
            if (copy < (printJob.copies || 1) - 1) {
                await this.delay(500);
            }
        }

        return true;
    }

    /**
     * Send data to network printer via TCP socket
     */
    private static async sendToNetworkPrinter(printer: Printer, data: Buffer): Promise<boolean> {
        const address = printer.connectionAddress;
        const port = printer.port || 9100;

        if (!address) {
            throw new Error('Network printer has no IP address configured');
        }

        return new Promise<boolean>((resolve, reject) => {
            const socket = new net.Socket();
            const timeout = 30000; // 30 second timeout

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                console.log(`[Network Printer] Connected to ${address}:${port}`);

                socket.write(data, (err) => {
                    if (err) {
                        console.error(`[Network Printer] Write error:`, err);
                        socket.destroy();
                        reject(err);
                    } else {
                        console.log(`[Network Printer] Data sent successfully (${data.length} bytes)`);
                        // Give the printer time to receive all data before closing
                        setTimeout(() => {
                            socket.end(() => {
                                resolve(true);
                            });
                        }, 100);
                    }
                });
            });

            socket.on('timeout', () => {
                console.error(`[Network Printer] Connection timeout`);
                socket.destroy();
                reject(new Error('Connection timeout'));
            });

            socket.on('error', (err) => {
                console.error(`[Network Printer] Socket error:`, err);
                socket.destroy();
                reject(err);
            });

            socket.on('close', (hadError) => {
                if (hadError) {
                    console.error(`[Network Printer] Connection closed with error`);
                }
            });

            try {
                console.log(`[Network Printer] Connecting to ${address}:${port}...`);
                socket.connect(port, address);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Send data to USB printer (via serial port interface)
     */
    private static async sendToUSBPrinter(printer: Printer, data: Buffer): Promise<boolean> {
        // USB printers often appear as serial devices
        // Try to find the printer's serial port path
        let portPath = printer.connectionAddress;

        if (!portPath) {
            // Try to auto-detect USB printer port
            try {
                const ports = await SerialPort.list();

                if (printer.vendorId && printer.productId) {
                    const vendorId = printer.vendorId.toLowerCase();
                    const productId = printer.productId.toLowerCase();

                    const matchingPort = ports.find(p =>
                        p.vendorId?.toLowerCase() === vendorId &&
                        p.productId?.toLowerCase() === productId
                    );

                    if (matchingPort) {
                        portPath = matchingPort.path;
                    }
                }

                if (!portPath) {
                    // Look for any USB serial device
                    const usbPort = ports.find(p => p.vendorId !== undefined);
                    if (usbPort) {
                        portPath = usbPort.path;
                        console.log(`[USB Printer] Auto-detected port: ${portPath}`);
                    }
                }
            } catch (err) {
                console.error('[USB Printer] Error listing ports:', err);
            }
        }

        if (!portPath) {
            throw new Error('USB printer port not found. Please configure the connection address or connect the printer.');
        }

        return this.sendToSerialPort(portPath, data, printer.baudRate || 9600);
    }

    /**
     * Send data to serial printer
     */
    private static async sendToSerialPrinter(printer: Printer, data: Buffer): Promise<boolean> {
        const portPath = printer.connectionAddress;

        if (!portPath) {
            throw new Error('Serial printer has no port path configured');
        }

        return this.sendToSerialPort(portPath, data, printer.baudRate || 9600);
    }

    /**
     * Send data to a serial port
     */
    private static async sendToSerialPort(portPath: string, data: Buffer, baudRate: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            console.log(`[Serial Printer] Opening port ${portPath} at ${baudRate} baud...`);

            const port = new SerialPort({
                path: portPath,
                baudRate: baudRate,
                autoOpen: false
            });

            port.open((err) => {
                if (err) {
                    console.error(`[Serial Printer] Error opening port:`, err);
                    reject(err);
                    return;
                }

                console.log(`[Serial Printer] Port opened, sending ${data.length} bytes...`);

                port.write(data, (writeErr) => {
                    if (writeErr) {
                        console.error(`[Serial Printer] Write error:`, writeErr);
                        port.close();
                        reject(writeErr);
                        return;
                    }

                    // Drain the buffer to ensure all data is sent
                    port.drain((drainErr) => {
                        if (drainErr) {
                            console.error(`[Serial Printer] Drain error:`, drainErr);
                            port.close();
                            reject(drainErr);
                            return;
                        }

                        console.log(`[Serial Printer] Data sent successfully`);

                        // Close the port after a brief delay
                        setTimeout(() => {
                            port.close((closeErr) => {
                                if (closeErr) {
                                    console.error(`[Serial Printer] Error closing port:`, closeErr);
                                }
                                resolve(true);
                            });
                        }, 100);
                    });
                });
            });

            // Handle port errors
            port.on('error', (err) => {
                console.error(`[Serial Printer] Port error:`, err);
                reject(err);
            });
        });
    }

    /**
     * Utility delay function
     */
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Determine if a printer should use CUPS for printing
     * CUPS is used for standard printers (laser, inkjet) that don't support ESC/POS
     */
    private static shouldUseCups(printer: Printer, printJob: PrintJob): boolean {
        // Laser and inkjet printers should use CUPS
        const cupsTypes = ['LASER', 'INKJET'];
        if (cupsTypes.includes(printer.printerType)) {
            return true;
        }

        // If content type is explicitly TEXT or HTML (not ESC_POS), use CUPS
        if (printJob.contentType === 'TEXT' || printJob.contentType === 'HTML') {
            return true;
        }

        return false;
    }

    /**
     * Get CUPS printer name from printer configuration
     * Tries to match by vendor/product ID or printer name
     */
    private static async getCupsPrinterName(printer: Printer): Promise<string | null> {
        try {
            // List CUPS printers
            const { stdout } = await execAsync('lpstat -p -d 2>/dev/null || true');
            const lines = stdout.split('\n');

            // Extract printer names
            const cupsPrinters: string[] = [];
            for (const line of lines) {
                const match = line.match(/^printer\s+(\S+)/);
                if (match) {
                    cupsPrinters.push(match[1]);
                }
            }

            if (cupsPrinters.length === 0) {
                console.warn('[CUPS] No printers found');
                return null;
            }

            console.log(`[CUPS] Available printers: ${cupsPrinters.join(', ')}`);

            // Try to find a matching printer
            // 1. Check if printer name contains the model
            if (printer.printerModel) {
                const modelParts = printer.printerModel.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const cupsPrinter of cupsPrinters) {
                    const cupsNameNormalized = cupsPrinter.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cupsNameNormalized.includes(modelParts) || modelParts.includes(cupsNameNormalized)) {
                        console.log(`[CUPS] Matched printer by model: ${cupsPrinter}`);
                        return cupsPrinter;
                    }
                }
            }

            // 2. Check if any CUPS printer name contains the printer name
            const nameParts = printer.printerName.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const cupsPrinter of cupsPrinters) {
                const cupsNameNormalized = cupsPrinter.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cupsNameNormalized.includes(nameParts) || nameParts.includes(cupsNameNormalized)) {
                    console.log(`[CUPS] Matched printer by name: ${cupsPrinter}`);
                    return cupsPrinter;
                }
            }

            // 3. Check connectionAddress if it looks like a CUPS printer name
            if (printer.connectionAddress && cupsPrinters.includes(printer.connectionAddress)) {
                console.log(`[CUPS] Matched printer by address: ${printer.connectionAddress}`);
                return printer.connectionAddress;
            }

            // 4. Get default printer
            const defaultMatch = stdout.match(/system default destination:\s+(\S+)/);
            if (defaultMatch) {
                console.log(`[CUPS] Using default printer: ${defaultMatch[1]}`);
                return defaultMatch[1];
            }

            // 5. Use first available printer
            console.log(`[CUPS] Using first available printer: ${cupsPrinters[0]}`);
            return cupsPrinters[0];
        } catch (error) {
            console.error('[CUPS] Error getting printer name:', error);
            return null;
        }
    }

    /**
     * Send print job to CUPS printer using lp command
     */
    private static async sendToCupsPrinter(printer: Printer, printJob: PrintJob): Promise<boolean> {
        const cupsPrinterName = await this.getCupsPrinterName(printer);

        if (!cupsPrinterName) {
            throw new Error('No CUPS printer found. Please ensure CUPS is installed and a printer is configured.');
        }

        // Create a temporary file for the print content
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `printjob_${printJob.printJobId}.txt`);

        try {
            // Convert ESC/POS content to plain text if needed
            let content = printJob.content;
            if (printJob.contentType === 'ESC_POS') {
                content = this.convertEscPosToText(content);
            }

            // Write content to temp file
            fs.writeFileSync(tempFile, content, 'utf8');
            console.log(`[CUPS] Created temp file: ${tempFile}`);

            // Build lp command
            const copies = printJob.copies || 1;
            const lpCommand = `lp -d "${cupsPrinterName}" -n ${copies} "${tempFile}"`;

            console.log(`[CUPS] Executing: ${lpCommand}`);
            const { stdout, stderr } = await execAsync(lpCommand);

            if (stderr && !stderr.includes('request id')) {
                console.error(`[CUPS] stderr: ${stderr}`);
            }

            console.log(`[CUPS] Print job submitted: ${stdout.trim()}`);
            return true;
        } catch (error: any) {
            console.error(`[CUPS] Error printing:`, error);
            throw new Error(`CUPS print failed: ${error.message}`);
        } finally {
            // Clean up temp file
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                    console.log(`[CUPS] Cleaned up temp file`);
                }
            } catch (cleanupError) {
                console.warn(`[CUPS] Failed to clean up temp file:`, cleanupError);
            }
        }
    }

    /**
     * Convert ESC/POS formatted content to plain text
     * Strips ESC/POS commands and keeps readable text
     */
    private static convertEscPosToText(content: string): string {
        // Remove ESC/POS control codes
        let text = content;

        // Remove ESC sequences (ESC followed by various commands)
        // eslint-disable-next-line no-control-regex
        text = text.replace(/\x1b[\x00-\x7f]/g, '');
        // eslint-disable-next-line no-control-regex
        text = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

        // Remove GS sequences
        // eslint-disable-next-line no-control-regex
        text = text.replace(/\x1d[\x00-\x7f]/g, '');
        // eslint-disable-next-line no-control-regex
        text = text.replace(/\x1d\([a-zA-Z][\x00-\xff]*/g, '');

        // Remove other control characters except newlines and tabs
        // eslint-disable-next-line no-control-regex
        text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

        // Clean up multiple blank lines
        text = text.replace(/\n{3,}/g, '\n\n');

        // Trim whitespace
        text = text.trim();

        return text;
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
