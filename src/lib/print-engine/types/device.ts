export enum PrinterType {
    THERMAL = 'THERMAL',
    INKJET = 'INKJET',
    LASER = 'LASER',
    DOT_MATRIX = 'DOT_MATRIX',
    LABEL = 'LABEL',
}

export enum PrinterConnectionType {
    USB = 'USB',
    NETWORK = 'NETWORK',
    BLUETOOTH = 'BLUETOOTH',
    SERIAL = 'SERIAL',
    WIFI = 'WIFI',
}

/**
 * Minimal device descriptor — everything the print engine needs to know
 * about a printer to talk to it. No tenantId/branchId/DB fields: callers
 * map their own persisted printer record down to this shape.
 */
export interface PrinterDescriptor {
    printerName: string;
    printerModel?: string | null;
    printerType: PrinterType;
    connectionType: PrinterConnectionType;
    connectionAddress?: string | null; // IP address, MAC address, or device path
    port?: number | null;
    baudRate?: number | null;
    vendorId?: string | null;
    productId?: string | null;
}

export interface PrinterConfiguration {
    paperWidth?: number;
    paperHeight?: number;
    dpi?: number;
    fontSize?: number;
    encoding?: string;
    cutPaper?: boolean;
    openCashDrawer?: boolean;
    printLogo?: boolean;
    logoUrl?: string;
    headerLines?: string[];
    footerLines?: string[];
    printSpeed?: number;
    darkness?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    beepAfterPrint?: boolean;
    copies?: number;
    lineSpacing?: number;
    printMode?: 'normal' | 'draft' | 'high';
    autoPrintOnSale?: boolean;
}

export interface DiscoveredPrinter {
    name: string;
    address?: string;
    port?: number;
    type?: PrinterType;
    connectionType: PrinterConnectionType;
    vendorId?: string;
    productId?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    isOnline: boolean;
}
