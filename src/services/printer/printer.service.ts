import { PrinterModel } from '../../models/printer.model';
import { BranchModel } from '../../models/branch.model';
import { TerminalModel } from '../../models/terminal.model';
import { ValidationError } from '../../utils/errors';
import { PrintJobService } from './print-job.service';
import { PrinterDiscoveryService } from './printer-discovery.service';
import prisma from '../../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../../utils/pagination.utils';
import {
    Printer,
    CreatePrinterRequest,
    UpdatePrinterRequest,
    PrinterQueryParams,
    PrintJob,
    CreatePrintJobRequest,
    PrinterConfiguration,
    PrinterStatus,
    PrintReceiptRequest,
    PrintLabelRequest,
    DiscoveredPrinter,
    PrinterTestResult,
    PrinterConnectionType
} from '../../types/printer';

/**
 * PrinterService - Main service for printer CRUD operations
 * Delegates print jobs to PrintJobService
 * Delegates discovery/testing to PrinterDiscoveryService
 */
export class PrinterService {
    // ==================== PRINTER CRUD OPERATIONS ====================

    /**
     * Create a new printer
     */
    static async createPrinter(
        data: CreatePrinterRequest,
        tenantId: string,
        branchId: string
    ): Promise<Printer> {
        const validationError = ValidationError.validateRequired(data, ['printerName', 'printerType', 'connectionType']);
        if (validationError) {
            throw new Error(validationError);
        }

        const branch = await BranchModel.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        const existingPrinter = await PrinterModel.findByName(data.printerName, branchId);
        if (existingPrinter) {
            throw new Error('Printer with this name already exists in this branch');
        }

        if (data.terminalId) {
            const terminal = await TerminalModel.findById(data.terminalId, tenantId, branchId);
            if (!terminal) {
                throw new Error('Terminal not found');
            }
        }

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

    static async listPrinters(
        query: PrinterQueryParams = {},
        tenantId: string,
        branchId: string | undefined,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<Printer>> {
        const where: any = { tenantId, isActive: true };

        if (branchId) {
            where.branchId = branchId;
        } else if (query.branchId) {
            where.branchId = query.branchId;
        }

        if (query.terminalId) where.terminalId = query.terminalId;
        if (query.printerType) where.printerType = query.printerType;
        if (query.connectionType) where.connectionType = query.connectionType;
        if (query.status) where.status = query.status;
        if (query.isReceiptPrinter !== undefined) where.isReceiptPrinter = query.isReceiptPrinter;
        if (query.isLabelPrinter !== undefined) where.isLabelPrinter = query.isLabelPrinter;
        if (query.isKitchenPrinter !== undefined) where.isKitchenPrinter = query.isKitchenPrinter;
        if (query.isReportPrinter !== undefined) where.isReportPrinter = query.isReportPrinter;

        const [printers, total] = await Promise.all([
            prisma.printer.findMany({
                where,
                skip: pagination.skip,
                take: pagination.limit,
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.printer.count({ where }),
        ]);

        return {
            data: printers as unknown as Printer[],
            pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
        };
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

    // ==================== PRINTER STATUS & CONFIGURATION ====================

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

    // ==================== DELEGATED TO PrinterDiscoveryService ====================

    /**
     * Test printer connection
     */
    static async testPrinter(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<PrinterTestResult> {
        return PrinterDiscoveryService.testPrinter(printerId, tenantId, branchId);
    }

    /**
     * Discover available printers
     */
    static async discoverPrinters(connectionType?: PrinterConnectionType): Promise<DiscoveredPrinter[]> {
        return PrinterDiscoveryService.discoverPrinters(connectionType);
    }

    // ==================== DELEGATED TO PrintJobService ====================

    /**
     * Create a print job
     */
    static async createPrintJob(
        data: CreatePrintJobRequest,
        tenantId: string,
        branchId: string
    ): Promise<PrintJob> {
        return PrintJobService.createPrintJob(data, tenantId, branchId);
    }

    /**
     * Execute a print job
     */
    static async executePrintJob(printJobId: string): Promise<PrintJob | null> {
        return PrintJobService.executePrintJob(printJobId);
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
        return PrintJobService.printReceipt(request, tenantId, branchId, userId);
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
        return PrintJobService.printLabel(request, tenantId, branchId, userId);
    }

    /**
     * Get print job history
     */
    static async getPrintJobHistory(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<PrintJob[]> {
        return PrintJobService.getPrintJobHistory(printerId, tenantId, branchId);
    }

    /**
     * Get pending print jobs
     */
    static async getPendingPrintJobs(branchId: string): Promise<PrintJob[]> {
        return PrintJobService.getPendingPrintJobs(branchId);
    }

    /**
     * Cancel a print job
     */
    static async cancelPrintJob(printJobId: string): Promise<PrintJob | null> {
        return PrintJobService.cancelPrintJob(printJobId);
    }

    /**
     * Clean up old print jobs
     */
    static async cleanupOldPrintJobs(daysOld = 30): Promise<number> {
        return PrintJobService.cleanupOldPrintJobs(daysOld);
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
        return PrintJobService.printTestPage(printerId, tenantId, branchId, userId);
    }

    /**
     * Open cash drawer connected to a printer
     */
    static async openCashDrawer(
        printerId: string,
        tenantId: string,
        branchId?: string,
        userId?: string
    ): Promise<PrintJob> {
        return PrintJobService.openCashDrawer(printerId, tenantId, branchId, userId);
    }
}
