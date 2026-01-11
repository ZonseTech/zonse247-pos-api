import { PrinterModel } from '../models/printer.model';
import {
    Printer,
    PrinterStatus,
    PrinterTestResult,
    DiscoveredPrinter,
    PrinterConnectionType,
    PrinterType
} from '../types/printer';
import { SerialPort } from 'serialport';
import * as net from 'net';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import Bonjour, { Service } from 'bonjour-service';

const execAsync = promisify(exec);

// Common USB Vendor IDs for printers
const PRINTER_VENDOR_IDS = [
    0x04b8, // Epson
    0x0519, // Star Micronics
    0x0dd4, // Custom Engineering
    0x0416, // Winbond (common in receipt printers)
    0x1504, // Posiflex
    0x0fe6, // ICS Electronics (receipt printers)
    0x1a86, // QinHeng Electronics (CH340 - common in Chinese printers)
    0x067b, // Prolific (USB-Serial)
    0x0483, // STMicroelectronics
    0x20d1, // Simcom
    0x1fc9, // NXP
    0x03f0, // HP
    0x04f9, // Brother
    0x04a9, // Canon
];

export class PrinterDiscoveryService {
    private static bonjourInstance: Bonjour | null = null;

    /**
     * Get or create Bonjour instance
     */
    private static getBonjour(): Bonjour {
        if (!this.bonjourInstance) {
            this.bonjourInstance = new Bonjour();
        }
        return this.bonjourInstance;
    }

    /**
     * Cleanup Bonjour instance
     */
    static cleanup(): void {
        if (this.bonjourInstance) {
            this.bonjourInstance.destroy();
            this.bonjourInstance = null;
        }
    }

    /**
     * Test printer connection
     */
    static async testPrinter(
        printerId: string,
        tenantId: string,
        branchId?: string
    ): Promise<PrinterTestResult> {
        const printer = await PrinterModel.findById(printerId, tenantId, branchId);
        if (!printer) {
            return {
                success: false,
                message: 'Printer not found',
                printerId,
                printerStatus: PrinterStatus.OFFLINE
            };
        }

        const startTime = Date.now();

        try {
            const isOnline = await this.checkPrinterConnection(printer);
            const responseTime = Date.now() - startTime;

            if (isOnline) {
                await PrinterModel.updateStatus(printerId, PrinterStatus.ONLINE);
                return {
                    success: true,
                    message: 'Printer is online and responding',
                    printerId,
                    responseTime,
                    printerStatus: PrinterStatus.ONLINE
                };
            } else {
                await PrinterModel.updateStatus(printerId, PrinterStatus.OFFLINE, 'Connection test failed');
                return {
                    success: false,
                    message: 'Printer is not responding',
                    printerId,
                    responseTime,
                    printerStatus: PrinterStatus.OFFLINE
                };
            }
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await PrinterModel.updateStatus(printerId, PrinterStatus.ERROR, errorMessage);

            return {
                success: false,
                message: 'Failed to test printer',
                printerId,
                responseTime,
                printerStatus: PrinterStatus.ERROR,
                errorDetails: errorMessage
            };
        }
    }

    /**
     * Check printer connection based on connection type
     */
    static async checkPrinterConnection(printer: Printer): Promise<boolean> {
        switch (printer.connectionType) {
            case 'NETWORK':
            case 'WIFI':
                return this.checkNetworkPrinter(printer);
            case 'USB':
                return this.checkUSBPrinter(printer);
            case 'BLUETOOTH':
                return this.checkBluetoothPrinter(printer);
            case 'SERIAL':
                return this.checkSerialPrinter(printer);
            default:
                return false;
        }
    }

    /**
     * Check network printer connection using TCP socket
     */
    private static async checkNetworkPrinter(printer: Printer): Promise<boolean> {
        const address = printer.connectionAddress;
        const port = printer.port || 9100; // Default printer port

        if (!address) {
            return false;
        }

        return new Promise<boolean>((resolve) => {
            const socket = new net.Socket();
            const timeout = 5000; // 5 second timeout

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });

            try {
                socket.connect(port, address);
            } catch {
                resolve(false);
            }
        });
    }

    /**
     * Check USB printer connection
     */
    private static async checkUSBPrinter(printer: Printer): Promise<boolean> {
        try {
            // Dynamic import for usb module (it may not be available on all systems)
            const { usb } = await import('usb');

            if (printer.vendorId && printer.productId) {
                const vendorId = parseInt(printer.vendorId, 16);
                const productId = parseInt(printer.productId, 16);

                const devices = usb.getDeviceList();
                const device = devices.find(d =>
                    d.deviceDescriptor.idVendor === vendorId &&
                    d.deviceDescriptor.idProduct === productId
                );
                return device !== undefined;
            }

            // If no specific IDs, check if any USB printers are connected
            const devices = usb.getDeviceList();
            return devices.some(device =>
                PRINTER_VENDOR_IDS.includes(device.deviceDescriptor.idVendor)
            );
        } catch (error) {
            console.error('USB check error:', error);
            // USB module might not be available, try alternative check via serial ports
            return this.checkUSBPrinterViaSerial(printer);
        }
    }

    /**
     * Check USB printer via serial port (fallback)
     */
    private static async checkUSBPrinterViaSerial(printer: Printer): Promise<boolean> {
        try {
            const ports = await SerialPort.list();

            if (printer.vendorId && printer.productId) {
                return ports.some(port =>
                    port.vendorId?.toLowerCase() === printer.vendorId?.toLowerCase() &&
                    port.productId?.toLowerCase() === printer.productId?.toLowerCase()
                );
            }

            // Check for any USB-serial devices
            return ports.some(port => port.vendorId !== undefined);
        } catch {
            return false;
        }
    }

    /**
     * Check Bluetooth printer connection
     * Note: Bluetooth support is limited on server-side Node.js
     */
    private static async checkBluetoothPrinter(printer: Printer): Promise<boolean> {
        // Bluetooth on server-side requires platform-specific implementations
        // For now, we can check if it's configured and assume it might be available
        const address = printer.connectionAddress;

        if (!address) {
            return false;
        }

        // Basic MAC address validation
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(address)) {
            return false;
        }

        // For Bluetooth, we'll return true if configured
        // Actual Bluetooth connectivity should be handled by client applications
        console.log(`Bluetooth printer ${printer.printerName} is configured with address: ${address}`);
        return true;
    }

    /**
     * Check serial printer connection
     */
    private static async checkSerialPrinter(printer: Printer): Promise<boolean> {
        const portPath = printer.connectionAddress;

        if (!portPath) {
            return false;
        }

        try {
            const ports = await SerialPort.list();
            const portExists = ports.some(p => p.path === portPath);

            if (!portExists) {
                return false;
            }

            // Try to open the port briefly to verify it's accessible
            return new Promise<boolean>((resolve) => {
                const port = new SerialPort({
                    path: portPath,
                    baudRate: 9600,
                    autoOpen: false
                });

                port.open((err) => {
                    if (err) {
                        resolve(false);
                    } else {
                        port.close(() => resolve(true));
                    }
                });

                // Timeout after 3 seconds
                setTimeout(() => {
                    try {
                        port.close();
                    } catch {
                        // Ignore close errors
                    }
                    resolve(false);
                }, 3000);
            });
        } catch {
            return false;
        }
    }

    /**
     * Discover available printers
     */
    static async discoverPrinters(connectionType?: PrinterConnectionType): Promise<DiscoveredPrinter[]> {
        const discovered: DiscoveredPrinter[] = [];
        const discoveryPromises: Promise<DiscoveredPrinter[]>[] = [];

        try {
            if (!connectionType || connectionType === 'USB') {
                discoveryPromises.push(this.discoverUSBPrinters());
            }

            if (!connectionType || connectionType === 'NETWORK' || connectionType === 'WIFI') {
                discoveryPromises.push(this.discoverNetworkPrinters());
            }

            if (!connectionType || connectionType === 'SERIAL') {
                discoveryPromises.push(this.discoverSerialPrinters());
            }

            if (!connectionType || connectionType === 'BLUETOOTH') {
                discoveryPromises.push(this.discoverBluetoothPrinters());
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

    /**
     * Discover USB printers (cross-platform)
     */
    private static async discoverUSBPrinters(): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];
        const platform = os.platform();

        // On Windows, also try to discover system printers
        if (platform === 'win32') {
            const windowsPrinters = await this.discoverWindowsPrinters();
            printers.push(...windowsPrinters);
        }

        try {
            const { usb } = await import('usb');
            const devices = usb.getDeviceList();

            for (const device of devices) {
                const vendorId = device.deviceDescriptor.idVendor;
                const productId = device.deviceDescriptor.idProduct;

                // Check if this is likely a printer
                if (PRINTER_VENDOR_IDS.includes(vendorId)) {
                    const vendorIdHex = vendorId.toString(16).padStart(4, '0');
                    const productIdHex = productId.toString(16).padStart(4, '0');

                    let manufacturer = 'Unknown';
                    let productName = 'USB Printer';

                    // Try to get device strings
                    try {
                        device.open();
                        manufacturer = await this.getUSBString(device, device.deviceDescriptor.iManufacturer) || manufacturer;
                        productName = await this.getUSBString(device, device.deviceDescriptor.iProduct) || productName;
                        device.close();
                    } catch {
                        // Device might be in use or not accessible
                    }

                    printers.push({
                        name: `${manufacturer} ${productName}`.trim(),
                        connectionType: PrinterConnectionType.USB,
                        vendorId: vendorIdHex,
                        productId: productIdHex,
                        manufacturer,
                        model: productName,
                        type: this.inferPrinterType(productName),
                        isOnline: true
                    });
                }
            }
        } catch (error) {
            console.error('USB discovery error:', error);
            // Fallback to serial port discovery for USB-serial printers
            const serialUSBPrinters = await this.discoverUSBSerialPrinters();
            printers.push(...serialUSBPrinters);
        }

        return printers;
    }

    /**
     * Discover Windows system printers via PowerShell/WMIC
     */
    private static async discoverWindowsPrinters(): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];

        try {
            // Try PowerShell first (more reliable on modern Windows)
            try {
                const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"');
                const printerList = JSON.parse(stdout);
                const printerArray = Array.isArray(printerList) ? printerList : [printerList];

                for (const p of printerArray) {
                    if (p && p.Name) {
                        printers.push({
                            name: p.Name,
                            connectionType: this.inferConnectionTypeFromPort(p.PortName),
                            address: p.PortName,
                            model: p.DriverName,
                            type: this.inferPrinterType(p.Name + ' ' + (p.DriverName || '')),
                            isOnline: p.PrinterStatus === 'Normal' || p.PrinterStatus === 0
                        });
                    }
                }

                if (printers.length > 0) {
                    console.log(`[Windows] Discovered ${printers.length} printers via PowerShell`);
                    return printers;
                }
            } catch (psErr) {
                console.log(`[Windows] PowerShell printer discovery failed: ${psErr}`);
            }

            // Fallback to WMIC
            try {
                const { stdout } = await execAsync('wmic printer get name,drivername,portname,status');
                const lines = stdout.split('\n').filter(l => l.trim() && !l.includes('DriverName'));

                for (const line of lines) {
                    const parts = line.trim().split(/\s{2,}/);
                    if (parts.length >= 1 && parts[0]) {
                        printers.push({
                            name: parts[0],
                            connectionType: PrinterConnectionType.USB,
                            model: parts[1] || undefined,
                            address: parts[2] || undefined,
                            isOnline: true
                        });
                    }
                }

                console.log(`[Windows] Discovered ${printers.length} printers via WMIC`);
            } catch (wmicErr) {
                console.log(`[Windows] WMIC printer discovery failed: ${wmicErr}`);
            }
        } catch (error) {
            console.error('[Windows] Printer discovery error:', error);
        }

        return printers;
    }

    /**
     * Infer connection type from Windows port name
     */
    private static inferConnectionTypeFromPort(portName: string): PrinterConnectionType {
        if (!portName) return PrinterConnectionType.USB;

        const port = portName.toLowerCase();
        if (port.includes('usb')) return PrinterConnectionType.USB;
        if (port.includes('com')) return PrinterConnectionType.SERIAL;
        if (port.includes('lpt')) return PrinterConnectionType.USB;
        if (port.match(/\d+\.\d+\.\d+\.\d+/)) return PrinterConnectionType.NETWORK;
        if (port.includes('wsd')) return PrinterConnectionType.NETWORK;
        if (port.includes('tcp')) return PrinterConnectionType.NETWORK;

        return PrinterConnectionType.USB;
    }

    /**
     * Get USB device string
     */
    private static getUSBString(device: any, index: number): Promise<string | null> {
        return new Promise((resolve) => {
            if (index === 0) {
                resolve(null);
                return;
            }

            try {
                device.getStringDescriptor(index, (err: Error | null, data: string | undefined) => {
                    if (err || !data) {
                        resolve(null);
                    } else {
                        resolve(data);
                    }
                });
            } catch {
                resolve(null);
            }
        });
    }

    /**
     * Discover USB printers via serial ports (fallback)
     */
    private static async discoverUSBSerialPrinters(): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];

        try {
            const ports = await SerialPort.list();

            for (const port of ports) {
                // Check if it looks like a USB printer
                if (port.vendorId && PRINTER_VENDOR_IDS.includes(parseInt(port.vendorId, 16))) {
                    printers.push({
                        name: (port as any).friendlyName || port.path,
                        address: port.path,
                        connectionType: PrinterConnectionType.USB,
                        vendorId: port.vendorId,
                        productId: port.productId,
                        manufacturer: port.manufacturer,
                        serialNumber: port.serialNumber,
                        isOnline: true
                    });
                }
            }
        } catch (error) {
            console.error('USB-Serial discovery error:', error);
        }

        return printers;
    }

    /**
     * Discover network printers via mDNS/Bonjour
     */
    private static async discoverNetworkPrinters(): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];
        const discoveryTimeout = 10000; // 10 seconds

        // Service types to search for printers
        const serviceTypes = [
            'ipp',           // Internet Printing Protocol
            'ipps',          // IPP over HTTPS
            'pdl-datastream', // PDL data stream (raw printing)
            'printer',       // Generic printer service
            'http',          // Some printers advertise HTTP admin
        ];

        const discoveryPromises = serviceTypes.map(type =>
            this.discoverBonjourService(type, discoveryTimeout)
        );

        try {
            const results = await Promise.allSettled(discoveryPromises);

            const seenAddresses = new Set<string>();

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    for (const printer of result.value) {
                        // Deduplicate by address
                        const key = `${printer.address}:${printer.port}`;
                        if (!seenAddresses.has(key)) {
                            seenAddresses.add(key);
                            printers.push(printer);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Network discovery error:', error);
        }

        return printers;
    }

    /**
     * Discover Bonjour services of a specific type
     */
    private static discoverBonjourService(
        serviceType: string,
        timeout: number
    ): Promise<DiscoveredPrinter[]> {
        return new Promise((resolve) => {
            const printers: DiscoveredPrinter[] = [];
            const bonjour = this.getBonjour();

            try {
                const browser = bonjour.find({ type: serviceType });

                browser.on('up', (service: Service) => {
                    // Only add if it has an address
                    if (service.addresses && service.addresses.length > 0) {
                        // Prefer IPv4 addresses
                        const ipv4 = service.addresses.find(addr => !addr.includes(':'));
                        const address = ipv4 || service.addresses[0];

                        printers.push({
                            name: service.name || `Network Printer (${address})`,
                            address,
                            port: service.port || 9100,
                            connectionType: PrinterConnectionType.NETWORK,
                            model: service.txt?.ty || service.txt?.product,
                            manufacturer: service.txt?.mfg || service.txt?.manufacturer,
                            type: this.inferPrinterType(service.name || ''),
                            isOnline: true
                        });
                    }
                });

                // Stop discovery after timeout
                setTimeout(() => {
                    browser.stop();
                    resolve(printers);
                }, timeout);
            } catch (error) {
                console.error(`Bonjour discovery error for ${serviceType}:`, error);
                resolve([]);
            }
        });
    }

    /**
     * Discover Bluetooth printers
     * Note: Full Bluetooth support requires platform-specific implementations
     */
    private static async discoverBluetoothPrinters(): Promise<DiscoveredPrinter[]> {
        // Bluetooth discovery on Node.js server-side is limited
        // This would typically be handled by client applications
        // For server-side, we can return printers that were previously paired/configured

        console.log('Bluetooth discovery: Limited support on server-side. Use client applications for Bluetooth printer discovery.');

        return [];
    }

    /**
     * Discover serial port printers
     */
    private static async discoverSerialPrinters(): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];

        try {
            const ports = await SerialPort.list();

            for (const port of ports) {
                // Filter for likely printer ports
                const friendlyName = (port as any).friendlyName as string | undefined;
                const isPrinterPort =
                    port.manufacturer?.toLowerCase().includes('printer') ||
                    friendlyName?.toLowerCase().includes('printer') ||
                    port.pnpId?.toLowerCase().includes('printer') ||
                    // Include common serial-USB converters often used with printers
                    port.manufacturer?.toLowerCase().includes('prolific') ||
                    port.manufacturer?.toLowerCase().includes('ftdi') ||
                    port.manufacturer?.toLowerCase().includes('ch340');

                // Include all serial ports as potential printers
                printers.push({
                    name: friendlyName || port.path,
                    address: port.path,
                    connectionType: PrinterConnectionType.SERIAL,
                    vendorId: port.vendorId,
                    productId: port.productId,
                    manufacturer: port.manufacturer,
                    serialNumber: port.serialNumber,
                    type: isPrinterPort ? PrinterType.THERMAL : undefined,
                    isOnline: true // Port exists, so it's "online"
                });
            }
        } catch (error) {
            console.error('Serial port discovery error:', error);
        }

        return printers;
    }

    /**
     * Infer printer type from name/model
     */
    private static inferPrinterType(name: string): PrinterType | undefined {
        const lowerName = name.toLowerCase();

        if (lowerName.includes('thermal') || lowerName.includes('receipt') ||
            lowerName.includes('pos') || lowerName.includes('tm-')) {
            return PrinterType.THERMAL;
        }

        if (lowerName.includes('label') || lowerName.includes('zebra') ||
            lowerName.includes('dymo') || lowerName.includes('brother ql')) {
            return PrinterType.LABEL;
        }

        if (lowerName.includes('laser') || lowerName.includes('laserjet')) {
            return PrinterType.LASER;
        }

        if (lowerName.includes('inkjet') || lowerName.includes('deskjet') ||
            lowerName.includes('officejet')) {
            return PrinterType.INKJET;
        }

        if (lowerName.includes('dot matrix') || lowerName.includes('epson lx') ||
            lowerName.includes('epson fx')) {
            return PrinterType.DOT_MATRIX;
        }

        return undefined;
    }

    /**
     * Scan a range of IP addresses for network printers
     */
    static async scanNetworkRange(
        baseIP: string,
        startHost = 1,
        endHost = 254,
        port = 9100
    ): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];
        const ipParts = baseIP.split('.');

        if (ipParts.length !== 4) {
            throw new Error('Invalid base IP address format');
        }

        const networkBase = ipParts.slice(0, 3).join('.');
        const scanPromises: Promise<DiscoveredPrinter | null>[] = [];

        for (let i = startHost; i <= endHost; i++) {
            const ip = `${networkBase}.${i}`;
            scanPromises.push(this.probeNetworkPrinter(ip, port));
        }

        // Scan in batches to avoid overwhelming the network
        const batchSize = 50;
        for (let i = 0; i < scanPromises.length; i += batchSize) {
            const batch = scanPromises.slice(i, i + batchSize);
            const results = await Promise.allSettled(batch);

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    printers.push(result.value);
                }
            }
        }

        return printers;
    }

    /**
     * Probe a single IP for a printer
     */
    private static probeNetworkPrinter(
        ip: string,
        port: number
    ): Promise<DiscoveredPrinter | null> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = 1000; // 1 second timeout per host

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                resolve({
                    name: `Network Printer (${ip})`,
                    address: ip,
                    port,
                    connectionType: PrinterConnectionType.NETWORK,
                    isOnline: true
                });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(null);
            });

            socket.on('error', () => {
                socket.destroy();
                resolve(null);
            });

            try {
                socket.connect(port, ip);
            } catch {
                resolve(null);
            }
        });
    }

    /**
     * Get printer status for all printers in a branch
     */
    static async getBranchPrinterStatus(branchId: string): Promise<PrinterTestResult[]> {
        const printers = await PrinterModel.findAll({ branchId });
        const results: PrinterTestResult[] = [];

        // Test printers in parallel with a limit
        const batchSize = 5;
        for (let i = 0; i < printers.length; i += batchSize) {
            const batch = printers.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(printer =>
                    this.testPrinter(printer.printerId, printer.tenantId, branchId)
                )
            );
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Monitor printer health (for background jobs)
     */
    static async monitorPrinterHealth(tenantId: string): Promise<{
        total: number;
        online: number;
        offline: number;
        error: number;
        printers: PrinterTestResult[];
    }> {
        const printers = await PrinterModel.findAll({ tenantId });
        const results: PrinterTestResult[] = [];

        // Test printers in parallel with a limit
        const batchSize = 10;
        for (let i = 0; i < printers.length; i += batchSize) {
            const batch = printers.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(printer =>
                    this.testPrinter(printer.printerId, tenantId, printer.branchId)
                )
            );
            results.push(...batchResults);
        }

        return {
            total: results.length,
            online: results.filter(r => r.printerStatus === PrinterStatus.ONLINE).length,
            offline: results.filter(r => r.printerStatus === PrinterStatus.OFFLINE).length,
            error: results.filter(r => r.printerStatus === PrinterStatus.ERROR).length,
            printers: results
        };
    }

    /**
     * Validate printer configuration
     */
    static validatePrinterConfig(printer: Partial<Printer>): {
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

        // Validate based on connection type
        switch (printer.connectionType) {
            case 'NETWORK':
            case 'WIFI':
                if (!printer.connectionAddress) {
                    errors.push('IP address is required for network printers');
                } else {
                    // Validate IP address format
                    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                    if (!ipRegex.test(printer.connectionAddress)) {
                        errors.push('Invalid IP address format');
                    }
                }
                break;
            case 'USB':
                // USB printers can auto-detect, but if IDs are provided, validate them
                if (printer.vendorId && !/^[0-9a-fA-F]{4}$/.test(printer.vendorId)) {
                    errors.push('Invalid USB vendor ID format (expected 4-digit hex)');
                }
                if (printer.productId && !/^[0-9a-fA-F]{4}$/.test(printer.productId)) {
                    errors.push('Invalid USB product ID format (expected 4-digit hex)');
                }
                break;
            case 'BLUETOOTH':
                if (!printer.connectionAddress) {
                    errors.push('Bluetooth address is required for Bluetooth printers');
                } else {
                    // Validate MAC address format
                    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
                    if (!macRegex.test(printer.connectionAddress)) {
                        errors.push('Invalid Bluetooth address format (expected MAC address)');
                    }
                }
                break;
            case 'SERIAL':
                if (!printer.connectionAddress) {
                    errors.push('Serial port path is required for serial printers');
                }
                break;
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get available serial ports
     */
    static async getAvailableSerialPorts(): Promise<{
        path: string;
        manufacturer?: string;
        serialNumber?: string;
        vendorId?: string;
        productId?: string;
        friendlyName?: string;
    }[]> {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                vendorId: port.vendorId,
                productId: port.productId,
                friendlyName: (port as any).friendlyName
            }));
        } catch (error) {
            console.error('Error listing serial ports:', error);
            return [];
        }
    }

    /**
     * Get common printer ports
     */
    static getCommonPrinterPorts(): { port: number; protocol: string; description: string }[] {
        return [
            { port: 9100, protocol: 'RAW', description: 'HP JetDirect / Raw printing (most common)' },
            { port: 515, protocol: 'LPD', description: 'Line Printer Daemon' },
            { port: 631, protocol: 'IPP', description: 'Internet Printing Protocol (CUPS)' },
            { port: 443, protocol: 'IPPS', description: 'IPP over HTTPS' },
            { port: 80, protocol: 'HTTP', description: 'Printer web interface' },
            { port: 161, protocol: 'SNMP', description: 'Printer status via SNMP' }
        ];
    }
}
