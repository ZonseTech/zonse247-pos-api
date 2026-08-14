import {
    formatReceipt,
    generateBasicReceipt,
    formatLabel,
    generateBasicLabel,
    ReceiptData,
    ReceiptFormatOptions,
    ProductLabelData,
} from '@zonse247/print-engine';
import { OrderModel } from '../../models/order.model';
import { BranchModel } from '../../models/branch.model';
import { ProductService } from '../inventory/product.service';
import { SaleService } from '../sale.service';
import { TerminalSettingsModel } from '../../models/terminal-settings.model';
import { ReceiptDisplaySettings } from '../../types/terminal-settings';

export interface ReceiptContentRequest extends ReceiptFormatOptions {
    saleId?: string;
    transactionId?: string;
    orderId?: string;
    tenantId?: string;
    branchId?: string;
    terminalId?: string;
    // Receipt display settings from terminal settings
    receiptSettings?: ReceiptDisplaySettings;
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

export type { ReceiptData };

/**
 * Fetches the sale/order/product data a receipt or label needs, then hands
 * off to @zonse247/print-engine's pure formatters. All ESC/POS/ZPL content
 * generation itself lives in the package — this service owns only the
 * database lookups that assemble the data the package formats.
 */
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
            const reference = request.saleId || request.transactionId || request.orderId;
            return generateBasicReceipt(reference, request, receiptSettings);
        }

        return formatReceipt(receiptData, request, receiptSettings);
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
            return generateBasicLabel(request);
        }

        const productData: ProductLabelData = {
            name: product.name,
            sku: (product as any).sku ?? null,
            unit: (product as any).unit ?? null,
            sellingPrice: (product as any).sellingPrice ?? null,
            primaryBarcode: (product as any).primaryBarcode ?? null,
        };

        return formatLabel(productData, request);
    }
}
