import { exec } from 'child_process';
import { promisify } from 'util';
import { DiscoveredPrinter, PrinterConnectionType } from '../types';
import { inferConnectionTypeFromPort, inferPrinterType } from './classify';

const execAsync = promisify(exec);

/**
 * Discover Windows system printers via PowerShell/WMIC
 */
export async function discoverWindowsPrinters(): Promise<DiscoveredPrinter[]> {
    const printers: DiscoveredPrinter[] = [];

    try {
        // Try PowerShell first (more reliable on modern Windows)
        try {
            const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"');
            const printerList = JSON.parse(stdout);
            const printerArray = Array.isArray(printerList) ? printerList : [printerList];

            for (const p of printerArray) {
                if (p && p.Name) {
                    printers.push({
                        name: p.Name,
                        connectionType: inferConnectionTypeFromPort(p.PortName),
                        address: p.PortName,
                        model: p.DriverName,
                        type: inferPrinterType(p.Name + ' ' + (p.DriverName || '')),
                        isOnline: p.PrinterStatus === 'Normal' || p.PrinterStatus === 0,
                    });
                }
            }

            if (printers.length > 0) {
                console.log(`[Windows] Discovered ${printers.length} printers via PowerShell`);
                return printers;
            }
        } catch (psErr) {
            console.log(`[Windows] PowerShell printer discovery failed: ${psErr}`);
        }

        // Fallback to WMIC
        try {
            const { stdout } = await execAsync('wmic printer get name,drivername,portname,status');
            const lines = stdout.split('\n').filter((l) => l.trim() && !l.includes('DriverName'));

            for (const line of lines) {
                const parts = line.trim().split(/\s{2,}/);
                if (parts.length >= 1 && parts[0]) {
                    printers.push({
                        name: parts[0],
                        connectionType: PrinterConnectionType.USB,
                        model: parts[1] || undefined,
                        address: parts[2] || undefined,
                        isOnline: true,
                    });
                }
            }

            console.log(`[Windows] Discovered ${printers.length} printers via WMIC`);
        } catch (wmicErr) {
            console.log(`[Windows] WMIC printer discovery failed: ${wmicErr}`);
        }
    } catch (error) {
        console.error('[Windows] Printer discovery error:', error);
    }

    return printers;
}
