import {
    AppPlatform,
    PlatformDiscoveryRequest,
    PlatformDiscoveryResult,
    PrinterConnectionType,
} from '../types';
import { IDiscoveryStrategy } from './strategy.types';

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
