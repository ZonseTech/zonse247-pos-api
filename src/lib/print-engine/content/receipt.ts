import { ReceiptDisplaySettings } from '../types';
import { ESC_POS, ZONSE247_LOGO } from '../constants';
import { divider, feedAndCut, formatLeftRight } from '../utils/text-layout';

export interface ReceiptData {
    businessName: string;
    branchName: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxId?: string;
    receiptNumber: string;
    date: Date;
    cashier?: string;
    terminal?: string;
    customer?: {
        name: string;
        phone?: string;
        address?: string;
        loyaltyPoints?: number;
    };
    items: Array<{
        id: string;
        saleId: string;
        variantId: string;
        productId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        listPrice?: number;
        unitCost: number;
        subtotal: number;
        total: number;
        discount?: number;
        tax?: number;
        createdAt: Date;
        variant: {
            id: string;
            variantName: string;
            sku: string | null;
            product: {
                id: string;
                name: string;
            };
        };
        product: {
            id: string;
            name: string;
            sku: string | null;
        };
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    otherCharges: number;
    totalAmount: number;
    amountPaid: number;
    changeAmount: number;
    paymentMethod: string;
    payments?: Array<{
        method: string;
        amount: number;
        reference?: string;
    }>;
    totalItemCount?: number;
    savedAmount?: number;
    listPriceTotal?: number;
    currency?: string;
}

export interface ReceiptFormatOptions {
    includeHeader?: boolean;
    includeFooter?: boolean;
    includeLogo?: boolean;
    customMessage?: string;
    openCashDrawer?: boolean;
    beepAfterPrint?: boolean;
    cutPaper?: boolean;
    paperWidth?: number;
}

/**
 * Derive the printable character width from the printer's physical paper
 * width (mm). 58mm thermal paper fits 32 columns of Font A; 80mm (the
 * default used elsewhere, e.g. the ESC/POS test page) fits 48.
 */
export function getLineWidth(paperWidthMm?: number): number {
    return paperWidthMm && paperWidthMm <= 58 ? 32 : 48;
}

/**
 * Decode base64 logo data to raster image format for ESC/POS.
 * Assumes pre-processed monochrome bitmap data: first 4 bytes are
 * width (2 bytes) + height (2 bytes), the rest is pixel data.
 */
export function decodeLogoData(logoData: string): { width: number; height: number; data: Uint8Array } | null {
    try {
        const base64Data = logoData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length < 4) {
            return null;
        }

        const width = buffer.readUInt16LE(0);
        const height = buffer.readUInt16LE(2);
        const pixelData = new Uint8Array(buffer.slice(4));

        const expectedBytes = Math.ceil(width / 8) * height;
        if (pixelData.length < expectedBytes) {
            return null;
        }

        return { width, height, data: pixelData };
    } catch {
        return null;
    }
}

export function formatCurrency(amount: number, currency = 'MWK'): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currency} ${absAmount.toFixed(2)}`;
}

/**
 * Generate a basic receipt when no sale/order data is available
 * (e.g. the reference id didn't resolve to a record).
 */
export function generateBasicReceipt(
    reference: string | undefined,
    options: ReceiptFormatOptions,
    settings: ReceiptDisplaySettings | null
): string {
    let content = '';

    content += ESC_POS.INIT;

    if (options.includeHeader !== false) {
        content += ESC_POS.ALIGN_CENTER;

        if (settings?.storeName) {
            content += ESC_POS.BOLD_ON;
            content += ESC_POS.DOUBLE_SIZE;
            content += `${settings.storeName}\n`;
            content += ESC_POS.NORMAL;
            content += ESC_POS.BOLD_OFF;
        }

        if (settings?.receiptHeader) {
            content += `${settings.receiptHeader}\n`;
        }

        content += ESC_POS.BOLD_ON;
        content += 'RECEIPT\n';
        content += ESC_POS.BOLD_OFF;
        content += '================================\n';
    }

    content += ESC_POS.ALIGN_LEFT;
    content += `Reference: ${reference || 'N/A'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;

    if (options.customMessage) {
        content += `\n${options.customMessage}\n`;
    }

    if (options.includeFooter !== false) {
        content += '================================\n';
        content += ESC_POS.ALIGN_CENTER;
        content += `${settings?.thankYouNote || 'Thank you for your purchase!'}\n`;

        if (settings?.showPoweredBy !== false) {
            content += '\nPowered by Zonse247 POS\n';
        }
    }

    content += feedAndCut(3, options.cutPaper !== false);

    if (options.openCashDrawer) {
        content += ESC_POS.OPEN_DRAWER;
    }

    if (options.beepAfterPrint) {
        content += ESC_POS.BEEP;
    }

    return content;
}

/**
 * Format receipt content with ESC/POS commands. Applies all receipt display
 * settings. `data` must already be fully assembled by the caller — this
 * function does no data fetching.
 */
export function formatReceiptContent(
    data: ReceiptData,
    options: ReceiptFormatOptions,
    settings: ReceiptDisplaySettings | null
): string {
    let content = '';
    const lineWidth = getLineWidth(options.paperWidth);
    const separator = divider('_', lineWidth);
    const lightSeparator = divider('-', lineWidth);

    const formatLR = (left: string, right: string): string =>
        formatLeftRight(left, right, lineWidth, true) + '\n';

    const formatMoney = (amount: number, currency?: string): string => {
        const curr = currency || data.currency || 'MK';
        const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${curr}${formatted}`;
    };

    content += ESC_POS.INIT;
    content += ESC_POS.ALIGN_CENTER;

    if (options.includeLogo !== false) {
        const logoData = settings?.logoData;

        if (logoData) {
            try {
                const logoImage = decodeLogoData(logoData);
                if (logoImage) {
                    content += ESC_POS.RASTER_IMAGE(logoImage.width, logoImage.height, logoImage.data);
                    content += '\n';
                }
            } catch {
                content += ZONSE247_LOGO;
            }
        } else {
            content += ZONSE247_LOGO;
        }
    }

    const storeName = settings?.storeName || data.businessName;
    if (storeName) {
        content += `${storeName}\n`;
    }

    const storeAddress = settings?.storeAddress || data.address;
    if (storeAddress && settings?.showAddressOnReceipt !== false) {
        content += `${storeAddress}\n`;
    }

    const storePhone = settings?.storePhone || data.phone;
    if (storePhone && settings?.showPhoneOnReceipt !== false) {
        content += `Tel: ${storePhone}\n`;
    }

    const storeWebsite = settings?.storeWebsite || data.website;
    if (storeWebsite && settings?.showWebsiteOnReceipt === true) {
        content += `${storeWebsite}\n`;
    }

    const taxId = settings?.businessTaxId || data.taxId;
    if (taxId && settings?.showTaxOnReceipt !== false) {
        const taxTitle = settings?.taxTitle || 'VAT';
        content += `${taxTitle} #: ${taxId}\n`;
    }

    if (settings?.receiptHeader) {
        content += `${settings.receiptHeader}\n`;
    }

    content += separator;
    content += 'RECEIPT\n';
    content += separator;

    content += ESC_POS.ALIGN_LEFT;
    content += formatLR('Receipt #:', data.receiptNumber);

    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    content += formatLR('Date:', data.date.toLocaleDateString('en-US', dateOptions));

    if (data.customer) {
        content += formatLR('Customer:', data.customer.name);

        if (data.customer.phone && settings?.showCustomerPhone === true) {
            content += formatLR('Phone:', data.customer.phone);
        }

        if (data.customer.address && settings?.showCustomerAddress === true) {
            content += formatLR('Address:', data.customer.address);
        }
    } else {
        content += formatLR('Customer:', 'Walk-in Customer');
    }

    if (data.cashier && settings?.showCashierName !== false) {
        content += formatLR('Cashier:', data.cashier);
    }

    if (data.terminal) {
        content += formatLR('Terminal:', data.terminal);
    }

    content += separator;
    content += ESC_POS.ALIGN_CENTER;
    content += 'ITEMS\n';
    content += separator;
    content += ESC_POS.ALIGN_LEFT;

    const sortedItems = [...data.items];
    if (settings?.orderItemsBy === 'name') {
        sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'orderAdded' is the default - no sorting needed

    for (const item of sortedItems) {
        if (settings?.showListPrice === true && item.listPrice && item.listPrice > item.unitPrice) {
            // Thermal printers can't strike through text, so brackets stand in for it.
            content += `${item.name}\n`;
            content += `  [${item.listPrice.toFixed(2)}] -> ${item.unitPrice.toFixed(2)}\n`;
            content += formatLR(`  ${item.quantity} x ${item.unitPrice.toFixed(2)}`, formatMoney(item.total));
        } else {
            content += `${item.name}\n`;

            if (settings?.showRateInReceipt !== false) {
                content += formatLR(`  ${item.quantity} x ${item.unitPrice.toFixed(2)}`, formatMoney(item.total));
            } else {
                content += formatLR(`  Qty: ${item.quantity}`, formatMoney(item.total));
            }
        }
    }

    content += separator;

    if (settings?.showTotalItemCount === true && data.totalItemCount) {
        content += formatLR('Total Items:', data.totalItemCount.toString());
        content += lightSeparator;
    }

    content += formatLR('Subtotal:', formatMoney(data.subtotal));

    if (data.discountAmount > 0) {
        content += formatLR('Discount:', `-${formatMoney(data.discountAmount)}`);
    }

    if (settings?.showTotalMoneySaved === true && data.savedAmount && data.savedAmount > 0) {
        content += formatLR('You Saved:', formatMoney(data.savedAmount));
    }

    if (data.otherCharges > 0) {
        content += formatLR('Other Charges:', formatMoney(data.otherCharges));
    }

    if (data.taxAmount > 0 && settings?.showTaxOnReceipt !== false) {
        const taxTitle = settings?.taxTitle || 'Tax';
        content += formatLR(`${taxTitle}:`, formatMoney(data.taxAmount));
    }

    content += lightSeparator;
    content += formatLR('TOTAL:', formatMoney(data.totalAmount));
    content += separator;

    if (settings?.showPaymentDetails !== false) {
        content += 'Payment\n';

        if (data.payments && data.payments.length > 1) {
            for (const payment of data.payments) {
                content += formatLR(`${payment.method}:`, formatMoney(payment.amount));
                if (payment.reference) {
                    content += formatLR('  Ref:', payment.reference);
                }
            }
        } else {
            content += formatLR(`${data.paymentMethod}:`, formatMoney(data.amountPaid));
        }
    }

    if (settings?.showChangeReturn !== false && data.changeAmount > 0) {
        content += formatLR('Change:', formatMoney(data.changeAmount));
    }

    content += separator;
    content += ESC_POS.ALIGN_CENTER;

    const thankYouNote = settings?.thankYouNote || 'Thank you for your business!';
    content += `${thankYouNote}\n`;

    if (settings?.showPoweredBy !== false) {
        content += '\nPowered by Zonse247 POS\n';
    }

    content += separator;
    content += feedAndCut(4, options.cutPaper !== false);

    if (options.openCashDrawer) {
        content += ESC_POS.OPEN_DRAWER;
    }

    if (options.beepAfterPrint) {
        content += ESC_POS.BEEP;
    }

    return content;
}
