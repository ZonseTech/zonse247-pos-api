import {
    AppPlatform,
    PlatformDiscoveryRequest,
    PlatformDiscoveryResult,
    PrintResult,
    PrinterConnectionType,
    PrinterDescriptor,
} from '../types';

export interface IPrintStrategy {
    supports(platform: AppPlatform): boolean;
    supportsConnection(connectionType: PrinterConnectionType): boolean;
    print(printer: PrinterDescriptor, content: string, options?: Record<string, unknown>): Promise<PrintResult>;
    testConnection(printer: PrinterDescriptor): Promise<{ online: boolean; responseTime?: number; error?: string }>;
    getName(): string;
}

export interface IDiscoveryStrategy {
    supports(platform: AppPlatform): boolean;
    discover(request: PlatformDiscoveryRequest): Promise<PlatformDiscoveryResult>;
    getSupportedConnectionTypes(): PrinterConnectionType[];
}
