/**
 * Bluetooth Printer Strategy
 * Handles printing to Bluetooth connected printers (Desktop & Mobile)
 */

import { Printer, PrinterConnectionType } from '../../../types/printer';
import {
    AppPlatform,
    PrintResult,
    PrintErrorCode
} from '../../../types/printer.platform';
import { BasePrintStrategy } from './print.strategy';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Bluetooth print strategy for wireless printers
 * Note: Full Bluetooth implementation requires native modules specific to each platform
 * This provides the interface and Linux/macOS fallback implementations
 */
export class BluetoothPrintStrategy extends BasePrintStrategy {
    constructor() {
        super(
            'BluetoothPrintStrategy',
            [AppPlatform.DESKTOP, AppPlatform.MOBILE_ANDROID, AppPlatform.MOBILE_IOS, AppPlatform.MOBILE_REACT_NATIVE],
            [PrinterConnectionType.BLUETOOTH]
        );
    }

    async print(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const platform = os.platform();
        const bluetoothAddress = printer.connectionAddress;

        if (!bluetoothAddress) {
            return this.createFailureResult(
                'No Bluetooth address specified for printer',
                PrintErrorCode.CONNECTION_FAILED
            );
        }

        try {
            if (platform === 'linux') {
                return await this.printLinuxBluetooth(printer, content, options);
            } else if (platform === 'darwin') {
                return await this.printMacOSBluetooth(printer, content);
            } else if (platform === 'win32') {
                return await this.printWindowsBluetooth(printer, content);
            }

            // For mobile platforms, this would be handled by native modules
            // Return info that native implementation is needed
            return this.createFailureResult(
                'Bluetooth printing requires native implementation for this platform',
                PrintErrorCode.UNKNOWN
            );
        } catch (error) {
            return this.createFailureResult(
                `Bluetooth print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    /**
     * Linux Bluetooth printing using rfcomm
     */
    private async printLinuxBluetooth(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const address = printer.connectionAddress;
        if (!address) {
            return this.createFailureResult(
                'No Bluetooth address specified',
                PrintErrorCode.CONNECTION_FAILED
            );
        }
        const channel = options?.channel ?? 1;

        try {
            // Create rfcomm channel
            const rfcommDevice = `/dev/rfcomm0`;
            
            // Bind to Bluetooth device
            await execAsync(`sudo rfcomm bind 0 ${address} ${channel}`);

            // Write data
            const fs = await import('fs');
            await fs.promises.writeFile(rfcommDevice, content);

            // Release connection
            await execAsync('sudo rfcomm release 0').catch(() => undefined);

            return this.createSuccessResult(undefined, AppPlatform.DESKTOP);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';

            // Check for common Bluetooth errors
            if (errMsg.includes('not found') || errMsg.includes('No such device')) {
                return this.createFailureResult(
                    'Bluetooth device not found. Ensure Bluetooth is enabled and printer is paired.',
                    PrintErrorCode.BLUETOOTH_DISABLED
                );
            }

            if (errMsg.includes('permission') || errMsg.includes('EACCES')) {
                return this.createFailureResult(
                    'Bluetooth access denied. You may need to run with elevated privileges.',
                    PrintErrorCode.PERMISSION_DENIED
                );
            }

            return this.createFailureResult(
                `Bluetooth print failed: ${errMsg}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    /**
     * macOS Bluetooth printing
     */
    private async printMacOSBluetooth(_printer: Printer, _content: string): Promise<PrintResult> {
        // macOS doesn't have a simple CLI for Bluetooth serial
        // This would typically be handled by a native module or Electron's Bluetooth API
        return this.createFailureResult(
            'Bluetooth printing on macOS requires native implementation',
            PrintErrorCode.UNKNOWN
        );
    }

    /**
     * Windows Bluetooth printing
     */
    private async printWindowsBluetooth(printer: Printer, _content: string): Promise<PrintResult> {
        const address = printer.connectionAddress;

        if (!address) {
            return this.createFailureResult(
                'No Bluetooth address specified',
                PrintErrorCode.CONNECTION_FAILED
            );
        }

        try {
            // Windows might expose Bluetooth printer as COM port
            // Try to find the COM port for this Bluetooth device
            await execAsync(
                'wmic path Win32_PnPEntity where "Caption like \'%Bluetooth%\'" get Caption,DeviceID'
            );

            // This is simplified - actual implementation would need to parse the output
            // and find the correct COM port
            
            return this.createFailureResult(
                'Windows Bluetooth printing requires additional configuration',
                PrintErrorCode.UNKNOWN
            );
        } catch (error) {
            return this.createFailureResult(
                `Windows Bluetooth error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    async testConnection(printer: Printer): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const startTime = Date.now();
        const address = printer.connectionAddress;

        if (!address) {
            return {
                online: false,
                error: 'No Bluetooth address specified'
            };
        }

        const platform = os.platform();

        try {
            if (platform === 'linux') {
                // Use hcitool to check if device is reachable
                const { stdout } = await execAsync(`hcitool info ${address}`, { timeout: 10000 });
                const online = stdout.includes('BD Address');

                return {
                    online,
                    responseTime: Date.now() - startTime,
                    error: online ? undefined : 'Device not reachable'
                };
            } else if (platform === 'darwin') {
                // Check using system_profiler
                const { stdout } = await execAsync('system_profiler SPBluetoothDataType', { timeout: 10000 });
                const online = stdout.toLowerCase().includes(address.toLowerCase().replace(/:/g, '-'));

                return {
                    online,
                    responseTime: Date.now() - startTime,
                    error: online ? undefined : 'Device not found'
                };
            }

            return {
                online: false,
                responseTime: Date.now() - startTime,
                error: 'Bluetooth test not available for this platform'
            };
        } catch (error) {
            return {
                online: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Connection test failed'
            };
        }
    }

    /**
     * Scan for Bluetooth printers (Linux only implementation)
     */
    static async scanForPrinters(): Promise<Array<{ name: string; address: string }>> {
        const platform = os.platform();

        if (platform !== 'linux') {
            return [];
        }

        try {
            const { stdout } = await execAsync('hcitool scan', { timeout: 30000 });
            const lines = stdout.split('\n').slice(1); // Skip header
            const printers: Array<{ name: string; address: string }> = [];

            for (const line of lines) {
                const match = line.trim().match(/^([0-9A-F:]{17})\s+(.+)$/i);
                if (match) {
                    // Filter for likely printers (name contains printer-related keywords)
                    const name = match[2];
                    if (/print|star|epson|pos|thermal/i.test(name)) {
                        printers.push({
                            address: match[1],
                            name
                        });
                    }
                }
            }

            return printers;
        } catch {
            return [];
        }
    }
}

export default BluetoothPrintStrategy;
