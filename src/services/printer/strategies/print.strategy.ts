/**
 * Print Strategy Pattern
 * Defines interfaces and strategies for multi-platform printing
 */

import {
    Printer,
    PrinterConnectionType
} from '../../../types/printer';
import {
    AppPlatform,
    PlatformCapabilities,
    PrintResult,
    PlatformDiscoveryRequest,
    PlatformDiscoveryResult,
    PLATFORM_CAPABILITIES,
    PrintErrorCode
} from '../../../types/printer.platform';
import {
    PrinterError,
    PrinterErrorCode,
    PlatformNotSupportedError
} from '../../../utils/errors/printer.error';

// ==================== STRATEGY INTERFACES ====================

/**
 * Interface for print execution strategy
 */
export interface IPrintStrategy {
    /**
     * Check if this strategy supports the given platform
     */
    supports(platform: AppPlatform): boolean;

    /**
     * Check if this strategy supports the given connection type
     */
    supportsConnection(connectionType: PrinterConnectionType): boolean;

    /**
     * Execute print job
     */
    print(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult>;

    /**
     * Test printer connection
     */
    testConnection(printer: Printer): Promise<{ online: boolean; responseTime?: number; error?: string }>;

    /**
     * Get strategy name
     */
    getName(): string;
}

/**
 * Interface for printer discovery strategy
 */
export interface IDiscoveryStrategy {
    /**
     * Check if this strategy supports the given platform
     */
    supports(platform: AppPlatform): boolean;

    /**
     * Discover printers
     */
    discover(request: PlatformDiscoveryRequest): Promise<PlatformDiscoveryResult>;

    /**
     * Get supported connection types
     */
    getSupportedConnectionTypes(): PrinterConnectionType[];
}

/**
 * Interface for content formatter
 */
export interface IContentFormatter {
    /**
     * Format content for specific printer type
     */
    format(content: string, printer: Printer): string;

    /**
     * Get supported content types
     */
    getSupportedContentTypes(): string[];
}

// ==================== ABSTRACT BASE STRATEGIES ====================

/**
 * Abstract base class for print strategies
 */
export abstract class BasePrintStrategy implements IPrintStrategy {
    protected readonly supportedPlatforms: AppPlatform[];
    protected readonly supportedConnections: PrinterConnectionType[];
    protected readonly name: string;

    constructor(
        name: string,
        platforms: AppPlatform[],
        connections: PrinterConnectionType[]
    ) {
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

    abstract print(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult>;
    abstract testConnection(printer: Printer): Promise<{ online: boolean; responseTime?: number; error?: string }>;

    /**
     * Create a successful print result
     */
    protected createSuccessResult(printJobId?: string, platform?: AppPlatform): PrintResult {
        return {
            success: true,
            printJobId,
            message: 'Print completed successfully',
            platform: platform || AppPlatform.DESKTOP,
            status: 'COMPLETED' as any,
            printedAt: new Date()
        };
    }

    /**
     * Create a failed print result
     */
    protected createFailureResult(
        message: string,
        errorCode: PrintErrorCode,
        platform?: AppPlatform
    ): PrintResult {
        return {
            success: false,
            message,
            platform: platform || AppPlatform.DESKTOP,
            status: 'FAILED' as any,
            errorCode,
            errorDetails: message
        };
    }
}

/**
 * Abstract base class for discovery strategies
 */
export abstract class BaseDiscoveryStrategy implements IDiscoveryStrategy {
    protected readonly supportedPlatforms: AppPlatform[];
    protected readonly supportedConnections: PrinterConnectionType[];

    constructor(platforms: AppPlatform[], connections: PrinterConnectionType[]) {
        this.supportedPlatforms = platforms;
        this.supportedConnections = connections;
    }

    supports(platform: AppPlatform): boolean {
        return this.supportedPlatforms.includes(platform);
    }

    getSupportedConnectionTypes(): PrinterConnectionType[] {
        return this.supportedConnections;
    }

    abstract discover(request: PlatformDiscoveryRequest): Promise<PlatformDiscoveryResult>;
}

// ==================== STRATEGY FACTORY ====================

/**
 * Factory for creating print strategies
 */
export class PrintStrategyFactory {
    private static strategies: Map<string, IPrintStrategy> = new Map();
    private static discoveryStrategies: Map<string, IDiscoveryStrategy> = new Map();

    /**
     * Register a print strategy
     */
    static registerStrategy(strategy: IPrintStrategy): void {
        this.strategies.set(strategy.getName(), strategy);
    }

    /**
     * Register a discovery strategy
     */
    static registerDiscoveryStrategy(name: string, strategy: IDiscoveryStrategy): void {
        this.discoveryStrategies.set(name, strategy);
    }

    /**
     * Get appropriate print strategy for printer
     */
    static getStrategy(
        platform: AppPlatform,
        connectionType: PrinterConnectionType
    ): IPrintStrategy | null {
        for (const strategy of this.strategies.values()) {
            if (strategy.supports(platform) && strategy.supportsConnection(connectionType)) {
                return strategy;
            }
        }
        return null;
    }

    /**
     * Get all strategies for a platform
     */
    static getStrategiesForPlatform(platform: AppPlatform): IPrintStrategy[] {
        const strategies: IPrintStrategy[] = [];
        for (const strategy of this.strategies.values()) {
            if (strategy.supports(platform)) {
                strategies.push(strategy);
            }
        }
        return strategies;
    }

    /**
     * Get discovery strategy for platform
     */
    static getDiscoveryStrategy(platform: AppPlatform): IDiscoveryStrategy | null {
        for (const strategy of this.discoveryStrategies.values()) {
            if (strategy.supports(platform)) {
                return strategy;
            }
        }
        return null;
    }

    /**
     * Check if platform is supported
     */
    static isPlatformSupported(platform: AppPlatform): boolean {
        return this.getStrategiesForPlatform(platform).length > 0;
    }
}

// ==================== STRATEGY SELECTOR ====================

/**
 * Selects and executes appropriate print strategy
 */
export class PrintStrategySelector {
    private platform: AppPlatform;
    private capabilities: PlatformCapabilities;

    constructor(platform: AppPlatform) {
        this.platform = platform;
        this.capabilities = PLATFORM_CAPABILITIES[platform];
    }

    /**
     * Select best strategy for printer
     */
    selectStrategy(printer: Printer): IPrintStrategy {
        const strategy = PrintStrategyFactory.getStrategy(
            this.platform,
            printer.connectionType
        );

        if (!strategy) {
            throw new PlatformNotSupportedError(
                `${printer.connectionType} printing`,
                this.platform
            );
        }

        return strategy;
    }

    /**
     * Execute print with automatic strategy selection
     */
    async print(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const strategy = this.selectStrategy(printer);
        return strategy.print(printer, content, options);
    }

    /**
     * Test printer connection with automatic strategy selection
     */
    async testConnection(printer: Printer): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const strategy = this.selectStrategy(printer);
        return strategy.testConnection(printer);
    }

    /**
     * Check if connection type is supported on current platform
     */
    isConnectionSupported(connectionType: PrinterConnectionType): boolean {
        switch (connectionType) {
            case 'USB':
                return this.capabilities.supportsUSB;
            case 'NETWORK':
                return this.capabilities.supportsNetwork;
            case 'BLUETOOTH':
                return this.capabilities.supportsBluetooth;
            case 'SERIAL':
                return this.capabilities.supportsSerial;
            case 'WIFI':
                return this.capabilities.supportsWifi;
            default:
                return false;
        }
    }

    /**
     * Get platform capabilities
     */
    getCapabilities(): PlatformCapabilities {
        return this.capabilities;
    }

    /**
     * Get available connection types for platform
     */
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

// ==================== CONTEXT FOR STRATEGY PATTERN ====================

/**
 * Print context that uses strategy pattern
 */
export class PrintContext {
    private strategy?: IPrintStrategy;
    private printer?: Printer;
    private platform: AppPlatform;

    constructor(platform: AppPlatform = AppPlatform.DESKTOP) {
        this.platform = platform;
    }

    /**
     * Set the print strategy manually
     */
    setStrategy(strategy: IPrintStrategy): void {
        this.strategy = strategy;
    }

    /**
     * Set printer and auto-select strategy
     */
    setPrinter(printer: Printer): void {
        this.printer = printer;
        this.strategy = PrintStrategyFactory.getStrategy(
            this.platform,
            printer.connectionType
        ) || undefined;
    }

    /**
     * Set platform
     */
    setPlatform(platform: AppPlatform): void {
        this.platform = platform;
        // Re-select strategy if printer is set
        if (this.printer) {
            this.setPrinter(this.printer);
        }
    }

    /**
     * Execute print using current strategy
     */
    async print(content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        if (!this.strategy) {
            throw new PrinterError(
                PrinterErrorCode.PLATFORM_NOT_SUPPORTED,
                'No print strategy available for current platform and connection type'
            );
        }

        if (!this.printer) {
            throw new PrinterError(
                PrinterErrorCode.PRINTER_NOT_FOUND,
                'No printer configured'
            );
        }

        return this.strategy.print(this.printer, content, options);
    }

    /**
     * Test connection using current strategy
     */
    async testConnection(): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        if (!this.strategy || !this.printer) {
            throw new PrinterError(
                PrinterErrorCode.PRINTER_NOT_FOUND,
                'No printer or strategy configured'
            );
        }

        return this.strategy.testConnection(this.printer);
    }

    /**
     * Get current strategy name
     */
    getStrategyName(): string | undefined {
        return this.strategy?.getName();
    }

    /**
     * Check if ready to print
     */
    isReady(): boolean {
        return !!this.strategy && !!this.printer;
    }
}

export default {
    PrintStrategyFactory,
    PrintStrategySelector,
    PrintContext,
    BasePrintStrategy,
    BaseDiscoveryStrategy
};
