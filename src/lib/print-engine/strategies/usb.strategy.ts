import { AppPlatform, PrintErrorCode, PrintResult, PrinterConnectionType, PrinterDescriptor } from '../types';
import { BasePrintStrategy } from './base-print-strategy';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export class USBPrintStrategy extends BasePrintStrategy {
    constructor() {
        super(
            'USBPrintStrategy',
            [AppPlatform.DESKTOP, AppPlatform.MOBILE_ANDROID],
            [PrinterConnectionType.USB]
        );
    }

    async print(printer: PrinterDescriptor, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
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

    private async printLinux(printer: PrinterDescriptor, content: string, _options?: Record<string, unknown>): Promise<PrintResult> {
        const devicePath = printer.connectionAddress || await this.findLinuxUSBDevice(printer);

        if (!devicePath) {
            return this.createFailureResult(
                'USB printer device not found',
                PrintErrorCode.PRINTER_NOT_FOUND
            );
        }

        try {
            await fs.promises.writeFile(devicePath, content);
            return this.createSuccessResult(AppPlatform.DESKTOP);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
                return this.createFailureResult(
                    `Permission denied. Add user to dialout group: sudo usermod -a -G dialout $USER`,
                    PrintErrorCode.PERMISSION_DENIED
                );
            }

            try {
                await execAsync(`echo '${content.replace(/'/g, "\\'")}' | lp -d "${printer.printerName}"`);
                return this.createSuccessResult(AppPlatform.DESKTOP);
            } catch (_lpError) {
                return this.createFailureResult(
                    `Print failed: ${errorMessage}`,
                    PrintErrorCode.CONNECTION_FAILED
                );
            }
        }
    }

    private async printMacOS(printer: PrinterDescriptor, content: string): Promise<PrintResult> {
        try {
            const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
            await fs.promises.writeFile(tempFile, content);

            const printerArg = printer.printerName ? `-d "${printer.printerName}"` : '';
            await execAsync(`lp ${printerArg} "${tempFile}"`);

            await fs.promises.unlink(tempFile).catch(() => undefined);

            return this.createSuccessResult(AppPlatform.DESKTOP);
        } catch (error) {
            return this.createFailureResult(
                `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        }
    }

    private async printWindows(printer: PrinterDescriptor, content: string): Promise<PrintResult> {
        // content is the ESC/POS byte buffer encoded as a 'binary' (latin1) string;
        // round-trip it back to a Buffer so raw byte values survive intact.
        const data = Buffer.from(content, 'binary');

        const tempDir = os.tmpdir();
        const tempDataFile = path.join(tempDir, `print_data_${Date.now()}.bin`);
        const tempScriptFile = path.join(tempDir, `print_raw_${Date.now()}.ps1`);

        try {
            await fs.promises.writeFile(tempDataFile, data);

            let printerName = printer.printerName;

            // Generic/fallback discovery names don't correspond to a real spooler
            // entry - try to resolve the actual installed POS/thermal printer.
            if (
                !printerName ||
                printerName === 'USB Printer' ||
                printerName === 'Unknown USB Printer' ||
                printerName === 'Default Thermal Printer'
            ) {
                try {
                    const { stdout } = await execAsync('wmic printer get name,portname');
                    const lines = stdout.split('\n').filter((l) => l.trim());

                    const posPrinter = lines.find(
                        (l) =>
                            l.toLowerCase().includes('pos') ||
                            l.toLowerCase().includes('thermal') ||
                            l.toLowerCase().includes('receipt') ||
                            l.toLowerCase().includes('zywell') ||
                            l.toLowerCase().includes('epson') ||
                            l.toLowerCase().includes('star')
                    );

                    if (posPrinter) {
                        printerName = posPrinter.split(/\s{2,}/)[0].trim();
                    }
                } catch {
                    // Auto-detection failed; fall through to the check below
                }
            }

            if (!printerName) {
                return this.createFailureResult(
                    'No printer name configured and auto-detection failed',
                    PrintErrorCode.PRINTER_NOT_FOUND
                );
            }

            // Send via winspool.drv RAW data type (P/Invoke through PowerShell).
            // This is the reliable path for ESC/POS thermal printers - unlike the
            // legacy `print` command, it bypasses text/driver interpretation and
            // writes the exact bytes to the spooler.
            const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, IntPtr pBytes, Int32 dwCount)
    {
        Int32 dwWritten = 0;
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "POS Print Job";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero))
        {
            if (StartDocPrinter(hPrinter, 1, di))
            {
                if (StartPagePrinter(hPrinter))
                {
                    bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }

        if (!bSuccess)
        {
            throw new Exception("Failed to send data to printer. Error code: " + Marshal.GetLastWin32Error());
        }

        return bSuccess;
    }

    public static bool SendFileToPrinter(string szPrinterName, string szFileName)
    {
        byte[] bytes = File.ReadAllBytes(szFileName);
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        bool bSuccess = SendBytesToPrinter(szPrinterName, pUnmanagedBytes, bytes.Length);
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return bSuccess;
    }
}
"@

$printerName = "${printerName}"
$dataFile = "${tempDataFile.replace(/\\/g, '\\\\')}"

try {
    $result = [RawPrinterHelper]::SendFileToPrinter($printerName, $dataFile)
    if ($result) {
        Write-Host "SUCCESS"
        exit 0
    } else {
        Write-Host "FAILED"
        exit 1
    }
} catch {
    Write-Host "ERROR: $_"
    exit 1
}
`;

            await fs.promises.writeFile(tempScriptFile, psScript, 'utf8');

            const { stdout } = await execAsync(
                `powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptFile}"`,
                { timeout: 30000 }
            );

            const output = stdout.trim();

            if (output.includes('SUCCESS')) {
                return this.createSuccessResult(AppPlatform.DESKTOP);
            }

            return this.createFailureResult(
                `Windows RAW printing failed: ${output}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        } catch (error) {
            return this.createFailureResult(
                `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                PrintErrorCode.CONNECTION_FAILED
            );
        } finally {
            try {
                await fs.promises.unlink(tempDataFile);
            } catch {
                // ignore
            }
            try {
                await fs.promises.unlink(tempScriptFile);
            } catch {
                // ignore
            }
        }
    }

    private async findLinuxUSBDevice(printer: PrinterDescriptor): Promise<string | null> {
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
                // ignore
            }
        }

        if (printer.vendorId && printer.productId) {
            try {
                const { stdout } = await execAsync('ls -la /dev/usb/');
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
                // ignore
            }
        }

        return null;
    }

    async testConnection(printer: PrinterDescriptor): Promise<{ online: boolean; responseTime?: number; error?: string }> {
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
