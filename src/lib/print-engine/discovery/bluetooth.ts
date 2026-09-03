import { DiscoveredPrinter, PrinterConnectionType } from '../types';
import { inferPrinterType } from './classify';

/**
 * Discover Bluetooth printers.
 * Scans for nearby Bluetooth devices and also lists paired devices.
 */
export async function discoverBluetoothPrinters(): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];
    const seenAddresses = new Set<string>();

    try {
        const { BluetoothPrintStrategy } = await import('../strategies/bluetooth.strategy');

        const paired = await BluetoothPrintStrategy.listPairedDevices();
        for (const device of paired) {
            if (!seenAddresses.has(device.address)) {
                seenAddresses.add(device.address);
                printers.push({
                    name: device.name,
                    address: device.address,
                    connectionType: PrinterConnectionType.BLUETOOTH,
                    type: inferPrinterType(device.name),
                    isOnline: true,
                });
            }
        }

        const scanned = await BluetoothPrintStrategy.scanForPrinters();
        for (const device of scanned) {
            if (!seenAddresses.has(device.address)) {
                seenAddresses.add(device.address);
                printers.push({
                    name: device.name,
                    address: device.address,
                    connectionType: PrinterConnectionType.BLUETOOTH,
                    type: inferPrinterType(device.name),
                    isOnline: true,
                });
            }
        }

        console.log(`[Bluetooth] Discovered ${printers.length} devices (${paired.length} paired, ${scanned.length} scanned)`);
    } catch (error) {
        console.warn('[Bluetooth] Discovery failed — bluetooth-serial-port may not be installed:', error);
    }

    return printers;
}
