/**
 * USB Printer Strategy
 * Handles printing to USB connected printers (Desktop/Desktop only)
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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * USB print strategy for directly connected printers
 */
export class USBPrintStrategy extends BasePrintStrategy {
    constructor() {
        super(
            'USBPrintStrategy',
            [AppPlatform.DESKTOP, AppPlatform.MOBILE_ANDROID],
            [PrinterConnectionType.USB]
        );
    }

    async print(printer: Printer, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const platform = os.platform();

        try {
            if (platform === 'linux') {
                return await this.printLinux(printer, content, options);
            } else if (platform === 'darwin') {
                return await this.printMacOS(printer, content);
            } else if (platform === 'win32') {
                return await this.printWindows(printer, content);
            }

            return this.createFailureResult(
                `Unsupported operating system: ${platform}`,
                PrintErrorCode.UNKNOWN
            );
        } catch (error) {
            return this.createFailureResult(
                `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    private async printLinux(printer: Printer, content: string, _options?: Record<string, unknown>): Promise<PrintResult> {
        const devicePath = printer.connectionAddress || await this.findLinuxUSBDevice(printer);

        if (!devicePath) {
            return this.createFailureResult(
                'USB printer device not found',
                PrintErrorCode.PRINTER_NOT_FOUND
            );
        }

        try {
            // Write directly to device
            await fs.promises.writeFile(devicePath, content);
            return this.createSuccessResult(undefined, AppPlatform.DESKTOP);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check for permission issues
            if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
                return this.createFailureResult(
                    `Permission denied. Add user to dialout group: sudo usermod -a -G dialout $USER`,
                    PrintErrorCode.PERMISSION_DENIED
                );
            }

            // Try using lp command as fallback
            try {
                await execAsync(`echo '${content.replace(/'/g, "\\'")}' | lp -d "${printer.printerName}"`);
                return this.createSuccessResult(undefined, AppPlatform.DESKTOP);
            } catch (_lpError) {
                return this.createFailureResult(
                    `Print failed: ${errorMessage}`,
                    PrintErrorCode.CONNECTION_FAILED
                );
            }
        }
    }

    private async printMacOS(printer: Printer, content: string): Promise<PrintResult> {
        try {
            // Create temp file
            const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
            await fs.promises.writeFile(tempFile, content);

            // Use lp command
            const printerArg = printer.printerName ? `-d "${printer.printerName}"` : '';
            await execAsync(`lp ${printerArg} "${tempFile}"`);

            // Cleanup
            await fs.promises.unlink(tempFile).catch(() => undefined);

            return this.createSuccessResult(undefined, AppPlatform.DESKTOP);
        } catch (error) {
            return this.createFailureResult(
                `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    private async printWindows(printer: Printer, content: string): Promise<PrintResult> {
        try {
            // Create temp file
            const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
            await fs.promises.writeFile(tempFile, content);

            // Use Windows print command
            const printerName = printer.printerName || 'default';
            await execAsync(`print /d:"${printerName}" "${tempFile}"`);

            // Cleanup
            await fs.promises.unlink(tempFile).catch(() => undefined);

            return this.createSuccessResult(undefined, AppPlatform.DESKTOP);
        } catch (error) {
            return this.createFailureResult(
                `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    private async findLinuxUSBDevice(printer: Printer): Promise<string | null> {
        // Check common USB printer paths
        const possiblePaths = [
            '/dev/usb/lp0',
            '/dev/usb/lp1',
            '/dev/usblp0',
            '/dev/usblp1'
        ];

        for (const devicePath of possiblePaths) {
            try {
                await fs.promises.access(devicePath, fs.constants.W_OK);
                return devicePath;
            } catch {
                // Path not accessible, try next
            }
        }

        // Try to find by vendor/product ID if provided
        if (printer.vendorId && printer.productId) {
            try {
                const { stdout } = await execAsync('ls -la /dev/usb/');
                // Parse output to find matching device
                // This is a simplified implementation
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('lp')) {
                        const match = line.match(/lp\d+/);
                        if (match) {
                            return `/dev/usb/${match[0]}`;
                        }
                    }
                }
            } catch {
                // Could not enumerate USB devices
            }
        }

        return null;
    }

    async testConnection(printer: Printer): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const startTime = Date.now();
        const platform = os.platform();

        try {
            if (platform === 'linux') {
                const devicePath = printer.connectionAddress || await this.findLinuxUSBDevice(printer);
                if (devicePath) {
                    await fs.promises.access(devicePath, fs.constants.W_OK);
                    return {
                        online: true,
                        responseTime: Date.now() - startTime
                    };
                }
            } else if (platform === 'darwin' || platform === 'win32') {
                // Check if printer exists in system
                const { stdout } = await execAsync(
                    platform === 'darwin' ? 'lpstat -p' : 'wmic printer get name'
                );

                if (printer.printerName && stdout.includes(printer.printerName)) {
                    return {
                        online: true,
                        responseTime: Date.now() - startTime
                    };
                }
            }

            return {
                online: false,
                responseTime: Date.now() - startTime,
                error: 'Printer not found'
            };
        } catch (error) {
            return {
                online: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Connection test failed'
            };
        }
    }
}

export default USBPrintStrategy;
