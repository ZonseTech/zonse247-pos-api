import { SerialPort } from 'serialport';
import { DiscoveredPrinter, PrinterConnectionType, PrinterDescriptor, PrinterType, SerialPortInfo } from '../types';

export async function discoverSerialPrinters(): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];

    try {
        const ports = await SerialPort.list();

        for (const port of ports) {
            const friendlyName = (port as any).friendlyName as string | undefined;
            const isPrinterPort =
                port.manufacturer?.toLowerCase().includes('printer') ||
                friendlyName?.toLowerCase().includes('printer') ||
                port.pnpId?.toLowerCase().includes('printer') ||
                // Include common serial-USB converters often used with printers
                port.manufacturer?.toLowerCase().includes('prolific') ||
                port.manufacturer?.toLowerCase().includes('ftdi') ||
                port.manufacturer?.toLowerCase().includes('ch340');

            printers.push({
                name: friendlyName || port.path,
                address: port.path,
                connectionType: PrinterConnectionType.SERIAL,
                vendorId: port.vendorId,
                productId: port.productId,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                type: isPrinterPort ? PrinterType.THERMAL : undefined,
                isOnline: true, // Port exists, so it's "online"
            });
        }
    } catch (error) {
        console.error('Serial port discovery error:', error);
    }

    return printers;
}

export async function checkSerialPrinter(printer: PrinterDescriptor): Promise<boolean> {
    const portPath = printer.connectionAddress;

    if (!portPath) {
        return false;
    }

    try {
        const ports = await SerialPort.list();
        const portExists = ports.some((p) => p.path === portPath);

        if (!portExists) {
            return false;
        }

        return new Promise<boolean>((resolve) => {
            const port = new SerialPort({
                path: portPath,
                baudRate: 9600,
                autoOpen: false,
            });

            port.open((err) => {
                if (err) {
                    resolve(false);
                } else {
                    port.close(() => resolve(true));
                }
            });

            setTimeout(() => {
                try {
                    port.close();
                } catch {
                    // ignore
                }
                resolve(false);
            }, 3000);
        });
    } catch {
        return false;
    }
}

export async function getAvailableSerialPorts(): Promise<SerialPortInfo[]> {
    try {
        const ports = await SerialPort.list();
        return ports.map((port) => ({
            path: port.path,
            manufacturer: port.manufacturer,
            serialNumber: port.serialNumber,
            vendorId: port.vendorId,
            productId: port.productId,
            friendlyName: (port as any).friendlyName,
        }));
    } catch (error) {
        console.error('Error listing serial ports:', error);
        return [];
    }
}
