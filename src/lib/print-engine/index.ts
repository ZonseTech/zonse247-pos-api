export * from './types';
export * from './errors';

export { print, testConnection } from './print';
export { PrinterDiscovery } from './discovery';

import { PrinterDiscovery } from './discovery';
import { PrinterConnectionType, DiscoveredPrinter, CommonPrinterPort, SerialPortInfo, PrinterDescriptor } from './types';

export function discoverPrinters(connectionType?: PrinterConnectionType): Promise<DiscoveredPrinter[]> {
    return PrinterDiscovery.discoverPrinters(connectionType);
}

export function scanNetworkRange(baseIP: string, startHost?: number, endHost?: number, port?: number): Promise<DiscoveredPrinter[]> {
    return PrinterDiscovery.scanNetworkRange(baseIP, startHost, endHost, port);
}

export function getAvailableSerialPorts(): Promise<SerialPortInfo[]> {
    return PrinterDiscovery.getAvailableSerialPorts();
}

export function getCommonPrinterPorts(): CommonPrinterPort[] {
    return PrinterDiscovery.getCommonPrinterPorts();
}

export function validatePrinterConfig(printer: Partial<PrinterDescriptor>): { valid: boolean; errors: string[] } {
    return PrinterDiscovery.validatePrinterConfig(printer);
}

export function checkPrinterConnection(printer: PrinterDescriptor): Promise<boolean> {
    return PrinterDiscovery.checkPrinterConnection(printer);
}

// Content generation
export { ESC_POS, ZONSE247_LOGO, PLATFORM_CAPABILITIES } from './constants';
export { generateOpenDrawerCommand, generateBeepCommand } from './content/esc-pos';
export { divider, centerText, rightAlignText, formatLeftRight, feedAndCut } from './utils/text-layout';
export {
    ReceiptData,
    ReceiptFormatOptions,
    formatReceiptContent as formatReceipt,
    generateBasicReceipt,
    getLineWidth,
    decodeLogoData,
    formatCurrency,
} from './content/receipt';
export {
    LabelContentOptions,
    ProductLabelData,
    formatLabelContent as formatLabel,
    generateBasicLabel,
} from './content/label';
export { generateTestPageContent } from './content/test-page';
export { KitchenOrderData, generateKitchenTicketContent } from './content/kitchen-ticket';
export { PrintReportData, generateReportContent } from './content/report';

// Strategy layer (for advanced consumers that want manual control)
export {
    IPrintStrategy,
    IDiscoveryStrategy,
    BasePrintStrategy,
    BaseDiscoveryStrategy,
    PrintStrategyFactory,
    PrintStrategySelector,
    PrintContext,
    USBPrintStrategy,
    NetworkPrintStrategy,
    BluetoothPrintStrategy,
    initializePrintStrategies,
    ensureStrategiesInitialized,
    createPrintContext,
} from './strategies';
