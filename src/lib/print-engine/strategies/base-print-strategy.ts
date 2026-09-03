import {
    AppPlatform,
    PrintErrorCode,
    PrintResult,
    PrinterConnectionType,
    PrinterDescriptor,
} from '../types';
import { IPrintStrategy } from './strategy.types';

export abstract class BasePrintStrategy implements IPrintStrategy {
    protected readonly supportedPlatforms: AppPlatform[];
    protected readonly supportedConnections: PrinterConnectionType[];
    protected readonly name: string;

    constructor(name: string, platforms: AppPlatform[], connections: PrinterConnectionType[]) {
        this.name = name;
        this.supportedPlatforms = platforms;
        this.supportedConnections = connections;
    }

    supports(platform: AppPlatform): boolean {
        return this.supportedPlatforms.includes(platform);
    }

    supportsConnection(connectionType: PrinterConnectionType): boolean {
        return this.supportedConnections.includes(connectionType);
    }

    getName(): string {
        return this.name;
    }

    abstract print(printer: PrinterDescriptor, content: string, options?: Record<string, unknown>): Promise<PrintResult>;
    abstract testConnection(printer: PrinterDescriptor): Promise<{ online: boolean; responseTime?: number; error?: string }>;

    protected createSuccessResult(platform?: AppPlatform): PrintResult {
        return {
            success: true,
            message: 'Print completed successfully',
            platform: platform || AppPlatform.DESKTOP,
            printedAt: new Date(),
        };
    }

    protected createFailureResult(message: string, errorCode: PrintErrorCode, platform?: AppPlatform): PrintResult {
        return {
            success: false,
            message,
            platform: platform || AppPlatform.DESKTOP,
            errorCode,
            errorDetails: message,
        };
    }
}
