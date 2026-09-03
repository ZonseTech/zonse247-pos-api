import { AppPlatform, PrinterConnectionType } from '../types';
import { IPrintStrategy, IDiscoveryStrategy } from './strategy.types';

export class PrintStrategyFactory {
    private static strategies: Map<string, IPrintStrategy> = new Map();
    private static discoveryStrategies: Map<string, IDiscoveryStrategy> = new Map();

    static registerStrategy(strategy: IPrintStrategy): void {
        this.strategies.set(strategy.getName(), strategy);
    }

    static registerDiscoveryStrategy(name: string, strategy: IDiscoveryStrategy): void {
        this.discoveryStrategies.set(name, strategy);
    }

    static getStrategy(platform: AppPlatform, connectionType: PrinterConnectionType): IPrintStrategy | null {
        for (const strategy of this.strategies.values()) {
            if (strategy.supports(platform) && strategy.supportsConnection(connectionType)) {
                return strategy;
            }
        }
        return null;
    }

    static getStrategiesForPlatform(platform: AppPlatform): IPrintStrategy[] {
        const strategies: IPrintStrategy[] = [];
        for (const strategy of this.strategies.values()) {
            if (strategy.supports(platform)) {
                strategies.push(strategy);
            }
        }
        return strategies;
    }

    static getDiscoveryStrategy(platform: AppPlatform): IDiscoveryStrategy | null {
        for (const strategy of this.discoveryStrategies.values()) {
            if (strategy.supports(platform)) {
                return strategy;
            }
        }
        return null;
    }

    static isPlatformSupported(platform: AppPlatform): boolean {
        return this.getStrategiesForPlatform(platform).length > 0;
    }
}
