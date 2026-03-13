/**
 * Print Content Service
 * 
 * Generates ESC/POS content for thermal receipt printers.
 * 
 * PERFORMANCE BEST PRACTICES:
 * 1. Pass `receiptSettings` in the request to skip terminal settings DB lookup
 * 2. DB calls for branch and terminal settings run in parallel
 * 3. Content generation is synchronous and memory-efficient
 * 4. For batch printing, cache receiptSettings in the caller
 * 
 * @example
 * // Fast path - pass settings directly
 * await PrintContentService.generateReceiptContent({
 *   saleId: '...',
 *   tenantId: '...',
 *   branchId: '...',
 *   receiptSettings: cachedSettings, // Skips DB lookup
 * });
 */

import { Printer } from '../../types/printer';
import { OrderModel } from '../../models/order.model';
import { BranchModel } from '../../models/branch.model';
import { ProductService } from '../inventory/product.service';
import { SaleService } from '../sale.service';
import { TerminalSettingsModel } from '../../models/terminal-settings.model';
import { ReceiptDisplaySettings } from '../../types/terminal-settings';

const ESC_POS = {
    // Initialization
    INIT: '\x1B\x40',

    // Text alignment
    ALIGN_LEFT: '\x1B\x61\x00',
    ALIGN_CENTER: '\x1B\x61\x01',
    ALIGN_RIGHT: '\x1B\x61\x02',

    // Text formatting
    BOLD_ON: '\x1B\x45\x01',
    BOLD_OFF: '\x1B\x45\x00',
    UNDERLINE_ON: '\x1B\x2D\x01',
    UNDERLINE_OFF: '\x1B\x2D\x00',
    DOUBLE_HEIGHT: '\x1B\x21\x10',
    DOUBLE_WIDTH: '\x1B\x21\x20',
    DOUBLE_SIZE: '\x1B\x21\x30',
    NORMAL: '\x1B\x21\x00',

    // Line spacing
    LINE_SPACING_DEFAULT: '\x1B\x32',
    LINE_SPACING_SET: (n: number) => `\x1B\x33${String.fromCharCode(n)}`,

    // Paper handling
    CUT_PAPER: '\x1D\x56\x00',
    CUT_PAPER_PARTIAL: '\x1D\x56\x01',
    FEED_LINES: (n: number) => `\x1B\x64${String.fromCharCode(n)}`,

    // Cash drawer
    OPEN_DRAWER: '\x1B\x70\x00\x19\xFA',

    // Barcode
    BARCODE_HEIGHT: (n: number) => `\x1D\x68${String.fromCharCode(n)}`,
    BARCODE_WIDTH: (n: number) => `\x1D\x77${String.fromCharCode(n)}`,
    BARCODE_TEXT_BELOW: '\x1D\x48\x02',
    BARCODE_CODE128: (data: string) => `\x1D\x6B\x49${String.fromCharCode(data.length)}${data}`,
    BARCODE_EAN13: (data: string) => `\x1D\x6B\x02${data}\x00`,

    // QR Code
    QR_MODEL: '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00',
    QR_SIZE: (n: number) => `\x1D\x28\x6B\x03\x00\x31\x43${String.fromCharCode(n)}`,
    QR_ERROR: '\x1D\x28\x6B\x03\x00\x31\x45\x31',
    QR_STORE: (data: string) => {
        const len = data.length + 3;
        return `\x1D\x28\x6B${String.fromCharCode(len % 256)}${String.fromCharCode(Math.floor(len / 256))}\x31\x50\x30${data}`;
    },
    QR_PRINT: '\x1D\x28\x6B\x03\x00\x31\x51\x30',

    // Beep
    BEEP: '\x1B\x42\x03\x02',

    // Raster bit image (GS v 0)
    // m=0: normal, m=1: double width, m=2: double height, m=3: double width+height
    RASTER_IMAGE: (width: number, height: number, data: Uint8Array, mode = 0) => {
        const xL = (width / 8) % 256;
        const xH = Math.floor((width / 8) / 256);
        const yL = height % 256;
        const yH = Math.floor(height / 256);
        return `\x1D\x76\x30${String.fromCharCode(mode)}${String.fromCharCode(xL)}${String.fromCharCode(xH)}${String.fromCharCode(yL)}${String.fromCharCode(yH)}${String.fromCharCode(...data)}`;
    },
};

// Zonse247 placeholder logo (simple text version for thermal printers)
const ZONSE247_LOGO = [
    '********************************',
    '*                              *',
    '*        ZONSE247 POS          *',
    '*                              *',
    '********************************',
].join('\n') + '\n';

export interface ReceiptContentRequest {
    saleId?: string;
    transactionId?: string;
    orderId?: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
    includeLogo?: boolean;
    customMessage?: string;
    tenantId?: string;
    branchId?: string;
    terminalId?: string;
    // Receipt display settings from terminal settings
    receiptSettings?: ReceiptDisplaySettings;
    // Printer configuration options
    openCashDrawer?: boolean;
    beepAfterPrint?: boolean;
    cutPaper?: boolean;
}

export interface LabelContentRequest {
    productId: string;
    tenantId: string;
    branchId: string;
    includeBarcode?: boolean;
    includePrice?: boolean;
    includeQRCode?: boolean;
    customText?: string;
    labelWidth?: number;
    labelHeight?: number;
}

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
        listPrice?: number;        // Original price before discounts
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
    totalItemCount?: number;      // Total quantity of all items
    savedAmount?: number;         // Total money saved from discounts
    listPriceTotal?: number;      // Total before any discounts
    currency?: string;
}

export class PrintContentService {
    /**
     * Generate receipt content (ESC/POS format) with actual data
     * 
     * Performance optimizations:
     * - Uses provided receiptSettings to skip DB lookup
     * - Parallel data fetching in fetchSaleData
     * - Content generation is synchronous/memory-efficient
     */
    static async generateReceiptContent(request: ReceiptContentRequest): Promise<string> {
        let receiptData: ReceiptData | null = null;
        let receiptSettings: ReceiptDisplaySettings | null = request.receiptSettings || null;

        // Fetch sale/order data (prioritize saleId - transactions table is deprecated)
        if (request.saleId && request.tenantId && request.branchId) {
            const result = await this.fetchSaleData(
                request.saleId,
                request.tenantId,
                request.branchId,
                request.terminalId,
                receiptSettings  // Pass existing settings to avoid redundant fetch
            );
            if (result) {
                receiptData = result.data;
                // Use fetched settings only if not already provided
                receiptSettings = receiptSettings || result.settings;
            }
        } else if (request.orderId) {
            receiptData = await this.fetchOrderData(request.orderId);
        }

        // If no data found, generate a basic receipt
        if (!receiptData) {
            return this.generateBasicReceipt(request, receiptSettings);
        }

        return this.formatReceiptContent(receiptData, request, receiptSettings);
    }

    /**
     * Fetch sale data for receipt
     * 
     * Performance optimizations:
     * - Parallel database calls for branch and terminal settings
     * - Skip terminal settings fetch if already provided
     * - Minimal data transformation
     */
    private static async fetchSaleData(
        saleId: string,
        tenantId: string,
        branchId: string,
        terminalId?: string,
        existingSettings?: ReceiptDisplaySettings | null
    ): Promise<{ data: ReceiptData; settings: ReceiptDisplaySettings | null } | null> {
        // Fetch sale data first (required for receipt)
        const sale = await SaleService.getSaleById(saleId, tenantId, branchId);

        if (!sale) {
            return null;
        }

        // Determine terminal ID for settings lookup
        const saleTerminalId = terminalId || sale.terminal?.terminalId;

        // Parallel fetch: branch data AND terminal settings (if needed)
        // Skip terminal settings fetch if already provided in request
        const [branch, terminalSettings] = await Promise.all([
            BranchModel.findById(branchId),
            // Only fetch terminal settings if not provided and terminal ID exists
            (!existingSettings && saleTerminalId)
                ? TerminalSettingsModel.findByTerminalId(saleTerminalId)
                : Promise.resolve(null)
        ]);

        // Use provided settings or fetched settings
        const receiptSettings: ReceiptDisplaySettings | null = existingSettings
            || (terminalSettings?.receiptSettings as unknown as ReceiptDisplaySettings)
            || null;

        // Map sale items to receipt items with full variant/product data
        const items = sale.items.map((item) => {
            const variantName = item.variant?.variantName || '';
            const productName = item.variant?.product?.name || item.product?.name || 'Unknown Product';
            // Show "ProductName - VariantName" only if variantName differs from productName
            const displayName = variantName && variantName !== productName && variantName !== 'Default'
                ? `${productName} - ${variantName}`
                : productName;

            // Calculate list price (original price before discount)
            const itemDiscount = Number(item.discountAmount || 0);
            const listPrice = Number(item.unitPrice || 0) + (item.quantity > 0 ? itemDiscount / item.quantity : 0);

            return {
                id: item.id,
                saleId: item.saleId,
                variantId: item.variantId || '',
                productId: item.productId || '',
                name: displayName,
                quantity: item.quantity || 1,
                unitPrice: Number(item.unitPrice || 0),
                listPrice,
                unitCost: Number(item.unitCost || 0),
                subtotal: Number(item.subtotal || 0),
                total: Number(item.totalAmount || item.subtotal || 0),
                discount: itemDiscount,
                tax: Number(item.taxAmount || 0),
                createdAt: new Date(item.createdAt),
                variant: {
                    id: item.variant?.id || item.variantId || '',
                    variantName: item.variant?.variantName || 'Default',
                    sku: item.variant?.sku || null,
                    product: {
                        id: item.variant?.product?.id || item.productId || '',
                        name: item.variant?.product?.name || productName
                    }
                },
                product: {
                    id: item.product?.id || item.productId || '',
                    name: displayName,
                    sku: item.variant?.sku || item.product?.sku || null
                }
            };
        });

        // Calculate totals
        const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const discountAmount = Number(sale.discountAmount || 0);
        const savedAmount = discountAmount;
        const listPriceTotal = items.reduce((sum, item) => sum + (item.listPrice * item.quantity), 0);

        // Determine payment method name - check for multiple payments first
        let paymentMethodName = 'Cash';
        const payments: Array<{ method: string; amount: number; reference?: string }> = [];

        if (sale.payments && sale.payments.length > 0) {
            if (sale.payments.length === 1) {
                paymentMethodName = sale.payments[0].paymentMethod?.name || 'Cash';
            } else {
                paymentMethodName = 'Split Payment';
            }
            // Build payments array for detailed display
            for (const payment of sale.payments) {
                payments.push({
                    method: payment.paymentMethod?.name || 'Cash',
                    amount: Number(payment.amount || 0),
                    reference: (payment as any).reference || undefined
                });
            }
        } else if (sale.paymentMethod) {
            paymentMethodName = sale.paymentMethod.name || 'Cash';
            payments.push({
                method: paymentMethodName,
                amount: Number(sale.amountPaid || sale.totalAmount || 0)
            });
        }

        const receiptData: ReceiptData = {
            businessName: receiptSettings?.storeName || branch?.branchName || 'Store',
            branchName: branch?.branchName || '',
            address: receiptSettings?.storeAddress || [branch?.addressLine1, branch?.addressLine2, branch?.city].filter(Boolean).join(', ') || '',
            phone: receiptSettings?.storePhone || branch?.phoneNumber || '',
            email: branch?.email || '',
            website: receiptSettings?.storeWebsite || (branch as any)?.website || '',
            taxId: receiptSettings?.businessTaxId || (branch as any)?.taxId || '',
            receiptNumber: sale.saleNumber || saleId.substring(0, 8).toUpperCase(),
            date: new Date(sale.saleDate || sale.createdAt),
            cashier: sale.user?.fullname || sale.user?.username,
            terminal: sale.terminal?.terminalLabel || sale.terminal?.terminalCode,
            customer: sale.customer ? {
                name: sale.customer.name,
                phone: sale.customer.phone,
                address: (sale.customer as any)?.address,
                loyaltyPoints: undefined
            } : undefined,
            items,
            subtotal: Number(sale.subtotal || 0),
            taxAmount: Number(sale.taxAmount || 0),
            discountAmount,
            otherCharges: Number(sale.otherCharges || 0),
            totalAmount: Number(sale.totalAmount || 0),
            amountPaid: Number(sale.amountPaid || sale.totalAmount || 0),
            changeAmount: Number(sale.changeAmount || 0),
            paymentMethod: paymentMethodName,
            payments,
            totalItemCount,
            savedAmount,
            listPriceTotal,
            currency: (branch as any)?.currency || 'MWK'
        };

        return { data: receiptData, settings: receiptSettings };
    }

    /**
     * Fetch order data for receipt
     */
    private static async fetchOrderData(orderId: string): Promise<ReceiptData | null> {
        const orders = await OrderModel.findByRefNumber(orderId);
        if (!orders || orders.length === 0) return null;

        const firstOrder = orders[0] as any;

        // Build items from orders (each order record might be an item)
        const items = orders.map((order: any, index: number) => ({
            id: order.id || `order-item-${index}`,
            saleId: order.saleId || orderId,
            variantId: order.variantId || '',
            productId: order.productId || '',
            name: order.productName || 'Product',
            quantity: order.qty || order.quantity || 1,
            unitPrice: parseFloat(order.sellingPrice || order.unitPrice || 0),
            unitCost: parseFloat(order.costPrice || order.unitCost || 0),
            subtotal: parseFloat(order.subtotal || order.total || 0),
            total: parseFloat(order.total || 0),
            discount: parseFloat(order.discount || 0),
            tax: parseFloat(order.tax || 0),
            createdAt: new Date(order.createdAt || new Date()),
            variant: {
                id: order.variantId || '',
                variantName: order.variantName || 'Default',
                sku: order.sku || null,
                product: {
                    id: order.productId || '',
                    name: order.productName || 'Product'
                }
            },
            product: {
                id: order.productId || '',
                name: order.productName || 'Product',
                sku: order.sku || null
            }
        }));

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);

        return {
            businessName: 'Store',
            branchName: '',
            receiptNumber: firstOrder.refNumber || orderId.substring(0, 8).toUpperCase(),
            date: new Date(firstOrder.createdAt || new Date()),
            items,
            subtotal,
            taxAmount: 0,
            discountAmount: 0,
            otherCharges: 0,
            totalAmount: subtotal,
            amountPaid: subtotal,
            changeAmount: 0,
            paymentMethod: 'Cash'
        };
    }

    /**
     * Generate basic receipt when no data available
     */
    private static generateBasicReceipt(
        request: ReceiptContentRequest,
        settings: ReceiptDisplaySettings | null
    ): string {
        let content = '';

        content += ESC_POS.INIT;

        if (request.includeHeader !== false) {
            content += ESC_POS.ALIGN_CENTER;

            // Store name from settings
            if (settings?.storeName) {
                content += ESC_POS.BOLD_ON;
                content += ESC_POS.DOUBLE_SIZE;
                content += `${settings.storeName}\n`;
                content += ESC_POS.NORMAL;
                content += ESC_POS.BOLD_OFF;
            }

            // Receipt header message
            if (settings?.receiptHeader) {
                content += `${settings.receiptHeader}\n`;
            }

            content += ESC_POS.BOLD_ON;
            content += 'RECEIPT\n';
            content += ESC_POS.BOLD_OFF;
            content += '================================\n';
        }

        content += ESC_POS.ALIGN_LEFT;
        content += `Reference: ${request.saleId || request.transactionId || request.orderId || 'N/A'}\n`;
        content += `Date: ${new Date().toLocaleString()}\n`;

        if (request.customMessage) {
            content += `\n${request.customMessage}\n`;
        }

        if (request.includeFooter !== false) {
            content += '================================\n';
            content += ESC_POS.ALIGN_CENTER;
            // Use thank you note from settings or default
            content += `${settings?.thankYouNote || 'Thank you for your purchase!'}\n`;

            // Show powered by if enabled
            if (settings?.showPoweredBy !== false) {
                content += '\nPowered by Zonse247 POS\n';
            }
        }

        content += ESC_POS.FEED_LINES(3);

        // Cut paper (default: true)
        if (request.cutPaper !== false) {
            content += ESC_POS.CUT_PAPER;
        }

        // Open cash drawer if configured
        if (request.openCashDrawer) {
            content += ESC_POS.OPEN_DRAWER;
        }

        // Beep after print if configured
        if (request.beepAfterPrint) {
            content += ESC_POS.BEEP;
        }

        return content;
    }

    /**
     * Format receipt content with ESC/POS commands
     * Applies all receipt display settings
     */
    private static formatReceiptContent(
        data: ReceiptData,
        request: ReceiptContentRequest,
        settings: ReceiptDisplaySettings | null
    ): string {
        let content = '';
        const lineWidth = 32; // Standard receipt width
        const separator = '_'.repeat(lineWidth) + '\n';
        const lightSeparator = '-'.repeat(lineWidth) + '\n';

        // Helper function to format left-right aligned line
        const formatLR = (left: string, right: string): string => {
            const maxLeft = lineWidth - right.length - 1;
            const truncatedLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
            const spaces = lineWidth - truncatedLeft.length - right.length;
            return truncatedLeft + ' '.repeat(Math.max(1, spaces)) + right + '\n';
        };

        // Helper to format currency with thousands separator
        const formatMoney = (amount: number, currency?: string): string => {
            const curr = currency || data.currency || 'MK';
            const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `${curr}${formatted}`;
        };

        // Initialize printer
        content += ESC_POS.INIT;

        // ============================================
        // HEADER SECTION
        // ============================================
        content += ESC_POS.ALIGN_CENTER;

        // Business logo (if includeLogo is true or not specified)
        if (request.includeLogo !== false) {
            // Use custom logo from settings if available, otherwise use Zonse247 placeholder
            const logoData = settings?.logoData; // Base64 encoded logo from settings

            if (logoData) {
                // Custom logo: decode base64 and print as raster image
                try {
                    const logoImage = PrintContentService.decodeLogoData(logoData);
                    if (logoImage) {
                        content += ESC_POS.RASTER_IMAGE(logoImage.width, logoImage.height, logoImage.data);
                        content += '\n';
                    }
                } catch {
                    // Fallback to simple text logo on decode error
                    content += ZONSE247_LOGO;
                }
            } else {
                // Use Zonse247 placeholder logo (simple text version for compatibility)
                content += ZONSE247_LOGO;
            }
        }

        // Store name (centered)
        const storeName = settings?.storeName || data.businessName;
        if (storeName) {
            content += `${storeName}\n`;
        }

        // Store address (if showAddressOnReceipt is true)
        const storeAddress = settings?.storeAddress || data.address;
        if (storeAddress && settings?.showAddressOnReceipt !== false) {
            content += `${storeAddress}\n`;
        }

        // Store phone (if showPhoneOnReceipt is true)
        const storePhone = settings?.storePhone || data.phone;
        if (storePhone && settings?.showPhoneOnReceipt !== false) {
            content += `Tel: ${storePhone}\n`;
        }

        // Store website (if showWebsiteOnReceipt is true)
        const storeWebsite = settings?.storeWebsite || data.website;
        if (storeWebsite && settings?.showWebsiteOnReceipt === true) {
            content += `${storeWebsite}\n`;
        }

        // Business Tax ID (if set)
        const taxId = settings?.businessTaxId || data.taxId;
        if (taxId && settings?.showTaxOnReceipt !== false) {
            const taxTitle = settings?.taxTitle || 'VAT';
            content += `${taxTitle} #: ${taxId}\n`;
        }

        // Receipt header custom message
        if (settings?.receiptHeader) {
            content += `${settings.receiptHeader}\n`;
        }

        content += separator;
        content += 'RECEIPT\n';
        content += separator;

        // ============================================
        // RECEIPT DETAILS SECTION (Left-Right Format)
        // ============================================
        content += ESC_POS.ALIGN_LEFT;
        content += formatLR('Receipt #:', data.receiptNumber);

        // Format date
        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
        content += formatLR('Date:', data.date.toLocaleDateString('en-US', dateOptions));

        // Customer info
        if (data.customer) {
            content += formatLR('Customer:', data.customer.name);

            // Show customer phone if enabled
            if (data.customer.phone && settings?.showCustomerPhone === true) {
                content += formatLR('Phone:', data.customer.phone);
            }

            // Show customer address if enabled
            if (data.customer.address && settings?.showCustomerAddress === true) {
                content += formatLR('Address:', data.customer.address);
            }
        } else {
            content += formatLR('Customer:', 'Walk-in Customer');
        }

        // Cashier (if showCashierName is true)
        if (data.cashier && settings?.showCashierName !== false) {
            content += formatLR('Cashier:', data.cashier);
        }

        // Terminal
        if (data.terminal) {
            content += formatLR('Terminal:', data.terminal);
        }

        // ============================================
        // ITEMS SECTION
        // ============================================
        content += separator;
        content += ESC_POS.ALIGN_CENTER;
        content += 'ITEMS\n';
        content += separator;
        content += ESC_POS.ALIGN_LEFT;

        // Sort items based on orderItemsBy setting
        const sortedItems = [...data.items];
        if (settings?.orderItemsBy === 'name') {
            sortedItems.sort((a, b) => a.name.localeCompare(b.name));
        }
        // 'orderAdded' is the default - no sorting needed

        // Items format based on settings
        for (const item of sortedItems) {
            // Show list price if enabled and different from selling price
            if (settings?.showListPrice === true && item.listPrice && item.listPrice > item.unitPrice) {
                // Show original price struck through (use brackets to indicate)
                content += `${item.name}\n`;
                content += `  [${item.listPrice.toFixed(2)}] -> ${item.unitPrice.toFixed(2)}\n`;
                content += formatLR(`  ${item.quantity} x ${item.unitPrice.toFixed(2)}`, formatMoney(item.total));
            } else {
                // Standard item line
                content += `${item.name}\n`;

                // Show rate if enabled (qty x price = total)
                if (settings?.showRateInReceipt !== false) {
                    content += formatLR(`  ${item.quantity} x ${item.unitPrice.toFixed(2)}`, formatMoney(item.total));
                } else {
                    content += formatLR(`  Qty: ${item.quantity}`, formatMoney(item.total));
                }
            }
        }

        // ============================================
        // TOTALS SECTION (Left-Right Format)
        // ============================================
        content += separator;

        // Total item count (if showTotalItemCount is true)
        if (settings?.showTotalItemCount === true && data.totalItemCount) {
            content += formatLR('Total Items:', data.totalItemCount.toString());
            content += lightSeparator;
        }

        // Subtotal
        content += formatLR('Subtotal:', formatMoney(data.subtotal));

        // Discount (if any)
        if (data.discountAmount > 0) {
            content += formatLR('Discount:', `-${formatMoney(data.discountAmount)}`);
        }

        // Total money saved (if showTotalMoneySaved is true and there are savings)
        if (settings?.showTotalMoneySaved === true && data.savedAmount && data.savedAmount > 0) {
            content += formatLR('You Saved:', formatMoney(data.savedAmount));
        }

        // Other charges (if any)
        if (data.otherCharges > 0) {
            content += formatLR('Other Charges:', formatMoney(data.otherCharges));
        }

        // Tax (if showTaxOnReceipt is true and tax exists)
        if (data.taxAmount > 0 && settings?.showTaxOnReceipt !== false) {
            const taxTitle = settings?.taxTitle || 'Tax';
            content += formatLR(`${taxTitle}:`, formatMoney(data.taxAmount));
        }

        // ============================================
        // GRAND TOTAL SECTION (Left-Right Format)
        // ============================================
        content += lightSeparator;
        content += formatLR('TOTAL:', formatMoney(data.totalAmount));
        content += separator;

        // ============================================
        // PAYMENT DETAILS SECTION (Left-Right Format)
        // ============================================
        if (settings?.showPaymentDetails !== false) {
            content += 'Payment\n';

            // Show individual payments if multiple
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

        // Change (if showChangeReturn is true and there's change)
        if (settings?.showChangeReturn !== false && data.changeAmount > 0) {
            content += formatLR('Change:', formatMoney(data.changeAmount));
        }

        // ============================================
        // FOOTER SECTION
        // ============================================
        content += separator;
        content += ESC_POS.ALIGN_CENTER;

        // Thank you note
        const thankYouNote = settings?.thankYouNote || 'Thank you for your business!';
        content += `${thankYouNote}\n`;

        // Powered by (if showPoweredBy is true)
        if (settings?.showPoweredBy !== false) {
            content += '\nPowered by Zonse247 POS\n';
        }

        content += separator;

        // Feed and cut
        content += ESC_POS.FEED_LINES(4);

        // Cut paper (default: true)
        if (request.cutPaper !== false) {
            content += ESC_POS.CUT_PAPER;
        }

        // Open cash drawer if configured
        if (request.openCashDrawer) {
            content += ESC_POS.OPEN_DRAWER;
        }

        // Beep after print if configured
        if (request.beepAfterPrint) {
            content += ESC_POS.BEEP;
        }

        return content;
    }

    /**
     * Format a line with columns
     */
    private static formatLine(col1: string, col2: string, col3: string, col4: string, width: number): string {
        const c1Width = Math.floor(width * 0.4);
        const c2Width = Math.floor(width * 0.15);
        const c3Width = Math.floor(width * 0.2);
        const c4Width = width - c1Width - c2Width - c3Width;

        return col1.padEnd(c1Width) +
            col2.padStart(c2Width) +
            col3.padStart(c3Width) +
            col4.padStart(c4Width) + '\n';
    }

    /**
     * Format a total line (label + amount)
     */
    private static formatTotalLine(label: string, amount: number, currency: string | undefined, width: number): string {
        const amountStr = this.formatCurrency(amount, currency);
        const padding = width - label.length - amountStr.length;
        return `${label}${' '.repeat(Math.max(1, padding))}${amountStr}\n`;
    }

    /**
     * Format currency amount
     */
    private static formatCurrency(amount: number, currency = 'MWK'): string {
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        return `${sign}${currency} ${absAmount.toFixed(2)}`;
    }

    /**
     * Decode base64 logo data to raster image format for ESC/POS
     * @param logoData - Base64 encoded monochrome bitmap or PNG
     * @returns Object with width, height, and pixel data for ESC/POS raster printing
     */
    private static decodeLogoData(logoData: string): { width: number; height: number; data: Uint8Array } | null {
        try {
            // Remove data URL prefix if present
            const base64Data = logoData.replace(/^data:image\/\w+;base64,/, '');

            // Decode base64 to buffer
            const buffer = Buffer.from(base64Data, 'base64');

            // For simplicity, assume pre-processed monochrome bitmap data
            // Format: first 4 bytes = width (2 bytes) + height (2 bytes), rest = pixel data
            if (buffer.length < 4) {
                return null;
            }

            const width = buffer.readUInt16LE(0);
            const height = buffer.readUInt16LE(2);
            const pixelData = new Uint8Array(buffer.slice(4));

            // Validate data length (width/8 * height bytes required)
            const expectedBytes = Math.ceil(width / 8) * height;
            if (pixelData.length < expectedBytes) {
                return null;
            }

            return { width, height, data: pixelData };
        } catch {
            return null;
        }
    }

    /**
     * Generate label content (ZPL format) with actual product data
     */
    static async generateLabelContent(request: LabelContentRequest): Promise<string> {
        // Fetch product data
        const product = await ProductService.getProductById(
            request.productId,
            request.tenantId,
            request.branchId
        );

        if (!product) {
            return this.generateBasicLabel(request);
        }

        return this.formatLabelContent(product, request);
    }

    /**
     * Generate basic label when product not found
     */
    private static generateBasicLabel(request: LabelContentRequest): string {
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
     * Format label content with product data (ZPL format)
     */
    private static formatLabelContent(product: any, request: LabelContentRequest): string {
        const labelWidth = request.labelWidth || 400;
        const labelHeight = request.labelHeight || 300;

        let content = '';

        // ZPL Header
        content += '^XA\n'; // Start format
        content += `^LL${labelHeight}\n`; // Label length
        content += `^PW${labelWidth}\n`; // Print width
        content += '^CF0,35\n'; // Default font size

        // Product name (large, bold)
        const productName = product.name.length > 30
            ? product.name.substring(0, 30) + '...'
            : product.name;
        content += `^FO20,20^A0N,45,45^FD${productName}^FS\n`;

        // SKU
        content += `^FO20,70^A0N,25,25^FDSKU: ${product.sku}^FS\n`;

        // Price (if requested)
        let yPos = 100;
        if (request.includePrice !== false && product.sellingPrice) {
            content += `^FO20,${yPos}^A0N,50,50^FD${this.formatCurrency(product.sellingPrice, 'MWK')}^FS\n`;
            yPos += 60;
        }

        // Barcode (if requested)
        if (request.includeBarcode) {
            const barcodeData = product.primaryBarcode || product.sku || request.productId;
            content += `^FO20,${yPos}^BY2\n`;
            content += `^BCN,60,Y,N,N^FD${barcodeData}^FS\n`;
            yPos += 90;
        }

        // QR Code (if requested)
        if (request.includeQRCode) {
            const qrData = product.primaryBarcode || product.sku || request.productId;
            content += `^FO${labelWidth - 100},20\n`;
            content += '^BQN,2,4\n';
            content += `^FDQA,${qrData}^FS\n`;
        }

        // Custom text
        if (request.customText) {
            content += `^FO20,${yPos}^A0N,25,25^FD${request.customText}^FS\n`;
        }

        // Unit info
        if (product.unit) {
            content += `^FO20,${labelHeight - 30}^A0N,20,20^FDUnit: ${product.unit}^FS\n`;
        }

        // ZPL Footer
        content += '^XZ\n'; // End format

        return content;
    }

    /**
     * Generate test page content
     * For laser/inkjet printers, generates plain text
     * For thermal printers, generates ESC/POS commands
     */
    static generateTestPageContent(printer: Printer): string {
        // Use plain text for laser and inkjet printers
        const usePlainText = printer.printerType === 'LASER' || printer.printerType === 'INKJET';

        if (usePlainText) {
            return this.generatePlainTextTestPage(printer);
        }

        return this.generateEscPosTestPage(printer);
    }

    /**
     * Generate plain text test page for laser/inkjet printers
     */
    private static generatePlainTextTestPage(printer: Printer): string {
        const lineWidth = 60;
        let content = '';

        content += '\n';
        content += '='.repeat(lineWidth) + '\n';
        content += this.centerText('PRINTER TEST PAGE', lineWidth) + '\n';
        content += this.centerText('Zonse247 POS System', lineWidth) + '\n';
        content += '='.repeat(lineWidth) + '\n\n';

        content += 'PRINTER INFORMATION\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += `Printer Name:   ${printer.printerName}\n`;
        content += `Printer Type:   ${printer.printerType}\n`;
        content += `Printer Model:  ${printer.printerModel || 'N/A'}\n`;
        content += `Connection:     ${printer.connectionType}\n`;
        content += `Test Date:      ${new Date().toLocaleString()}\n\n`;

        content += 'CHARACTER SET TEST\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += 'Numbers:    0123456789\n';
        content += 'Uppercase:  ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
        content += 'Lowercase:  abcdefghijklmnopqrstuvwxyz\n';
        content += 'Symbols:    !@#$%^&*()_+-=[]{}|;:\'",.<>?/\\\n\n';

        content += 'ALIGNMENT TEST\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += 'Left Aligned Text\n';
        content += this.centerText('Center Aligned Text', lineWidth) + '\n';
        content += this.rightAlignText('Right Aligned Text', lineWidth) + '\n\n';

        content += 'LINE TEST\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += 'Single line: ' + '-'.repeat(lineWidth - 13) + '\n';
        content += 'Double line: ' + '='.repeat(lineWidth - 13) + '\n';
        content += 'Dotted line: ' + '.'.repeat(lineWidth - 13) + '\n\n';

        content += 'SAMPLE RECEIPT FORMAT\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += this.formatReceiptLine('Item 1', 'K 1,000.00', lineWidth) + '\n';
        content += this.formatReceiptLine('Item 2 (x2)', 'K 2,500.00', lineWidth) + '\n';
        content += this.formatReceiptLine('Item 3', 'K 750.00', lineWidth) + '\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += this.formatReceiptLine('SUBTOTAL', 'K 4,250.00', lineWidth) + '\n';
        content += this.formatReceiptLine('TAX (16.5%)', 'K 701.25', lineWidth) + '\n';
        content += '='.repeat(lineWidth) + '\n';
        content += this.formatReceiptLine('TOTAL', 'K 4,951.25', lineWidth) + '\n';
        content += '='.repeat(lineWidth) + '\n\n';

        content += '='.repeat(lineWidth) + '\n';
        content += this.centerText('TEST COMPLETE', lineWidth) + '\n';
        content += this.centerText('Printer is functioning correctly!', lineWidth) + '\n';
        content += '='.repeat(lineWidth) + '\n\n';

        return content;
    }

    /**
     * Center text within a given width
     */
    private static centerText(text: string, width: number): string {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(padding) + text;
    }

    /**
     * Right align text within a given width
     */
    private static rightAlignText(text: string, width: number): string {
        const padding = Math.max(0, width - text.length);
        return ' '.repeat(padding) + text;
    }

    /**
     * Format a receipt line with left and right text
     */
    private static formatReceiptLine(left: string, right: string, width: number): string {
        const spaces = Math.max(1, width - left.length - right.length);
        return left + ' '.repeat(spaces) + right;
    }

    /**
     * Generate ESC/POS test page for thermal printers
     */
    private static generateEscPosTestPage(printer: Printer): string {
        let content = '';
        const lineWidth = 48;

        // Initialize printer
        content += ESC_POS.INIT;
        content += ESC_POS.ALIGN_CENTER;

        // Header
        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_SIZE;
        content += 'PRINTER TEST PAGE\n';
        content += ESC_POS.NORMAL;
        content += 'Zonse247 POS System\n';
        content += '='.repeat(lineWidth) + '\n\n';

        // Printer info
        content += ESC_POS.ALIGN_LEFT;
        content += `Printer: ${printer.printerName}\n`;
        content += `Type: ${printer.printerType}\n`;
        content += `Connection: ${printer.connectionType}\n`;
        if (printer.printerModel) {
            content += `Model: ${printer.printerModel}\n`;
        }
        content += `Date: ${new Date().toLocaleString()}\n\n`;

        // Separator
        content += ESC_POS.ALIGN_CENTER;
        content += '-'.repeat(lineWidth) + '\n';
        content += 'TEXT FORMATTING TEST\n';
        content += '-'.repeat(lineWidth) + '\n';

        // Text formatting tests
        content += ESC_POS.ALIGN_LEFT;
        content += ESC_POS.NORMAL;
        content += 'Normal Text\n';
        content += ESC_POS.BOLD_ON;
        content += 'Bold Text\n';
        content += ESC_POS.BOLD_OFF;
        content += ESC_POS.DOUBLE_HEIGHT;
        content += 'Double Height\n';
        content += ESC_POS.NORMAL;

        // Alignment test
        content += '\n';
        content += ESC_POS.ALIGN_CENTER;
        content += '-'.repeat(lineWidth) + '\n';
        content += 'ALIGNMENT TEST\n';
        content += '-'.repeat(lineWidth) + '\n';

        content += ESC_POS.ALIGN_LEFT;
        content += 'Left Aligned\n';
        content += ESC_POS.ALIGN_CENTER;
        content += 'Center Aligned\n';
        content += ESC_POS.ALIGN_RIGHT;
        content += 'Right Aligned\n';
        content += ESC_POS.ALIGN_LEFT;

        // Character test
        content += '\n';
        content += ESC_POS.ALIGN_CENTER;
        content += '-'.repeat(lineWidth) + '\n';
        content += 'CHARACTER TEST\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += ESC_POS.ALIGN_LEFT;
        content += '0123456789\n';
        content += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
        content += 'abcdefghijklmnopqrstuvwxyz\n';

        // Sample receipt format
        content += '\n';
        content += ESC_POS.ALIGN_CENTER;
        content += '-'.repeat(lineWidth) + '\n';
        content += 'SAMPLE RECEIPT\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += ESC_POS.ALIGN_LEFT;

        const formatLine = (left: string, right: string) => {
            const spaces = lineWidth - left.length - right.length;
            return left + ' '.repeat(Math.max(1, spaces)) + right + '\n';
        };

        content += formatLine('Item 1', 'K 1,000.00');
        content += formatLine('Item 2 x2', 'K 2,500.00');
        content += formatLine('Item 3', 'K 750.00');
        content += '-'.repeat(lineWidth) + '\n';
        content += ESC_POS.BOLD_ON;
        content += formatLine('TOTAL', 'K 4,250.00');
        content += ESC_POS.BOLD_OFF;

        // Footer
        content += '\n';
        content += ESC_POS.ALIGN_CENTER;
        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_HEIGHT;
        content += 'TEST COMPLETE\n';
        content += ESC_POS.NORMAL;
        content += '='.repeat(lineWidth) + '\n';
        content += '\nPrinter is working correctly!\n';
        content += 'Thank you for using Zonse247 POS\n';

        // Feed and cut
        content += ESC_POS.FEED_LINES(4);
        content += ESC_POS.CUT_PAPER;

        return content;
    }

    /**
     * Generate kitchen order ticket content
     */
    static generateKitchenTicketContent(orderData: {
        orderId: string;
        orderNumber?: string;
        items: Array<{ name: string; quantity: number; notes?: string; modifiers?: string[] }>;
        tableNumber?: string;
        serverName?: string;
        priority?: 'normal' | 'rush' | 'vip';
        orderType?: 'dine-in' | 'takeaway' | 'delivery';
        customerName?: string;
        specialInstructions?: string;
    }): string {
        let content = '';
        const lineWidth = 48;

        content += ESC_POS.INIT;

        // Priority indicator
        if (orderData.priority === 'rush') {
            content += ESC_POS.ALIGN_CENTER;
            content += ESC_POS.DOUBLE_SIZE;
            content += ESC_POS.BOLD_ON;
            content += '*** RUSH ORDER ***\n';
            content += ESC_POS.BOLD_OFF;
            content += ESC_POS.NORMAL;
        } else if (orderData.priority === 'vip') {
            content += ESC_POS.ALIGN_CENTER;
            content += ESC_POS.DOUBLE_SIZE;
            content += ESC_POS.BOLD_ON;
            content += '*** VIP ORDER ***\n';
            content += ESC_POS.BOLD_OFF;
            content += ESC_POS.NORMAL;
        }

        // Header
        content += ESC_POS.ALIGN_CENTER;
        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_SIZE;
        content += 'KITCHEN ORDER\n';
        content += ESC_POS.NORMAL;
        content += '='.repeat(lineWidth) + '\n\n';

        // Order info
        content += ESC_POS.ALIGN_LEFT;
        content += ESC_POS.DOUBLE_HEIGHT;
        content += `Order #: ${orderData.orderNumber || orderData.orderId}\n`;
        content += ESC_POS.NORMAL;
        content += `Time: ${new Date().toLocaleTimeString()}\n`;

        if (orderData.orderType) {
            content += ESC_POS.BOLD_ON;
            content += `Type: ${orderData.orderType.toUpperCase()}\n`;
            content += ESC_POS.BOLD_OFF;
        }

        if (orderData.tableNumber) {
            content += ESC_POS.DOUBLE_HEIGHT;
            content += `Table: ${orderData.tableNumber}\n`;
            content += ESC_POS.NORMAL;
        }

        if (orderData.serverName) {
            content += `Server: ${orderData.serverName}\n`;
        }

        if (orderData.customerName) {
            content += `Customer: ${orderData.customerName}\n`;
        }

        // Items
        content += '\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += ESC_POS.BOLD_ON;
        content += 'ITEMS\n';
        content += ESC_POS.BOLD_OFF;
        content += '-'.repeat(lineWidth) + '\n';

        for (const item of orderData.items) {
            // Quantity and item name (prominent)
            content += ESC_POS.DOUBLE_HEIGHT;
            content += ESC_POS.BOLD_ON;
            content += `${item.quantity}x ${item.name}\n`;
            content += ESC_POS.BOLD_OFF;
            content += ESC_POS.NORMAL;

            // Modifiers
            if (item.modifiers && item.modifiers.length > 0) {
                for (const mod of item.modifiers) {
                    content += `   + ${mod}\n`;
                }
            }

            // Notes
            if (item.notes) {
                content += ESC_POS.BOLD_ON;
                content += `   >> ${item.notes}\n`;
                content += ESC_POS.BOLD_OFF;
            }

            content += '\n';
        }

        // Special instructions
        if (orderData.specialInstructions) {
            content += '-'.repeat(lineWidth) + '\n';
            content += ESC_POS.BOLD_ON;
            content += 'SPECIAL INSTRUCTIONS:\n';
            content += ESC_POS.BOLD_OFF;
            content += `${orderData.specialInstructions}\n`;
        }

        content += '-'.repeat(lineWidth) + '\n';
        content += `Printed: ${new Date().toLocaleString()}\n`;

        content += ESC_POS.FEED_LINES(3);
        content += ESC_POS.CUT_PAPER;

        return content;
    }

    /**
     * Generate report content
     */
    static generateReportContent(reportData: {
        title: string;
        subtitle?: string;
        generatedAt: Date;
        generatedBy?: string;
        dateRange?: { from: Date; to: Date };
        headers: string[];
        rows: string[][];
        summary?: Record<string, string | number>;
        notes?: string;
    }): string {
        let content = '';
        const lineWidth = 48;

        content += ESC_POS.INIT;

        // Report header
        content += ESC_POS.ALIGN_CENTER;
        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_SIZE;
        content += `${reportData.title.toUpperCase()}\n`;
        content += ESC_POS.NORMAL;

        if (reportData.subtitle) {
            content += `${reportData.subtitle}\n`;
        }

        content += '='.repeat(lineWidth) + '\n';

        // Meta info
        content += ESC_POS.ALIGN_LEFT;
        content += `Generated: ${reportData.generatedAt.toLocaleString()}\n`;

        if (reportData.generatedBy) {
            content += `By: ${reportData.generatedBy}\n`;
        }

        if (reportData.dateRange) {
            content += `Period: ${reportData.dateRange.from.toLocaleDateString()} - ${reportData.dateRange.to.toLocaleDateString()}\n`;
        }

        content += '\n';

        // Table header
        content += '-'.repeat(lineWidth) + '\n';
        const colWidth = Math.floor(lineWidth / reportData.headers.length);
        content += reportData.headers.map(h => h.substring(0, colWidth - 1).padEnd(colWidth)).join('') + '\n';
        content += '-'.repeat(lineWidth) + '\n';

        // Table rows
        for (const row of reportData.rows) {
            content += row.map(cell =>
                (cell || '').toString().substring(0, colWidth - 1).padEnd(colWidth)
            ).join('') + '\n';
        }

        // Summary
        if (reportData.summary && Object.keys(reportData.summary).length > 0) {
            content += '\n';
            content += '='.repeat(lineWidth) + '\n';
            content += ESC_POS.BOLD_ON;
            content += 'SUMMARY\n';
            content += ESC_POS.BOLD_OFF;
            content += '-'.repeat(lineWidth) + '\n';

            for (const [key, value] of Object.entries(reportData.summary)) {
                const valueStr = typeof value === 'number' ? value.toFixed(2) : value.toString();
                content += `${key}: ${valueStr}\n`;
            }
        }

        // Notes
        if (reportData.notes) {
            content += '\n';
            content += '-'.repeat(lineWidth) + '\n';
            content += `Note: ${reportData.notes}\n`;
        }

        content += '\n';
        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.ALIGN_CENTER;
        content += '*** END OF REPORT ***\n';
        content += '='.repeat(lineWidth) + '\n';

        content += ESC_POS.FEED_LINES(4);
        content += ESC_POS.CUT_PAPER;

        return content;
    }

    /**
     * Generate cash drawer open command
     */
    static generateOpenDrawerCommand(): string {
        return ESC_POS.INIT + ESC_POS.OPEN_DRAWER;
    }

    /**
     * Generate beep command
     */
    static generateBeepCommand(): string {
        return ESC_POS.INIT + ESC_POS.BEEP;
    }
}
