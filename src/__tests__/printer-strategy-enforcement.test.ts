import { PrintJobService } from '../services/printer/print-job.service';
import { PrinterDiscoveryService } from '../services/printer/printer-discovery.service';
import { PrintStrategyFactory, PrintStrategySelector } from '../services/printer/strategies';
import { AppPlatform } from '../types/printer.platform';
import { PrinterConnectionType, PrinterType } from '../types/printer';

jest.mock('../services/printer/strategies', () => {
    const actual = jest.requireActual('../services/printer/strategies');
    return {
        ...actual,
        ensureStrategiesInitialized: jest.fn(),
    };
});

describe('printer strategy enforcement', () => {
    it('preserves latin1 bytes for raw receipt content', async () => {
        expect(Buffer.from('café', 'latin1')).toEqual(Buffer.from([0x63, 0x61, 0x66, 0xE9]));
    });

    it('routes discovery through the strategy factory', async () => {
        const discoverySpy = jest.fn().mockResolvedValue({
            platform: AppPlatform.DESKTOP,
            printers: [{
                name: 'Desk Printer',
                platform: AppPlatform.DESKTOP,
                connectionType: PrinterConnectionType.NETWORK,
                address: '192.168.0.30',
                isOnline: true,
            }],
            scanDuration: 10,
        });

        jest.spyOn(PrintStrategyFactory, 'getDiscoveryStrategy').mockReturnValue({
            supports: () => true,
            getSupportedConnectionTypes: () => [PrinterConnectionType.NETWORK],
            discover: discoverySpy,
        } as any);

        const result = await PrinterDiscoveryService.discoverPrinters(PrinterConnectionType.NETWORK);

        expect(discoverySpy).toHaveBeenCalled();
        expect(result).toEqual([{ name: 'Desk Printer', address: '192.168.0.30', connectionType: PrinterConnectionType.NETWORK, isOnline: true }]);
    });

    it.each([
        ['Epson TM-T20', PrinterType.THERMAL],
        ['Brother QL-800', PrinterType.LABEL],
        ['HOP-E802', PrinterType.THERMAL],
    ])('classifies discovery results for %s as %s', async (printerName, expectedType) => {
        const discoverySpy = jest.fn().mockResolvedValue({
            platform: AppPlatform.DESKTOP,
            printers: [{
                name: printerName,
                platform: AppPlatform.DESKTOP,
                connectionType: PrinterConnectionType.NETWORK,
                address: '192.168.1.30',
                isOnline: true,
            }],
            scanDuration: 10,
        });

        jest.spyOn(PrintStrategyFactory, 'getDiscoveryStrategy').mockReturnValue({
            supports: () => true,
            getSupportedConnectionTypes: () => [PrinterConnectionType.NETWORK],
            discover: discoverySpy,
        } as any);

        const result = await PrinterDiscoveryService.discoverPrinters(PrinterConnectionType.NETWORK);

        expect(result[0].type).toBe(expectedType);
    });

    it.each([
        ['Epson TM-T20', PrinterType.THERMAL, PrinterConnectionType.NETWORK],
        ['Brother QL-800', PrinterType.LABEL, PrinterConnectionType.USB],
        ['HOP-E802', PrinterType.THERMAL, PrinterConnectionType.BLUETOOTH],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ])('routes print jobs through the strategy selector for %s', async (printerName, printerType, connectionType) => {
        const selectorSpy = jest
            .spyOn(PrintStrategySelector.prototype, 'print')
            .mockResolvedValue({
                success: true,
                message: 'printed',
                platform: AppPlatform.DESKTOP,
                status: 'COMPLETED' as never,
            });

        const printer = {
            printerId: 'printer-1',
            printerName: 'Receipt Printer',
            printerType: PrinterType.THERMAL,
            connectionType: PrinterConnectionType.NETWORK,
            connectionAddress: '192.168.0.10',
            port: 9100,
        } as any;

        const printJob = {
            printJobId: 'job-1',
            printerId: printer.printerId,
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            content: 'abc123',
            contentType: 'RAW',
            copies: 1,
            jobType: 'RECEIPT' as never,
            jobTitle: 'Receipt',
            status: 'PENDING' as never,
        } as any;

        const sendToPrinter = (PrintJobService as any).sendToPrinter;
        const result = await sendToPrinter.call(PrintJobService, printer, printJob);

        expect(result).toBe(true);
        expect(selectorSpy).toHaveBeenCalledWith(printer, 'abc123', undefined);
        selectorSpy.mockRestore();
    });
});
