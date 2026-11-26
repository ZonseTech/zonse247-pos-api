import { AppPlatform } from './platform';
import { PrinterConnectionType } from './device';

export interface PlatformDiscoveryRequest {
    platform: AppPlatform;
    connectionTypes?: PrinterConnectionType[];
    timeout?: number;
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
}

export interface PlatformDiscoveryResult {
    platform: AppPlatform;
    printers: DiscoveredPlatformPrinter[];
    scanDuration: number;
    errors?: string[];
}

export interface SerialPortInfo {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    vendorId?: string;
    productId?: string;
    friendlyName?: string;
}

export interface CommonPrinterPort {
    port: number;
    protocol: string;
    description: string;
}
