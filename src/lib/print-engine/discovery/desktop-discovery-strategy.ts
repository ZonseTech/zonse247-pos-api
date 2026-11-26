import { BaseDiscoveryStrategy } from '../strategies/base-discovery-strategy';
import {
    AppPlatform,
    DiscoveredPlatformPrinter,
    PlatformDiscoveryRequest,
    PlatformDiscoveryResult,
    PrinterConnectionType,
} from '../types';
import { PrinterDiscovery } from './index';

export class DesktopPrinterDiscoveryStrategy extends BaseDiscoveryStrategy {
    constructor() {
        super(
            [AppPlatform.DESKTOP],
            [
                PrinterConnectionType.USB,
                PrinterConnectionType.NETWORK,
                PrinterConnectionType.WIFI,
                PrinterConnectionType.SERIAL,
                PrinterConnectionType.BLUETOOTH,
            ]
        );
    }

    async discover(request: PlatformDiscoveryRequest): Promise<PlatformDiscoveryResult> {
        const startedAt = Date.now();
        const connectionTypes = request.connectionTypes?.length
            ? request.connectionTypes
            : [
                PrinterConnectionType.USB,
                PrinterConnectionType.NETWORK,
                PrinterConnectionType.WIFI,
                PrinterConnectionType.SERIAL,
                PrinterConnectionType.BLUETOOTH,
            ];

        const printers: DiscoveredPlatformPrinter[] = [];
        const errors: string[] = [];

        for (const connectionType of connectionTypes) {
            try {
                const discovered = await PrinterDiscovery.discoverByConnectionType(connectionType);
                printers.push(...discovered);
            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }

        return {
            platform: request.platform,
            printers,
            scanDuration: Date.now() - startedAt,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}
