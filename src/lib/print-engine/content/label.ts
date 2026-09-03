import { formatCurrency } from './receipt';

export interface LabelContentOptions {
    productId: string;
    includeBarcode?: boolean;
    includePrice?: boolean;
    includeQRCode?: boolean;
    customText?: string;
    labelWidth?: number;
    labelHeight?: number;
}

/** Minimal product shape needed to render a label — caller fetches this from its own database. */
export interface ProductLabelData {
    name: string;
    sku: string | null;
    unit?: string | null;
    sellingPrice?: number | null;
    primaryBarcode?: string | null;
}

/**
 * Generate a basic label when product data isn't available.
 */
export function generateBasicLabel(request: LabelContentOptions): string {
    let content = '';

    content += '^XA\n'; // Start ZPL
    content += '^CF0,40\n'; // Default font
    content += `^FO50,50^FDProduct: ${request.productId}^FS\n`;

    if (request.includeBarcode) {
        content += '^FO50,100^BY2\n';
        content += `^BCN,100,Y,N,N^FD${request.productId}^FS\n`;
    }

    if (request.customText) {
        content += `^FO50,220^CF0,30^FD${request.customText}^FS\n`;
    }

    content += '^XZ\n'; // End ZPL

    return content;
}

/**
 * Format label content with product data (ZPL format).
 */
export function formatLabelContent(product: ProductLabelData, request: LabelContentOptions): string {
    const labelWidth = request.labelWidth || 400;
    const labelHeight = request.labelHeight || 300;

    let content = '';

    content += '^XA\n'; // Start format
    content += `^LL${labelHeight}\n`; // Label length
    content += `^PW${labelWidth}\n`; // Print width
    content += '^CF0,35\n'; // Default font size

    const productName = product.name.length > 30
        ? product.name.substring(0, 30) + '...'
        : product.name;
    content += `^FO20,20^A0N,45,45^FD${productName}^FS\n`;

    content += `^FO20,70^A0N,25,25^FDSKU: ${product.sku}^FS\n`;

    let yPos = 100;
    if (request.includePrice !== false && product.sellingPrice) {
        content += `^FO20,${yPos}^A0N,50,50^FD${formatCurrency(product.sellingPrice, 'MWK')}^FS\n`;
        yPos += 60;
    }

    if (request.includeBarcode) {
        const barcodeData = product.primaryBarcode || product.sku || request.productId;
        content += `^FO20,${yPos}^BY2\n`;
        content += `^BCN,60,Y,N,N^FD${barcodeData}^FS\n`;
        yPos += 90;
    }

    if (request.includeQRCode) {
        const qrData = product.primaryBarcode || product.sku || request.productId;
        content += `^FO${labelWidth - 100},20\n`;
        content += '^BQN,2,4\n';
        content += `^FDQA,${qrData}^FS\n`;
    }

    if (request.customText) {
        content += `^FO20,${yPos}^A0N,25,25^FD${request.customText}^FS\n`;
    }

    if (product.unit) {
        content += `^FO20,${labelHeight - 30}^A0N,20,20^FDUnit: ${product.unit}^FS\n`;
    }

    content += '^XZ\n'; // End format

    return content;
}
