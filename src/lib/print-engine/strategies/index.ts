export { IPrintStrategy, IDiscoveryStrategy } from './strategy.types';
export { BasePrintStrategy } from './base-print-strategy';
export { BaseDiscoveryStrategy } from './base-discovery-strategy';
export { PrintStrategyFactory } from './print-strategy-factory';
export { PrintStrategySelector } from './print-strategy-selector';
export { PrintContext } from './print-context';

export { USBPrintStrategy } from './usb.strategy';
export { NetworkPrintStrategy } from './network.strategy';
export { BluetoothPrintStrategy } from './bluetooth.strategy';

import { PrintStrategyFactory } from './print-strategy-factory';
import { PrintContext } from './print-context';
import { NetworkPrintStrategy } from './network.strategy';
import { USBPrintStrategy } from './usb.strategy';
import { BluetoothPrintStrategy } from './bluetooth.strategy';
import type { AppPlatform } from '../types';

/**
 * Initialize all strategies with the factory
 * Call this during application startup
 */
export function initializePrintStrategies(): void {
    PrintStrategyFactory.registerStrategy(new NetworkPrintStrategy());
    PrintStrategyFactory.registerStrategy(new USBPrintStrategy());
    PrintStrategyFactory.registerStrategy(new BluetoothPrintStrategy());
}

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
