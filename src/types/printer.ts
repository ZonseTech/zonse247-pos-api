/**
 * Printer Types and Interfaces
 * Defines types for printer management in POS system.
 *
 * Device-level types (connection/discovery/config shape) come from
 * lib/print-engine, the single source of truth for those shapes. Only
 * DB/tenant-shaped types are declared here.
 */

import { ReceiptDisplaySettings } from './terminal-settings';
import {
    PrinterType,
    PrinterConnectionType,
    PrinterConfiguration,
    DiscoveredPrinter,
} from '../lib/print-engine';

export { PrinterType, PrinterConnectionType, PrinterConfiguration, DiscoveredPrinter };

export enum PrinterStatus {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    BUSY = 'BUSY',
    ERROR = 'ERROR',
    PAPER_OUT = 'PAPER_OUT',
    COVER_OPEN = 'COVER_OPEN'
}

export enum PrintJobStatus {
    PENDING = 'PENDING',
    PRINTING = 'PRINTING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum PrintJobType {
    RECEIPT = 'RECEIPT',
    INVOICE = 'INVOICE',
    REPORT = 'REPORT',
    LABEL = 'LABEL',
    BARCODE = 'BARCODE',
    KITCHEN_ORDER = 'KITCHEN_ORDER',
    TEST_PAGE = 'TEST_PAGE',
    CASH_DRAWER = 'CASH_DRAWER'
}

export interface Printer {
    printerId: string;
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    printerName: string;
    printerModel?: string | null;
    printerType: PrinterType;
    connectionType: PrinterConnectionType;
    connectionAddress?: string | null;    // IP address, MAC address, or device path
    port?: number | null;                 // Network port for network printers
    baudRate?: number | null;             // Baud rate for serial/USB printers (default: 9600)
    vendorId?: string | null;             // USB vendor ID
    productId?: string | null;            // USB product ID
    serialNumber?: string | null;
    isDefault: boolean;
    isReceiptPrinter: boolean;
    isLabelPrinter: boolean;
    isKitchenPrinter: boolean;
    isReportPrinter: boolean;
    status: PrinterStatus;
    configuration: PrinterConfiguration;
    lastConnected?: Date | null;
    lastPrintJob?: Date | null;
    printJobCount?: number;
    errorCount?: number;
    lastError?: string | null;
    isActive: boolean;
    synced?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreatePrinterRequest {
    tenantId?: string;
    branchId?: string;
    terminalId?: string;
    printerName: string;
    printerModel?: string;
    printerType: PrinterType;
    connectionType: PrinterConnectionType;
    connectionAddress?: string;
    port?: number;
    baudRate?: number;
    vendorId?: string;
    productId?: string;
    serialNumber?: string;
    isDefault?: boolean;
    isReceiptPrinter?: boolean;
    isLabelPrinter?: boolean;
    isKitchenPrinter?: boolean;
    isReportPrinter?: boolean;
    configuration?: PrinterConfiguration;
}

export interface UpdatePrinterRequest {
    printerName?: string;
    printerModel?: string;
    printerType?: PrinterType;
    connectionType?: PrinterConnectionType;
    connectionAddress?: string;
    port?: number;
    baudRate?: number;
    vendorId?: string;
    productId?: string;
    serialNumber?: string;
    isDefault?: boolean;
    isReceiptPrinter?: boolean;
    isLabelPrinter?: boolean;
    isKitchenPrinter?: boolean;
    isReportPrinter?: boolean;
    status?: PrinterStatus;
    configuration?: PrinterConfiguration;
    isActive?: boolean;
}

export interface PrinterQueryParams {
    tenantId?: string;
    branchId?: string;
    terminalId?: string;
    printerType?: PrinterType;
    connectionType?: PrinterConnectionType;
    status?: PrinterStatus;
    isDefault?: boolean;
    isReceiptPrinter?: boolean;
    isLabelPrinter?: boolean;
    isKitchenPrinter?: boolean;
    isReportPrinter?: boolean;
    isActive?: boolean;
}

export interface PrintJob {
    printJobId: string;
    printerId: string;
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    userId?: string | null;
    jobType: PrintJobType;
    jobTitle: string;
    status: PrintJobStatus;
    content: string;                  // Content to print (HTML, raw commands, etc.)
    contentType?: string;             // 'HTML', 'RAW', 'ESC_POS', 'ZPL'
    copies?: number;
    priority?: number;                // 1-10, higher = more urgent
    referenceId?: string | null;      // Reference to sale, order, etc.
    referenceType?: string | null;    // 'SALE', 'ORDER', 'RETURN', etc.
    errorMessage?: string | null;
    printedAt?: Date | null;
    scheduledAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreatePrintJobRequest {
    printerId: string;
    tenantId?: string;
    branchId?: string;
    terminalId?: string;
    userId?: string;
    jobType: PrintJobType;
    jobTitle: string;
    content: string;
    contentType?: string;
    copies?: number;
    priority?: number;
    referenceId?: string;
    referenceType?: string;
    scheduledAt?: Date;
}

export interface PrintReceiptRequest {
    printerId?: string;               // Optional - uses default receipt printer if not specified
    saleId?: string;                  // Primary identifier - use this for new sales
    transactionId?: string;           // @deprecated - use saleId instead (transactions table deprecated)
    orderId?: string;
    terminalId?: string;              // Terminal ID for fetching receipt settings (if receiptSettings not provided)
    receiptSettings?: ReceiptDisplaySettings; // Pass directly to skip terminal settings DB lookup
    copies?: number;
    includeHeader?: boolean;
    includeFooter?: boolean;
    includeLogo?: boolean;
    customMessage?: string;
}

export interface PrintLabelRequest {
    printerId?: string;               // Optional - uses default label printer if not specified
    productId: string;
    quantity: number;
    includePrice?: boolean;
    includeBarcode?: boolean;
    includeQRCode?: boolean;
    customText?: string;
}

export interface PrinterTestResult {
    success: boolean;
    message: string;
    printerId: string;
    responseTime?: number;
    printerStatus?: PrinterStatus;
    errorDetails?: string;
}
