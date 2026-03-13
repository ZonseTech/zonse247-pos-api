import { EventEmitter } from 'events';
import { PrintQueueService, getPrintQueue, PrintQueueConfig } from './print-queue.service';
import { PrinterDiscoveryService } from './printer-discovery.service';
import { PrinterModel } from '../../models/printer.model';
import { PrintJob, Printer, DiscoveredPrinter, PrinterType } from '../../types/printer';

export interface PrintAgentConfig extends Partial<PrintQueueConfig> {
    autoDiscoverPrinters: boolean;
    discoveryIntervalMs: number;
    autoRegisterPrinters: boolean;
    defaultTenantId: string;
    defaultBranchId: string;
}

export interface PrintAgentStatus {
    isRunning: boolean;
    queueSize: number;
    printersOnline: number;
    printersOffline: number;
    totalPrinters: number;
    lastDiscovery: Date | null;
    uptime: number;
}

const DEFAULT_AGENT_CONFIG: PrintAgentConfig = {
    autoDiscoverPrinters: true,
    discoveryIntervalMs: 60000, // Discover printers every minute
    autoRegisterPrinters: false, // Don't auto-register, let user confirm
    defaultTenantId: '-1',
    defaultBranchId: '-1',
    maxRetries: 5,
    retryDelayMs: 5000,
    persistQueue: true,
    queueFilePath: './data/print-queue.json'
};

/**
 * PrintAgentService - Local print agent for Electron app
 * Handles printer discovery, connection management, and print queue
 */
export class PrintAgentService extends EventEmitter {
    private static instance: PrintAgentService | null = null;
    private config: PrintAgentConfig;
    private printQueue: PrintQueueService;
    private discoveryInterval: NodeJS.Timeout | null = null;
    private isRunning = false;
    private startedAt: Date | null = null;
    private lastDiscovery: Date | null = null;
    private discoveredPrinters: DiscoveredPrinter[] = [];

    private constructor(config: Partial<PrintAgentConfig> = {}) {
        super();
        this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
        this.printQueue = getPrintQueue(this.config);

        // Forward queue events
        this.printQueue.on('job:queued', (job) => this.emit('job:queued', job));
        this.printQueue.on('job:started', (job) => this.emit('job:started', job));
        this.printQueue.on('job:completed', (job) => this.emit('job:completed', job));
        this.printQueue.on('job:failed', (job, error) => this.emit('job:failed', job, error));
        this.printQueue.on('job:retry', (job, attempt) => this.emit('job:retry', job, attempt));
        this.printQueue.on('printer:online', (id) => this.emit('printer:online', id));
        this.printQueue.on('printer:offline', (id) => this.emit('printer:offline', id));
        this.printQueue.on('queue:empty', () => this.emit('queue:empty'));
        this.printQueue.on('error', (error) => this.emit('error', error));
    }

    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<PrintAgentConfig>): PrintAgentService {
        if (!PrintAgentService.instance) {
            PrintAgentService.instance = new PrintAgentService(config);
        }
        return PrintAgentService.instance;
    }

    /**
     * Start the print agent
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[PrintAgent] Already running');
            return;
        }

        console.log('[PrintAgent] Starting print agent...');
        this.isRunning = true;
        this.startedAt = new Date();

        // Start print queue
        await this.printQueue.start();

        // Initial printer discovery
        if (this.config.autoDiscoverPrinters) {
            await this.discoverPrinters();

            // Start discovery interval
            this.discoveryInterval = setInterval(
                () => this.discoverPrinters(),
                this.config.discoveryIntervalMs
            );
        }

        this.emit('started');
        console.log('[PrintAgent] Print agent started');
    }

    /**
     * Stop the print agent
     */
    async stop(): Promise<void> {
        console.log('[PrintAgent] Stopping print agent...');
        this.isRunning = false;

        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
        }

        await this.printQueue.stop();

        // Cleanup discovery service
        PrinterDiscoveryService.cleanup();

        this.emit('stopped');
        console.log('[PrintAgent] Print agent stopped');
    }

    /**
     * Get agent status
     */
    getStatus(): PrintAgentStatus {
        const queueStatus = this.printQueue.getQueueStatus();
        const printerStatus = this.printQueue.getAllPrinterStatus();

        let printersOnline = 0;
        let printersOffline = 0;

        printerStatus.forEach((isOnline) => {
            if (isOnline) printersOnline++;
            else printersOffline++;
        });

        return {
            isRunning: this.isRunning,
            queueSize: queueStatus.total,
            printersOnline,
            printersOffline,
            totalPrinters: printerStatus.size,
            lastDiscovery: this.lastDiscovery,
            uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0
        };
    }

    /**
     * Discover available printers
     */
    async discoverPrinters(): Promise<DiscoveredPrinter[]> {
        console.log('[PrintAgent] Discovering printers...');

        try {
            this.discoveredPrinters = await PrinterDiscoveryService.discoverPrinters();
            this.lastDiscovery = new Date();

            console.log(`[PrintAgent] Found ${this.discoveredPrinters.length} printers`);
            this.emit('printers:discovered', this.discoveredPrinters);

            // Auto-register if enabled
            if (this.config.autoRegisterPrinters) {
                await this.autoRegisterPrinters(this.discoveredPrinters);
            }

            return this.discoveredPrinters;
        } catch (error) {
            console.error('[PrintAgent] Printer discovery error:', error);
            this.emit('error', error);
            return [];
        }
    }

    /**
     * Get last discovered printers
     */
    getDiscoveredPrinters(): DiscoveredPrinter[] {
        return this.discoveredPrinters;
    }

    /**
     * Register a discovered printer
     */
    async registerPrinter(
        discoveredPrinter: DiscoveredPrinter,
        options: {
            printerName?: string;
            tenantId?: string;
            branchId?: string;
            isDefault?: boolean;
            isReceiptPrinter?: boolean;
            isLabelPrinter?: boolean;
            isKitchenPrinter?: boolean;
        } = {}
    ): Promise<Printer> {
        const printerData = {
            printerName: options.printerName || discoveredPrinter.name,
            printerModel: discoveredPrinter.model,
            printerType: discoveredPrinter.type || PrinterType.THERMAL,
            connectionType: discoveredPrinter.connectionType,
            connectionAddress: discoveredPrinter.address,
            port: discoveredPrinter.port,
            vendorId: discoveredPrinter.vendorId,
            productId: discoveredPrinter.productId,
            serialNumber: discoveredPrinter.serialNumber,
            isDefault: options.isDefault || false,
            isReceiptPrinter: options.isReceiptPrinter ?? true,
            isLabelPrinter: options.isLabelPrinter || false,
            isKitchenPrinter: options.isKitchenPrinter || false,
            isReportPrinter: false,
            configuration: {
                paperWidth: 80,
                cutPaper: true,
                openCashDrawer: false
            }
        };

        const printer = await PrinterModel.create({
            ...printerData,
            tenantId: options.tenantId || this.config.defaultTenantId,
            branchId: options.branchId || this.config.defaultBranchId
        });

        console.log(`[PrintAgent] Registered printer: ${printer.printerName}`);
        this.emit('printer:registered', printer);

        return printer;
    }

    /**
     * Auto-register discovered printers
     */
    private async autoRegisterPrinters(discovered: DiscoveredPrinter[]): Promise<void> {
        for (const printer of discovered) {
            try {
                // Check if printer is already registered by name
                const existing = await PrinterModel.findAll({
                    tenantId: this.config.defaultTenantId
                });

                if (existing.length === 0) {
                    await this.registerPrinter(printer);
                }
            } catch (error) {
                console.error(`[PrintAgent] Error auto-registering printer ${printer.name}:`, error);
            }
        }
    }

    /**
     * Add job to queue
     */
    queueJob(printJob: PrintJob): void {
        this.printQueue.addJob(printJob);
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return this.printQueue.getQueueStatus();
    }

    /**
     * Force retry all failed jobs
     */
    retryAllJobs(): void {
        this.printQueue.forceRetryAll();
    }

    /**
     * Clear the queue
     */
    clearQueue(): void {
        this.printQueue.clearQueue();
    }

    /**
     * Test printer connection
     */
    async testPrinter(printerId: string, tenantId: string, branchId?: string) {
        return PrinterDiscoveryService.testPrinter(printerId, tenantId, branchId);
    }

    /**
     * Scan network for printers
     */
    async scanNetwork(baseIP: string, startHost = 1, endHost = 254, port = 9100) {
        return PrinterDiscoveryService.scanNetworkRange(baseIP, startHost, endHost, port);
    }

    /**
     * Get available serial ports
     */
    async getSerialPorts() {
        return PrinterDiscoveryService.getAvailableSerialPorts();
    }

    /**
     * Check system permissions for printing
     */
    async checkPermissions(): Promise<{
        canAccessSerial: boolean;
        canAccessUSB: boolean;
        canAccessNetwork: boolean;
        issues: string[];
    }> {
        const issues: string[] = [];
        let canAccessSerial = true;
        let canAccessUSB = true;
        const canAccessNetwork = true; // Network usually doesn't have permission issues

        try {
            // Check serial port access
            const { SerialPort } = await import('serialport');
            const ports = await SerialPort.list();

            if (ports.length > 0) {
                // Try to detect permission issues by checking if we can list ports
                // On Linux, check if user is in dialout group
                if (process.platform === 'linux') {
                    const { execSync } = await import('child_process');
                    try {
                        const groups = execSync('groups').toString();
                        if (!groups.includes('dialout')) {
                            canAccessSerial = false;
                            issues.push('User is not in "dialout" group. Run: sudo usermod -a -G dialout $USER (then restart)');
                        }
                    } catch {
                        // Can't check groups, assume ok
                    }
                }
            }
        } catch (error) {
            canAccessSerial = false;
            issues.push(`Serial port access error: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            // Check USB access
            const { usb } = await import('usb');
            usb.getDeviceList();
        } catch (error) {
            canAccessUSB = false;
            const errMsg = error instanceof Error ? error.message : String(error);
            if (errMsg.includes('LIBUSB_ERROR_ACCESS')) {
                issues.push('USB access denied. On Linux, you may need to add udev rules or run with elevated privileges.');
            } else {
                issues.push(`USB access error: ${errMsg}`);
            }
        }

        return {
            canAccessSerial,
            canAccessUSB,
            canAccessNetwork,
            issues
        };
    }

    /**
     * Get setup instructions for the current platform
     */
    getSetupInstructions(): {
        platform: string;
        instructions: string[];
    } {
        const platform = process.platform;
        const instructions: string[] = [];

        if (platform === 'linux') {
            instructions.push(
                '=== STEP 1: Add user to required groups ===',
                'sudo usermod -a -G dialout,lp,plugdev $USER',
                '',
                '=== STEP 2: Create udev rules for USB printer access ===',
                'sudo nano /etc/udev/rules.d/99-thermal-printers.rules',
                '',
                '# Add these rules (covers most thermal/POS receipt printers):',
                '',
                '# --- Epson ---',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666", GROUP="plugdev"',
                '',
                '# --- Star Micronics ---',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0519", MODE="0666", GROUP="plugdev"',
                '',
                '# --- Bixolon ---',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="1504", MODE="0666", GROUP="plugdev"',
                '',
                '# --- Chinese/Generic POS printers (POS-80C, XPrinter, etc.) ---',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0416", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0fe6", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0525", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="28e9", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="1d90", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="6868", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="154f", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0fe5", MODE="0666", GROUP="plugdev"',
                '',
                '# --- USB-Serial adapters (for serial thermal printers) ---',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="067b", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="10c4", MODE="0666", GROUP="plugdev"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0403", MODE="0666", GROUP="plugdev"',
                '',
                '# --- Generic USB printer class devices ---',
                'SUBSYSTEM=="usb", ATTR{bInterfaceClass}=="07", MODE="0666", GROUP="plugdev"',
                '',
                '# --- USB printer device files (/dev/usb/lp*) ---',
                'KERNEL=="lp[0-9]*", SUBSYSTEM=="usb", MODE="0666", GROUP="lp"',
                'KERNEL=="lp[0-9]*", SUBSYSTEM=="usbmisc", MODE="0666", GROUP="lp"',
                '',
                '=== STEP 3: Reload udev rules ===',
                'sudo udevadm control --reload-rules',
                'sudo udevadm trigger',
                '',
                '=== STEP 4: Restart & reconnect ===',
                '1. Log out and log back in (or reboot)',
                '2. Unplug and replug the USB printer',
                '3. Verify with: lsusb && ls -la /dev/usb/lp*',
                '',
                '=== ALTERNATIVE: Use CUPS (recommended) ===',
                'If direct USB access fails, use CUPS:',
                '1. Add printer via: sudo system-config-printer',
                '2. Or: lpadmin -p MyPrinter -E -v usb://Vendor/Model',
                '3. Check status: lpstat -v',
                '',
                '=== Network printers work without additional setup ==='
            );
        } else if (platform === 'darwin') {
            instructions.push(
                '=== STEP 1: USB Printer Setup ===',
                'USB printers typically work out of the box on macOS.',
                '',
                '=== STEP 2: Grant USB Access (if needed) ===',
                '1. Open System Preferences > Security & Privacy > Privacy',
                '2. Select "Input Monitoring" or "Full Disk Access"',
                '3. Add your app (Electron app or terminal)',
                '4. Restart the application',
                '',
                '=== STEP 3: Install libusb (for direct USB access) ===',
                'brew install libusb',
                '',
                '=== STEP 4: Check USB Devices ===',
                'system_profiler SPUSBDataType',
                '',
                '=== STEP 5: Serial Port Access ===',
                '1. Serial ports appear as /dev/tty.* or /dev/cu.*',
                '2. List available: ls /dev/tty.* /dev/cu.*',
                '3. User may need to be in "wheel" group for access',
                '',
                '=== STEP 6: CUPS Configuration (recommended) ===',
                '1. Open System Preferences > Printers & Scanners',
                '2. Click + to add a printer',
                '3. Select your USB printer from the list',
                '4. Or use command line:',
                '   lpstat -v                    # List configured printers',
                '   lpadmin -p MyPrinter -E -v usb://Vendor/Model',
                '',
                '=== Troubleshooting ===',
                '- Reset printing system: Right-click printer list > Reset printing system',
                '- Check Console.app for USB/printer errors',
                '- Ensure printer driver is installed (check manufacturer website)',
                '',
                '=== Network printers work without additional setup ==='
            );
        } else if (platform === 'win32') {
            instructions.push(
                '=== STEP 1: Install Printer Drivers ===',
                '1. Download drivers from printer manufacturer website',
                '2. Run the installer and follow prompts',
                '3. Connect USB printer when prompted',
                '',
                '=== STEP 2: Verify USB Printer Detection ===',
                '1. Open Device Manager (Win+X > Device Manager)',
                '2. Expand "Universal Serial Bus controllers"',
                '3. Look for your printer device',
                '4. If yellow warning, right-click > Update driver',
                '',
                '=== STEP 3: Check Printer in Windows Settings ===',
                '1. Open Settings > Devices > Printers & scanners',
                '2. Your printer should appear in the list',
                '3. Click "Manage" to set as default or test',
                '',
                '=== STEP 4: Serial/COM Port Printers ===',
                '1. Open Device Manager > Ports (COM & LPT)',
                '2. Note the COM port number (e.g., COM3)',
                '3. Use this port number when configuring the printer',
                '4. For USB-Serial adapters, install adapter drivers first',
                '',
                '=== STEP 5: Direct USB Access (for ESC/POS) ===',
                '1. Install Zadig (https://zadig.akeo.ie/)',
                '2. Options > List All Devices',
                '3. Select your printer',
                '4. Install WinUSB driver (for libusb access)',
                '   WARNING: This replaces Windows printer driver',
                '',
                '=== STEP 6: Windows Spooler Service ===',
                '1. Press Win+R, type: services.msc',
                '2. Find "Print Spooler" service',
                '3. Ensure it is "Running" and set to "Automatic"',
                '4. If issues, right-click > Restart',
                '',
                '=== PowerShell Commands ===',
                'Get-Printer                           # List all printers',
                'Get-PrinterPort                       # List printer ports',
                'Add-Printer -Name "MyPrinter" -DriverName "Generic / Text Only" -PortName "USB001"',
                '',
                '=== Troubleshooting ===',
                '- Clear print queue: net stop spooler && del /Q %systemroot%\\System32\\spool\\PRINTERS\\* && net start spooler',
                '- Run as Administrator if permission issues occur',
                '- Check Windows Event Viewer for printer errors',
                '',
                '=== Network printers work without additional setup ==='
            );
        }

        return { platform, instructions };
    }
}

export const getPrintAgent = (config?: Partial<PrintAgentConfig>) =>
    PrintAgentService.getInstance(config);

export const printAgentAPI = {
    start: () => getPrintAgent().start(),
    stop: () => getPrintAgent().stop(),
    getStatus: () => getPrintAgent().getStatus(),
    discoverPrinters: () => getPrintAgent().discoverPrinters(),
    getDiscoveredPrinters: () => getPrintAgent().getDiscoveredPrinters(),
    registerPrinter: (printer: DiscoveredPrinter, options?: any) =>
        getPrintAgent().registerPrinter(printer, options),
    queueJob: (job: PrintJob) => getPrintAgent().queueJob(job),
    getQueueStatus: () => getPrintAgent().getQueueStatus(),
    retryAllJobs: () => getPrintAgent().retryAllJobs(),
    clearQueue: () => getPrintAgent().clearQueue(),
    testPrinter: (printerId: string, tenantId: string, branchId?: string) =>
        getPrintAgent().testPrinter(printerId, tenantId, branchId),
    scanNetwork: (baseIP: string, startHost?: number, endHost?: number, port?: number) =>
        getPrintAgent().scanNetwork(baseIP, startHost, endHost, port),
    getSerialPorts: () => getPrintAgent().getSerialPorts(),
    checkPermissions: () => getPrintAgent().checkPermissions(),
    getSetupInstructions: () => getPrintAgent().getSetupInstructions()
};
