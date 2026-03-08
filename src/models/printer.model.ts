import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import {
    Printer,
    CreatePrinterRequest,
    UpdatePrinterRequest,
    PrinterQueryParams,
    PrintJob,
    CreatePrintJobRequest,
    PrinterConfiguration,
    PrinterStatus,
    PrintJobStatus
} from '../types/printer';

const defaultConfiguration: PrinterConfiguration = {
    paperWidth: 80,
    dpi: 203,
    fontSize: 12,
    encoding: 'UTF-8',
    cutPaper: true,
    openCashDrawer: false,
    printLogo: true,
    darkness: 5,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
    marginRight: 5,
    beepAfterPrint: false,
    copies: 1
};

export class PrinterModel {
    /**
     * Find all printers by tenant ID
     */
    static async findByTenantId(tenantId: string): Promise<Printer[]> {
        try {
            const printers = await prisma.printer.findMany({
                where: { tenantId, isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            return printers as unknown as Printer[];
        } catch (error) {
            throw new Error(`Error finding printers by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find all printers by branch ID
     */
    static async findByBranchId(branchId: string): Promise<Printer[]> {
        try {
            const printers = await prisma.printer.findMany({
                where: { branchId, isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            return printers as unknown as Printer[];
        } catch (error) {
            throw new Error(`Error finding printers by branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find all printers by terminal ID
     */
    static async findByTerminalId(terminalId: string): Promise<Printer[]> {
        try {
            const printers = await prisma.printer.findMany({
                where: { terminalId, isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            return printers as unknown as Printer[];
        } catch (error) {
            throw new Error(`Error finding printers by terminal ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find all printers with optional filters
     */
    static async findAll(conditions: PrinterQueryParams = {}): Promise<Printer[]> {
        try {
            const whereClause: any = { ...conditions };
            if (whereClause.isActive === undefined) {
                whereClause.isActive = true;
            }

            const printers = await prisma.printer.findMany({
                where: whereClause,
                orderBy: [
                    { isDefault: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
            return printers as unknown as Printer[];
        } catch (error) {
            throw new Error(`Error finding printers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find printer by ID
     */
    static async findById(printerId: string, tenantId?: string, branchId?: string): Promise<Printer | null> {
        try {
            const printer = await prisma.printer.findUnique({
                where: { printerId }
            });

            if (printer) {
                if (tenantId && printer.tenantId !== tenantId) return null;
                if (branchId && printer.branchId !== branchId) return null;
            }

            return printer as unknown as Printer | null;
        } catch (error) {
            throw new Error(`Error finding printer by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find default printer for a branch
     */
    static async findDefaultPrinter(branchId: string, printerUse?: 'receipt' | 'label' | 'kitchen' | 'report'): Promise<Printer | null> {
        try {
            const whereClause: any = {
                branchId,
                isActive: true,
                isDefault: true
            };

            if (printerUse === 'receipt') whereClause.isReceiptPrinter = true;
            if (printerUse === 'label') whereClause.isLabelPrinter = true;
            if (printerUse === 'kitchen') whereClause.isKitchenPrinter = true;
            if (printerUse === 'report') whereClause.isReportPrinter = true;

            const printer = await prisma.printer.findFirst({
                where: whereClause
            });

            return printer as unknown as Printer | null;
        } catch (error) {
            throw new Error(`Error finding default printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find printer by name within a branch
     */
    static async findByName(printerName: string, branchId: string): Promise<Printer | null> {
        try {
            const printer = await prisma.printer.findFirst({
                where: { printerName, branchId }
            });
            return printer as unknown as Printer | null;
        } catch (error) {
            throw new Error(`Error finding printer by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if printer exists
     */
    static async exists(printerId: string): Promise<boolean> {
        try {
            const printer = await prisma.printer.findUnique({
                where: { printerId },
                select: { printerId: true }
            });
            return !!printer;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create a new printer
     */
    static async create(data: CreatePrinterRequest & { tenantId: string; branchId: string }): Promise<Printer> {
        try {
            const printerId = uuidv4();
            const now = new Date();

            const configuration = {
                ...defaultConfiguration,
                ...(data.configuration || {})
            };

            const printer = await prisma.printer.create({
                data: {
                    printerId,
                    tenantId: data.tenantId,
                    branchId: data.branchId,
                    terminalId: data.terminalId || null,
                    printerName: data.printerName,
                    printerModel: data.printerModel || null,
                    printerType: data.printerType || 'THERMAL',
                    connectionType: data.connectionType || 'USB',
                    connectionAddress: data.connectionAddress || null,
                    port: data.port || null,
                    vendorId: data.vendorId || null,
                    productId: data.productId || null,
                    serialNumber: data.serialNumber || null,
                    isDefault: data.isDefault || false,
                    isReceiptPrinter: data.isReceiptPrinter ?? true,
                    isLabelPrinter: data.isLabelPrinter ?? false,
                    isKitchenPrinter: data.isKitchenPrinter ?? false,
                    isReportPrinter: data.isReportPrinter ?? false,
                    status: 'OFFLINE',
                    configuration: JSON.stringify(configuration),
                    printJobCount: 0,
                    errorCount: 0,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now
                }
            });

            return printer as unknown as Printer;
        } catch (error) {
            throw new Error(`Error creating printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a printer
     */
    static async update(printerId: string, data: UpdatePrinterRequest): Promise<Printer | null> {
        try {
            const updateData: any = {
                ...data,
                updatedAt: new Date()
            };

            if (data.configuration) {
                const existingPrinter = await prisma.printer.findUnique({
                    where: { printerId }
                });

                if (existingPrinter) {
                    const existingConfig = existingPrinter.configuration
                        ? (typeof existingPrinter.configuration === 'string'
                            ? JSON.parse(existingPrinter.configuration)
                            : existingPrinter.configuration)
                        : {};
                    updateData.configuration = JSON.stringify({
                        ...existingConfig,
                        ...data.configuration
                    });
                } else {
                    updateData.configuration = JSON.stringify(data.configuration);
                }
            }

            const printer = await prisma.printer.update({
                where: { printerId },
                data: updateData
            });

            return printer as unknown as Printer;
        } catch (error) {
            throw new Error(`Error updating printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Set printer as default
     */
    static async setAsDefault(printerId: string, branchId: string): Promise<Printer | null> {
        try {
            // First, unset any existing default printers in the branch
            await prisma.printer.updateMany({
                where: { branchId, isDefault: true },
                data: { isDefault: false, updatedAt: new Date() }
            });

            // Then set the specified printer as default
            const printer = await prisma.printer.update({
                where: { printerId },
                data: {
                    isDefault: true,
                    updatedAt: new Date()
                }
            });

            return printer as unknown as Printer;
        } catch (error) {
            throw new Error(`Error setting printer as default: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update printer status
     */
    static async updateStatus(printerId: string, status: PrinterStatus, errorMessage?: string): Promise<Printer | null> {
        try {
            const updateData: any = {
                status,
                updatedAt: new Date()
            };

            if (status === 'ONLINE') {
                updateData.lastConnected = new Date();
                updateData.lastError = null;
            }

            if (status === 'ERROR' && errorMessage) {
                updateData.lastError = errorMessage;
                updateData.errorCount = { increment: 1 };
            }

            const printer = await prisma.printer.update({
                where: { printerId },
                data: updateData
            });

            return printer as unknown as Printer;
        } catch (error) {
            throw new Error(`Error updating printer status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update printer configuration
     */
    static async updateConfiguration(printerId: string, configuration: Partial<PrinterConfiguration>): Promise<Printer | null> {
        try {
            const existingPrinter = await prisma.printer.findUnique({
                where: { printerId }
            });

            if (!existingPrinter) return null;

            const existingConfig = existingPrinter.configuration
                ? (typeof existingPrinter.configuration === 'string'
                    ? JSON.parse(existingPrinter.configuration)
                    : existingPrinter.configuration)
                : {};
            const newConfig = {
                ...existingConfig,
                ...configuration
            };

            const printer = await prisma.printer.update({
                where: { printerId },
                data: {
                    configuration: JSON.stringify(newConfig),
                    updatedAt: new Date()
                }
            });

            return printer as unknown as Printer;
        } catch (error) {
            throw new Error(`Error updating printer configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Increment print job count
     */
    static async incrementPrintJobCount(printerId: string): Promise<void> {
        try {
            await prisma.printer.update({
                where: { printerId },
                data: {
                    printJobCount: { increment: 1 },
                    lastPrintJob: new Date(),
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            throw new Error(`Error incrementing print job count: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a printer (soft delete)
     */
    static async delete(printerId: string): Promise<boolean> {
        try {
            await prisma.printer.update({
                where: { printerId },
                data: {
                    isActive: false,
                    updatedAt: new Date()
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Error deleting printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Hard delete a printer
     */
    static async hardDelete(printerId: string): Promise<boolean> {
        try {
            await prisma.printer.delete({
                where: { printerId }
            });
            return true;
        } catch (error) {
            throw new Error(`Error hard deleting printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export class PrintJobModel {
    /**
     * Find print jobs by printer ID
     */
    static async findByPrinterId(printerId: string): Promise<PrintJob[]> {
        try {
            const printJobs = await prisma.printJob.findMany({
                where: { printerId },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
            return printJobs as unknown as PrintJob[];
        } catch (error) {
            throw new Error(`Error finding print jobs by printer ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find pending print jobs
     */
    static async findPending(branchId: string): Promise<PrintJob[]> {
        try {
            const printJobs = await prisma.printJob.findMany({
                where: {
                    branchId,
                    status: 'PENDING'
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' }
                ]
            });
            return printJobs as unknown as PrintJob[];
        } catch (error) {
            throw new Error(`Error finding pending print jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Find print job by ID
     */
    static async findById(printJobId: string): Promise<PrintJob | null> {
        try {
            const printJob = await prisma.printJob.findUnique({
                where: { printJobId }
            });
            return printJob as unknown as PrintJob | null;
        } catch (error) {
            throw new Error(`Error finding print job by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a print job
     */
    static async create(data: CreatePrintJobRequest & { tenantId: string; branchId: string }): Promise<PrintJob> {
        try {
            const printJobId = uuidv4();
            const now = new Date();

            const printJob = await prisma.printJob.create({
                data: {
                    printJobId,
                    printerId: data.printerId,
                    tenantId: data.tenantId,
                    branchId: data.branchId,
                    terminalId: data.terminalId || null,
                    userId: data.userId || null,
                    jobType: data.jobType || 'RECEIPT',
                    jobTitle: data.jobTitle,
                    status: 'PENDING',
                    content: data.content,
                    contentType: data.contentType || 'RAW',
                    copies: data.copies || 1,
                    priority: data.priority || 5,
                    referenceId: data.referenceId || null,
                    referenceType: data.referenceType || null,
                    scheduledAt: data.scheduledAt || null,
                    createdAt: now,
                    updatedAt: now
                }
            });

            return printJob as unknown as PrintJob;
        } catch (error) {
            throw new Error(`Error creating print job: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update print job status
     */
    static async updateStatus(printJobId: string, status: PrintJobStatus, errorMessage?: string): Promise<PrintJob | null> {
        try {
            const updateData: any = {
                status,
                updatedAt: new Date()
            };

            if (status === 'COMPLETED') {
                updateData.printedAt = new Date();
            }

            if (status === 'FAILED' && errorMessage) {
                updateData.errorMessage = errorMessage;
            }

            const printJob = await prisma.printJob.update({
                where: { printJobId },
                data: updateData
            });

            return printJob as unknown as PrintJob;
        } catch (error) {
            throw new Error(`Error updating print job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete old print jobs (cleanup)
     */
    static async deleteOldJobs(daysOld = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await prisma.printJob.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
                }
            });

            return result.count;
        } catch (error) {
            throw new Error(`Error deleting old print jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
