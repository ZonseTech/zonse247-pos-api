import { EventEmitter } from 'events';
import { PrinterModel, PrintJobModel } from '../../models/printer.model';
import {
    PrintJob,
    PrintJobStatus,
    Printer
} from '../../types/printer';
import * as net from 'net';
import { SerialPort } from 'serialport';
import * as fs from 'fs';
import * as path from 'path';

// Print queue events
export interface PrintQueueEvents {
    'job:queued': (job: PrintJob) => void;
    'job:started': (job: PrintJob) => void;
    'job:completed': (job: PrintJob) => void;
    'job:failed': (job: PrintJob, error: string) => void;
    'job:retry': (job: PrintJob, attempt: number) => void;
    'printer:online': (printerId: string) => void;
    'printer:offline': (printerId: string) => void;
    'queue:empty': () => void;
    'error': (error: Error) => void;
}

export interface QueuedJob {
    printJob: PrintJob;
    attempts: number;
    maxAttempts: number;
    nextRetryAt: Date | null;
    lastError: string | null;
    addedAt: Date;
}

export interface PrintQueueConfig {
    maxRetries: number;
    retryDelayMs: number;
    retryBackoffMultiplier: number;
    maxRetryDelayMs: number;
    processingIntervalMs: number;
    printerCheckIntervalMs: number;
    persistQueue: boolean;
    queueFilePath: string;
}

const DEFAULT_CONFIG: PrintQueueConfig = {
    maxRetries: 5,
    retryDelayMs: 5000,           // 5 seconds initial retry delay
    retryBackoffMultiplier: 2,    // Exponential backoff
    maxRetryDelayMs: 300000,      // Max 5 minutes between retries
    processingIntervalMs: 1000,   // Check queue every second
    printerCheckIntervalMs: 30000, // Check printer status every 30 seconds
    persistQueue: true,
    queueFilePath: './data/print-queue.json'
};

/**
 * PrintQueueService - Manages print job queue with retry logic
 * Designed for Electron app integration with offline support
 */
export class PrintQueueService extends EventEmitter {
    private static instance: PrintQueueService | null = null;
    private queue: Map<string, QueuedJob> = new Map();
    private printerStatus: Map<string, boolean> = new Map();
    private config: PrintQueueConfig;
    private processingInterval: NodeJS.Timeout | null = null;
    private printerCheckInterval: NodeJS.Timeout | null = null;
    private isProcessing = false;
    private isRunning = false;

    private constructor(config: Partial<PrintQueueConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<PrintQueueConfig>): PrintQueueService {
        if (!PrintQueueService.instance) {
            PrintQueueService.instance = new PrintQueueService(config);
        }
        return PrintQueueService.instance;
    }

    /**
     * Start the print queue service
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[PrintQueue] Already running');
            return;
        }

        console.log('[PrintQueue] Starting print queue service...');
        this.isRunning = true;

        // Load persisted queue
        if (this.config.persistQueue) {
            await this.loadQueue();
        }

        // Start processing interval
        this.processingInterval = setInterval(
            () => this.processQueue(),
            this.config.processingIntervalMs
        );

        // Start printer status check interval
        this.printerCheckInterval = setInterval(
            () => this.checkAllPrinterStatus(),
            this.config.printerCheckIntervalMs
        );

        // Initial printer status check
        await this.checkAllPrinterStatus();

        console.log('[PrintQueue] Print queue service started');
    }

    /**
     * Stop the print queue service
     */
    async stop(): Promise<void> {
        console.log('[PrintQueue] Stopping print queue service...');
        this.isRunning = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        if (this.printerCheckInterval) {
            clearInterval(this.printerCheckInterval);
            this.printerCheckInterval = null;
        }

        // Persist queue before stopping
        if (this.config.persistQueue) {
            await this.saveQueue();
        }

        console.log('[PrintQueue] Print queue service stopped');
    }

    /**
     * Add a job to the queue
     */
    addJob(printJob: PrintJob, maxAttempts?: number): void {
        const queuedJob: QueuedJob = {
            printJob,
            attempts: 0,
            maxAttempts: maxAttempts || this.config.maxRetries,
            nextRetryAt: null,
            lastError: null,
            addedAt: new Date()
        };

        this.queue.set(printJob.printJobId, queuedJob);
        this.emit('job:queued', printJob);
        console.log(`[PrintQueue] Job ${printJob.printJobId} added to queue`);

        // Persist queue
        if (this.config.persistQueue) {
            this.saveQueue().catch(err => console.error('[PrintQueue] Error saving queue:', err));
        }
    }

    /**
     * Remove a job from the queue
     */
    removeJob(printJobId: string): boolean {
        const removed = this.queue.delete(printJobId);
        if (removed && this.config.persistQueue) {
            this.saveQueue().catch(err => console.error('[PrintQueue] Error saving queue:', err));
        }
        return removed;
    }

    /**
     * Get queue status
     */
    getQueueStatus(): {
        total: number;
        pending: number;
        retrying: number;
        jobs: QueuedJob[];
    } {
        const jobs = Array.from(this.queue.values());
        const now = new Date();

        return {
            total: jobs.length,
            pending: jobs.filter(j => !j.nextRetryAt || j.nextRetryAt <= now).length,
            retrying: jobs.filter(j => j.nextRetryAt && j.nextRetryAt > now).length,
            jobs
        };
    }

    /**
     * Get printer status
     */
    getPrinterStatus(printerId: string): boolean {
        return this.printerStatus.get(printerId) || false;
    }

    /**
     * Get all printer statuses
     */
    getAllPrinterStatus(): Map<string, boolean> {
        return new Map(this.printerStatus);
    }

    /**
     * Process the queue
     */
    private async processQueue(): Promise<void> {
        if (!this.isRunning || this.isProcessing) return;

        this.isProcessing = true;

        try {
            const now = new Date();
            const jobs = Array.from(this.queue.values());

            // Find jobs ready to process
            const readyJobs = jobs.filter(job =>
                !job.nextRetryAt || job.nextRetryAt <= now
            );

            for (const queuedJob of readyJobs) {
                await this.processJob(queuedJob);
            }

            // Check if queue is empty
            if (this.queue.size === 0) {
                this.emit('queue:empty');
            }
        } catch (error) {
            console.error('[PrintQueue] Error processing queue:', error);
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single job
     */
    private async processJob(queuedJob: QueuedJob): Promise<void> {
        const { printJob } = queuedJob;

        // Check if printer is online
        const printerOnline = this.printerStatus.get(printJob.printerId);
        if (!printerOnline) {
            // Printer offline, schedule retry
            this.scheduleRetry(queuedJob, 'Printer is offline');
            return;
        }

        try {
            queuedJob.attempts++;
            this.emit('job:started', printJob);
            console.log(`[PrintQueue] Processing job ${printJob.printJobId} (attempt ${queuedJob.attempts})`);

            // Get printer details
            const printer = await PrinterModel.findById(printJob.printerId);
            if (!printer) {
                throw new Error('Printer not found');
            }

            // Send to printer
            const success = await this.sendToPrinter(printer, printJob);

            if (success) {
                // Update job status in database
                await PrintJobModel.updateStatus(printJob.printJobId, PrintJobStatus.COMPLETED);
                await PrinterModel.incrementPrintJobCount(printer.printerId);

                // Remove from queue
                this.queue.delete(printJob.printJobId);
                this.emit('job:completed', printJob);
                console.log(`[PrintQueue] Job ${printJob.printJobId} completed successfully`);

                // Persist queue
                if (this.config.persistQueue) {
                    await this.saveQueue();
                }
            } else {
                throw new Error('Print execution failed');
            }
        } catch (error) {
            const errorMessage = this.formatErrorMessage(error);
            queuedJob.lastError = errorMessage;

            console.error(`[PrintQueue] Job ${printJob.printJobId} failed:`, errorMessage);

            if (queuedJob.attempts >= queuedJob.maxAttempts) {
                // Max retries reached, mark as failed
                await PrintJobModel.updateStatus(printJob.printJobId, PrintJobStatus.FAILED, errorMessage);
                this.queue.delete(printJob.printJobId);
                this.emit('job:failed', printJob, errorMessage);
                console.log(`[PrintQueue] Job ${printJob.printJobId} permanently failed after ${queuedJob.attempts} attempts`);
            } else {
                // Schedule retry
                this.scheduleRetry(queuedJob, errorMessage);
            }

            // Persist queue
            if (this.config.persistQueue) {
                await this.saveQueue();
            }
        }
    }

    /**
     * Schedule a retry for a job
     */
    private scheduleRetry(queuedJob: QueuedJob, reason: string): void {
        const delay = Math.min(
            this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, queuedJob.attempts),
            this.config.maxRetryDelayMs
        );

        queuedJob.nextRetryAt = new Date(Date.now() + delay);
        queuedJob.lastError = reason;

        this.emit('job:retry', queuedJob.printJob, queuedJob.attempts + 1);
        console.log(`[PrintQueue] Job ${queuedJob.printJob.printJobId} scheduled for retry in ${delay}ms`);
    }

    /**
     * Format error message with helpful hints
     */
    private formatErrorMessage(error: unknown): string {
        const baseMessage = error instanceof Error ? error.message : String(error);

        // Add helpful hints based on error type
        if (baseMessage.includes('Permission denied')) {
            return `${baseMessage}. HINT: On Linux, add your user to the 'dialout' group: sudo usermod -a -G dialout $USER (then restart)`;
        }

        if (baseMessage.includes('ECONNREFUSED')) {
            return `${baseMessage}. HINT: Check if the printer is powered on and connected to the network. Verify IP address and port.`;
        }

        if (baseMessage.includes('ETIMEDOUT') || baseMessage.includes('timeout')) {
            return `${baseMessage}. HINT: Printer may be busy or network is slow. Will retry automatically.`;
        }

        if (baseMessage.includes('ENOENT') || baseMessage.includes('not found')) {
            return `${baseMessage}. HINT: Serial port or device not found. Check cable connections and port path.`;
        }

        if (baseMessage.includes('EBUSY')) {
            return `${baseMessage}. HINT: Device is busy (another application may be using it). Close other applications and retry.`;
        }

        return baseMessage;
    }

    /**
     * Check status of all printers
     */
    private async checkAllPrinterStatus(): Promise<void> {
        try {
            // Get unique printer IDs from queue
            const printerIds = new Set<string>();
            for (const job of this.queue.values()) {
                printerIds.add(job.printJob.printerId);
            }

            // Also check all active printers
            const activePrinters = await PrinterModel.findAll({ isActive: true });
            for (const printer of activePrinters) {
                printerIds.add(printer.printerId);
            }

            // Check each printer
            for (const printerId of printerIds) {
                const printer = await PrinterModel.findById(printerId);
                if (printer) {
                    const wasOnline = this.printerStatus.get(printerId);
                    const isOnline = await this.checkPrinterConnection(printer);
                    this.printerStatus.set(printerId, isOnline);

                    // Emit events on status change
                    if (wasOnline !== isOnline) {
                        if (isOnline) {
                            this.emit('printer:online', printerId);
                            console.log(`[PrintQueue] Printer ${printer.printerName} is now online`);
                        } else {
                            this.emit('printer:offline', printerId);
                            console.log(`[PrintQueue] Printer ${printer.printerName} is now offline`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[PrintQueue] Error checking printer status:', error);
        }
    }

    /**
     * Check if a printer is connected
     */
    private async checkPrinterConnection(printer: Printer): Promise<boolean> {
        switch (printer.connectionType) {
            case 'NETWORK':
            case 'WIFI':
                return this.checkNetworkPrinter(printer);
            case 'USB':
            case 'SERIAL':
                return this.checkSerialPrinter(printer);
            case 'BLUETOOTH':
                return this.checkBluetoothPrinter(printer);
            default:
                return false;
        }
    }

    /**
     * Check network printer connection
     */
    private async checkNetworkPrinter(printer: Printer): Promise<boolean> {
        const address = printer.connectionAddress;
        const port = printer.port || 9100;

        if (!address) return false;

        return new Promise<boolean>((resolve) => {
            const socket = new net.Socket();
            const timeout = 3000;

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
     * Check serial printer connection
     */
    private async checkSerialPrinter(printer: Printer): Promise<boolean> {
        const portPath = printer.connectionAddress;
        if (!portPath) return false;

        try {
            const ports = await SerialPort.list();
            return ports.some(p => p.path === portPath);
        } catch {
            return false;
        }
    }

    /**
     * Check Bluetooth printer connection
     */
    private async checkBluetoothPrinter(printer: Printer): Promise<boolean> {
        try {
            const { BluetoothPrintStrategy } = await import('./strategies/bluetooth.strategy');
            const strategy = new BluetoothPrintStrategy();
            const result = await strategy.testConnection(printer);
            return result.online;
        } catch {
            return false;
        }
    }

    /**
     * Send data to printer
     */
    private async sendToPrinter(printer: Printer, printJob: PrintJob): Promise<boolean> {
        const content = printJob.content;
        if (!content) {
            throw new Error('Print job has no content');
        }

        const data = Buffer.from(content, 'binary');

        for (let copy = 0; copy < (printJob.copies || 1); copy++) {
            let success = false;

            switch (printer.connectionType) {
                case 'NETWORK':
                case 'WIFI':
                    success = await this.sendToNetworkPrinter(printer, data);
                    break;
                case 'USB':
                case 'SERIAL':
                    success = await this.sendToSerialPrinter(printer, data);
                    break;
                case 'BLUETOOTH':
                    success = await this.sendToBluetoothPrinter(printer, data);
                    break;
                default:
                    throw new Error(`Unsupported connection type: ${printer.connectionType}`);
            }

            if (!success) return false;

            // Small delay between copies
            if (copy < (printJob.copies || 1) - 1) {
                await this.delay(500);
            }
        }

        return true;
    }

    /**
     * Send to network printer
     */
    private async sendToNetworkPrinter(printer: Printer, data: Buffer): Promise<boolean> {
        const address = printer.connectionAddress;
        const port = printer.port || 9100;

        if (!address) {
            throw new Error('Network printer has no IP address configured');
        }

        return new Promise<boolean>((resolve, reject) => {
            const socket = new net.Socket();
            const timeout = 30000;

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.write(data, (err) => {
                    if (err) {
                        socket.destroy();
                        reject(err);
                    } else {
                        setTimeout(() => {
                            socket.end(() => resolve(true));
                        }, 100);
                    }
                });
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Connection timeout'));
            });

            socket.on('error', (err) => {
                socket.destroy();
                reject(err);
            });

            try {
                socket.connect(port, address);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Send to serial printer
     */
    private async sendToSerialPrinter(printer: Printer, data: Buffer): Promise<boolean> {
        const portPath = printer.connectionAddress;
        if (!portPath) {
            throw new Error('Serial printer has no port path configured');
        }

        return new Promise<boolean>((resolve, reject) => {
            const port = new SerialPort({
                path: portPath,
                baudRate: printer.baudRate || 9600,
                autoOpen: false
            });

            port.open((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                port.write(data, (writeErr) => {
                    if (writeErr) {
                        port.close();
                        reject(writeErr);
                        return;
                    }

                    port.drain((drainErr) => {
                        if (drainErr) {
                            port.close();
                            reject(drainErr);
                            return;
                        }

                        setTimeout(() => {
                            port.close(() => resolve(true));
                        }, 100);
                    });
                });
            });

            port.on('error', reject);
        });
    }

    /**
     * Send to Bluetooth printer via COM port (Windows) or native module fallback
     */
    private async sendToBluetoothPrinter(printer: Printer, data: Buffer): Promise<boolean> {
        const address = printer.connectionAddress;
        if (!address) {
            throw new Error('Bluetooth printer has no address configured');
        }

        const { BluetoothPrintStrategy } = await import('./strategies/bluetooth.strategy');
        const strategy = new BluetoothPrintStrategy();
        const content = data.toString('binary');
        const result = await strategy.print(printer, content);

        if (!result.success) {
            throw new Error(result.errorDetails || 'Bluetooth print failed');
        }

        return true;
    }

    /**
     * Save queue to file
     */
    private async saveQueue(): Promise<void> {
        try {
            const dir = path.dirname(this.config.queueFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const data = JSON.stringify(
                Array.from(this.queue.entries()),
                null,
                2
            );

            fs.writeFileSync(this.config.queueFilePath, data, 'utf8');
        } catch (error) {
            console.error('[PrintQueue] Error saving queue:', error);
        }
    }

    /**
     * Load queue from file
     */
    private async loadQueue(): Promise<void> {
        try {
            if (!fs.existsSync(this.config.queueFilePath)) {
                return;
            }

            const data = fs.readFileSync(this.config.queueFilePath, 'utf8');
            const entries = JSON.parse(data);

            this.queue = new Map(entries.map(([key, value]: [string, QueuedJob]) => {
                // Restore Date objects
                value.addedAt = new Date(value.addedAt);
                if (value.nextRetryAt) {
                    value.nextRetryAt = new Date(value.nextRetryAt);
                }
                return [key, value];
            }));

            console.log(`[PrintQueue] Loaded ${this.queue.size} jobs from queue file`);
        } catch (error) {
            console.error('[PrintQueue] Error loading queue:', error);
        }
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Force retry all failed jobs
     */
    forceRetryAll(): void {
        for (const job of this.queue.values()) {
            job.nextRetryAt = null;
            job.attempts = Math.max(0, job.attempts - 1);
        }
        console.log('[PrintQueue] All jobs scheduled for immediate retry');
    }

    /**
     * Clear the queue
     */
    clearQueue(): void {
        this.queue.clear();
        if (this.config.persistQueue) {
            this.saveQueue().catch(err => console.error('[PrintQueue] Error saving queue:', err));
        }
        console.log('[PrintQueue] Queue cleared');
    }
}

// Export singleton getter
export const getPrintQueue = (config?: Partial<PrintQueueConfig>) =>
    PrintQueueService.getInstance(config);
