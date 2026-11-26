import { AppPlatform, PrintErrorCode, PrintResult, PrinterDescriptor } from '../types';
import { PrintEngineError } from '../errors';
import { IPrintStrategy } from './strategy.types';
import { PrintStrategyFactory } from './print-strategy-factory';

export class PrintContext {
    private strategy?: IPrintStrategy;
    private printer?: PrinterDescriptor;
    private platform: AppPlatform;

    constructor(platform: AppPlatform = AppPlatform.DESKTOP) {
        this.platform = platform;
    }

    setStrategy(strategy: IPrintStrategy): void {
        this.strategy = strategy;
    }

    setPrinter(printer: PrinterDescriptor): void {
        this.printer = printer;
        this.strategy = PrintStrategyFactory.getStrategy(this.platform, printer.connectionType) || undefined;
    }

    setPlatform(platform: AppPlatform): void {
        this.platform = platform;
        if (this.printer) {
            this.setPrinter(this.printer);
        }
    }

    async print(content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        if (!this.strategy) {
            throw new PrintEngineError(
                PrintErrorCode.PLATFORM_NOT_SUPPORTED,
                'No print strategy available for current platform and connection type'
            );
        }

        if (!this.printer) {
            throw new PrintEngineError(PrintErrorCode.PRINTER_NOT_FOUND, 'No printer configured');
        }

        return this.strategy.print(this.printer, content, options);
    }

    async testConnection(): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        if (!this.strategy || !this.printer) {
            throw new PrintEngineError(PrintErrorCode.PRINTER_NOT_FOUND, 'No printer or strategy configured');
        }

        return this.strategy.testConnection(this.printer);
    }

    getStrategyName(): string | undefined {
        return this.strategy?.getName();
    }

    isReady(): boolean {
        return !!this.strategy && !!this.printer;
    }
}
