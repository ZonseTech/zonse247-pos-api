/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 as uuidv4 } from 'uuid';
import {
    SaleWithItems,
    SaleItemWithDetails,
    SalePayment,
    ProcessedSaleItem,
    PaymentCreateData,
    SalePaymentInput,
    CreateSaleItemInput,
} from '../types/sale.types';
import { SALE_NUMBER, roundCurrency } from '../constants/sale.constants';

/**
 * Generate a formatted sale number prefix based on current date
 * Format: SALE-YYYYMMDD
 */
export function generateSaleNumberPrefix(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${SALE_NUMBER.PREFIX}-${year}${month}${day}`;
}

/**
 * Format the complete sale number with sequence
 * @param prefix - Date-based prefix
 * @param sequence - Sequence number
 * @returns Formatted sale number (e.g., SALE-20260208-00001)
 */
export function formatSaleNumber(prefix: string, sequence: number): string {
    return `${prefix}-${String(sequence).padStart(SALE_NUMBER.SEQUENCE_PADDING, '0')}`;
}

/**
 * Extract sequence number from a sale number string
 * @param saleNumber - Full sale number string
 * @returns Sequence number or 0 if invalid
 */
export function extractSequenceNumber(saleNumber: string): number {
    const parts = saleNumber.split('-');
    return parseInt(parts[parts.length - 1] || '0', 10);
}

/**
 * Calculate totals for a sale item
 * @param item - Input item with price and quantity
 * @returns Calculated subtotal, tax, discount, and total
 */
export function calculateItemTotals(item: CreateSaleItemInput): {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
} {
    const subtotal = item.quantity * item.unitPrice;
    const taxAmount = item.taxAmount || 0;
    const discountAmount = item.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    return {
        subtotal: roundCurrency(subtotal),
        taxAmount: roundCurrency(taxAmount),
        discountAmount: roundCurrency(discountAmount),
        totalAmount: roundCurrency(totalAmount),
    };
}

/**
 * Create a processed sale item ready for database insertion
 */
export function createProcessedItem(
    item: CreateSaleItemInput,
    inventoryId: string,
    averageCost: number,
    productId: string
): ProcessedSaleItem {
    const { subtotal, taxAmount, discountAmount, totalAmount } = calculateItemTotals(item);

    return {
        productId,  // Parent product ID for legacy database column
        variantId: item.variantId || item.productId!,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: averageCost,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        inventoryId,
    };
}

/**
 * Create payment data objects ready for database insertion
 * @param payments - Array of payment inputs
 * @returns Array of payment create data
 */
export function createPaymentData(payments: SalePaymentInput[]): PaymentCreateData[] {
    return payments.map(payment => ({
        id: uuidv4(),
        paymentMethodId: payment.paymentMethodId,
        amount: payment.amount,
        reference: payment.reference || null,
        providerId: payment.providerId || null,
        providerRef: payment.providerRef || null,
        notes: mergePhoneNumberIntoNotes(payment.notes, payment.phoneNumber),
        status: 'COMPLETED',
    }));
}

/**
 * SalePayment has no dedicated phoneNumber column, so mobile money phone
 * numbers are folded into `notes` on the way in.
 */
function mergePhoneNumberIntoNotes(notes?: string, phoneNumber?: string): string | null {
    const phoneNote = phoneNumber ? `Phone: ${phoneNumber}` : null;
    if (phoneNote && notes) return `${phoneNote} | ${notes}`;
    return phoneNote || notes || null;
}

/**
 * Create single payment data from legacy paymentMethodId
 * @param paymentMethodId - Single payment method ID
 * @param amount - Total payment amount
 * @returns Array with single payment create data
 */
export function createSinglePaymentData(paymentMethodId: string, amount: number): PaymentCreateData[] {
    return [{
        id: uuidv4(),
        paymentMethodId,
        amount,
        reference: null,
        providerId: null,
        providerRef: null,
        notes: null,
        status: 'COMPLETED',
    }];
}

/**
 * Calculate total paid from multiple payments
 * @param payments - Array of payment inputs
 * @returns Total amount paid
 */
export function calculateTotalPaid(payments: SalePaymentInput[]): number {
    return payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Map raw database sale to response format
 * Provides backward compatibility by including flattened product info
 */
export function mapSaleToResponse(sale: any): SaleWithItems {
    return {
        id: sale.id,
        tenantId: sale.tenantId,
        branchId: sale.branchId,
        saleNumber: sale.saleNumber,
        customerId: sale.customerId,
        terminalId: sale.terminalId,
        userId: sale.userId,
        subtotal: Number(sale.subtotal),
        taxAmount: Number(sale.taxAmount),
        discountAmount: Number(sale.discountAmount),
        otherCharges: Number(sale.otherCharges || 0),
        totalAmount: Number(sale.totalAmount),
        amountPaid: Number(sale.amountPaid),
        changeAmount: Number(sale.changeAmount),
        paymentMethodId: sale.paymentMethodId,
        status: sale.status,
        saleDate: sale.saleDate,
        notes: sale.notes,
        isVoided: sale.isVoided,
        voidedAt: sale.voidedAt,
        voidedBy: sale.voidedBy,
        voidReason: sale.voidReason,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        items: mapSaleItems(sale.items),
        payments: sale.payments?.map(mapPayment),
        paymentMethod: sale.paymentMethod,
        terminal: sale.terminal,
        user: sale.user,
        customer: sale.customer,
    };
}

/**
 * Map sale items with variant/product details
 */
function mapSaleItems(items: any[]): SaleItemWithDetails[] {
    return items.map(item => {
        const variant = item.variant;
        const product = variant?.product;
        const displayName = getProductDisplayName(product?.name, variant?.variantName);

        return {
            id: item.id,
            saleId: item.saleId,
            variantId: item.variantId,
            productId: variant?.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            unitCost: Number(item.unitCost),
            subtotal: Number(item.subtotal),
            taxAmount: Number(item.taxAmount),
            discountAmount: Number(item.discountAmount),
            totalAmount: Number(item.totalAmount),
            createdAt: item.createdAt,
            variant: variant ? {
                id: variant.id,
                variantName: variant.variantName,
                sku: variant.sku,
                product: product,
            } : undefined,
            // Legacy: Flattened product info for backward compatibility
            product: product ? {
                id: product.id,
                name: displayName,
                sku: variant?.sku,
            } : undefined,
        };
    });
}

/**
 * Map payment record to response format
 */
function mapPayment(payment: any): SalePayment {
    return {
        id: payment.id,
        saleId: payment.saleId,
        paymentMethodId: payment.paymentMethodId,
        amount: Number(payment.amount),
        reference: payment.reference,
        providerId: payment.providerId,
        providerRef: payment.providerRef,
        status: payment.status,
        processedAt: payment.processedAt,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        paymentMethod: payment.paymentMethod,
        provider: payment.provider || undefined,
    };
}

/**
 * Get display name for product/variant combination
 * @param productName - Base product name
 * @param variantName - Variant name
 * @returns Combined display name
 */
export function getProductDisplayName(productName?: string, variantName?: string): string {
    if (!productName) return 'Unknown Product';
    if (!variantName || variantName === 'Default') return productName;
    return `${productName} - ${variantName}`;
}

/**
 * Validate stock availability for a sale
 * @throws Error if insufficient stock
 */
export function validateStockAvailability(
    inventory: any,
    requestedQuantity: number,
    displayName: string
): void {
    if (inventory.trackInventory && !inventory.allowNegativeStock) {
        if (inventory.availableQuantity < requestedQuantity) {
            throw new Error(
                `Insufficient stock for ${displayName}. ` +
                `Available: ${inventory.availableQuantity}, Requested: ${requestedQuantity}`
            );
        }
    }
}

/**
 * Validate payment amount covers total
 * @throws Error if insufficient payment
 */
export function validatePaymentAmount(totalAmount: number, totalPaid: number): void {
    if (totalPaid < totalAmount) {
        throw new Error(
            `Insufficient payment amount. Total: ${totalAmount}, Paid: ${totalPaid}`
        );
    }
}

/**
 * Validate a client-supplied sale date (used for backdating sales)
 * @throws Error if the date is unparseable or in the future
 */
export function validateSaleDate(saleDate?: string): void {
    if (!saleDate) return;

    const parsed = new Date(saleDate);
    if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid sale date: ${saleDate}`);
    }
    if (parsed.getTime() > Date.now()) {
        throw new Error('Sale date cannot be in the future');
    }
}

/**
 * Build the standard include object for sale queries
 * Centralizes the relation includes for consistency
 */
export function buildSaleInclude(): any {
    return {
        items: {
            include: {
                variant: {
                    include: {
                        product: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        },
        payments: {
            include: {
                paymentMethod: {
                    select: {
                        methodId: true,
                        name: true,
                        icon: true,
                        parent: { select: { methodId: true, name: true, icon: true } },
                    },
                },
                provider: {
                    select: { providerId: true, name: true, logoUrl: true },
                },
            },
        },
        paymentMethod: {
            select: {
                methodId: true,
                name: true,
                icon: true,
                parent: { select: { methodId: true, name: true, icon: true } },
            },
        },
        terminal: {
            select: { terminalId: true, terminalLabel: true, terminalCode: true },
        },
        user: {
            select: { userId: true, fullname: true, username: true },
        },
        customer: {
            select: { customerId: true, name: true, phone: true, email: true },
        },
    };
}

/**
 * Build date filter for Prisma where clause
 * @param startDate - Optional start date
 * @param endDate - Optional end date
 * @returns Date filter object or undefined
 */
export function buildDateFilter(startDate?: Date, endDate?: Date): any {
    if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return { gte: startDate, lte: endOfDay };
    }
    if (startDate) {
        return { gte: startDate };
    }
    if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return { lte: endOfDay };
    }
    return undefined;
}

/**
 * Build search filter for sales
 * @param search - Search term
 * @returns OR filter array for Prisma
 */
export function buildSearchFilter(search: string): any[] {
    return [
        { saleNumber: { contains: search } },
        { notes: { contains: search } },
        { customer: { name: { contains: search } } },
        {
            user: {
                OR: [
                    { fullname: { contains: search } },
                    { username: { contains: search } },
                ],
            },
        },
    ];
}
