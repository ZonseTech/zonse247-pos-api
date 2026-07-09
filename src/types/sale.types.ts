import { SaleStatus } from '../databases/prisma/generated/prisma/client';

/**
 * Base Sale entity - represents a completed transaction
 */
export interface Sale {
    id: string;
    tenantId: string;
    branchId: string;
    saleNumber: string;
    customerId?: string;
    terminalId?: string;
    userId: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    otherCharges: number;
    totalAmount: number;
    amountPaid: number;
    changeAmount: number;
    paymentMethodId?: string;
    status: SaleStatus;
    saleDate: Date;
    notes?: string;
    isVoided: boolean;
    voidedAt?: Date;
    voidedBy?: string;
    voidReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Individual item within a sale
 */
export interface SaleItem {
    id: string;
    saleId: string;
    variantId: string;
    productId?: string;     // Legacy - kept for backward compatibility
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    createdAt: Date;
}

/**
 * Input for creating a payment (split payment support)
 */
export interface SalePaymentInput {
    paymentMethodId: string;
    amount: number;
    reference?: string;
    providerId?: string;
    providerRef?: string;
    notes?: string;
}

/**
 * Payment record associated with a sale
 */
export interface SalePayment {
    id: string;
    saleId: string;
    paymentMethodId: string;
    amount: number;
    reference?: string;
    providerId?: string;
    providerRef?: string;
    status: PaymentStatus;
    processedAt: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    paymentMethod?: PaymentMethodInfo;
}

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED' | 'FAILED';

/**
 * Input for creating a new sale
 */
export interface CreateSaleInput {
    tenantId: string;
    branchId: string;
    customerId?: string;
    terminalId?: string;
    userId: string;
    taxAmount?: number;
    discountAmount?: number;
    otherCharges?: number | OtherChargeInput[];
    amountPaid: number;
    paymentMethodId?: string;
    payments?: SalePaymentInput[];
    notes?: string;
    items: CreateSaleItemInput[];
    /** Backdate the sale's transaction date; omit to use "now" */
    saleDate?: string;
}

/**
 * Input for other charges (fees, service charges, etc.)
 */
export interface OtherChargeInput {
    type: string;
    label: string;
    value: number;
    isPercentage: boolean;
    amount: number;
}

/**
 * Input for a single sale item
 */
export interface CreateSaleItemInput {
    variantId: string;
    productId?: string;     // Legacy support
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    discountAmount?: number;
}

/**
 * Input for voiding a sale
 */
export interface VoidSaleInput {
    voidedBy: string;
    voidReason: string;
}

/**
 * Options for listing sales
 */
export interface ListSalesOptions {
    status?: SaleStatus;
    userId?: string;
    terminalId?: string;
    paymentMethodId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    includeItems?: boolean;
    search?: string;
}

/**
 * Options for sales summary
 */
export interface SalesSummaryOptions {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    paymentMethodId?: string;
    userId?: string;
    terminalId?: string;
}

/**
 * Sale with all related items and payment details
 */
export interface SaleWithItems extends Sale {
    items: SaleItemWithDetails[];
    payments?: SalePayment[];
    paymentMethod?: PaymentMethodInfo;
    terminal?: TerminalInfo;
    user?: UserInfo;
    customer?: CustomerInfo;
}

/**
 * Sale item with variant and product details
 */
export interface SaleItemWithDetails extends SaleItem {
    variant?: VariantInfo;
    product?: ProductInfo;
}

/**
 * Paginated sales response
 */
export interface PaginatedSalesResponse {
    sales: SaleWithItems[];
    total: number;
    totalPages: number;
}

/**
 * Sales summary statistics
 */
export interface SalesSummary {
    totalSales: number;
    totalVoided: number;
    netSales: number;
    totalCount: number;
    completedCount: number;
    voidedCount: number;
    refundedCount: number;
}

export interface PaymentMethodInfo {
    methodId: string;
    name: string;
    icon?: string;
}

export interface TerminalInfo {
    terminalId: string;
    terminalLabel: string;
    terminalCode: string;
}

export interface UserInfo {
    userId: string;
    fullname: string;
    username: string;
}

export interface CustomerInfo {
    customerId: string;
    name: string;
    phone?: string;
    email?: string;
}

export interface VariantInfo {
    id: string;
    variantName: string;
    sku?: string | null;
    product: {
        id: string;
        name: string;
    };
}

export interface ProductInfo {
    id: string;
    name: string;
    sku?: string | null;
}

/**
 * Internal type for processing sale items with cost information
 */
export interface ProcessedSaleItem {
    productId: string;  // Parent product ID (for legacy support)
    variantId: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    inventoryId: string;
}

/**
 * Payment data ready for database insertion
 */
export interface PaymentCreateData {
    id: string;
    paymentMethodId: string;
    amount: number;
    reference: string | null;
    providerId: string | null;
    providerRef: string | null;
    notes: string | null;
    status: string;
}
