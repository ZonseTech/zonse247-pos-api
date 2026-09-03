import { SerialPort } from 'serialport';
import * as os from 'os';
import { DiscoveredPrinter, PrinterConnectionType, PrinterDescriptor } from '../types';
import { PRINTER_VENDOR_IDS } from '../constants';
import { inferPrinterType } from './classify';
import { discoverWindowsPrinters } from './windows';

function getUSBString(device: any, index: number): Promise<string | null> {
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
export async function discoverUSBSerialPrinters(): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];

    try {
        const ports = await SerialPort.list();

        for (const port of ports) {
            if (port.vendorId && PRINTER_VENDOR_IDS.includes(parseInt(port.vendorId, 16))) {
                printers.push({
                    name: (port as any).friendlyName || port.path,
                    address: port.path,
                    connectionType: PrinterConnectionType.USB,
                    vendorId: port.vendorId,
                    productId: port.productId,
                    manufacturer: port.manufacturer,
                    serialNumber: port.serialNumber,
                    isOnline: true,
                });
            }
        }
    } catch (error) {
        console.error('USB-Serial discovery error:', error);
    }

    return printers;
}

/**
 * Discover USB printers (cross-platform)
 */
export async function discoverUSBPrinters(): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];
    const platform = os.platform();

    if (platform === 'win32') {
        const windowsPrinters = await discoverWindowsPrinters();
        printers.push(...windowsPrinters);
    }

    try {
        const { usb } = await import('usb');
        const devices = usb.getDeviceList();

        for (const device of devices) {
            const vendorId = device.deviceDescriptor.idVendor;
            const productId = device.deviceDescriptor.idProduct;

            if (PRINTER_VENDOR_IDS.includes(vendorId)) {
                const vendorIdHex = vendorId.toString(16).padStart(4, '0');
                const productIdHex = productId.toString(16).padStart(4, '0');

                let manufacturer = 'Unknown';
                let productName = 'USB Printer';

                try {
                    device.open();
                    manufacturer = await getUSBString(device, device.deviceDescriptor.iManufacturer) || manufacturer;
                    productName = await getUSBString(device, device.deviceDescriptor.iProduct) || productName;
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
                    type: inferPrinterType(productName),
                    isOnline: true,
                });
            }
        }
    } catch (error) {
        console.error('USB discovery error:', error);
        // Fallback to serial port discovery for USB-serial printers
        const serialUSBPrinters = await discoverUSBSerialPrinters();
        printers.push(...serialUSBPrinters);
    }

    return printers;
}

/**
 * Check USB printer via serial port (fallback)
 */
export async function checkUSBPrinterViaSerial(printer: PrinterDescriptor): Promise<boolean> {
    try {
        const ports = await SerialPort.list();

        if (printer.vendorId && printer.productId) {
            return ports.some((port) =>
                port.vendorId?.toLowerCase() === printer.vendorId?.toLowerCase() &&
                port.productId?.toLowerCase() === printer.productId?.toLowerCase()
            );
        }

        return ports.some((port) => port.vendorId !== undefined);
    } catch {
        return false;
    }
}

export async function checkUSBPrinter(printer: PrinterDescriptor): Promise<boolean> {
    try {
        // Dynamic import for usb module (it may not be available on all systems)
        const { usb } = await import('usb');

        if (printer.vendorId && printer.productId) {
            const vendorId = parseInt(printer.vendorId, 16);
            const productId = parseInt(printer.productId, 16);

            const devices = usb.getDeviceList();
            const device = devices.find((d) =>
                d.deviceDescriptor.idVendor === vendorId &&
                d.deviceDescriptor.idProduct === productId
            );
            return device !== undefined;
        }

        const devices = usb.getDeviceList();
        return devices.some((device) =>
            PRINTER_VENDOR_IDS.includes(device.deviceDescriptor.idVendor)
        );
    } catch (error) {
        console.error('USB check error:', error);
        // USB module might not be available, try alternative check via serial ports
        return checkUSBPrinterViaSerial(printer);
    }
}
