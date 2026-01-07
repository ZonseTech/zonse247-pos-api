/**
 * Printer Types and Interfaces
 * Defines types for printer management in POS system
 */

export enum PrinterType {
    THERMAL = 'THERMAL',
    INKJET = 'INKJET',
    LASER = 'LASER',
    DOT_MATRIX = 'DOT_MATRIX',
    LABEL = 'LABEL'
}

export enum PrinterConnectionType {
    USB = 'USB',
    NETWORK = 'NETWORK',
    BLUETOOTH = 'BLUETOOTH',
    SERIAL = 'SERIAL',
    WIFI = 'WIFI'
}

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
    TEST_PAGE = 'TEST_PAGE'
}

export interface PrinterConfiguration {
    paperWidth?: number;          // in mm (e.g., 58, 80)
    paperHeight?: number;         // in mm (for labels)
    dpi?: number;                 // dots per inch
    fontSize?: number;            // default font size
    encoding?: string;            // character encoding (e.g., 'UTF-8', 'CP437')
    cutPaper?: boolean;           // auto-cut after printing
    openCashDrawer?: boolean;     // open drawer after receipt
    printLogo?: boolean;          // print store logo
    logoUrl?: string;             // URL or path to logo
    headerLines?: string[];       // custom header text
    footerLines?: string[];       // custom footer text
    printSpeed?: number;          // print speed setting
    darkness?: number;            // print darkness/density (1-10)
    marginTop?: number;           // top margin in mm
    marginBottom?: number;        // bottom margin in mm
    marginLeft?: number;          // left margin in mm
    marginRight?: number;         // right margin in mm
    beepAfterPrint?: boolean;     // beep sound after print
    copies?: number;              // default number of copies
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
    saleId?: string;
    transactionId?: string;
    orderId?: string;
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

export interface DiscoveredPrinter {
    name: string;
    address?: string;
    port?: number;
    type?: PrinterType;
    connectionType: PrinterConnectionType;
    vendorId?: string;
    productId?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    isOnline: boolean;
}

export interface PrinterTestResult {
    success: boolean;
    message: string;
    printerId: string;
    responseTime?: number;
    printerStatus?: PrinterStatus;
    errorDetails?: string;
}
