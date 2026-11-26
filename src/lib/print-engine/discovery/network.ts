import * as net from 'net';
import Bonjour, { Service } from 'bonjour-service';
import { DiscoveredPrinter, PrinterConnectionType } from '../types';
import { inferPrinterType } from './classify';

let bonjourInstance: Bonjour | null = null;

function getBonjour(): Bonjour {
    if (!bonjourInstance) {
        bonjourInstance = new Bonjour();
    }
    return bonjourInstance;
}

export function cleanupBonjour(): void {
    if (bonjourInstance) {
        bonjourInstance.destroy();
        bonjourInstance = null;
    }
}

function discoverBonjourService(
    serviceType: string,
    timeout: number
): Promise<DiscoveredPrinter[]> {
    return new Promise((resolve) => {
        const printers: DiscoveredPrinter[] = [];
        const bonjour = getBonjour();

        try {
            const browser = bonjour.find({ type: serviceType });

            browser.on('up', (service: Service) => {
                if (service.addresses && service.addresses.length > 0) {
                    // Prefer IPv4 addresses
                    const ipv4 = service.addresses.find((addr) => !addr.includes(':'));
                    const address = ipv4 || service.addresses[0];

                    printers.push({
                        name: service.name || `Network Printer (${address})`,
                        address,
                        port: service.port || 9100,
                        connectionType: PrinterConnectionType.NETWORK,
                        model: service.txt?.ty || service.txt?.product,
                        manufacturer: service.txt?.mfg || service.txt?.manufacturer,
                        type: inferPrinterType(service.name || ''),
                        isOnline: true,
                    });
                }
            });

            setTimeout(() => {
                browser.stop();
                resolve(printers);
            }, timeout);
        } catch (error) {
            console.error(`Bonjour discovery error for ${serviceType}:`, error);
            resolve([]);
        }
    });
}

/**
 * Discover network printers via mDNS/Bonjour
 */
export async function discoverNetworkPrinters(): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];
    const discoveryTimeout = 10000;

    const serviceTypes = [
        'ipp', // Internet Printing Protocol
        'ipps', // IPP over HTTPS
        'pdl-datastream', // PDL data stream (raw printing)
        'printer', // Generic printer service
        'http', // Some printers advertise HTTP admin
    ];

    const discoveryPromises = serviceTypes.map((type) =>
        discoverBonjourService(type, discoveryTimeout)
    );

    try {
        const results = await Promise.allSettled(discoveryPromises);

        const seenAddresses = new Set<string>();

        for (const result of results) {
            if (result.status === 'fulfilled') {
                for (const printer of result.value) {
                    const key = `${printer.address}:${printer.port}`;
                    if (!seenAddresses.has(key)) {
                        seenAddresses.add(key);
                        printers.push(printer);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Network discovery error:', error);
    }

    return printers;
}

function probeNetworkPrinter(
    ip: string,
    port: number
): Promise<DiscoveredPrinter | null> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 1000;

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            resolve({
                name: `Network Printer (${ip})`,
                address: ip,
                port,
                connectionType: PrinterConnectionType.NETWORK,
                isOnline: true,
            });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(null);
        });

        try {
            socket.connect(port, ip);
        } catch {
            resolve(null);
        }
    });
}

export async function scanNetworkRange(
    baseIP: string,
    startHost = 1,
    endHost = 254,
    port = 9100
): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];
    const ipParts = baseIP.split('.');

    if (ipParts.length !== 4) {
        throw new Error('Invalid base IP address format');
    }

    const networkBase = ipParts.slice(0, 3).join('.');
    const scanPromises: Promise<DiscoveredPrinter | null>[] = [];

    for (let i = startHost; i <= endHost; i++) {
        const ip = `${networkBase}.${i}`;
        scanPromises.push(probeNetworkPrinter(ip, port));
    }

    // Scan in batches to avoid overwhelming the network
    const batchSize = 50;
    for (let i = 0; i < scanPromises.length; i += batchSize) {
        const batch = scanPromises.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch);

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                printers.push(result.value);
            }
        }
    }

    return printers;
}
