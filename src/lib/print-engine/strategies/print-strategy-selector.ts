import {
    AppPlatform,
    PlatformCapabilities,
    PrintResult,
    PrinterConnectionType,
    PrinterDescriptor,
} from '../types';
import { PLATFORM_CAPABILITIES } from '../constants';
import { PlatformNotSupportedError } from '../errors';
import { IPrintStrategy } from './strategy.types';
import { PrintStrategyFactory } from './print-strategy-factory';

export class PrintStrategySelector {
    private platform: AppPlatform;
    private capabilities: PlatformCapabilities;

    constructor(platform: AppPlatform) {
        this.platform = platform;
        this.capabilities = PLATFORM_CAPABILITIES[platform];
    }

    selectStrategy(printer: PrinterDescriptor): IPrintStrategy {
        const strategy = PrintStrategyFactory.getStrategy(this.platform, printer.connectionType);

        if (!strategy) {
            throw new PlatformNotSupportedError(`${printer.connectionType} printing`, this.platform);
        }

        return strategy;
    }

    async print(printer: PrinterDescriptor, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const strategy = this.selectStrategy(printer);
        return strategy.print(printer, content, options);
    }

    async testConnection(printer: PrinterDescriptor): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const strategy = this.selectStrategy(printer);
        return strategy.testConnection(printer);
    }

    isConnectionSupported(connectionType: PrinterConnectionType): boolean {
        switch (connectionType) {
            case PrinterConnectionType.USB:
                return this.capabilities.supportsUSB;
            case PrinterConnectionType.NETWORK:
                return this.capabilities.supportsNetwork;
            case PrinterConnectionType.BLUETOOTH:
                return this.capabilities.supportsBluetooth;
            case PrinterConnectionType.SERIAL:
                return this.capabilities.supportsSerial;
            case PrinterConnectionType.WIFI:
                return this.capabilities.supportsWifi;
            default:
                return false;
        }
    }

    getCapabilities(): PlatformCapabilities {
        return this.capabilities;
    }

    getAvailableConnectionTypes(): PrinterConnectionType[] {
        const types: PrinterConnectionType[] = [];
        if (this.capabilities.supportsUSB) types.push(PrinterConnectionType.USB);
        if (this.capabilities.supportsNetwork) types.push(PrinterConnectionType.NETWORK);
        if (this.capabilities.supportsBluetooth) types.push(PrinterConnectionType.BLUETOOTH);
        if (this.capabilities.supportsSerial) types.push(PrinterConnectionType.SERIAL);
        if (this.capabilities.supportsWifi) types.push(PrinterConnectionType.WIFI);
        return types;
    }
}
