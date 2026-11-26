import * as net from 'net';
import { AppPlatform, PrintErrorCode, PrintResult, PrinterConnectionType, PrinterDescriptor } from '../types';
import { BasePrintStrategy } from './base-print-strategy';

export class NetworkPrintStrategy extends BasePrintStrategy {
    private defaultPort = 9100;
    private timeout = 10000;

    constructor() {
        super(
            'NetworkPrintStrategy',
            [AppPlatform.WEB, AppPlatform.DESKTOP, AppPlatform.MOBILE_ANDROID, AppPlatform.MOBILE_IOS, AppPlatform.MOBILE_REACT_NATIVE],
            [PrinterConnectionType.NETWORK, PrinterConnectionType.WIFI]
        );
    }

    async print(printer: PrinterDescriptor, content: string, options?: Record<string, unknown>): Promise<PrintResult> {
        const address = printer.connectionAddress;
        const port = printer.port || this.defaultPort;

        if (!address) {
            return this.createFailureResult(
                'No connection address specified for network printer',
                PrintErrorCode.CONNECTION_FAILED
            );
        }

        const timeout = (options?.timeout as number) || this.timeout;

        return new Promise((resolve) => {
            const socket = new net.Socket();
            let resolved = false;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                }
            };

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                // Preserve raw ESC/POS bytes and non-ASCII characters for thermal printers.
                const payload = Buffer.from(content, 'latin1');
                socket.write(payload, (err) => {
                    if (err) {
                        cleanup();
                        resolve(this.createFailureResult(
                            `Failed to send data: ${err.message}`,
                            PrintErrorCode.CONNECTION_FAILED
                        ));
                        return;
                    }

                    // Wait a bit for data to be processed
                    setTimeout(() => {
                        cleanup();
                        resolve(this.createSuccessResult(AppPlatform.DESKTOP));
                    }, 500);
                });
            });

            socket.on('timeout', () => {
                cleanup();
                resolve(this.createFailureResult(
                    'Connection to printer timed out',
                    PrintErrorCode.CONNECTION_TIMEOUT
                ));
            });

            socket.on('error', (error) => {
                cleanup();
                resolve(this.createFailureResult(
                    `Connection error: ${error.message}`,
                    PrintErrorCode.CONNECTION_FAILED
                ));
            });

            socket.on('close', () => {
                if (!resolved) {
                    cleanup();
                }
            });

            try {
                socket.connect(port, address);
            } catch (error) {
                cleanup();
                resolve(this.createFailureResult(
                    `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    PrintErrorCode.CONNECTION_FAILED
                ));
            }
        });
    }

    async testConnection(printer: PrinterDescriptor): Promise<{ online: boolean; responseTime?: number; error?: string }> {
        const address = printer.connectionAddress;
        const port = printer.port || this.defaultPort;

        if (!address) {
            return {
                online: false,
                error: 'No connection address specified'
            };
        }

        const startTime = Date.now();

        return new Promise((resolve) => {
            const socket = new net.Socket();
            let resolved = false;

            socket.setTimeout(5000);

            socket.on('connect', () => {
                resolved = true;
                socket.destroy();
                resolve({
                    online: true,
                    responseTime: Date.now() - startTime
                });
            });

            socket.on('timeout', () => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                    resolve({
                        online: false,
                        responseTime: Date.now() - startTime,
                        error: 'Connection timed out'
                    });
                }
            });

            socket.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                    resolve({
                        online: false,
                        responseTime: Date.now() - startTime,
                        error: error.message
                    });
                }
            });

            try {
                socket.connect(port, address);
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    resolve({
                        online: false,
                        error: error instanceof Error ? error.message : 'Connection failed'
                    });
                }
            }
        });
    }
}

export default NetworkPrintStrategy;
