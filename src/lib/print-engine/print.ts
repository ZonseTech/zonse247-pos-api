import { ensureStrategiesInitialized, PrintStrategySelector } from './strategies';
import { AppPlatform, ConnectionTestResult, PrinterDescriptor, PrintResult } from './types';

/**
 * Print content to a printer, auto-selecting the right delivery strategy
 * (USB / network / Bluetooth) based on the printer's connection type.
 */
export async function print(
    printer: PrinterDescriptor,
    content: string,
    options?: Record<string, unknown>,
    platform: AppPlatform = AppPlatform.DESKTOP
): Promise<PrintResult> {
    ensureStrategiesInitialized();
    const selector = new PrintStrategySelector(platform);
    return selector.print(printer, content, options);
}

/**
 * Test whether a printer is reachable, using the same strategy selection as `print`.
 */
export async function testConnection(
    printer: PrinterDescriptor,
    platform: AppPlatform = AppPlatform.DESKTOP
): Promise<ConnectionTestResult> {
    ensureStrategiesInitialized();
    const selector = new PrintStrategySelector(platform);
    return selector.testConnection(printer);
}
