/* eslint-disable no-control-regex */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrinterModel, PrintJobModel } from '../../models/printer.model';
import {
	Printer,
	PrintJob,
	CreatePrintJobRequest,
	PrintJobStatus,
	PrintJobType,
	PrintReceiptRequest,
	PrintLabelRequest,
} from '../../types/printer';
import { PrintContentService } from './print-content.service';
import { getPrintQueue } from './print-queue.service';
import * as net from 'net';
import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Error types for better handling
export enum PrintErrorType {
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	CONNECTION_REFUSED = 'CONNECTION_REFUSED',
	TIMEOUT = 'TIMEOUT',
	DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
	DEVICE_BUSY = 'DEVICE_BUSY',
	PRINTER_OFFLINE = 'PRINTER_OFFLINE',
	NO_CONTENT = 'NO_CONTENT',
	UNKNOWN = 'UNKNOWN',
}

export interface PrintError {
	type: PrintErrorType;
	message: string;
	hint: string;
	retryable: boolean;
}

export class PrintJobService {
	/**
	 * Create a print job
	 */
	static async createPrintJob(
		data: CreatePrintJobRequest,
		tenantId: string,
		branchId: string
	): Promise<PrintJob> {
		// Verify printer exists
		const printer = await PrinterModel.findById(
			data.printerId,
			tenantId,
			branchId
		);
		if (!printer) {
			throw new Error('Printer not found');
		}

		if (!printer.isActive) {
			throw new Error('Printer is not active');
		}

		return PrintJobModel.create({ ...data, tenantId, branchId });
	}

	/**
	 * Execute a print job (with optional queue integration)
	 */
	static async executePrintJob(
		printJobId: string,
		useQueue = false
	): Promise<PrintJob | null> {
		const printJob = await PrintJobModel.findById(printJobId);
		if (!printJob) {
			throw new Error('Print job not found');
		}

		if (printJob.status !== 'PENDING') {
			throw new Error(
				`Print job is not in pending status (current: ${printJob.status})`
			);
		}

		// Update status to printing
		await PrintJobModel.updateStatus(printJobId, PrintJobStatus.PRINTING);

		try {
			const printer = await PrinterModel.findById(printJob.printerId);
			if (!printer) {
				throw new Error('Printer not found');
			}

			// Execute print based on content type
			const success = await this.sendToPrinter(printer, printJob);

			if (success) {
				await PrinterModel.incrementPrintJobCount(printer.printerId);
				return PrintJobModel.updateStatus(printJobId, PrintJobStatus.COMPLETED);
			} else {
				const errorMsg = 'Print execution failed';

				// Add to queue for retry if enabled
				if (useQueue) {
					const updatedJob = await PrintJobModel.updateStatus(
						printJobId,
						PrintJobStatus.PENDING,
						errorMsg
					);
					if (updatedJob) {
						getPrintQueue().addJob(updatedJob);
					}
					return updatedJob;
				}

				return PrintJobModel.updateStatus(
					printJobId,
					PrintJobStatus.FAILED,
					errorMsg
				);
			}
		} catch (error) {
			const printError = this.parseError(error);
			const errorMessage = `${printError.message}. ${printError.hint}`;

			// Add to queue for retry if error is retryable
			if (useQueue && printError.retryable) {
				const updatedJob = await PrintJobModel.updateStatus(
					printJobId,
					PrintJobStatus.PENDING,
					errorMessage
				);
				if (updatedJob) {
					getPrintQueue().addJob(updatedJob);
					console.log(`[PrintJob] Job ${printJobId} added to retry queue`);
				}
				return updatedJob;
			}

			return PrintJobModel.updateStatus(
				printJobId,
				PrintJobStatus.FAILED,
				errorMessage
			);
		}
	}

	/**
	 * Parse error and provide helpful information
	 */
	static parseError(error: unknown): PrintError {
		const message = error instanceof Error ? error.message : String(error);
		const lowerMessage = message.toLowerCase();

		if (
			lowerMessage.includes('permission denied') ||
			lowerMessage.includes('eacces')
		) {
			return {
				type: PrintErrorType.PERMISSION_DENIED,
				message: message,
				hint: 'On Linux, add your user to the "dialout" group: sudo usermod -a -G dialout $USER (then log out and back in)',
				retryable: false,
			};
		}

		if (
			lowerMessage.includes('econnrefused') ||
			lowerMessage.includes('connection refused')
		) {
			return {
				type: PrintErrorType.CONNECTION_REFUSED,
				message: message,
				hint: 'Check if printer is powered on and connected to the network. Verify IP address and port.',
				retryable: true,
			};
		}

		if (
			lowerMessage.includes('etimedout') ||
			lowerMessage.includes('timeout')
		) {
			return {
				type: PrintErrorType.TIMEOUT,
				message: message,
				hint: 'Printer may be busy or network is slow. Will retry automatically.',
				retryable: true,
			};
		}

		if (
			lowerMessage.includes('enoent') ||
			lowerMessage.includes('not found') ||
			lowerMessage.includes('no such file')
		) {
			return {
				type: PrintErrorType.DEVICE_NOT_FOUND,
				message: message,
				hint: 'Serial port or device not found. Check cable connections and verify port path.',
				retryable: true,
			};
		}

		if (
			lowerMessage.includes('ebusy') ||
			lowerMessage.includes('resource busy')
		) {
			return {
				type: PrintErrorType.DEVICE_BUSY,
				message: message,
				hint: 'Device is busy. Another application may be using it. Close other apps and retry.',
				retryable: true,
			};
		}

		if (lowerMessage.includes('offline')) {
			return {
				type: PrintErrorType.PRINTER_OFFLINE,
				message: message,
				hint: 'Printer is offline. Check power and connections.',
				retryable: true,
			};
		}

		return {
			type: PrintErrorType.UNKNOWN,
			message: message,
			hint: 'An unexpected error occurred. Check printer status and try again.',
			retryable: true,
		};
	}

	/**
	 * Send data to printer based on connection type
	 */
	private static async sendToPrinter(
		printer: Printer,
		printJob: PrintJob
	): Promise<boolean> {
		console.log(
			`[Print Job ${printJob.printJobId}] Sending to printer ${printer.printerName}`
		);
		console.log(`Printer type: ${printer.printerType}`);
		console.log(`Connection type: ${printer.connectionType}`);
		console.log(`Content type: ${printJob.contentType}`);
		console.log(`Copies: ${printJob.copies}`);

		const content = printJob.content;
		if (!content) {
			throw new Error('Print job has no content');
		}

		// Check if this is a standard printer (laser/inkjet) that should use CUPS
		const useCups = this.shouldUseCups(printer, printJob);

		if (useCups) {
			console.log(
				`[Print Job ${printJob.printJobId}] Using CUPS for ${printer.printerType} printer`
			);
			return this.sendToCupsPrinter(printer, printJob);
		}

		// Convert string content to Buffer for ESC/POS printers
		// Use 'latin1' encoding which correctly preserves byte values 0-255
		const data = Buffer.from(content, 'latin1');

		// Log first bytes for debugging
		console.log(
			`[Print Job ${printJob.printJobId}] Content length: ${content.length}, Buffer length: ${data.length}`
		);
		console.log(
			`[Print Job ${printJob.printJobId}] First 20 bytes: ${data
				.slice(0, 20)
				.toString('hex')}`
		);

		// Send to printer based on connection type
		for (let copy = 0; copy < (printJob.copies || 1); copy++) {
			let success = false;

			switch (printer.connectionType) {
				case 'NETWORK':
				case 'WIFI':
					success = await this.sendToNetworkPrinter(printer, data);
					break;
				case 'USB':
					success = await this.sendToUSBPrinter(printer, data);
					break;
				case 'SERIAL':
					success = await this.sendToSerialPrinter(printer, data);
					break;
				case 'BLUETOOTH':
					success = await this.sendToBluetoothPrinter(printer, data);
					break;
				default:
					throw new Error(
						`Unsupported connection type: ${printer.connectionType}`
					);
			}

			if (!success) {
				return false;
			}

			// Small delay between copies
			if (copy < (printJob.copies || 1) - 1) {
				await this.delay(500);
			}
		}

		return true;
	}

	/**
	 * Send data to Bluetooth printer via COM port (Windows) or bluetooth-serial-port fallback
	 */
	private static async sendToBluetoothPrinter(
		printer: Printer,
		data: Buffer
	): Promise<boolean> {
		const address = printer.connectionAddress;
		if (!address) {
			throw new Error(
				'Bluetooth printer has no address configured. Set connectionAddress to a MAC address or COM port.'
			);
		}

		try {
			const { BluetoothPrintStrategy } = await import(
				'./strategies/bluetooth.strategy'
			);
			const strategy = new BluetoothPrintStrategy();
			const content = data.toString('binary');
			const result = await strategy.print(printer, content);

			if (result.success) {
				console.log(
					`[Bluetooth Printer] Successfully sent ${data.length} bytes to ${printer.printerName}`
				);
				return true;
			} else {
				console.error(
					`[Bluetooth Printer] Print failed: ${result.errorDetails || 'Unknown error'}`
				);
				return false;
			}
		} catch (error) {
			console.error('[Bluetooth Printer] Error:', error);
			throw error;
		}
	}

	/**
	 * Send data to network printer via TCP socket
	 */
	private static async sendToNetworkPrinter(
		printer: Printer,
		data: Buffer
	): Promise<boolean> {
		const address = printer.connectionAddress;
		const port = printer.port || 9100;

		if (!address) {
			throw new Error('Network printer has no IP address configured');
		}

		return new Promise<boolean>((resolve, reject) => {
			const socket = new net.Socket();
			const timeout = 30000; // 30 second timeout

			socket.setTimeout(timeout);

			socket.on('connect', () => {
				console.log(`[Network Printer] Connected to ${address}:${port}`);

				socket.write(data, (err) => {
					if (err) {
						console.error(`[Network Printer] Write error:`, err);
						socket.destroy();
						reject(err);
					} else {
						console.log(
							`[Network Printer] Data sent successfully (${data.length} bytes)`
						);
						// Give the printer time to receive all data before closing
						setTimeout(() => {
							socket.end(() => {
								resolve(true);
							});
						}, 100);
					}
				});
			});

			socket.on('timeout', () => {
				console.error(`[Network Printer] Connection timeout`);
				socket.destroy();
				reject(new Error('Connection timeout'));
			});

			socket.on('error', (err) => {
				console.error(`[Network Printer] Socket error:`, err);
				socket.destroy();
				reject(err);
			});

			socket.on('close', (hadError) => {
				if (hadError) {
					console.error(`[Network Printer] Connection closed with error`);
				}
			});

			try {
				console.log(`[Network Printer] Connecting to ${address}:${port}...`);
				socket.connect(port, address);
			} catch (err) {
				reject(err);
			}
		});
	}

	/**
	 * Send data to USB printer (cross-platform: Windows, macOS, Linux)
	 */
	private static async sendToUSBPrinter(
		printer: Printer,
		data: Buffer
	): Promise<boolean> {
		const platform = os.platform();
		console.log(`[USB Printer] Detected platform: ${platform}`);

		// Windows: Use RAW printing via PowerShell or printer name
		if (platform === 'win32') {
			return this.sendToWindowsPrinter(printer, data);
		}

		// Linux: Try /dev/usb/lp* device files first
		if (platform === 'linux') {
			const usbDevicePaths = [
				'/dev/usb/lp0',
				'/dev/usb/lp1',
				'/dev/usb/lp2',
				'/dev/usb/lp3',
			];

			for (const devicePath of usbDevicePaths) {
				try {
					await fs.promises.access(devicePath, fs.constants.W_OK);
					console.log(
						`[USB Printer] Found USB printer device at: ${devicePath}`
					);
					return this.sendToUsbDevice(devicePath, data);
				} catch (err) {
					// Device doesn't exist or not writable, try next
					continue;
				}
			}
			console.log(
				`[USB Printer] No /dev/usb/lp* device found, trying libusb...`
			);
		}

		// macOS: Try /dev/cu.* USB modem devices
		if (platform === 'darwin') {
			try {
				const devFiles = await fs.promises.readdir('/dev');
				const usbModems = devFiles.filter(
					(f) => f.startsWith('cu.usbmodem') || f.startsWith('cu.usbserial')
				);

				if (usbModems.length > 0) {
					const devicePath = `/dev/${usbModems[0]}`;
					console.log(`[USB Printer] Found macOS USB device at: ${devicePath}`);
					return this.sendToSerialPort(
						devicePath,
						data,
						printer.baudRate || 9600
					);
				}
			} catch (err) {
				console.log(`[USB Printer] macOS device detection failed: ${err}`);
			}
		}

		console.log(`[USB Printer] Trying libusb (cross-platform)...`);

		// Second, try direct USB communication via libusb
		if (printer.vendorId && printer.productId) {
			try {
				const success = await this.sendViaLibUsb(printer, data);
				if (success) {
					return true;
				}
			} catch (err) {
				console.log(
					`[USB Printer] libusb failed: ${err}, trying serial port...`
				);
			}
		}

		// Fallback: USB printers may appear as serial devices
		let portPath = printer.connectionAddress;

		if (!portPath) {
			// Try to auto-detect USB printer port
			try {
				const ports = await SerialPort.list();

				if (printer.vendorId && printer.productId) {
					const vendorId = printer.vendorId.toLowerCase();
					const productId = printer.productId.toLowerCase();

					const matchingPort = ports.find(
						(p) =>
							p.vendorId?.toLowerCase() === vendorId &&
							p.productId?.toLowerCase() === productId
					);

					if (matchingPort) {
						portPath = matchingPort.path;
					}
				}

				if (!portPath) {
					// Look for any USB serial device
					const usbPort = ports.find((p) => p.vendorId !== undefined);
					if (usbPort) {
						portPath = usbPort.path;
						console.log(`[USB Printer] Auto-detected serial port: ${portPath}`);
					}
				}
			} catch (err) {
				console.error('[USB Printer] Error listing serial ports:', err);
			}
		}

		if (!portPath) {
			throw new Error(
				'USB printer not found. Please connect the printer or configure the connection address.'
			);
		}

		return this.sendToSerialPort(portPath, data, printer.baudRate || 9600);
	}

	/**
	 * Send data via libusb (direct USB communication)
	 */
	private static async sendViaLibUsb(
		printer: Printer,
		data: Buffer
	): Promise<boolean> {
		try {
			const usb = await import('usb');
			const vendorId = parseInt(printer.vendorId!, 16);
			const productId = parseInt(printer.productId!, 16);

			console.log(
				`[USB Printer] Looking for device VID:${printer.vendorId} PID:${printer.productId}`
			);

			const device = usb.findByIds(vendorId, productId);
			if (!device) {
				console.log(`[USB Printer] Device not found via libusb`);
				return false;
			}

			device.open();
			console.log(`[USB Printer] Device opened via libusb`);

			// Find the OUT endpoint (usually endpoint 1 or 2 with direction OUT)
			const iface = device.interfaces[0];
			if (!iface) {
				device.close();
				throw new Error('No interface found on USB device');
			}

			// Detach kernel driver if attached (Linux)
			if (iface.isKernelDriverActive()) {
				try {
					iface.detachKernelDriver();
					console.log(`[USB Printer] Kernel driver detached`);
				} catch (err) {
					console.log(`[USB Printer] Could not detach kernel driver: ${err}`);
				}
			}

			iface.claim();
			console.log(`[USB Printer] Interface claimed`);

			// Find OUT endpoint (bulk transfer)
			// LIBUSB_TRANSFER_TYPE_BULK = 2
			let outEndpoint: any = null;
			for (const endpoint of iface.endpoints) {
				if (endpoint.direction === 'out' && endpoint.transferType === 2) {
					outEndpoint = endpoint;
					break;
				}
			}

			if (!outEndpoint) {
				// Try first endpoint with OUT direction
				for (const endpoint of iface.endpoints) {
					if (endpoint.direction === 'out') {
						outEndpoint = endpoint;
						break;
					}
				}
			}

			if (!outEndpoint) {
				iface.release();
				device.close();
				throw new Error('No OUT endpoint found on USB device');
			}

			console.log(`[USB Printer] Using endpoint: ${outEndpoint.address}`);

			return new Promise<boolean>((resolve, reject) => {
				outEndpoint.transfer(data, (err: Error | null) => {
					try {
						iface.release();
					} catch (e) {
						//
					}
					try {
						device.close();
					} catch (e) {
						//
					}

					if (err) {
						console.error(`[USB Printer] libusb transfer error:`, err);
						reject(err);
					} else {
						console.log(
							`[USB Printer] Data sent successfully via libusb (${data.length} bytes)`
						);
						resolve(true);
					}
				});
			});
		} catch (err) {
			console.error(`[USB Printer] libusb error:`, err);
			throw err;
		}
	}

	/**
	 * Send data directly to USB device file (/dev/usb/lp*)
	 */
	private static async sendToUsbDevice(
		devicePath: string,
		data: Buffer
	): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			console.log(
				`[USB Printer] Writing ${data.length} bytes to ${devicePath}...`
			);

			const writeStream = fs.createWriteStream(devicePath);

			writeStream.on('error', (err) => {
				console.error(`[USB Printer] Write error:`, err);
				reject(err);
			});

			writeStream.on('finish', () => {
				console.log(`[USB Printer] Data sent successfully to ${devicePath}`);
				resolve(true);
			});

			writeStream.write(data);
			writeStream.end();
		});
	}

	/**
	 * Send data to Windows printer using RAW printing via winspool.drv API
	 * This is the most reliable method for POS/thermal printers with ESC/POS drivers
	 */
	private static async sendToWindowsPrinter(
		printer: Printer,
		data: Buffer
	): Promise<boolean> {
		console.log(`[Windows Printer] Sending RAW data to printer...`);

		const tempDir = os.tmpdir();
		const tempDataFile = path.join(tempDir, `print_data_${Date.now()}.bin`);
		const tempScriptFile = path.join(tempDir, `print_raw_${Date.now()}.ps1`);

		try {
			// Write binary data to temp file
			await fs.promises.writeFile(tempDataFile, data);
			console.log(
				`[Windows Printer] Data file: ${tempDataFile} (${data.length} bytes)`
			);

			// Determine printer name
			let printerName = printer.printerName;

			// If no printer name, try to auto-detect POS/thermal printer
			if (
				!printerName ||
				printerName === 'USB Printer' ||
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
						console.log(
							`[Windows Printer] Auto-detected POS printer: ${printerName}`
						);
					}
				} catch (err) {
					console.log(`[Windows Printer] Auto-detection failed: ${err}`);
				}
			}

			if (!printerName) {
				throw new Error('No printer name configured and auto-detection failed');
			}

			// PowerShell script using RawPrinterHelper (P/Invoke to winspool.drv)
			// This sends raw bytes directly to the printer without any interpretation
			const psScript = `
# RawPrinterHelper - Send raw bytes directly to printer via winspool.drv
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

			console.log(`[Windows Printer] Sending to: ${printerName}`);

			const { stdout, stderr } = await execAsync(
				`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptFile}"`,
				{ timeout: 30000 }
			);

			const output = stdout.trim();
			console.log(`[Windows Printer] Result: ${output}`);

			if (stderr) {
				console.log(`[Windows Printer] Stderr: ${stderr}`);
			}

			if (output.includes('SUCCESS')) {
				return true;
			}

			// If RAW API failed, try fallback methods
			console.log(
				`[Windows Printer] RAW API failed, trying fallback methods...`
			);

			// Fallback: Try COM port if configured
			if (
				printer.connectionAddress &&
				printer.connectionAddress.match(/^COM\d+$/i)
			) {
				try {
					return await this.sendToSerialPort(
						printer.connectionAddress,
						data,
						printer.baudRate || 9600
					);
				} catch (comErr) {
					console.log(`[Windows Printer] COM port fallback failed: ${comErr}`);
				}
			}

			throw new Error(`Windows printing failed: ${output}`);
		} finally {
			// Clean up temp files
			try {
				await fs.promises.unlink(tempDataFile);
			} catch (e) {
				/* ignore */
			}
			try {
				await fs.promises.unlink(tempScriptFile);
			} catch (e) {
				/* ignore */
			}
		}
	}

	/**
	 * Send data to serial printer
	 */
	private static async sendToSerialPrinter(
		printer: Printer,
		data: Buffer
	): Promise<boolean> {
		const portPath = printer.connectionAddress;

		if (!portPath) {
			throw new Error('Serial printer has no port path configured');
		}

		return this.sendToSerialPort(portPath, data, printer.baudRate || 9600);
	}

	/**
	 * Send data to a serial port
	 */
	private static async sendToSerialPort(
		portPath: string,
		data: Buffer,
		baudRate: number
	): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			console.log(
				`[Serial Printer] Opening port ${portPath} at ${baudRate} baud...`
			);

			const port = new SerialPort({
				path: portPath,
				baudRate: baudRate,
				autoOpen: false,
			});

			port.open((err) => {
				if (err) {
					console.error(`[Serial Printer] Error opening port:`, err);
					reject(err);
					return;
				}

				console.log(
					`[Serial Printer] Port opened, sending ${data.length} bytes...`
				);

				port.write(data, (writeErr) => {
					if (writeErr) {
						console.error(`[Serial Printer] Write error:`, writeErr);
						port.close();
						reject(writeErr);
						return;
					}

					// Drain the buffer to ensure all data is sent
					port.drain((drainErr) => {
						if (drainErr) {
							console.error(`[Serial Printer] Drain error:`, drainErr);
							port.close();
							reject(drainErr);
							return;
						}

						console.log(`[Serial Printer] Data sent successfully`);

						// Close the port after a brief delay
						setTimeout(() => {
							port.close((closeErr) => {
								if (closeErr) {
									console.error(
										`[Serial Printer] Error closing port:`,
										closeErr
									);
								}
								resolve(true);
							});
						}, 100);
					});
				});
			});

			// Handle port errors
			port.on('error', (err) => {
				console.error(`[Serial Printer] Port error:`, err);
				reject(err);
			});
		});
	}

	/**
	 * Utility delay function
	 */
	private static delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Determine if a printer should use system printing (CUPS on Linux/macOS, Windows Print Spooler on Windows)
	 * System printing is used for standard printers (laser, inkjet) that don't support ESC/POS
	 */
	private static shouldUseSystemPrinting(
		printer: Printer,
		printJob: PrintJob
	): boolean {
		// Laser and inkjet printers should use system printing
		const systemPrintTypes = ['LASER', 'INKJET'];
		if (systemPrintTypes.includes(printer.printerType)) {
			return true;
		}

		// If content type is explicitly TEXT or HTML (not ESC_POS), use system printing
		if (printJob.contentType === 'TEXT' || printJob.contentType === 'HTML') {
			return true;
		}

		return false;
	}

	/**
	 * Alias for backward compatibility
	 */
	private static shouldUseCups(printer: Printer, printJob: PrintJob): boolean {
		return this.shouldUseSystemPrinting(printer, printJob);
	}

	/**
	 * Get system printer name from printer configuration (cross-platform)
	 * On Linux/macOS: Uses CUPS lpstat command
	 * On Windows: Uses wmic or PowerShell
	 */
	private static async getCupsPrinterName(
		printer: Printer
	): Promise<string | null> {
		const platform = os.platform();

		// On Windows, use different commands
		if (platform === 'win32') {
			return this.getWindowsPrinterName(printer);
		}

		try {
			// List CUPS printers (Linux/macOS)
			const { stdout } = await execAsync('lpstat -p -d 2>/dev/null || true');
			const lines = stdout.split('\n');

			// Extract printer names
			const cupsPrinters: string[] = [];
			for (const line of lines) {
				const match = line.match(/^printer\s+(\S+)/);
				if (match) {
					cupsPrinters.push(match[1]);
				}
			}

			if (cupsPrinters.length === 0) {
				console.warn('[CUPS] No printers found');
				return null;
			}

			console.log(`[CUPS] Available printers: ${cupsPrinters.join(', ')}`);

			// Try to find a matching printer
			// 1. Check if printer name contains the model
			if (printer.printerModel) {
				const modelParts = printer.printerModel
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '');
				for (const cupsPrinter of cupsPrinters) {
					const cupsNameNormalized = cupsPrinter
						.toLowerCase()
						.replace(/[^a-z0-9]/g, '');
					if (
						cupsNameNormalized.includes(modelParts) ||
						modelParts.includes(cupsNameNormalized)
					) {
						console.log(`[CUPS] Matched printer by model: ${cupsPrinter}`);
						return cupsPrinter;
					}
				}
			}

			// 2. Check if any CUPS printer name contains the printer name
			const nameParts = printer.printerName
				.toLowerCase()
				.replace(/[^a-z0-9]/g, '');
			for (const cupsPrinter of cupsPrinters) {
				const cupsNameNormalized = cupsPrinter
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '');
				if (
					cupsNameNormalized.includes(nameParts) ||
					nameParts.includes(cupsNameNormalized)
				) {
					console.log(`[CUPS] Matched printer by name: ${cupsPrinter}`);
					return cupsPrinter;
				}
			}

			// 3. Check connectionAddress if it looks like a CUPS printer name
			if (
				printer.connectionAddress &&
				cupsPrinters.includes(printer.connectionAddress)
			) {
				console.log(
					`[CUPS] Matched printer by address: ${printer.connectionAddress}`
				);
				return printer.connectionAddress;
			}

			// 4. Get default printer
			const defaultMatch = stdout.match(/system default destination:\s+(\S+)/);
			if (defaultMatch) {
				console.log(`[CUPS] Using default printer: ${defaultMatch[1]}`);
				return defaultMatch[1];
			}

			// 5. Use first available printer
			console.log(`[CUPS] Using first available printer: ${cupsPrinters[0]}`);
			return cupsPrinters[0];
		} catch (error) {
			console.error('[CUPS] Error getting printer name:', error);
			return null;
		}
	}

	/**
	 * Send print job to system printer (CUPS on Linux/macOS, Windows Print Spooler on Windows)
	 */
	private static async sendToCupsPrinter(
		printer: Printer,
		printJob: PrintJob
	): Promise<boolean> {
		const platform = os.platform();

		// On Windows, use Windows printing APIs
		if (platform === 'win32') {
			return this.sendToWindowsSystemPrinter(printer, printJob);
		}

		// On Linux/macOS, use CUPS
		const cupsPrinterName = await this.getCupsPrinterName(printer);

		if (!cupsPrinterName) {
			throw new Error(
				'No CUPS printer found. Please ensure CUPS is installed and a printer is configured.'
			);
		}

		// Create a temporary file for the print content
		const tempDir = os.tmpdir();
		const tempFile = path.join(tempDir, `printjob_${printJob.printJobId}.txt`);

		try {
			// Convert ESC/POS content to plain text if needed
			let content = printJob.content;
			if (printJob.contentType === 'ESC_POS') {
				content = this.convertEscPosToText(content);
			}

			// Write content to temp file
			fs.writeFileSync(tempFile, content, 'utf8');
			console.log(`[CUPS] Created temp file: ${tempFile}`);

			// Build lp command
			const copies = printJob.copies || 1;
			const lpCommand = `lp -d "${cupsPrinterName}" -n ${copies} "${tempFile}"`;

			console.log(`[CUPS] Executing: ${lpCommand}`);
			const { stdout, stderr } = await execAsync(lpCommand);

			if (stderr && !stderr.includes('request id')) {
				console.error(`[CUPS] stderr: ${stderr}`);
			}

			console.log(`[CUPS] Print job submitted: ${stdout.trim()}`);
			return true;
		} catch (error: any) {
			console.error(`[CUPS] Error printing:`, error);
			throw new Error(`CUPS print failed: ${error.message}`);
		} finally {
			// Clean up temp file
			try {
				if (fs.existsSync(tempFile)) {
					fs.unlinkSync(tempFile);
					console.log(`[CUPS] Cleaned up temp file`);
				}
			} catch (cleanupError) {
				console.warn(`[CUPS] Failed to clean up temp file:`, cleanupError);
			}
		}
	}

	/**
	 * Get Windows printer name from configuration
	 */
	private static async getWindowsPrinterName(
		printer: Printer
	): Promise<string | null> {
		try {
			// Try PowerShell first (more reliable on modern Windows)
			try {
				const { stdout } = await execAsync(
					'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"'
				);
				const printers = stdout
					.split('\n')
					.map((p) => p.trim())
					.filter((p) => p);

				if (printers.length > 0) {
					console.log(`[Windows] Available printers: ${printers.join(', ')}`);

					// Try to match by printer name or model
					const nameParts = printer.printerName
						.toLowerCase()
						.replace(/[^a-z0-9]/g, '');
					for (const winPrinter of printers) {
						const winNameNormalized = winPrinter
							.toLowerCase()
							.replace(/[^a-z0-9]/g, '');
						if (
							winNameNormalized.includes(nameParts) ||
							nameParts.includes(winNameNormalized)
						) {
							return winPrinter;
						}
					}

					// Return first printer as fallback
					return printers[0];
				}
			} catch (psErr) {
				console.log(`[Windows] PowerShell printer list failed: ${psErr}`);
			}

			// Fallback to WMIC
			const { stdout } = await execAsync('wmic printer get name');
			const lines = stdout
				.split('\n')
				.map((l) => l.trim())
				.filter((l) => l && l !== 'Name');

			if (lines.length > 0) {
				console.log(`[Windows] Available printers (WMIC): ${lines.join(', ')}`);
				return lines[0];
			}

			return null;
		} catch (error) {
			console.error('[Windows] Error getting printer name:', error);
			return null;
		}
	}

	/**
	 * Send print job to Windows system printer
	 */
	private static async sendToWindowsSystemPrinter(
		printer: Printer,
		printJob: PrintJob
	): Promise<boolean> {
		const printerName = await this.getWindowsPrinterName(printer);

		if (!printerName) {
			throw new Error(
				'No Windows printer found. Please ensure a printer is installed.'
			);
		}

		// Create a temporary file for the print content
		const tempDir = os.tmpdir();
		const tempFile = path.join(tempDir, `printjob_${printJob.printJobId}.txt`);

		try {
			// Convert ESC/POS content to plain text if needed
			let content = printJob.content;
			if (printJob.contentType === 'ESC_POS') {
				content = this.convertEscPosToText(content);
			}

			// Write content to temp file
			await fs.promises.writeFile(tempFile, content, 'utf8');
			console.log(`[Windows] Created temp file: ${tempFile}`);

			const copies = printJob.copies || 1;

			// Try multiple Windows printing methods

			// Method 1: PowerShell Out-Printer
			try {
				const psCmd = `powershell -Command "Get-Content '${tempFile.replace(
					/'/g,
					"''"
				)}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
				for (let i = 0; i < copies; i++) {
					await execAsync(psCmd);
				}
				console.log(`[Windows] Print job submitted via PowerShell`);
				return true;
			} catch (psErr) {
				console.log(`[Windows] PowerShell Out-Printer failed: ${psErr}`);
			}

			// Method 2: Use print command
			try {
				for (let i = 0; i < copies; i++) {
					await execAsync(`print /d:"${printerName}" "${tempFile}"`);
				}
				console.log(`[Windows] Print job submitted via print command`);
				return true;
			} catch (printErr) {
				console.log(`[Windows] print command failed: ${printErr}`);
			}

			// Method 3: Use notepad /p for text files
			try {
				for (let i = 0; i < copies; i++) {
					await execAsync(`notepad /p "${tempFile}"`);
				}
				console.log(`[Windows] Print job submitted via notepad`);
				return true;
			} catch (notepadErr) {
				console.log(`[Windows] notepad print failed: ${notepadErr}`);
			}

			throw new Error(
				'Windows printing failed. Please ensure the printer is configured correctly.'
			);
		} finally {
			// Clean up temp file
			try {
				await fs.promises.unlink(tempFile);
				console.log(`[Windows] Cleaned up temp file`);
			} catch (e) {
				// Ignore cleanup errors
			}
		}
	}

	/**
	 * Convert ESC/POS formatted content to plain text
	 * Strips ESC/POS commands and keeps readable text
	 */
	private static convertEscPosToText(content: string): string {
		// Remove ESC/POS control codes
		let text = content;

		// Remove ESC sequences (ESC followed by various commands)
		// eslint-disable-next-line no-control-regex
		text = text.replace(/\x1b[\x00-\x7f]/g, '');
		// eslint-disable-next-line no-control-regex
		text = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

		// Remove GS sequences
		// eslint-disable-next-line no-control-regex
		text = text.replace(/\x1d[\x00-\x7f]/g, '');
		// eslint-disable-next-line no-control-regex
		text = text.replace(/\x1d\([a-zA-Z][\x00-\xff]*/g, '');

		// Remove other control characters except newlines and tabs
		// eslint-disable-next-line no-control-regex
		text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

		// Clean up multiple blank lines
		text = text.replace(/\n{3,}/g, '\n\n');

		// Trim whitespace
		text = text.trim();

		return text;
	}

	/**
	 * Print a receipt
	 * 
	 * Performance: 
	 * - Pass receiptSettings in request to skip terminal settings DB lookup
	 * - Debug logging is only enabled in development mode
	 */
	static async printReceipt(
		request: PrintReceiptRequest,
		tenantId: string,
		branchId: string,
		userId?: string
	): Promise<PrintJob> {
		const debug = process.env.NODE_ENV !== 'production';

		if (debug) {
			console.log('[PrintReceipt] Starting receipt print for sale:', request.saleId || request.orderId);
		}

		// Get the printer to use
		let printer: Printer | null = null;

		if (request.printerId) {
			printer = await PrinterModel.findById(
				request.printerId,
				tenantId,
				branchId
			);
		} else {
			printer = await PrinterModel.findDefaultPrinter(branchId, 'receipt');
		}

		if (!printer) {
			throw new Error('No receipt printer available');
		}

		// Get printer configuration for cash drawer and beep settings
		const printerConfig = printer.configuration || {};

		// Generate receipt content based on saleId or orderId (include tenantId/branchId for data fetching)
		const content = await PrintContentService.generateReceiptContent({
			...request,
			tenantId,
			branchId,
			terminalId: request.terminalId,
			// Pass printer configuration for drawer/beep
			openCashDrawer: printerConfig.openCashDrawer,
			beepAfterPrint: printerConfig.beepAfterPrint,
			cutPaper: printerConfig.cutPaper,
		});

		if (debug) {
			console.log('[PrintReceipt] Content generated, length:', content.length);
		}

		const printJobData: CreatePrintJobRequest = {
			printerId: printer.printerId,
			jobType: PrintJobType.RECEIPT,
			jobTitle: `Receipt - ${request.saleId || request.transactionId || request.orderId || 'Unknown'
				}`,
			content,
			contentType: 'ESC_POS',
			copies: request.copies || 1,
			priority: 8, // High priority for receipts
			userId,
			referenceId: request.saleId || request.transactionId || request.orderId,
			referenceType: request.saleId
				? 'SALE'
				: request.transactionId
					? 'TRANSACTION'
					: 'ORDER',
		};

		const printJob = await PrintJobModel.create({
			...printJobData,
			tenantId,
			branchId,
		});

		// Execute immediately
		await this.executePrintJob(printJob.printJobId);

		if (debug) {
			console.log('[PrintReceipt] Completed, job ID:', printJob.printJobId);
		}

		return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
	}

	/**
	 * Print a label
	 */
	static async printLabel(
		request: PrintLabelRequest,
		tenantId: string,
		branchId: string,
		userId?: string
	): Promise<PrintJob> {
		// Get the printer to use
		let printer: Printer | null = null;

		if (request.printerId) {
			printer = await PrinterModel.findById(
				request.printerId,
				tenantId,
				branchId
			);
		} else {
			printer = await PrinterModel.findDefaultPrinter(branchId, 'label');
		}

		if (!printer) {
			throw new Error('No label printer available');
		}

		// Generate label content
		const content = await PrintContentService.generateLabelContent({
			...request,
			tenantId,
			branchId,
		});

		const printJobData: CreatePrintJobRequest = {
			printerId: printer.printerId,
			jobType: PrintJobType.LABEL,
			jobTitle: `Label - Product ${request.productId}`,
			content,
			contentType: 'ZPL', // Zebra Programming Language or similar
			copies: request.quantity,
			priority: 5,
			userId,
			referenceId: request.productId,
			referenceType: 'PRODUCT',
		};

		const printJob = await PrintJobModel.create({
			...printJobData,
			tenantId,
			branchId,
		});

		// Execute immediately
		await this.executePrintJob(printJob.printJobId);

		return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
	}

	/**
	 * Print test page
	 */
	static async printTestPage(
		printerId: string,
		tenantId: string,
		branchId?: string,
		userId?: string
	): Promise<PrintJob> {
		const printer = await PrinterModel.findById(printerId, tenantId, branchId);
		if (!printer) {
			throw new Error('Printer not found');
		}

		const content = PrintContentService.generateTestPageContent(printer);

		const printJobData: CreatePrintJobRequest = {
			printerId: printer.printerId,
			jobType: PrintJobType.TEST_PAGE,
			jobTitle: `Test Page - ${printer.printerName}`,
			content,
			contentType: 'ESC_POS',
			copies: 1,
			priority: 10, // Highest priority for test pages
			userId,
		};

		const printJob = await PrintJobModel.create({
			...printJobData,
			tenantId: printer.tenantId,
			branchId: printer.branchId,
		});

		await this.executePrintJob(printJob.printJobId);

		return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
	}

	/**
	 * Open cash drawer connected to a printer
	 */
	static async openCashDrawer(
		printerId: string,
		tenantId: string,
		branchId?: string,
		userId?: string
	): Promise<PrintJob> {
		const printer = await PrinterModel.findById(printerId, tenantId, branchId);
		if (!printer) {
			throw new Error('Printer not found');
		}

		// Generate drawer open command
		const content = PrintContentService.generateOpenDrawerCommand();

		const printJobData: CreatePrintJobRequest = {
			printerId: printer.printerId,
			jobType: PrintJobType.CASH_DRAWER,
			jobTitle: `Open Cash Drawer - ${printer.printerName}`,
			content,
			contentType: 'ESC_POS',
			copies: 1,
			priority: 10, // High priority for drawer operations
			userId,
		};

		const printJob = await PrintJobModel.create({
			...printJobData,
			tenantId: printer.tenantId,
			branchId: printer.branchId,
		});

		await this.executePrintJob(printJob.printJobId);

		return PrintJobModel.findById(printJob.printJobId) as Promise<PrintJob>;
	}

	/**
	 * Get print job by ID
	 */
	static async getPrintJobById(printJobId: string): Promise<PrintJob | null> {
		return PrintJobModel.findById(printJobId);
	}

	/**
	 * Get print job history for a printer
	 */
	static async getPrintJobHistory(
		printerId: string,
		tenantId: string,
		branchId?: string
	): Promise<PrintJob[]> {
		const printer = await PrinterModel.findById(printerId, tenantId, branchId);
		if (!printer) {
			throw new Error('Printer not found');
		}

		return PrintJobModel.findByPrinterId(printerId);
	}

	/**
	 * Get pending print jobs for a branch
	 */
	static async getPendingPrintJobs(branchId: string): Promise<PrintJob[]> {
		return PrintJobModel.findPending(branchId);
	}

	/**
	 * Cancel a print job
	 */
	static async cancelPrintJob(printJobId: string): Promise<PrintJob | null> {
		const printJob = await PrintJobModel.findById(printJobId);
		if (!printJob) {
			throw new Error('Print job not found');
		}

		if (printJob.status !== 'PENDING') {
			throw new Error('Only pending print jobs can be cancelled');
		}

		return PrintJobModel.updateStatus(printJobId, PrintJobStatus.CANCELLED);
	}

	/**
	 * Retry a failed print job
	 */
	static async retryPrintJob(printJobId: string): Promise<PrintJob | null> {
		const printJob = await PrintJobModel.findById(printJobId);
		if (!printJob) {
			throw new Error('Print job not found');
		}

		if (printJob.status !== 'FAILED') {
			throw new Error('Only failed print jobs can be retried');
		}

		// Reset status to pending and clear error
		await PrintJobModel.updateStatus(printJobId, PrintJobStatus.PENDING);

		// Execute the job again
		return this.executePrintJob(printJobId);
	}

	/**
	 * Clean up old print jobs
	 */
	static async cleanupOldPrintJobs(daysOld = 30): Promise<number> {
		return PrintJobModel.deleteOldJobs(daysOld);
	}

	/**
	 * Get print job statistics for a printer
	 */
	static async getPrintJobStats(
		printerId: string,
		startDate?: Date,
		endDate?: Date
	): Promise<{
		total: number;
		completed: number;
		failed: number;
		cancelled: number;
		pending: number;
	}> {
		const jobs = await PrintJobModel.findByPrinterId(printerId);

		const filteredJobs = jobs.filter((job) => {
			if (startDate && new Date(job.createdAt) < startDate) return false;
			if (endDate && new Date(job.createdAt) > endDate) return false;
			return true;
		});

		return {
			total: filteredJobs.length,
			completed: filteredJobs.filter((j) => j.status === 'COMPLETED').length,
			failed: filteredJobs.filter((j) => j.status === 'FAILED').length,
			cancelled: filteredJobs.filter((j) => j.status === 'CANCELLED').length,
			pending: filteredJobs.filter((j) => j.status === 'PENDING').length,
		};
	}
}
