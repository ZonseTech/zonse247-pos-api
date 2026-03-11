/**
 * Platform-Specific Printer Types
 * Defines types for multi-platform printer support (Web, Desktop, Mobile)
 */

import { Printer, PrintJob, PrinterStatus, PrinterConnectionType, PrintJobStatus, PrintJobType } from './printer';

// ==================== PLATFORM TYPES ====================

/**
 * Supported application platforms
 */
export enum AppPlatform {
    WEB = 'WEB',
    DESKTOP = 'DESKTOP',      // Electron
    MOBILE_ANDROID = 'MOBILE_ANDROID',
    MOBILE_IOS = 'MOBILE_IOS',
    MOBILE_REACT_NATIVE = 'MOBILE_REACT_NATIVE'
}

/**
 * Platform capabilities for printing
 */
export interface PlatformCapabilities {
    platform: AppPlatform;
    
    // Connection support
    supportsUSB: boolean;
    supportsNetwork: boolean;
    supportsBluetooth: boolean;
    supportsSerial: boolean;
    supportsWifi: boolean;
    
    // Feature support
    supportsDirectPrint: boolean;    // Can print directly without server
    supportsPrintPreview: boolean;   // Can show print preview
    supportsBackgroundPrint: boolean; // Can print in background
    supportsPrinterDiscovery: boolean; // Can discover printers
    supportsCloudPrint: boolean;     // Can use cloud printing
    supportsRawCommands: boolean;    // Can send raw ESC/POS commands
    
    // Storage
    supportsLocalQueue: boolean;     // Can queue jobs locally
    supportsOfflineMode: boolean;    // Can work offline
}

/**
 * Platform-specific print request
 */
export interface PlatformPrintRequest {
    platform: AppPlatform;
    printerId?: string;
    content: string;
    contentType: 'HTML' | 'RAW' | 'ESC_POS' | 'ZPL' | 'PDF' | 'IMAGE';
    jobType: PrintJobType;
    jobTitle: string;
    copies?: number;
    priority?: number;
    
    // Platform-specific options
    options?: PlatformPrintOptions;
}

export interface PlatformPrintOptions {
    // Web options
    openInNewWindow?: boolean;
    showPrintDialog?: boolean;
    printBackground?: boolean;
    
    // Desktop (Electron) options
    silent?: boolean;        // Print without dialog
    deviceName?: string;     // Specific printer name
    pageRanges?: { from: number; to: number }[];
    
    // Mobile options
    bluetoothAddress?: string;
    wifiAddress?: string;
    paperSize?: 'ROLL_58MM' | 'ROLL_80MM' | 'A4' | 'LETTER';
    orientation?: 'PORTRAIT' | 'LANDSCAPE';
}

// ==================== PRINT RESULT TYPES ====================

/**
 * Result of a print operation
 */
export interface PrintResult {
    success: boolean;
    printJobId?: string;
    message: string;
    platform: AppPlatform;
    
    // Status tracking
    status: PrintJobStatus;
    printedAt?: Date;
    
    // Error info
    errorCode?: PrintErrorCode;
    errorDetails?: string;
    
    // Platform-specific result data
    platformData?: Record<string, unknown>;
}

export enum PrintErrorCode {
    // General errors
    UNKNOWN = 'UNKNOWN',
    PRINTER_NOT_FOUND = 'PRINTER_NOT_FOUND',
    PRINTER_OFFLINE = 'PRINTER_OFFLINE',
    PRINTER_BUSY = 'PRINTER_BUSY',
    NO_CONTENT = 'NO_CONTENT',
    INVALID_CONTENT = 'INVALID_CONTENT',
    
    // Connection errors
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    
    // Platform-specific errors
    BLUETOOTH_DISABLED = 'BLUETOOTH_DISABLED',
    BLUETOOTH_PAIRING_FAILED = 'BLUETOOTH_PAIRING_FAILED',
    USB_NOT_SUPPORTED = 'USB_NOT_SUPPORTED',
    NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
    
    // Queue errors
    QUEUE_FULL = 'QUEUE_FULL',
    JOB_CANCELLED = 'JOB_CANCELLED',
    JOB_TIMEOUT = 'JOB_TIMEOUT'
}

// ==================== PLATFORM-SPECIFIC PRINTER INFO ====================

/**
 * Extended printer info with platform-specific details
 */
export interface PlatformPrinter extends Printer {
    platform: AppPlatform;
    platformSpecificId?: string;  // Platform's internal ID for the printer
    capabilities?: PrinterCapabilities;
}

export interface PrinterCapabilities {
    maxPaperWidth: number;       // in mm
    supportedPaperWidths: number[];
    supportsColor: boolean;
    supportsCashDrawer: boolean;
    supportsCutter: boolean;
    supportsBarcode: boolean;
    supportsQRCode: boolean;
    supportsLogo: boolean;
    maxResolution?: number;      // DPI
    supportedEncodings: string[];
}

// ==================== DISCOVERY TYPES ====================

/**
 * Platform-aware printer discovery request
 */
export interface PlatformDiscoveryRequest {
    platform: AppPlatform;
    connectionTypes?: PrinterConnectionType[];
    timeout?: number;
    
    // Network scan options
    networkRange?: {
        baseIP: string;
        startHost: number;
        endHost: number;
        ports: number[];
    };
    
    // Bluetooth options
    bluetoothOptions?: {
        scanDuration: number;
        filterByName?: string;
    };
}

export interface PlatformDiscoveryResult {
    platform: AppPlatform;
    printers: DiscoveredPlatformPrinter[];
    scanDuration: number;
    errors?: string[];
}

export interface DiscoveredPlatformPrinter {
    name: string;
    platform: AppPlatform;
    connectionType: PrinterConnectionType;
    address?: string;
    port?: number;
    vendorId?: string;
    productId?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    isOnline: boolean;
    signalStrength?: number;     // For Bluetooth/WiFi
    capabilities?: PrinterCapabilities;
}

// ==================== QUEUE TYPES ====================

/**
 * Platform-aware print queue item
 */
export interface PlatformQueueItem {
    printJob: PrintJob;
    platform: AppPlatform;
    attempts: number;
    maxAttempts: number;
    nextRetryAt: Date | null;
    lastError: string | null;
    addedAt: Date;
    
    // Sync status
    syncedToServer: boolean;
    localOnly: boolean;          // Job created offline
}

// ==================== RESPONSE DTOs ====================

/**
 * Base response properties
 */
interface BaseResponseDTO {
    success: boolean;
    message: string;
    meta?: {
        platform?: AppPlatform;
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Standard printer response DTO
 */
export interface PrinterResponseDTO extends BaseResponseDTO {
    data?: {
        printer?: Printer;
        printers?: Printer[];
        printJob?: PrintJob;
        printJobs?: PrintJob[];
        count?: number;
    };
}

/**
 * Printer list response DTO
 */
export interface PrinterListResponseDTO extends BaseResponseDTO {
    data: {
        printers: Printer[];
        count: number;
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/**
 * Print job response DTO
 */
export interface PrintJobResponseDTO extends BaseResponseDTO {
    data: {
        printJob: PrintJob;
        sale?: unknown;          // Optional sale data for receipts
    };
}

/**
 * Printer health response DTO
 */
export interface PrinterHealthResponseDTO extends BaseResponseDTO {
    data: {
        summary: {
            total: number;
            online: number;
            offline: number;
            error: number;
        };
        printers: Array<{
            printerId: string;
            printerName: string;
            status: PrinterStatus;
            lastChecked: Date;
            responseTime?: number;
            errorMessage?: string;
        }>;
    };
}

/**
 * Queue status response DTO
 */
export interface QueueStatusResponseDTO extends BaseResponseDTO {
    data: {
        total: number;
        pending: number;
        retrying: number;
        processing: number;
        completed: number;
        failed: number;
        jobs?: PlatformQueueItem[];
    };
}

// ==================== REQUEST DTOs ====================

/**
 * Base print request DTO
 */
export interface BasePrintRequestDTO {
    printerId?: string;
    copies?: number;
    priority?: number;
}

/**
 * Receipt print request DTO
 */
export interface PrintReceiptRequestDTO extends BasePrintRequestDTO {
    saleId?: string;
    transactionId?: string;     // @deprecated - use saleId
    orderId?: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
    includeLogo?: boolean;
    customMessage?: string;
}

/**
 * Label print request DTO
 */
export interface PrintLabelRequestDTO extends BasePrintRequestDTO {
    productId: string;
    quantity: number;
    includePrice?: boolean;
    includeBarcode?: boolean;
    includeQRCode?: boolean;
    customText?: string;
}

/**
 * Test page print request DTO
 */
export interface PrintTestPageRequestDTO {
    printerId: string;
    includeColorTest?: boolean;
    includeBarcodeTest?: boolean;
    includeQRTest?: boolean;
}

// ==================== AGENT/SERVICE TYPES ====================

/**
 * Print agent status DTO
 */
export interface PrintAgentStatusDTO {
    isRunning: boolean;
    platform: AppPlatform;
    queueSize: number;
    printersOnline: number;
    printersOffline: number;
    totalPrinters: number;
    lastDiscovery: Date | null;
    uptime: number;
    version?: string;
}

/**
 * Permissions check result
 */
export interface PermissionsCheckDTO {
    platform: AppPlatform;
    permissions: {
        usb: boolean;
        bluetooth: boolean;
        network: boolean;
        serial: boolean;
    };
    hints: string[];
}

/**
 * Setup instructions for platform
 */
export interface SetupInstructionsDTO {
    platform: AppPlatform;
    steps: Array<{
        order: number;
        title: string;
        description: string;
        command?: string;
        link?: string;
    }>;
    requirements: string[];
    troubleshooting: Array<{
        issue: string;
        solution: string;
    }>;
}

// ==================== CONSTANTS ====================

/**
 * Platform capability defaults
 */
export const PLATFORM_CAPABILITIES: Record<AppPlatform, PlatformCapabilities> = {
    [AppPlatform.WEB]: {
        platform: AppPlatform.WEB,
        supportsUSB: false,
        supportsNetwork: true,
        supportsBluetooth: false,
        supportsSerial: false,
        supportsWifi: true,
        supportsDirectPrint: false,
        supportsPrintPreview: true,
        supportsBackgroundPrint: false,
        supportsPrinterDiscovery: false,
        supportsCloudPrint: true,
        supportsRawCommands: false,
        supportsLocalQueue: false,
        supportsOfflineMode: false
    },
    [AppPlatform.DESKTOP]: {
        platform: AppPlatform.DESKTOP,
        supportsUSB: true,
        supportsNetwork: true,
        supportsBluetooth: true,
        supportsSerial: true,
        supportsWifi: true,
        supportsDirectPrint: true,
        supportsPrintPreview: true,
        supportsBackgroundPrint: true,
        supportsPrinterDiscovery: true,
        supportsCloudPrint: true,
        supportsRawCommands: true,
        supportsLocalQueue: true,
        supportsOfflineMode: true
    },
    [AppPlatform.MOBILE_ANDROID]: {
        platform: AppPlatform.MOBILE_ANDROID,
        supportsUSB: true,        // USB OTG
        supportsNetwork: true,
        supportsBluetooth: true,
        supportsSerial: false,
        supportsWifi: true,
        supportsDirectPrint: true,
        supportsPrintPreview: true,
        supportsBackgroundPrint: true,
        supportsPrinterDiscovery: true,
        supportsCloudPrint: true,
        supportsRawCommands: true,
        supportsLocalQueue: true,
        supportsOfflineMode: true
    },
    [AppPlatform.MOBILE_IOS]: {
        platform: AppPlatform.MOBILE_IOS,
        supportsUSB: false,
        supportsNetwork: true,
        supportsBluetooth: true,
        supportsSerial: false,
        supportsWifi: true,
        supportsDirectPrint: false,
        supportsPrintPreview: true,
        supportsBackgroundPrint: false,
        supportsPrinterDiscovery: true,
        supportsCloudPrint: true,
        supportsRawCommands: false,  // Limited in iOS
        supportsLocalQueue: true,
        supportsOfflineMode: true
    },
    [AppPlatform.MOBILE_REACT_NATIVE]: {
        platform: AppPlatform.MOBILE_REACT_NATIVE,
        supportsUSB: true,        // Depends on native modules
        supportsNetwork: true,
        supportsBluetooth: true,
        supportsSerial: false,
        supportsWifi: true,
        supportsDirectPrint: true,
        supportsPrintPreview: true,
        supportsBackgroundPrint: true,
        supportsPrinterDiscovery: true,
        supportsCloudPrint: true,
        supportsRawCommands: true,
        supportsLocalQueue: true,
        supportsOfflineMode: true
    }
};

export default {
    AppPlatform,
    PrintErrorCode,
    PLATFORM_CAPABILITIES
};
