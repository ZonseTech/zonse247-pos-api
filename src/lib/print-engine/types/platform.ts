export enum AppPlatform {
    WEB = 'WEB',
    DESKTOP = 'DESKTOP', // Electron
    MOBILE_ANDROID = 'MOBILE_ANDROID',
    MOBILE_IOS = 'MOBILE_IOS',
    MOBILE_REACT_NATIVE = 'MOBILE_REACT_NATIVE',
}

export interface PlatformCapabilities {
    platform: AppPlatform;
    supportsUSB: boolean;
    supportsNetwork: boolean;
    supportsBluetooth: boolean;
    supportsSerial: boolean;
    supportsWifi: boolean;
    supportsDirectPrint: boolean;
    supportsPrintPreview: boolean;
    supportsBackgroundPrint: boolean;
    supportsPrinterDiscovery: boolean;
    supportsCloudPrint: boolean;
    supportsRawCommands: boolean;
    supportsLocalQueue: boolean;
    supportsOfflineMode: boolean;
}
