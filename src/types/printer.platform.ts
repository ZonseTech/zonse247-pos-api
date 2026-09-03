/**
 * Platform-Specific Printer Types
 * Defines types for multi-platform printer support (Web, Desktop, Mobile)
 */

import { Printer, PrintJob, PrinterStatus, PrintJobStatus, PrintJobType } from './printer';
import {
    AppPlatform,
    PrintErrorCode,
    PlatformCapabilities,
    PLATFORM_CAPABILITIES,
    PlatformDiscoveryRequest,
    DiscoveredPlatformPrinter,
    PlatformDiscoveryResult,
} from '../lib/print-engine';

// Device-level platform/discovery types are owned by lib/print-engine —
// re-exported here so existing api imports keep working unchanged.
export {
    AppPlatform,
    PrintErrorCode,
    PlatformCapabilities,
    PLATFORM_CAPABILITIES,
    PlatformDiscoveryRequest,
    DiscoveredPlatformPrinter,
    PlatformDiscoveryResult,
};

// ==================== PLATFORM TYPES ====================

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

export default {
    AppPlatform,
    PrintErrorCode,
    PLATFORM_CAPABILITIES
};
