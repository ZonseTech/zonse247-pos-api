import { Printer } from '../types/printer';
import { TransactionModel } from '../models/transaction.model';
import { OrderModel } from '../models/order.model';
import { BranchModel } from '../models/branch.model';
import { ProductService } from './product.service';

// ESC/POS Commands
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
};

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
    taxId?: string;
    receiptNumber: string;
    date: Date;
    cashier?: string;
    terminal?: string;
    customer?: {
        name: string;
        phone?: string;
        loyaltyPoints?: number;
    };
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
        discount?: number;
        tax?: number;
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    amountPaid: number;
    changeAmount: number;
    paymentMethod: string;
    currency?: string;
}

export class PrintContentService {
    /**
     * Generate receipt content (ESC/POS format) with actual data
     */
    static async generateReceiptContent(request: ReceiptContentRequest): Promise<string> {
        let receiptData: ReceiptData | null = null;

        // Fetch transaction/sale/order data
        if (request.transactionId) {
            receiptData = await this.fetchTransactionData(request.transactionId, request.tenantId, request.branchId);
        } else if (request.orderId) {
            receiptData = await this.fetchOrderData(request.orderId);
        }

        // If no data found, generate a basic receipt
        if (!receiptData) {
            return this.generateBasicReceipt(request);
        }

        return this.formatReceiptContent(receiptData, request);
    }

    /**
     * Fetch transaction data for receipt
     */
    private static async fetchTransactionData(
        transactionId: string,
        tenantId?: string,
        branchId?: string
    ): Promise<ReceiptData | null> {
        // Transaction links to Sale which has the items
        const transaction = await TransactionModel.findById(transactionId, tenantId, branchId, {
            sale: {
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            },
            customer: true,
            paymentMethod: true,
            user: true,
            branch: true
        });

        if (!transaction) return null;

        // Get branch from included relation or fetch separately
        const branch = (transaction as any).branch || await BranchModel.findById(transaction.branchId);

        // Get items from sale relation
        const saleItems = (transaction as any).sale?.items || [];
        const items = saleItems.map((item: any) => ({
            name: item.product?.name || item.productName || 'Unknown Product',
            quantity: item.quantity || 1,
            unitPrice: parseFloat(item.unitPrice || 0),
            total: parseFloat(item.subtotal || item.totalAmount || 0),
            discount: parseFloat(item.discountAmount || 0),
            tax: parseFloat(item.taxAmount || 0)
        }));

        // If no sale items, try to fetch from Order model using refNumber
        if (items.length === 0) {
            const orders = await OrderModel.findByRefNumber((transaction as any).refNumber);
            if (orders && orders.length > 0) {
                for (const order of orders) {
                    // Fetch product name for each order
                    const product = await ProductService.getProductById(
                        (order as any).productId,
                        tenantId || transaction.tenantId,
                        branchId || transaction.branchId
                    );
                    items.push({
                        name: product?.name || 'Product',
                        quantity: parseFloat((order as any).quantity || 1),
                        unitPrice: parseFloat((order as any).sellPrice || 0),
                        total: parseFloat((order as any).quantity || 1) * parseFloat((order as any).sellPrice || 0),
                        discount: 0,
                        tax: 0
                    });
                }
            }
        }

        return {
            businessName: branch?.branchName || 'Store',
            branchName: branch?.branchName || '',
            address: [branch?.addressLine1, branch?.addressLine2, branch?.city].filter(Boolean).join(', ') || '',
            phone: branch?.phoneNumber || '',
            email: branch?.email || '',
            taxId: (branch as any)?.taxId || '',
            receiptNumber: (transaction as any).refNumber || transactionId.substring(0, 8).toUpperCase(),
            date: new Date((transaction as any).date || (transaction as any).createdAt),
            cashier: (transaction as any).user?.name || (transaction as any).user?.username,
            terminal: (transaction as any).terminalId,
            customer: (transaction as any).customer ? {
                name: (transaction as any).customer.name || (transaction as any).customer.firstName,
                phone: (transaction as any).customer.phone,
                loyaltyPoints: (transaction as any).customer.loyaltyPoints
            } : undefined,
            items,
            subtotal: parseFloat((transaction as any).subtotal || 0),
            taxAmount: parseFloat((transaction as any).tax || 0),
            discountAmount: parseFloat((transaction as any).discount || 0),
            totalAmount: parseFloat((transaction as any).total || 0),
            amountPaid: parseFloat((transaction as any).paid || (transaction as any).total || 0),
            changeAmount: parseFloat((transaction as any).changeAmount || 0),
            paymentMethod: (transaction as any).paymentMethod?.name || 'Cash',
            currency: (branch as any)?.currency || 'MWK'
        };
    }

    /**
     * Fetch order data for receipt
     */
    private static async fetchOrderData(orderId: string): Promise<ReceiptData | null> {
        const orders = await OrderModel.findByRefNumber(orderId);
        if (!orders || orders.length === 0) return null;

        const firstOrder = orders[0] as any;

        // Build items from orders (each order record might be an item)
        const items = orders.map((order: any) => ({
            name: order.productName || 'Product',
            quantity: order.qty || order.quantity || 1,
            unitPrice: parseFloat(order.sellingPrice || order.unitPrice || 0),
            total: parseFloat(order.total || 0),
            discount: parseFloat(order.discount || 0),
            tax: parseFloat(order.tax || 0)
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
            totalAmount: subtotal,
            amountPaid: subtotal,
            changeAmount: 0,
            paymentMethod: 'Cash'
        };
    }

    /**
     * Generate basic receipt when no data available
     */
    private static generateBasicReceipt(request: ReceiptContentRequest): string {
        let content = '';

        content += ESC_POS.INIT;

        if (request.includeHeader !== false) {
            content += ESC_POS.ALIGN_CENTER;
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
            content += 'Thank you for your purchase!\n';
        }

        content += ESC_POS.FEED_LINES(3);
        content += ESC_POS.CUT_PAPER;

        return content;
    }

    /**
     * Format receipt content with ESC/POS commands
     */
    private static formatReceiptContent(data: ReceiptData, request: ReceiptContentRequest): string {
        let content = '';
        const lineWidth = 48; // Standard 80mm thermal printer width in characters

        // Initialize printer
        content += ESC_POS.INIT;

        // Header
        if (request.includeHeader !== false) {
            content += ESC_POS.ALIGN_CENTER;

            // Business name (large)
            content += ESC_POS.DOUBLE_SIZE;
            content += ESC_POS.BOLD_ON;
            content += `${data.businessName}\n`;
            content += ESC_POS.BOLD_OFF;
            content += ESC_POS.NORMAL;

            // Branch name
            if (data.branchName && data.branchName !== data.businessName) {
                content += `${data.branchName}\n`;
            }

            // Address
            if (data.address) {
                content += `${data.address}\n`;
            }

            // Contact info
            if (data.phone) {
                content += `Tel: ${data.phone}\n`;
            }
            if (data.email) {
                content += `${data.email}\n`;
            }
            if (data.taxId) {
                content += `Tax ID: ${data.taxId}\n`;
            }

            content += '='.repeat(lineWidth) + '\n';
        }

        // Receipt details
        content += ESC_POS.ALIGN_LEFT;
        content += ESC_POS.BOLD_ON;
        content += `Receipt #: ${data.receiptNumber}\n`;
        content += ESC_POS.BOLD_OFF;
        content += `Date: ${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}\n`;

        if (data.cashier) {
            content += `Cashier: ${data.cashier}\n`;
        }
        if (data.terminal) {
            content += `Terminal: ${data.terminal}\n`;
        }

        // Customer info
        if (data.customer) {
            content += '-'.repeat(lineWidth) + '\n';
            content += `Customer: ${data.customer.name}\n`;
            if (data.customer.phone) {
                content += `Phone: ${data.customer.phone}\n`;
            }
            if (data.customer.loyaltyPoints !== undefined) {
                content += `Loyalty Points: ${data.customer.loyaltyPoints}\n`;
            }
        }

        // Items header
        content += '='.repeat(lineWidth) + '\n';
        content += this.formatLine('Item', 'Qty', 'Price', 'Total', lineWidth);
        content += '-'.repeat(lineWidth) + '\n';

        // Items
        for (const item of data.items) {
            // Item name (may wrap)
            const itemName = item.name.length > 24 ? item.name.substring(0, 24) + '...' : item.name;
            content += `${itemName}\n`;
            content += this.formatLine(
                '',
                `${item.quantity}x`,
                this.formatCurrency(item.unitPrice, data.currency),
                this.formatCurrency(item.total, data.currency),
                lineWidth
            );

            if (item.discount && item.discount > 0) {
                content += `  Discount: -${this.formatCurrency(item.discount, data.currency)}\n`;
            }
        }

        // Totals
        content += '='.repeat(lineWidth) + '\n';
        content += this.formatTotalLine('Subtotal:', data.subtotal, data.currency, lineWidth);

        if (data.discountAmount > 0) {
            content += this.formatTotalLine('Discount:', -data.discountAmount, data.currency, lineWidth);
        }

        if (data.taxAmount > 0) {
            content += this.formatTotalLine('Tax:', data.taxAmount, data.currency, lineWidth);
        }

        content += '-'.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_HEIGHT;
        content += ESC_POS.BOLD_ON;
        content += this.formatTotalLine('TOTAL:', data.totalAmount, data.currency, lineWidth);
        content += ESC_POS.BOLD_OFF;
        content += ESC_POS.NORMAL;

        // Payment info
        content += '-'.repeat(lineWidth) + '\n';
        content += this.formatTotalLine(`${data.paymentMethod}:`, data.amountPaid, data.currency, lineWidth);

        if (data.changeAmount > 0) {
            content += this.formatTotalLine('Change:', data.changeAmount, data.currency, lineWidth);
        }

        // Footer
        if (request.includeFooter !== false) {
            content += '='.repeat(lineWidth) + '\n';
            content += ESC_POS.ALIGN_CENTER;
            content += '\n';
            content += 'Thank you for your purchase!\n';
            content += 'Please come again\n';

            if (request.customMessage) {
                content += '\n';
                content += `${request.customMessage}\n`;
            }

            content += '\n';
            content += `Printed: ${new Date().toLocaleString()}\n`;
        }

        // Feed and cut
        content += ESC_POS.FEED_LINES(4);
        content += ESC_POS.CUT_PAPER;

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
     */
    static generateTestPageContent(printer: Printer): string {
        let content = '';
        const lineWidth = 48;

        content += ESC_POS.INIT;
        content += ESC_POS.ALIGN_CENTER;

        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_SIZE;
        content += 'PRINTER TEST PAGE\n';
        content += ESC_POS.NORMAL;
        content += '='.repeat(lineWidth) + '\n\n';

        content += ESC_POS.ALIGN_LEFT;
        content += `Printer Name: ${printer.printerName}\n`;
        content += `Printer Type: ${printer.printerType}\n`;
        content += `Connection: ${printer.connectionType}\n`;
        if (printer.printerModel) {
            content += `Model: ${printer.printerModel}\n`;
        }
        content += `Test Date: ${new Date().toLocaleString()}\n\n`;

        // Font test
        content += ESC_POS.ALIGN_CENTER;
        content += '-'.repeat(lineWidth) + '\n';
        content += 'FONT TEST\n';
        content += '-'.repeat(lineWidth) + '\n';

        content += ESC_POS.NORMAL;
        content += 'Normal Text\n';
        content += ESC_POS.BOLD_ON;
        content += 'Bold Text\n';
        content += ESC_POS.BOLD_OFF;
        content += ESC_POS.UNDERLINE_ON;
        content += 'Underlined Text\n';
        content += ESC_POS.UNDERLINE_OFF;
        content += ESC_POS.DOUBLE_HEIGHT;
        content += 'Double Height\n';
        content += ESC_POS.DOUBLE_WIDTH;
        content += 'Double Width\n';
        content += ESC_POS.DOUBLE_SIZE;
        content += 'Double Size\n';
        content += ESC_POS.NORMAL;

        // Alignment test
        content += '\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += 'ALIGNMENT TEST\n';
        content += '-'.repeat(lineWidth) + '\n';

        content += ESC_POS.ALIGN_LEFT;
        content += 'Left Aligned\n';
        content += ESC_POS.ALIGN_CENTER;
        content += 'Center Aligned\n';
        content += ESC_POS.ALIGN_RIGHT;
        content += 'Right Aligned\n';

        // Barcode test
        content += '\n';
        content += ESC_POS.ALIGN_CENTER;
        content += '-'.repeat(lineWidth) + '\n';
        content += 'BARCODE TEST\n';
        content += '-'.repeat(lineWidth) + '\n';

        content += ESC_POS.BARCODE_HEIGHT(60);
        content += ESC_POS.BARCODE_WIDTH(2);
        content += ESC_POS.BARCODE_TEXT_BELOW;
        content += ESC_POS.BARCODE_CODE128('TEST12345');
        content += '\n\n';

        // Character set test
        content += '-'.repeat(lineWidth) + '\n';
        content += 'CHARACTER TEST\n';
        content += '-'.repeat(lineWidth) + '\n';
        content += '0123456789\n';
        content += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
        content += 'abcdefghijklmnopqrstuvwxyz\n';
        content += '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\n';

        // Completion
        content += '\n';
        content += '='.repeat(lineWidth) + '\n';
        content += ESC_POS.DOUBLE_HEIGHT;
        content += 'TEST COMPLETE\n';
        content += ESC_POS.NORMAL;
        content += '='.repeat(lineWidth) + '\n';
        content += '\nPrinter is functioning correctly!\n';

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
