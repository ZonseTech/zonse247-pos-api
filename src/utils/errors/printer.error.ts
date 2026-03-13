/**
 * Printer Error Module
 * Custom error classes for printer-related operations
 */

import { BaseError } from './base.error';
import { AppPlatform } from '../../types/printer.platform';

/**
 * Error codes specific to printer operations
 */
export enum PrinterErrorCode {
    // Printer errors
    PRINTER_NOT_FOUND = 'PRINTER_NOT_FOUND',
    PRINTER_NOT_ACTIVE = 'PRINTER_NOT_ACTIVE',
    PRINTER_OFFLINE = 'PRINTER_OFFLINE',
    PRINTER_BUSY = 'PRINTER_BUSY',
    PRINTER_NAME_EXISTS = 'PRINTER_NAME_EXISTS',
    
    // Connection errors
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
    
    // Print job errors
    PRINT_JOB_NOT_FOUND = 'PRINT_JOB_NOT_FOUND',
    PRINT_JOB_INVALID_STATUS = 'PRINT_JOB_INVALID_STATUS',
    PRINT_FAILED = 'PRINT_FAILED',
    NO_CONTENT = 'NO_CONTENT',
    INVALID_CONTENT = 'INVALID_CONTENT',
    
    // Platform errors
    PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
    FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
    
    // Configuration errors
    INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    
    // Discovery errors
    DISCOVERY_FAILED = 'DISCOVERY_FAILED',
    NO_PRINTERS_FOUND = 'NO_PRINTERS_FOUND'
}

/**
 * User-friendly error messages for printer errors
 */
export const PrinterErrorMessages: Record<PrinterErrorCode, string> = {
    [PrinterErrorCode.PRINTER_NOT_FOUND]: 'Printer not found',
    [PrinterErrorCode.PRINTER_NOT_ACTIVE]: 'Printer is not active',
    [PrinterErrorCode.PRINTER_OFFLINE]: 'Printer is offline',
    [PrinterErrorCode.PRINTER_BUSY]: 'Printer is busy',
    [PrinterErrorCode.PRINTER_NAME_EXISTS]: 'A printer with this name already exists',
    
    [PrinterErrorCode.CONNECTION_FAILED]: 'Failed to connect to printer',
    [PrinterErrorCode.CONNECTION_TIMEOUT]: 'Printer connection timed out',
    [PrinterErrorCode.PERMISSION_DENIED]: 'Permission denied to access printer',
    [PrinterErrorCode.DEVICE_NOT_FOUND]: 'Printer device not found',
    
    [PrinterErrorCode.PRINT_JOB_NOT_FOUND]: 'Print job not found',
    [PrinterErrorCode.PRINT_JOB_INVALID_STATUS]: 'Print job is not in the required status',
    [PrinterErrorCode.PRINT_FAILED]: 'Print operation failed',
    [PrinterErrorCode.NO_CONTENT]: 'No content to print',
    [PrinterErrorCode.INVALID_CONTENT]: 'Invalid print content',
    
    [PrinterErrorCode.PLATFORM_NOT_SUPPORTED]: 'This operation is not supported on the current platform',
    [PrinterErrorCode.FEATURE_NOT_AVAILABLE]: 'This feature is not available',
    
    [PrinterErrorCode.INVALID_CONFIGURATION]: 'Invalid printer configuration',
    [PrinterErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required field',
    
    [PrinterErrorCode.DISCOVERY_FAILED]: 'Printer discovery failed',
    [PrinterErrorCode.NO_PRINTERS_FOUND]: 'No printers found'
};

/**
 * Hints for resolving printer errors
 */
export const PrinterErrorHints: Partial<Record<PrinterErrorCode, string>> = {
    [PrinterErrorCode.PRINTER_OFFLINE]: 'Check if the printer is powered on and connected',
    [PrinterErrorCode.CONNECTION_TIMEOUT]: 'Verify network connectivity and printer IP address',
    [PrinterErrorCode.PERMISSION_DENIED]: 'On Linux, add user to dialout group: sudo usermod -a -G dialout $USER',
    [PrinterErrorCode.DEVICE_NOT_FOUND]: 'Ensure the printer is properly connected and drivers are installed',
    [PrinterErrorCode.PLATFORM_NOT_SUPPORTED]: 'Try using a different connection method supported by your platform'
};

/**
 * Base printer error class
 */
export class PrinterError extends BaseError {
    public readonly code: PrinterErrorCode;
    public readonly platform?: AppPlatform;
    public readonly printerId?: string;
    public readonly hint?: string;
    public readonly retryable: boolean;

    constructor(
        code: PrinterErrorCode,
        message?: string,
        statusCode = 500,
        options: {
            platform?: AppPlatform;
            printerId?: string;
            hint?: string;
            retryable?: boolean;
        } = {}
    ) {
        super(message || PrinterErrorMessages[code], statusCode);
        this.code = code;
        this.platform = options.platform;
        this.printerId = options.printerId;
        this.hint = options.hint || PrinterErrorHints[code];
        this.retryable = options.retryable ?? false;
        this.name = 'PrinterError';
    }

    /**
     * Convert to JSON for API response
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            printerId: this.printerId,
            platform: this.platform,
            hint: this.hint,
            retryable: this.retryable
        };
    }
}

/**
 * Error thrown when printer is not found
 */
export class PrinterNotFoundError extends PrinterError {
    constructor(printerId?: string) {
        super(
            PrinterErrorCode.PRINTER_NOT_FOUND,
            `Printer${printerId ? ` with ID ${printerId}` : ''} not found`,
            404,
            { printerId, retryable: false }
        );
        this.name = 'PrinterNotFoundError';
    }
}

/**
 * Error thrown when printer is offline
 */
export class PrinterOfflineError extends PrinterError {
    constructor(printerId?: string, printerName?: string) {
        super(
            PrinterErrorCode.PRINTER_OFFLINE,
            `Printer${printerName ? ` "${printerName}"` : ''} is offline`,
            503,
            { printerId, retryable: true }
        );
        this.name = 'PrinterOfflineError';
    }
}

/**
 * Error thrown when connection fails
 */
export class PrinterConnectionError extends PrinterError {
    constructor(
        message: string,
        options: {
            printerId?: string;
            platform?: AppPlatform;
            retryable?: boolean;
        } = {}
    ) {
        super(
            PrinterErrorCode.CONNECTION_FAILED,
            message,
            503,
            { ...options, retryable: options.retryable ?? true }
        );
        this.name = 'PrinterConnectionError';
    }

    /**
     * Create from raw error message
     */
    static fromError(error: Error | string, printerId?: string): PrinterConnectionError {
        const message = error instanceof Error ? error.message : error;
        const lowerMessage = message.toLowerCase();

        let code = PrinterErrorCode.CONNECTION_FAILED;
        let statusCode = 503;
        let retryable = true;
        let hint: string | undefined;

        if (lowerMessage.includes('permission denied') || lowerMessage.includes('eacces')) {
            code = PrinterErrorCode.PERMISSION_DENIED;
            statusCode = 403;
            retryable = false;
            hint = 'On Linux, add user to dialout group: sudo usermod -a -G dialout $USER';
        } else if (lowerMessage.includes('etimedout') || lowerMessage.includes('timeout')) {
            code = PrinterErrorCode.CONNECTION_TIMEOUT;
            hint = 'Check network connectivity and printer IP address';
        } else if (lowerMessage.includes('enoent') || lowerMessage.includes('not found')) {
            code = PrinterErrorCode.DEVICE_NOT_FOUND;
            statusCode = 404;
            retryable = false;
            hint = 'Ensure printer is connected and drivers are installed';
        }

        const err = new PrinterConnectionError(message, { printerId, retryable });
        (err as any).code = code;
        (err as any).statusCode = statusCode;
        if (hint) (err as any).hint = hint;
        return err;
    }
}

/**
 * Error thrown when print job fails
 */
export class PrintJobError extends PrinterError {
    public readonly printJobId?: string;

    constructor(
        code: PrinterErrorCode,
        message?: string,
        options: {
            printJobId?: string;
            printerId?: string;
            retryable?: boolean;
        } = {}
    ) {
        super(code, message, 500, { ...options, retryable: options.retryable ?? true });
        this.printJobId = options.printJobId;
        this.name = 'PrintJobError';
    }
}

/**
 * Error thrown when print job is not found
 */
export class PrintJobNotFoundError extends PrintJobError {
    constructor(printJobId?: string) {
        super(
            PrinterErrorCode.PRINT_JOB_NOT_FOUND,
            `Print job${printJobId ? ` with ID ${printJobId}` : ''} not found`,
            { printJobId, retryable: false }
        );
        (this as any).statusCode = 404;
        this.name = 'PrintJobNotFoundError';
    }
}

/**
 * Error thrown when platform doesn't support operation
 */
export class PlatformNotSupportedError extends PrinterError {
    public readonly feature: string;

    constructor(feature: string, platform?: AppPlatform) {
        super(
            PrinterErrorCode.PLATFORM_NOT_SUPPORTED,
            `${feature} is not supported on ${platform || 'this platform'}`,
            400,
            { platform, retryable: false }
        );
        this.feature = feature;
        this.name = 'PlatformNotSupportedError';
    }
}

/**
 * Error thrown when printer configuration is invalid
 */
export class PrinterConfigurationError extends PrinterError {
    public readonly field?: string;

    constructor(message: string, field?: string) {
        super(
            PrinterErrorCode.INVALID_CONFIGURATION,
            message,
            400,
            { retryable: false }
        );
        this.field = field;
        this.name = 'PrinterConfigurationError';
    }
}

/**
 * Error thrown when printer name already exists
 */
export class PrinterNameExistsError extends PrinterError {
    constructor(printerName: string, branchId?: string) {
        super(
            PrinterErrorCode.PRINTER_NAME_EXISTS,
            `Printer with name "${printerName}" already exists${branchId ? ' in this branch' : ''}`,
            409,
            { retryable: false }
        );
        this.name = 'PrinterNameExistsError';
    }
}

/**
 * Helper to determine HTTP status code from error code
 */
export function getStatusCodeFromPrinterError(code: PrinterErrorCode): number {
    const statusMap: Partial<Record<PrinterErrorCode, number>> = {
        [PrinterErrorCode.PRINTER_NOT_FOUND]: 404,
        [PrinterErrorCode.PRINT_JOB_NOT_FOUND]: 404,
        [PrinterErrorCode.PRINTER_NAME_EXISTS]: 409,
        [PrinterErrorCode.PERMISSION_DENIED]: 403,
        [PrinterErrorCode.PRINTER_OFFLINE]: 503,
        [PrinterErrorCode.CONNECTION_TIMEOUT]: 503,
        [PrinterErrorCode.PRINTER_BUSY]: 503,
        [PrinterErrorCode.INVALID_CONFIGURATION]: 400,
        [PrinterErrorCode.MISSING_REQUIRED_FIELD]: 400,
        [PrinterErrorCode.PLATFORM_NOT_SUPPORTED]: 400,
        [PrinterErrorCode.PRINT_JOB_INVALID_STATUS]: 400
    };

    return statusMap[code] || 500;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof PrinterError) {
        return error.retryable;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        // Retryable conditions
        if (message.includes('timeout') ||
            message.includes('busy') ||
            message.includes('connection refused') ||
            message.includes('network')) {
            return true;
        }
        // Non-retryable conditions
        if (message.includes('permission') ||
            message.includes('not found') ||
            message.includes('invalid')) {
            return false;
        }
    }

    return false;
}
