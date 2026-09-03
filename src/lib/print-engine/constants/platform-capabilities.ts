import { AppPlatform, PlatformCapabilities } from '../types/platform';

/**
 * Default capability matrix per host platform. Lives here rather than in
 * types/platform.ts so that folder stays pure type declarations — this is
 * runtime data.
 */
export const PLATFORM_CAPABILITIES: Record<AppPlatform, PlatformCapabilities> = {
    [AppPlatform.WEB]: {
        platform: AppPlatform.WEB,
        supportsUSB: false, supportsNetwork: true, supportsBluetooth: false,
        supportsSerial: false, supportsWifi: true, supportsDirectPrint: false,
        supportsPrintPreview: true, supportsBackgroundPrint: false,
        supportsPrinterDiscovery: false, supportsCloudPrint: true,
        supportsRawCommands: false, supportsLocalQueue: false, supportsOfflineMode: false,
    },
    [AppPlatform.DESKTOP]: {
        platform: AppPlatform.DESKTOP,
        supportsUSB: true, supportsNetwork: true, supportsBluetooth: true,
        supportsSerial: true, supportsWifi: true, supportsDirectPrint: true,
        supportsPrintPreview: true, supportsBackgroundPrint: true,
        supportsPrinterDiscovery: true, supportsCloudPrint: true,
        supportsRawCommands: true, supportsLocalQueue: true, supportsOfflineMode: true,
    },
    [AppPlatform.MOBILE_ANDROID]: {
        platform: AppPlatform.MOBILE_ANDROID,
        supportsUSB: true, supportsNetwork: true, supportsBluetooth: true,
        supportsSerial: false, supportsWifi: true, supportsDirectPrint: true,
        supportsPrintPreview: true, supportsBackgroundPrint: true,
        supportsPrinterDiscovery: true, supportsCloudPrint: true,
        supportsRawCommands: true, supportsLocalQueue: true, supportsOfflineMode: true,
    },
    [AppPlatform.MOBILE_IOS]: {
        platform: AppPlatform.MOBILE_IOS,
        supportsUSB: false, supportsNetwork: true, supportsBluetooth: true,
        supportsSerial: false, supportsWifi: true, supportsDirectPrint: false,
        supportsPrintPreview: true, supportsBackgroundPrint: false,
        supportsPrinterDiscovery: true, supportsCloudPrint: true,
        supportsRawCommands: false, supportsLocalQueue: true, supportsOfflineMode: true,
    },
    [AppPlatform.MOBILE_REACT_NATIVE]: {
        platform: AppPlatform.MOBILE_REACT_NATIVE,
        supportsUSB: true, supportsNetwork: true, supportsBluetooth: true,
        supportsSerial: false, supportsWifi: true, supportsDirectPrint: true,
        supportsPrintPreview: true, supportsBackgroundPrint: true,
        supportsPrinterDiscovery: true, supportsCloudPrint: true,
        supportsRawCommands: true, supportsLocalQueue: true, supportsOfflineMode: true,
    },
};
