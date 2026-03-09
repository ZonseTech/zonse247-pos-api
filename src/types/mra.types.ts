/**
 * MRA EIS (Electronic Invoicing System) Types
 * Based on MRA API Documentation: https://dev-eis-api.mra.mw/docs/
 * 
 * The MRA EIS Integration follows this flow:
 * 1. Taxpayer applies for terminal on MRA Portal → Gets TAC (Terminal Activation Code)
 * 2. Terminal sends TAC to MRA's activation endpoint → Gets config
 * 3. Terminal persists config locally
 * 4. Terminal confirms activation with MRA
 * 5. Terminal can now submit sales to MRA
 */

// ==================== ENUMS ====================

export enum MraEnvironment {
    SANDBOX = 'SANDBOX',
    PRODUCTION = 'PRODUCTION'
}

export enum MraTerminalStatus {
    PENDING = 'PENDING',
    ACTIVATED = 'ACTIVATED',
    DEACTIVATED = 'DEACTIVATED',
    SUSPENDED = 'SUSPENDED',
    BLOCKED = 'BLOCKED'
}

export enum MraSaleSubmissionStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED'
}

// ==================== API CONFIGURATION ====================

export interface MraApiConfig {
    configId: string;
    tenantId: string;
    environment: MraEnvironment;
    apiBaseUrl: string;
    apiKey?: string;
    apiSecret?: string;
    terminalId?: string;
    mraTerminalId?: string;
    secretKey?: string;        // HMAC-SHA512 secret key from MRA
    ivKey?: string;            // Initialization vector for encryption
    lastSyncTimestamp?: Date;
    syncStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// ==================== TERMINAL ACTIVATION ====================

/**
 * Request to activate a terminal with MRA
 * Requires TAC (Terminal Activation Code) obtained from MRA Portal
 */
export interface MraTerminalActivationRequest {
    tac: string;                 // Terminal Activation Code from MRA Portal
    terminalId: string;          // Internal terminal ID
    deviceId?: string;           // Device identifier
    osName?: string;             // Operating system name
    osVersion?: string;          // Operating system version
    posProductId?: string;       // POS software product ID
    posProductVersion?: string;  // POS software version
}

/**
 * Response from MRA terminal activation endpoint
 */
export interface MraTerminalActivationResponse {
    success: boolean;
    message: string;
    data?: {
        terminalId: string;           // MRA-assigned terminal ID
        taxpayerInfo: MraTaxpayerInfo;
        terminalConfig: MraTerminalConfig;
        globalConfig: MraGlobalConfig;
        securityKeys: MraSecurityKeys;
    };
    error?: MraErrorResponse;
}

/**
 * Taxpayer information returned during activation
 */
export interface MraTaxpayerInfo {
    tpin: string;              // Taxpayer Identification Number (TIN/TPIN)
    taxpayerName: string;      // Business/Taxpayer name
    tradingName?: string;      // Trading name if different
    address?: string;          // Physical address
    district?: string;         // District location
    phoneNumber?: string;
    email?: string;
    vatNumber?: string;        // VAT registration number
    tourismLevy?: boolean;     // Subject to tourism levy
    category?: string;         // Business category
}

/**
 * Terminal-specific configuration from MRA
 */
export interface MraTerminalConfig {
    terminalCode: string;
    branchCode?: string;
    maxOfflineTransactionAge: number;    // Hours
    maxOfflineCumulativeAmount: number;  // Maximum offline amount
    configVersion: number;
    receiptPrefix?: string;
    fiscalDayStartHour?: number;         // Hour when fiscal day starts (0-23)
    forceSendTimeout?: number;           // Minutes before forcing send
    heartbeatInterval?: number;          // Minutes between heartbeats
    features?: {
        offlineEnabled: boolean;
        voidEnabled: boolean;
        refundEnabled: boolean;
    };
}

/**
 * Global configuration settings
 */
export interface MraGlobalConfig {
    vatRate: number;           // Standard VAT rate (e.g., 16.5%)
    currencyCode: string;      // Currency code (MWK)
    currencySymbol: string;    // Currency symbol (MK)
    dateFormat: string;        // Date format pattern
    timeFormat: string;        // Time format pattern
    decimalPlaces: number;     // Decimal places for amounts
    taxRates: MraTaxRate[];    // All applicable tax rates
}

/**
 * Tax rate configuration
 */
export interface MraTaxRate {
    code: string;              // Tax code (A, B, C, etc.)
    name: string;              // Tax name
    rate: number;              // Tax rate percentage
    isDefault: boolean;        // Is the default rate
    validFrom: Date;
    validTo?: Date;
}

/**
 * Security keys for signing and verification
 */
export interface MraSecurityKeys {
    secretKey: string;         // HMAC-SHA512 secret key
    ivKey: string;             // Initialization vector for encryption
    keyVersion: number;        // Key version for rotation
    expiresAt?: Date;          // Key expiration date
}

// ==================== TERMINAL ACTIVATION CONFIRMATION ====================

/**
 * Request to confirm terminal activation
 * Sent after successfully persisting configuration
 */
export interface MraActivationConfirmationRequest {
    terminalId: string;        // MRA terminal ID
    configVersion: number;     // Config version that was persisted
    deviceInfo?: {
        deviceId: string;
        osName: string;
        osVersion: string;
        posProductId: string;
        posProductVersion: string;
    };
}

/**
 * Response from activation confirmation
 */
export interface MraActivationConfirmationResponse {
    success: boolean;
    message: string;
    data?: {
        status: MraTerminalStatus;
        activatedAt: Date;
    };
    error?: MraErrorResponse;
}

// ==================== CONFIGURATION SYNC ====================

/**
 * Request to get latest configuration
 * Should be called at start of each business day and on terminal restart
 */
export interface MraGetConfigRequest {
    terminalId: string;        // MRA terminal ID
    currentConfigVersion: number;
}

/**
 * Response from get latest configuration
 */
export interface MraGetConfigResponse {
    success: boolean;
    message: string;
    data?: {
        hasUpdates: boolean;
        terminalConfig?: MraTerminalConfig;
        globalConfig?: MraGlobalConfig;
        securityKeys?: MraSecurityKeys;  // Only if keys were rotated
    };
    error?: MraErrorResponse;
}

// ==================== SALE SUBMISSION ====================

/**
 * Sale/Invoice item for MRA submission
 */
export interface MraSaleItem {
    itemNo: number;            // Line item number
    itemCode: string;          // Product code/SKU
    itemDesc: string;          // Product description
    quantity: number;
    unitOfMeasure: string;     // Unit (PCS, KG, L, etc.)
    unitPrice: number;         // Price before tax
    discountAmount?: number;
    taxCode: string;           // Tax rate code (A, B, C, etc.)
    taxAmount: number;
    totalAmount: number;       // After tax and discount
    hsCode?: string;           // Harmonized System code
}

/**
 * Payment information for MRA submission
 */
export interface MraPaymentInfo {
    paymentMethod: string;     // CASH, CARD, MOBILE, CREDIT, etc.
    amount: number;
    reference?: string;        // Transaction reference
    cardType?: string;         // VISA, MASTERCARD, etc.
    cardLastFourDigits?: string;
}

/**
 * Sale submission request to MRA
 */
export interface MraSaleSubmissionRequest {
    terminalId: string;        // MRA terminal ID
    invoiceNumber: string;     // Local invoice/receipt number
    invoiceType: 'NORMAL' | 'COPY' | 'TRAINING' | 'PROFORMA';
    transactionType: 'SALE' | 'REFUND' | 'VOID';
    transactionDate: Date;
    transactionTime: string;   // HH:mm:ss format

    // Customer info (optional for B2C, required for B2B)
    customerTpin?: string;
    customerName?: string;
    customerAddress?: string;

    // Items
    items: MraSaleItem[];

    // Totals
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    totalAmount: number;

    // Tax breakdown by code
    taxSummary: {
        taxCode: string;
        taxableAmount: number;
        taxAmount: number;
    }[];

    // Payment
    payments: MraPaymentInfo[];
    amountPaid: number;
    changeAmount: number;

    // Offline handling
    isOffline: boolean;
    offlineSignature?: string; // Signature generated offline
    offlineQrData?: string;    // QR data generated offline

    // Reference to original (for refund/void)
    originalInvoiceNumber?: string;

    // Remarks
    remarks?: string;
}

/**
 * Response from sale submission
 */
export interface MraSaleSubmissionResponse {
    success: boolean;
    message: string;
    data?: {
        mraInvoiceId: string;        // MRA's invoice ID
        verificationCode: string;     // Verification code for QR
        qrCodeData: string;          // Data for generating QR code
        verificationUrl: string;     // URL for online verification
        fiscalSignature: string;     // Digital signature
        responseCode: string;
        responseDesc: string;
        submittedAt: Date;
    };
    error?: MraErrorResponse;
}

// ==================== UTILITIES ====================

/**
 * Ping/health check response
 */
export interface MraPingResponse {
    success: boolean;
    serverTime?: Date;
    apiVersion?: string;
    status?: 'OK' | 'MAINTENANCE' | 'DEGRADED';
    error?: MraErrorResponse;
}

/**
 * Offline signature request for local signing
 */
export interface MraOfflineSignatureRequest {
    terminalId: string;
    secretKey: string;
    payload: unknown;
}

/**
 * Product status check request
 */
export interface MraProductStatusRequest {
    terminalId: string;
    productCode: string;
}

/**
 * Product status response
 */
export interface MraProductStatusResponse {
    success: boolean;
    data?: {
        productCode: string;
        isMapped: boolean;
        categoryCode?: string;
        categoryName?: string;
        stockLevel?: number;
    };
    error?: MraErrorResponse;
}

/**
 * Last transaction query response
 */
export interface MraLastTransactionResponse {
    success: boolean;
    data?: {
        invoiceNumber: string;
        mraInvoiceId: string;
        transactionDate: Date;
        totalAmount: number;
        status: 'SUBMITTED' | 'PENDING' | 'REJECTED';
    };
    error?: MraErrorResponse;
}

// ==================== ERROR HANDLING ====================

/**
 * Standard MRA error response
 */
export interface MraErrorResponse {
    code: string;              // Error code
    message: string;           // Error message
    details?: string;          // Additional details
    timestamp: Date;
}

/**
 * Common MRA error codes
 */
export const MRA_ERROR_CODES = {
    INVALID_TAC: 'ERR001',
    TAC_EXPIRED: 'ERR002',
    TAC_ALREADY_USED: 'ERR003',
    TERMINAL_NOT_FOUND: 'ERR004',
    TERMINAL_NOT_ACTIVATED: 'ERR005',
    TERMINAL_BLOCKED: 'ERR006',
    INVALID_SIGNATURE: 'ERR007',
    DUPLICATE_INVOICE: 'ERR008',
    INVALID_INVOICE_DATA: 'ERR009',
    CONFIG_VERSION_MISMATCH: 'ERR010',
    UNAUTHORIZED: 'ERR401',
    FORBIDDEN: 'ERR403',
    SERVER_ERROR: 'ERR500',
};

// ==================== INTERNAL TYPES ====================

/**
 * Internal MRA onboarding status
 */
export interface MraOnboardingStatus {
    tenantId: string;
    branchId: string;
    terminalId: string;
    mraTerminalId?: string;
    status: MraTerminalStatus;
    tacUsed?: boolean;
    configPersisted: boolean;
    activationConfirmed: boolean;
    lastConfigSync?: Date;
    configVersion?: number;
    errorMessage?: string;
}

/**
 * MRA terminal activation input for service
 */
export interface MraActivateTerminalInput {
    tenantId: string;
    branchId: string;
    terminalId: string;
    tac: string;
    environment?: MraEnvironment;
}

/**
 * MRA terminal activation result
 */
export interface MraActivateTerminalResult {
    success: boolean;
    mraTerminalId?: string;
    message: string;
    taxpayerInfo?: MraTaxpayerInfo;
    requiresConfirmation: boolean;
}
