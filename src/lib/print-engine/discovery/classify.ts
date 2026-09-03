/**
 * Pure classification helpers for discovered printers: no I/O, no platform
 * calls — just heuristics over names/vendor IDs/port strings.
 */
import { PrinterConnectionType, PrinterType } from '../types';

export function inferPrinterType(name: string): PrinterType | undefined {
    const lowerName = name.toLowerCase();

    // Thermal / receipt printers (ESC/POS)
    if (lowerName.includes('thermal') || lowerName.includes('receipt') ||
        lowerName.includes('pos') || lowerName.includes('tm-') ||
        // Common Bluetooth thermal printer model prefixes
        /\b(mp|mpt|mtp|spp|rpp|hm|ht|ts)[-\s]?\d/i.test(name) ||
        lowerName.includes('xprinter') || lowerName.includes('munbyn') ||
        lowerName.includes('goojprt') || lowerName.includes('rongta') ||
        lowerName.includes('hop-e802') || lowerName.includes('hop e802')) {
        return PrinterType.THERMAL;
    }

    // Label printers (ZPL, CPCL, Brother raster, etc.)
    if (lowerName.includes('label') || lowerName.includes('zebra') ||
        lowerName.includes('dymo') || lowerName.includes('brother ql') ||
        // Brother P-Touch series (PT-280, PT-E550W, PT-P900, etc.)
        /\bpt[-\s]?\d/i.test(name) ||
        lowerName.includes('p-touch') || lowerName.includes('ptouch') ||
        // TSC / Godex / SATO label printers
        lowerName.includes('tsc') || lowerName.includes('godex') ||
        lowerName.includes('sato') || lowerName.includes('niimbot')) {
        return PrinterType.LABEL;
    }

    if (lowerName.includes('laser') || lowerName.includes('laserjet')) {
        return PrinterType.LASER;
    }

    if (lowerName.includes('inkjet') || lowerName.includes('deskjet') ||
        lowerName.includes('officejet')) {
        return PrinterType.INKJET;
    }

    if (lowerName.includes('dot matrix') || lowerName.includes('epson lx') ||
        lowerName.includes('epson fx')) {
        return PrinterType.DOT_MATRIX;
    }

    return undefined;
}

export function inferConnectionTypeFromPort(portName: string): PrinterConnectionType {
    if (!portName) return PrinterConnectionType.USB;

    const port = portName.toLowerCase();
    if (port.includes('usb')) return PrinterConnectionType.USB;
    if (port.includes('com')) return PrinterConnectionType.SERIAL;
    if (port.includes('lpt')) return PrinterConnectionType.USB;
    if (port.match(/\d+\.\d+\.\d+\.\d+/)) return PrinterConnectionType.NETWORK;
    if (port.includes('wsd')) return PrinterConnectionType.NETWORK;
    if (port.includes('tcp')) return PrinterConnectionType.NETWORK;

    return PrinterConnectionType.USB;
}
