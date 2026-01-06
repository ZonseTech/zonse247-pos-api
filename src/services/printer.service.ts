import { PrinterModel, PrintJobModel } from '../models/printer.model';
import { BranchModel } from '../models/branch.model';
import { TerminalModel } from '../models/terminal.model';
import { TenantService } from './tenant.service';
import {
    Printer,
    CreatePrinterRequest,
    UpdatePrinterRequest,
    PrinterQueryParams,
    PrintJob,
    CreatePrintJobRequest,
    PrinterConfiguration,
    PrinterStatus,
    PrintJobStatus,
    PrintJobType,
    PrintReceiptRequest,
    PrintLabelRequest,
    DiscoveredPrinter,
    PrinterTestResult,
    PrinterConnectionType
} from '../types/printer';

export class PrinterService {
    /**
     * Create a new printer
     */
    static async createPrinter(
        data: CreatePrinterRequest,
        tenantId: string,
        branchId: string
    ): Promise<Printer> {
        const validationError = TenantService.validateRequired(data, ['printerName', 'printerType', 'connectionType']);
        if (validationError) {
            throw new Error(validationError);
        }

        // Verify branch exists and belongs to tenant
        const branch = await BranchModel.findById(branchId, tenantId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        // Check if printer name already exists in branch
        const existingPrinter = await PrinterModel.findByName(data.printerName, branchId);
        if (existingPrinter) {
            throw new Error('Printer with this name already exists in this branch');
        }

        // If terminal is specified, verify it exists
        if (data.terminalId) {
            const terminal = await TerminalModel.findById(data.terminalId, tenantId, branchId);
            if (!terminal) {
                throw new Error('Terminal not found');
            }
        }

        // If this printer should be default, unset any existing defaults
        if (data.isDefault) {
            const existingDefault = await PrinterModel.findDefaultPrinter(branchId);
            if (existingDefault) {
                await PrinterModel.update(existingDefault.printerId, { isDefault: false });
            }
        }

        return PrinterModel.create({ ...data, tenantId, branchId });
    }

    /**
     * Get all printers
     */
    static async getAllPrinters(
        query: PrinterQueryParams = {},
        tenantId: string,
        branchId?: string
    ): Promise<Printer[]> {
        const conditions: PrinterQueryParams = { tenantId };

        if (branchId) {
            conditions.branchId = branchId;
        } else if (query.branchId) {
            conditions.branchId = query.branchId;
        }

        if (query.terminalId) conditions.terminalId = query.terminalId;
        if (query.printerType) conditions.printerType = query.printerType;
        if (query.connectionType) conditions.connectionType = query.connectionType;
        if (query.status) conditions.status = query.status;
        if (query.isReceiptPrinter !== undefined) conditions.isReceiptPrinter = query.isReceiptPrinter;
        if (query.isLabelPrinter !== undefined) conditions.isLabelPrinter = query.isLabelPrinter;
        if (query.isKitchenPrinter !== undefined) conditions.isKitchenPrinter = query.isKitchenPrinter;
        if (query.isReportPrinter !== undefined) conditions.isReportPrinter = query.isReportPrinter;

        return PrinterModel.findAll(conditions);
    }

    /**
     * Get printer by ID
     */
    static async getPrinterById(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<Printer | null> {
        return PrinterModel.findById(printerId, tenantId, branchId);
    }

    /**
     * Get default printer for a branch
     */
    static async getDefaultPrinter(
        branchId: string,
        printerUse?: 'receipt' | 'label' | 'kitchen' | 'report'
    ): Promise<Printer | null> {
        return PrinterModel.findDefaultPrinter(branchId, printerUse);
    }

    /**
     * Get printers by terminal
     */
    static async getPrintersByTerminal(terminalId: string): Promise<Printer[]> {
        return PrinterModel.findByTerminalId(terminalId);
    }

    /**
     * Update a printer
     */
    static async updatePrinter(
        printerId: string,
        data: UpdatePrinterRequest,
        tenantId: string,
        branchId?: string
    ): Promise<Printer | null> {
        const existingPrinter = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!existingPrinter) {
            throw new Error('Printer not found');
        }

        // Check for duplicate name if name is being changed
        if (data.printerName && data.printerName !== existingPrinter.printerName) {
            const duplicatePrinter = await PrinterModel.findByName(data.printerName, existingPrinter.branchId);
            if (duplicatePrinter) {
                throw new Error('Printer with this name already exists in this branch');
            }
        }

        return PrinterModel.update(printerId, data);
    }

    /**
     * Set printer as default
     */
    static async setDefaultPrinter(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<Printer | null> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        return PrinterModel.setAsDefault(printerId, printer.branchId);
    }

    /**
     * Update printer status
     */
    static async updatePrinterStatus(
        printerId: string,
        status: PrinterStatus,
        tenantId: string,
        branchId?: string,
        errorMessage?: string
    ): Promise<Printer | null> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        return PrinterModel.updateStatus(printerId, status, errorMessage);
    }

    /**
     * Update printer configuration
     */
    static async updatePrinterConfiguration(
        printerId: string,
        configuration: Partial<PrinterConfiguration>,
        tenantId: string,
        branchId?: string
    ): Promise<Printer | null> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        return PrinterModel.updateConfiguration(printerId, configuration);
    }

    /**
     * Delete a printer
     */
    static async deletePrinter(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<boolean> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            throw new Error('Printer not found');
        }

        return PrinterModel.delete(printerId);
    }

    /**
     * Test printer connection
     */
    static async testPrinter(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<PrinterTestResult> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            return {
                success: false,
                message: 'Printer not found',
                printerId,
                printerStatus: PrinterStatus.OFFLINE
            };
        }

        const startTime = Date.now();

        try {
            // Here you would implement actual printer testing logic
            // This is a placeholder that simulates testing
            // In production, you'd use libraries like:
            // - node-thermal-printer for thermal printers
            // - escpos for ESC/POS printers
            // - node-printer for system printers

            // Simulate connection test
            const isOnline = await this.checkPrinterConnection(printer);
            const responseTime = Date.now() - startTime;

            if (isOnline) {
                await PrinterModel.updateStatus(printerId, PrinterStatus.ONLINE);
                return {
                    success: true,
                    message: 'Printer is online and responding',
                    printerId,
                    responseTime,
                    printerStatus: PrinterStatus.ONLINE
                };
            } else {
                await PrinterModel.updateStatus(printerId, PrinterStatus.OFFLINE, 'Connection test failed');
                return {
                    success: false,
                    message: 'Printer is not responding',
                    printerId,
                    responseTime,
                    printerStatus: PrinterStatus.OFFLINE
                };
            }
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await PrinterModel.updateStatus(printerId, PrinterStatus.ERROR, errorMessage);

            return {
                success: false,
                message: 'Failed to test printer',
                printerId,
                responseTime,
                printerStatus: PrinterStatus.ERROR,
                errorDetails: errorMessage
            };
        }
    }

    /**
     * Check printer connection (implementation placeholder)
     */
    private static async checkPrinterConnection(printer: Printer): Promise<boolean> {
        // In production, implement actual connection checking based on connection type
        // For now, return true to simulate successful connection

        switch (printer.connectionType) {
            case 'NETWORK':
                // Would ping the IP address
                return true;
            case 'USB':
                // Would check USB device availability
                return true;
            case 'BLUETOOTH':
                // Would check Bluetooth connection
                return true;
            case 'SERIAL':
                // Would check serial port availability
                return true;
            default:
                return false;
        }
    }

    /**
     * Discover available printers
     */
    static async discoverPrinters(connectionType?: PrinterConnectionType): Promise<DiscoveredPrinter[]> {
        const discovered: DiscoveredPrinter[] = [];

        try {
            // This is a placeholder for printer discovery
            // In production, you would implement actual discovery using:
            // - System printer enumeration (node-printer)
            // - Network discovery (mDNS/Bonjour for network printers)
            // - USB device enumeration
            // - Bluetooth device scanning

            // Example placeholder results
            if (!connectionType || connectionType === 'USB') {
                // Discover USB printers
                // discovered.push(...await this.discoverUSBPrinters());
            }

            if (!connectionType || connectionType === 'NETWORK') {
                // Discover network printers
                // discovered.push(...await this.discoverNetworkPrinters());
            }

            if (!connectionType || connectionType === 'BLUETOOTH') {
                // Discover Bluetooth printers
                // discovered.push(...await this.discoverBluetoothPrinters());
            }

            return discovered;
        } catch (error) {
            console.error('Error discovering printers:', error);
            return [];
        }
    }

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
            // This is where you would implement actual printing logic
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
        // This would fetch the actual data and format it for printing
        const content = await this.generateReceiptContent(request);

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
     * Generate receipt content (placeholder)
     */
    private static async generateReceiptContent(
        request: PrintReceiptRequest
    ): Promise<string> {
        // In production, fetch sale/transaction/order data and format for printing
        // This would generate ESC/POS commands or formatted text

        let content = '';

        // Header
        if (request.includeHeader !== false) {
            content += `\x1B\x61\x01`; // Center align
            content += `RECEIPT\n`;
            content += `================\n`;
        }

        // Body would include actual transaction data
        content += `Reference: ${request.saleId || request.transactionId || request.orderId}\n`;
        content += `Date: ${new Date().toLocaleString()}\n`;

        // Custom message
        if (request.customMessage) {
            content += `\n${request.customMessage}\n`;
        }

        // Footer
        if (request.includeFooter !== false) {
            content += `================\n`;
            content += `Thank you!\n`;
        }

        // Cut paper
        content += `\x1D\x56\x00`; // Cut command

        return content;
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
        const content = await this.generateLabelContent(request);

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
     * Generate label content (placeholder)
     */
    private static async generateLabelContent(
        request: PrintLabelRequest
    ): Promise<string> {
        // In production, fetch product data and generate label format (ZPL, EPL, etc.)
        let content = '';

        // Example ZPL format
        content += `^XA\n`;
        content += `^FO50,50^A0N,40,40^FDProduct ID: ${request.productId}^FS\n`;

        if (request.includeBarcode) {
            content += `^FO50,100^BCN,100,Y,N,N^FD${request.productId}^FS\n`;
        }

        if (request.customText) {
            content += `^FO50,220^A0N,30,30^FD${request.customText}^FS\n`;
        }

        content += `^XZ\n`;

        return content;
    }

    /**
     * Get print job history
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
     * Get pending print jobs
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
     * Clean up old print jobs
     */
    static async cleanupOldPrintJobs(daysOld = 30): Promise<number> {
        return PrintJobModel.deleteOldJobs(daysOld);
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

        const content = this.generateTestPageContent(printer);

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
     * Generate test page content
     */
    private static generateTestPageContent(printer: Printer): string {
        let content = '';

        content += `\x1B\x40`; // Initialize printer
        content += `\x1B\x61\x01`; // Center align
        content += `================================\n`;
        content += `        PRINTER TEST PAGE       \n`;
        content += `================================\n\n`;

        content += `\x1B\x61\x00`; // Left align
        content += `Printer Name: ${printer.printerName}\n`;
        content += `Printer Type: ${printer.printerType}\n`;
        content += `Connection: ${printer.connectionType}\n`;
        content += `Test Date: ${new Date().toLocaleString()}\n\n`;

        content += `\x1B\x61\x01`; // Center align
        content += `Font Test:\n`;
        content += `\x1B\x21\x00`; // Normal
        content += `Normal Text\n`;
        content += `\x1B\x21\x10`; // Double height
        content += `Double Height\n`;
        content += `\x1B\x21\x20`; // Double width
        content += `Double Width\n`;
        content += `\x1B\x21\x00`; // Reset to normal

        content += `\n================================\n`;
        content += `        TEST COMPLETE           \n`;
        content += `================================\n\n\n`;

        content += `\x1D\x56\x00`; // Cut paper

        return content;
    }
}
