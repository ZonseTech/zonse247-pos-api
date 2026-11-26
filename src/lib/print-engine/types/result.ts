import { AppPlatform } from './platform';

export enum PrintErrorCode {
    UNKNOWN = 'UNKNOWN',
    PRINTER_NOT_FOUND = 'PRINTER_NOT_FOUND',
    PRINTER_OFFLINE = 'PRINTER_OFFLINE',
    PRINTER_BUSY = 'PRINTER_BUSY',
    NO_CONTENT = 'NO_CONTENT',
    INVALID_CONTENT = 'INVALID_CONTENT',
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    BLUETOOTH_DISABLED = 'BLUETOOTH_DISABLED',
    BLUETOOTH_PAIRING_FAILED = 'BLUETOOTH_PAIRING_FAILED',
    USB_NOT_SUPPORTED = 'USB_NOT_SUPPORTED',
    NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
    QUEUE_FULL = 'QUEUE_FULL',
    JOB_CANCELLED = 'JOB_CANCELLED',
    JOB_TIMEOUT = 'JOB_TIMEOUT',
    PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
}

export interface PrintResult {
    success: boolean;
    message: string;
    platform: AppPlatform;
    printedAt?: Date;
    errorCode?: PrintErrorCode;
    errorDetails?: string;
    platformData?: Record<string, unknown>;
}

export interface ConnectionTestResult {
    online: boolean;
    responseTime?: number;
    error?: string;
}
