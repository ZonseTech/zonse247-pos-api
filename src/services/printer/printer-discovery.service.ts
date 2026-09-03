import { PrinterModel } from '../../models/printer.model';
import {
    Printer,
    PrinterStatus,
    PrinterTestResult,
    DiscoveredPrinter,
    PrinterConnectionType,
} from '../../types/printer';
import {
    PrinterDiscovery,
    discoverPrinters,
    scanNetworkRange,
    getAvailableSerialPorts,
    getCommonPrinterPorts,
    validatePrinterConfig,
    checkPrinterConnection,
    SerialPortInfo,
    CommonPrinterPort,
} from '../../lib/print-engine';

export class PrinterDiscoveryService {
    static cleanup(): void {
        PrinterDiscovery.cleanup();
    }

    static discoverPrinters(connectionType?: PrinterConnectionType): Promise<DiscoveredPrinter[]> {
        return discoverPrinters(connectionType);
    }

    static scanNetworkRange(baseIP: string, startHost?: number, endHost?: number, port?: number): Promise<DiscoveredPrinter[]> {
        return scanNetworkRange(baseIP, startHost, endHost, port);
    }

    static getAvailableSerialPorts(): Promise<SerialPortInfo[]> {
        return getAvailableSerialPorts();
    }

    static getCommonPrinterPorts(): CommonPrinterPort[] {
        return getCommonPrinterPorts();
    }

    static validatePrinterConfig(printer: Partial<Printer>): { valid: boolean; errors: string[] } {
        return validatePrinterConfig(printer);
    }

    /**
     * Test a registered printer's connection and persist the result onto its row.
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
            const isOnline = await checkPrinterConnection(printer);
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
     * Get printer status for all printers in a branch
     */
    static async getBranchPrinterStatus(branchId: string): Promise<PrinterTestResult[]> {
        const printers = await PrinterModel.findAll({ branchId });
        const results: PrinterTestResult[] = [];

        // Test printers in parallel with a limit
        const batchSize = 5;
        for (let i = 0; i < printers.length; i += batchSize) {
            const batch = printers.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(printer =>
                    this.testPrinter(printer.printerId, printer.tenantId, branchId)
                )
            );
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Monitor printer health (for background jobs)
     */
    static async monitorPrinterHealth(tenantId: string): Promise<{
        total: number;
        online: number;
        offline: number;
        error: number;
        printers: PrinterTestResult[];
    }> {
        const printers = await PrinterModel.findAll({ tenantId });
        const results: PrinterTestResult[] = [];

        // Test printers in parallel with a limit
        const batchSize = 10;
        for (let i = 0; i < printers.length; i += batchSize) {
            const batch = printers.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(printer =>
                    this.testPrinter(printer.printerId, tenantId, printer.branchId)
                )
            );
            results.push(...batchResults);
        }

        return {
            total: results.length,
            online: results.filter(r => r.printerStatus === PrinterStatus.ONLINE).length,
            offline: results.filter(r => r.printerStatus === PrinterStatus.OFFLINE).length,
            error: results.filter(r => r.printerStatus === PrinterStatus.ERROR).length,
            printers: results
        };
    }
}

export default PrinterDiscoveryService;
