import { ensureStrategiesInitialized, PrintStrategySelector } from '../strategies';
import { PrintStrategyFactory } from '../strategies/print-strategy-factory';
import {
    AppPlatform,
    CommonPrinterPort,
    DiscoveredPlatformPrinter,
    DiscoveredPrinter,
    PlatformDiscoveryRequest,
    PrinterConnectionType,
    PrinterDescriptor,
    SerialPortInfo,
} from '../types';
import { inferPrinterType } from './classify';
import { discoverUSBPrinters, checkUSBPrinter } from './usb';
import { discoverNetworkPrinters, scanNetworkRange as scanNetworkRangeImpl, cleanupBonjour } from './network';
import { discoverBluetoothPrinters } from './bluetooth';
import { discoverSerialPrinters, checkSerialPrinter, getAvailableSerialPorts as getAvailableSerialPortsImpl } from './serial';
import { DesktopPrinterDiscoveryStrategy } from './desktop-discovery-strategy';

export class PrinterDiscovery {
    private static discoveryStrategyRegistered = false;

    private static registerDiscoveryStrategy(): void {
        if (this.discoveryStrategyRegistered) {
            return;
        }

        PrintStrategyFactory.registerDiscoveryStrategy('desktop', new DesktopPrinterDiscoveryStrategy());
        this.discoveryStrategyRegistered = true;
    }

    static async discoverByConnectionType(connectionType: PrinterConnectionType): Promise<DiscoveredPlatformPrinter[]> {
        switch (connectionType) {
            case PrinterConnectionType.USB:
                return (await discoverUSBPrinters()).map((printer) => ({
                    name: printer.name,
                    platform: AppPlatform.DESKTOP,
                    connectionType: printer.connectionType,
                    address: printer.address,
                    port: printer.port,
                    vendorId: printer.vendorId,
                    productId: printer.productId,
                    serialNumber: printer.serialNumber,
                    manufacturer: printer.manufacturer,
                    model: printer.model,
                    isOnline: printer.isOnline,
                }));
            case PrinterConnectionType.NETWORK:
            case PrinterConnectionType.WIFI:
                return (await discoverNetworkPrinters()).map((printer) => ({
                    name: printer.name,
                    platform: AppPlatform.DESKTOP,
                    connectionType: printer.connectionType,
                    address: printer.address,
                    port: printer.port,
                    manufacturer: printer.manufacturer,
                    model: printer.model,
                    isOnline: printer.isOnline,
                }));
            case PrinterConnectionType.SERIAL:
                return (await discoverSerialPrinters()).map((printer) => ({
                    name: printer.name,
                    platform: AppPlatform.DESKTOP,
                    connectionType: printer.connectionType,
                    address: printer.address,
                    port: printer.port,
                    vendorId: printer.vendorId,
                    productId: printer.productId,
                    serialNumber: printer.serialNumber,
                    manufacturer: printer.manufacturer,
                    model: printer.model,
                    isOnline: printer.isOnline,
                }));
            case PrinterConnectionType.BLUETOOTH:
                return (await discoverBluetoothPrinters()).map((printer) => ({
                    name: printer.name,
                    platform: AppPlatform.DESKTOP,
                    connectionType: printer.connectionType,
                    address: printer.address,
                    port: printer.port,
                    manufacturer: printer.manufacturer,
                    model: printer.model,
                    isOnline: printer.isOnline,
                }));
            default:
                return [];
        }
    }

    static cleanup(): void {
        cleanupBonjour();
    }

    static async checkPrinterConnection(printer: PrinterDescriptor): Promise<boolean> {
        if (printer.connectionType === PrinterConnectionType.SERIAL) {
            return checkSerialPrinter(printer);
        }

        if (printer.connectionType === PrinterConnectionType.USB) {
            return checkUSBPrinter(printer);
        }

        try {
            ensureStrategiesInitialized();
            const selector = new PrintStrategySelector(AppPlatform.DESKTOP);
            const result = await selector.testConnection(printer);
            return result.online;
        } catch {
            return false;
        }
    }

    static async discoverPrinters(connectionType?: PrinterConnectionType): Promise<DiscoveredPrinter[]> {
        ensureStrategiesInitialized();
        this.registerDiscoveryStrategy();

        const strategy = PrintStrategyFactory.getDiscoveryStrategy(AppPlatform.DESKTOP);
        if (strategy) {
            const request: PlatformDiscoveryRequest = {
                platform: AppPlatform.DESKTOP,
                connectionTypes: connectionType ? [connectionType] : undefined,
                timeout: 15000,
            };

            const result = await strategy.discover(request);
            return result.printers.map((printer) => ({
                name: printer.name,
                address: printer.address,
                port: printer.port,
                type: inferPrinterType(printer.name),
                connectionType: printer.connectionType,
                vendorId: printer.vendorId,
                productId: printer.productId,
                serialNumber: printer.serialNumber,
                manufacturer: printer.manufacturer,
                model: printer.model,
                isOnline: printer.isOnline,
            }));
        }

        const discovered: DiscoveredPrinter[] = [];
        const discoveryPromises: Promise<DiscoveredPrinter[]>[] = [];

        try {
            if (!connectionType || connectionType === PrinterConnectionType.USB) {
                discoveryPromises.push(discoverUSBPrinters());
            }

            if (!connectionType || connectionType === PrinterConnectionType.NETWORK || connectionType === PrinterConnectionType.WIFI) {
                discoveryPromises.push(discoverNetworkPrinters());
            }

            if (!connectionType || connectionType === PrinterConnectionType.SERIAL) {
                discoveryPromises.push(discoverSerialPrinters());
            }

            if (!connectionType || connectionType === PrinterConnectionType.BLUETOOTH) {
                discoveryPromises.push(discoverBluetoothPrinters());
            }

            const results = await Promise.allSettled(discoveryPromises);

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    discovered.push(...result.value);
                } else {
                    console.error('Discovery error:', result.reason);
                }
            }

            return discovered;
        } catch (error) {
            console.error('Error discovering printers:', error);
            return discovered;
        }
    }

    static async scanNetworkRange(
        baseIP: string,
        startHost = 1,
        endHost = 254,
        port = 9100
    ): Promise<DiscoveredPrinter[]> {
        return scanNetworkRangeImpl(baseIP, startHost, endHost, port);
    }

    static async getAvailableSerialPorts(): Promise<SerialPortInfo[]> {
        return getAvailableSerialPortsImpl();
    }

    static validatePrinterConfig(printer: Partial<PrinterDescriptor>): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!printer.printerName) {
            errors.push('Printer name is required');
        }

        if (!printer.connectionType) {
            errors.push('Connection type is required');
        }

        switch (printer.connectionType) {
            case PrinterConnectionType.NETWORK:
            case PrinterConnectionType.WIFI:
                if (!printer.connectionAddress) {
                    errors.push('IP address is required for network printers');
                } else {
                    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                    if (!ipRegex.test(printer.connectionAddress)) {
                        errors.push('Invalid IP address format');
                    }
                }
                break;
            case PrinterConnectionType.USB:
                // USB printers can auto-detect, but if IDs are provided, validate them
                if (printer.vendorId && !/^[0-9a-fA-F]{4}$/.test(printer.vendorId)) {
                    errors.push('Invalid USB vendor ID format (expected 4-digit hex)');
                }
                if (printer.productId && !/^[0-9a-fA-F]{4}$/.test(printer.productId)) {
                    errors.push('Invalid USB product ID format (expected 4-digit hex)');
                }
                break;
            case PrinterConnectionType.BLUETOOTH:
                if (!printer.connectionAddress) {
                    errors.push('Bluetooth address is required for Bluetooth printers');
                } else {
                    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
                    if (!macRegex.test(printer.connectionAddress)) {
                        errors.push('Invalid Bluetooth address format (expected MAC address)');
                    }
                }
                break;
            case PrinterConnectionType.SERIAL:
                if (!printer.connectionAddress) {
                    errors.push('Serial port path is required for serial printers');
                }
                break;
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    static getCommonPrinterPorts(): CommonPrinterPort[] {
        return [
            { port: 9100, protocol: 'RAW', description: 'HP JetDirect / Raw printing (most common)' },
            { port: 515, protocol: 'LPD', description: 'Line Printer Daemon' },
            { port: 631, protocol: 'IPP', description: 'Internet Printing Protocol (CUPS)' },
            { port: 443, protocol: 'IPPS', description: 'IPP over HTTPS' },
            { port: 80, protocol: 'HTTP', description: 'Printer web interface' },
            { port: 161, protocol: 'SNMP', description: 'Printer status via SNMP' },
        ];
    }
}

export default PrinterDiscovery;
