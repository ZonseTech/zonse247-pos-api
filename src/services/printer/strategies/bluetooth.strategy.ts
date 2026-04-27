/**
 * Bluetooth Printer Strategy
 * Handles printing to Bluetooth connected printers via OS-level Bluetooth COM/serial ports.
 * On Windows, paired Bluetooth SPP devices appear as COM ports.
 * Falls back to bluetooth-serial-port native module if available.
 */

import { Printer, PrinterConnectionType } from '../../../types/printer';
import {
    AppPlatform,
    PrintResult,
    PrintErrorCode
} from '../../../types/printer.platform';
import { BasePrintStrategy } from './print.strategy';
import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

const BT_CONNECT_TIMEOUT = 15000;
const BT_TEST_TIMEOUT = 10000;
const BT_SCAN_TIMEOUT = 30000;

/**
 * Lazily load bluetooth-serial-port to avoid crashing if native module is unavailable.
 * Returns the BluetoothSerialPort constructor or null.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadBluetoothModule(): any | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('bluetooth-serial-port');
        return mod.BluetoothSerialPort;
    } catch {
        return null;
    }
}

/**
 * Resolve which COM port belongs to a given Bluetooth MAC address on Windows.
 * Searches PnP device IDs for the MAC embedded in the Bluetooth COM port entry.
 */
async function resolveBluetoothCOMPort(macAddress: string): Promise<string | null> {
    if (os.platform() !== 'win32') return null;

    try {
        const macHex = macAddress.replace(/[:-]/g, '').toUpperCase();

        const { stdout } = await execAsync(
            `powershell -NoProfile -Command "Get-WmiObject -Class Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Standard Serial over Bluetooth' -and $_.DeviceID -match '${macHex}' } | Select-Object Name | ConvertTo-Json"`
        );

        const devices = JSON.parse(stdout || '[]');
        const devArray = Array.isArray(devices) ? devices : [devices];

        for (const d of devArray) {
            if (d?.Name) {
                const match = d.Name.match(/\(COM(\d+)\)/);
                if (match) return `COM${match[1]}`;
            }
        }
    } catch (error) {
        console.warn('[Bluetooth] Failed to resolve COM port for MAC:', error);
    }

    return null;
}

/**
 * Bluetooth print strategy for wireless thermal printers.
 *
 * Primary path (Windows): Uses OS Bluetooth COM ports via SerialPort — no native module needed.
 * Fallback path: Uses bluetooth-serial-port native module for cross-platform SPP communication.
 */
export class BluetoothPrintStrategy extends BasePrintStrategy {
    constructor() {
        super(
            'BluetoothPrintStrategy',
            [AppPlatform.DESKTOP, AppPlatform.MOBILE_ANDROID, AppPlatform.MOBILE_IOS, AppPlatform.MOBILE_REACT_NATIVE],
            [PrinterConnectionType.BLUETOOTH]
        );
    }

    /**
     * Print content to a Bluetooth printer.
     * On Windows, resolves the Bluetooth MAC to a COM port and writes via SerialPort.
     * Falls back to bluetooth-serial-port native module on other platforms.
     */
    async print(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const address = printer.connectionAddress;

        if (!address) {
            return this.createFailureResult(
                'No Bluetooth address specified for printer',
                PrintErrorCode.CONNECTION_FAILED
            );
        }

        // --- Windows COM port path ---
        const comPort = await this.resolvePort(address);
        if (comPort) {
            return this.printViaCOMPort(comPort, content, printer, options);
        }

        // --- Fallback: bluetooth-serial-port native module ---
        return this.printViaNativeModule(address, content, options);
    }

    /**
     * Resolve a Bluetooth address to a COM port path.
     * If the address is already a COM port (e.g. "COM4"), use it directly.
     */
    private async resolvePort(address: string): Promise<string | null> {
        if (/^COM\d+$/i.test(address)) {
            return address.toUpperCase();
        }

        if (os.platform() === 'win32') {
            return resolveBluetoothCOMPort(address);
        }

        return null;
    }

    /**
     * Print via Windows Bluetooth COM port using SerialPort.
     */
    private printViaCOMPort(
        comPort: string,
        content: string,
        printer: Printer,
        options?: Record<string, unknown>
    ): Promise<PrintResult> {
        const timeout = (options?.timeout as number) || BT_CONNECT_TIMEOUT;
        const baudRate = printer.baudRate || 9600;

        return new Promise<PrintResult>((resolve) => {
            const port = new SerialPort({
                path: comPort,
                baudRate,
                autoOpen: false,
            });

            port.on('error', (err) => {
                console.error(`[Bluetooth COM] Port error on ${comPort}:`, err.message);
            });

            const timer = setTimeout(() => {
                try { port.close(); } catch { /* ignore */ }
                resolve(this.createSuccessResult(undefined, AppPlatform.DESKTOP));
            }, timeout);

            port.open((err) => {
                if (err) {
                    clearTimeout(timer);
                    resolve(this.createFailureResult(
                        `Cannot open Bluetooth COM port ${comPort}: ${err.message}`,
                        PrintErrorCode.CONNECTION_FAILED
                    ));
                    return;
                }

                const buffer = Buffer.from(content, 'binary');
                port.write(buffer, (writeErr) => {
                    if (writeErr) {
                        clearTimeout(timer);
                        try { port.close(); } catch { /* ignore */ }
                        resolve(this.createFailureResult(
                            `Bluetooth write failed on ${comPort}: ${writeErr.message}`,
                            PrintErrorCode.CONNECTION_FAILED
                        ));
                        return;
                    }

                    port.drain((drainErr) => {
                        clearTimeout(timer);
                        if (drainErr) {
                            console.warn(`[Bluetooth COM] Drain warning on ${comPort}:`, drainErr.message);
                        }
                        try { port.close(); } catch { /* ignore */ }
                        resolve(this.createSuccessResult(undefined, AppPlatform.DESKTOP));
                    });
                });
            });
        });
    }

    /**
     * Fallback: print via bluetooth-serial-port native module (SPP).
     */
    private printViaNativeModule(
        address: string,
        content: string,
        options?: Record<string, unknown>
    ): Promise<PrintResult> {
        const BluetoothSerialPort = loadBluetoothModule();
        if (!BluetoothSerialPort) {
            return Promise.resolve(this.createFailureResult(
                'Bluetooth not available. On Windows, ensure the printer is paired and has a Bluetooth COM port. On other platforms, install bluetooth-serial-port.',
                PrintErrorCode.BLUETOOTH_DISABLED
            ));
        }

        const timeout = (options?.timeout as number) || BT_CONNECT_TIMEOUT;
        const explicitChannel = options?.channel as number | undefined;

        return new Promise<PrintResult>((resolve) => {
            const btSerial = new BluetoothSerialPort();
            let settled = false;

            const settle = (result: PrintResult) => {
                if (settled) return;
                settled = true;
                try { btSerial.close(); } catch { /* ignore */ }
                resolve(result);
            };

            const timer = setTimeout(() => {
                settle(this.createFailureResult(
                    'Bluetooth connection timed out. Ensure the printer is powered on and within range.',
                    PrintErrorCode.CONNECTION_TIMEOUT
                ));
            }, timeout);

            const connectAndWrite = (channel: number) => {
                btSerial.connect(address, channel, () => {
                    const buffer = Buffer.from(content, 'binary');
                    btSerial.write(buffer, (err: Error | null) => {
                        clearTimeout(timer);
                        if (err) {
                            settle(this.createFailureResult(
                                `Bluetooth write failed: ${err.message}`,
                                PrintErrorCode.CONNECTION_FAILED
                            ));
                        } else {
                            settle(this.createSuccessResult(undefined, AppPlatform.DESKTOP));
                        }
                    });
                }, () => {
                    clearTimeout(timer);
                    settle(this.createFailureResult(
                        'Cannot connect to Bluetooth printer. Ensure it is paired and powered on.',
                        PrintErrorCode.CONNECTION_FAILED
                    ));
                });
            };

            if (explicitChannel !== undefined) {
                connectAndWrite(explicitChannel);
            } else {
                btSerial.findSerialPortChannel(address, (channel: number) => {
                    connectAndWrite(channel);
                }, () => {
                    clearTimeout(timer);
                    settle(this.createFailureResult(
                        'Bluetooth printer not found. Ensure it is paired in OS Bluetooth settings.',
                        PrintErrorCode.BLUETOOTH_DISABLED
                    ));
                });
            }
        });
    }

    /**
     * Test Bluetooth printer connectivity.
     * On Windows, checks if the resolved COM port can be opened.
     * Falls back to bluetooth-serial-port SPP channel discovery.
     */
    async testConnection(printer: Printer): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const address = printer.connectionAddress;
        const startTime = Date.now();

        if (!address) {
            return { online: false, error: 'No Bluetooth address specified' };
        }

        const comPort = await this.resolvePort(address);
        if (comPort) {
            return this.testCOMPortConnection(comPort, startTime);
        }

        return this.testNativeModuleConnection(address, startTime);
    }

    /**
     * Test connectivity by opening/closing a COM port.
     */
    private testCOMPortConnection(
        comPort: string,
        startTime: number
    ): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        return new Promise((resolve) => {
            const port = new SerialPort({
                path: comPort,
                baudRate: 9600,
                autoOpen: false,
            });

            port.on('error', () => { /* swallow */ });

            const timer = setTimeout(() => {
                try { port.close(); } catch { /* ignore */ }
                resolve({
                    online: false,
                    responseTime: Date.now() - startTime,
                    error: `Bluetooth COM port ${comPort} open timed out`
                });
            }, BT_TEST_TIMEOUT);

            port.open((err) => {
                clearTimeout(timer);
                if (err) {
                    resolve({
                        online: false,
                        responseTime: Date.now() - startTime,
                        error: `Cannot open ${comPort}: ${err.message}`
                    });
                } else {
                    port.close(() => {
                        resolve({
                            online: true,
                            responseTime: Date.now() - startTime
                        });
                    });
                }
            });
        });
    }

    /**
     * Fallback: test via bluetooth-serial-port native module.
     */
    private testNativeModuleConnection(
        address: string,
        startTime: number
    ): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const BluetoothSerialPort = loadBluetoothModule();
        if (!BluetoothSerialPort) {
            return Promise.resolve({
                online: false,
                error: 'Bluetooth module not available and no COM port found for this device'
            });
        }

        return new Promise((resolve) => {
            const btSerial = new BluetoothSerialPort();
            let settled = false;

            const settle = (result: { online: boolean; responseTime?: number; error?: string }) => {
                if (settled) return;
                settled = true;
                try { btSerial.close(); } catch { /* ignore */ }
                resolve(result);
            };

            const timer = setTimeout(() => {
                settle({
                    online: false,
                    responseTime: Date.now() - startTime,
                    error: 'Bluetooth connection test timed out'
                });
            }, BT_TEST_TIMEOUT);

            btSerial.findSerialPortChannel(address, (channel: number) => {
                btSerial.connect(address, channel, () => {
                    clearTimeout(timer);
                    settle({ online: true, responseTime: Date.now() - startTime });
                }, () => {
                    clearTimeout(timer);
                    settle({
                        online: false,
                        responseTime: Date.now() - startTime,
                        error: 'Found device but could not connect. Ensure it is paired.'
                    });
                });
            }, () => {
                clearTimeout(timer);
                settle({
                    online: false,
                    responseTime: Date.now() - startTime,
                    error: 'Bluetooth device not found or not paired'
                });
            });
        });
    }

    /**
     * Scan for nearby Bluetooth devices.
     * On Windows, uses PowerShell to query PnP Bluetooth devices.
     * Falls back to bluetooth-serial-port inquiry scan.
     */
    static async scanForPrinters(): Promise<Array<{ name: string; address: string }>> {
        if (os.platform() === 'win32') {
            return this.scanWindowsBluetooth();
        }
        return this.scanViaNativeModule();
    }

    /**
     * Windows: discover Bluetooth devices via PowerShell PnP queries.
     */
    private static async scanWindowsBluetooth(): Promise<Array<{ name: string; address: string }>> {
        const devices: Array<{ name: string; address: string }> = [];

        try {
            const { stdout } = await execAsync(
                `powershell -NoProfile -Command "Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match 'DEV_' } | Select-Object FriendlyName, InstanceId, Status | ConvertTo-Json"`
            );

            const parsed = JSON.parse(stdout || '[]');
            const devArray = Array.isArray(parsed) ? parsed : [parsed];

            for (const d of devArray) {
                if (!d?.FriendlyName || !d?.InstanceId) continue;
                const macMatch = d.InstanceId.match(/DEV_([0-9A-Fa-f]{12})/);
                if (macMatch) {
                    const rawMac = macMatch[1].toUpperCase();
                    const address = rawMac.replace(/(.{2})(?=.)/g, '$1:');
                    devices.push({ name: d.FriendlyName, address });
                }
            }
        } catch (error) {
            console.warn('[Bluetooth] Windows PnP scan failed:', error);
        }

        return devices;
    }

    /**
     * Fallback: scan via bluetooth-serial-port native module inquiry.
     */
    private static async scanViaNativeModule(): Promise<Array<{ name: string; address: string }>> {
        const BluetoothSerialPort = loadBluetoothModule();
        if (!BluetoothSerialPort) {
            console.warn('[Bluetooth] bluetooth-serial-port module not available — skipping scan');
            return [];
        }

        return new Promise((resolve) => {
            const btSerial = new BluetoothSerialPort();
            const devices: Array<{ name: string; address: string }> = [];

            btSerial.on('found', (address: string, name: string) => {
                devices.push({ address, name: name || 'Unknown Device' });
            });

            btSerial.on('finished', () => {
                resolve(devices);
            });

            btSerial.inquire();
            setTimeout(() => resolve(devices), BT_SCAN_TIMEOUT);
        });
    }

    /**
     * List already-paired Bluetooth devices from the OS.
     * On Windows uses PowerShell; falls back to bluetooth-serial-port.
     */
    static async listPairedDevices(): Promise<Array<{ name: string; address: string; services: string[] }>> {
        if (os.platform() === 'win32') {
            return this.listWindowsPairedDevices();
        }
        return this.listPairedViaNativeModule();
    }

    /**
     * Windows: list paired BT devices and their COM ports via PowerShell.
     */
    private static async listWindowsPairedDevices(): Promise<Array<{ name: string; address: string; services: string[] }>> {
        const devices: Array<{ name: string; address: string; services: string[] }> = [];

        try {
            const { stdout: devStdout } = await execAsync(
                `powershell -NoProfile -Command "Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match 'DEV_' -and $_.Status -eq 'OK' } | Select-Object FriendlyName, InstanceId | ConvertTo-Json"`
            );

            const parsed = JSON.parse(devStdout || '[]');
            const devArray = Array.isArray(parsed) ? parsed : [parsed];

            let comPorts: Array<{ Name: string; DeviceID: string }> = [];
            try {
                const { stdout: comStdout } = await execAsync(
                    `powershell -NoProfile -Command "Get-WmiObject -Class Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Standard Serial over Bluetooth' } | Select-Object Name, DeviceID | ConvertTo-Json"`
                );
                const comParsed = JSON.parse(comStdout || '[]');
                comPorts = Array.isArray(comParsed) ? comParsed : [comParsed];
            } catch { /* ignore */ }

            for (const d of devArray) {
                if (!d?.FriendlyName || !d?.InstanceId) continue;

                const macMatch = d.InstanceId.match(/DEV_([0-9A-Fa-f]{12})/);
                if (!macMatch) continue;

                const rawMac = macMatch[1].toUpperCase();
                const address = rawMac.replace(/(.{2})(?=.)/g, '$1:');

                const services: string[] = [];
                for (const cp of comPorts) {
                    if (cp.DeviceID?.toUpperCase().includes(rawMac)) {
                        const portMatch = cp.Name?.match(/\(COM\d+\)/);
                        if (portMatch) services.push(`SPP ${portMatch[0]}`);
                    }
                }

                devices.push({ name: d.FriendlyName, address, services });
            }
        } catch (error) {
            console.warn('[Bluetooth] Windows paired device listing failed:', error);
        }

        return devices;
    }

    /**
     * Fallback: list paired devices via bluetooth-serial-port native module.
     */
    private static async listPairedViaNativeModule(): Promise<Array<{ name: string; address: string; services: string[] }>> {
        const BluetoothSerialPort = loadBluetoothModule();
        if (!BluetoothSerialPort) {
            return [];
        }

        return new Promise((resolve) => {
            const btSerial = new BluetoothSerialPort();
            btSerial.listPairedDevices((devices: Array<{ name: string; address: string; services: Array<{ channelID: number; name: string }> }>) => {
                resolve(devices.map(d => ({
                    name: d.name || 'Unknown Device',
                    address: d.address,
                    services: d.services?.map(s => s.name) || []
                })));
            });
        });
    }

    /**
     * Resolve a Bluetooth MAC address to its COM port on Windows.
     * Exported for use by other services.
     */
    static async resolveBluetoothCOMPort(macAddress: string): Promise<string | null> {
        return resolveBluetoothCOMPort(macAddress);
    }
}

export default BluetoothPrintStrategy;
