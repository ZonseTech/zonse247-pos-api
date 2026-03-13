export {
    IPrintStrategy,
    IDiscoveryStrategy,
    IContentFormatter,
    BasePrintStrategy,
    BaseDiscoveryStrategy,
    PrintStrategyFactory,
    PrintStrategySelector,
    PrintContext
} from './print.strategy';

export { USBPrintStrategy } from './usb.strategy';
export { NetworkPrintStrategy } from './network.strategy';
export { BluetoothPrintStrategy } from './bluetooth.strategy';

import { PrintStrategyFactory, PrintContext } from './print.strategy';
import { NetworkPrintStrategy } from './network.strategy';
import { USBPrintStrategy } from './usb.strategy';
import { BluetoothPrintStrategy } from './bluetooth.strategy';
import type { AppPlatform } from '../../../types/printer.platform';

/**
 * Initialize all strategies with the factory
 * Call this during application startup
 */
export function initializePrintStrategies(): void {
    PrintStrategyFactory.registerStrategy(new NetworkPrintStrategy());
    PrintStrategyFactory.registerStrategy(new USBPrintStrategy());
    PrintStrategyFactory.registerStrategy(new BluetoothPrintStrategy());
}

/**
 * Get a pre-configured print context
 */
export function createPrintContext(platform: AppPlatform): PrintContext {
    initializePrintStrategies();
    return new PrintContext(platform);
}

let initialized = false;
export function ensureStrategiesInitialized(): void {
    if (!initialized) {
        initializePrintStrategies();
        initialized = true;
    }
}
