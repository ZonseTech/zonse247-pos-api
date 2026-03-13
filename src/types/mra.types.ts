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
 * Platform information for terminal activation
 * All fields are required by MRA API
 */
export interface MraPlatformInfo {
    osName: string;
    osVersion: string;
    osBuild: string;      // Required by MRA API
    macAddress: string;   // Required by MRA API
}

/**
 * POS product information for terminal activation
 */
export interface MraPosInfo {
    productID: string;
    productVersion: string;
}

/**
 * Terminal runtime environment for activation request
 */
export interface MraTerminalRuntimeEnvironment {
    platform: MraPlatformInfo;
    pos: MraPosInfo;
}

/**
 * Request to activate a terminal with MRA
 * Requires TAC (Terminal Activation Code) obtained from MRA Portal
 * 
 * @see https://dev-eis-api.mra.mw/docs/terminal_activation.htm
 */
export interface MraTerminalActivationRequest {
    terminalActivationCode: string;     // Terminal Activation Code from MRA Portal
    environment: MraTerminalRuntimeEnvironment;
}

/**
 * Terminal credentials returned during activation
 */
export interface MraTerminalCredentials {
    jwtToken: string | null;
    secretKey: string | null;
}

/**
 * Activated terminal info from MRA
 */
export interface MraActivatedTerminal {
    terminalId: string | null;
    terminalPosition: number | null;
    taxpayerId: number;
    activationDate: string | null;
    terminalCredentials: MraTerminalCredentials | null;
}

/**
 * Tax rate configuration from MRA
 */
export interface MraTaxRateDto {
    id: string | null;
    name: string | null;
    chargeMode: string | null;
    ordinal: number;
    rate: number;
}

/**
 * Global (tax) configuration from MRA
 */
export interface MraTaxConfiguration {
    id: number;
    versionNo: number;
    taxrates: MraTaxRateDto[] | null;
}

/**
 * Tax office information
 */
export interface MraTaxOfficeDto {
    code: string | null;
    name: string | null;
}

/**
 * Activated levy information
 */
export interface MraActivatedLevyDto {
    id: string | null;
    name: string | null;
    chargeMode: string | null;
    rate: number;
    isActive: boolean;
}

/**
 * Taxpayer configuration from MRA
 */
export interface MraTaxpayerConfiguration {
    versionNo: number;
    tin: string | null;
    isVATRegistered: boolean;
    taxOfficeCode: string | null;
    taxOffice: MraTaxOfficeDto | null;
    activatedTaxRateIds: string[] | null;
    activatedLevies: MraActivatedLevyDto[] | null;
}

/**
 * Terminal site information
 */
export interface MraTerminalSiteDto {
    siteId: string | null;
    siteName: string | null;
}

/**
 * Offline transaction limits
 */
export interface MraOfflineLimit {
    maxTransactionAgeInHours: number;
    maxCummulativeAmount: number;
}

/**
 * Terminal configuration from MRA
 */
export interface MraTerminalConfigurationResponse {
    versionNo: number;
    terminalLabel: string | null;
    isActiveTerminal: boolean;
    emailAddress: string | null;
    phoneNumber: string | null;
    tradingName: string | null;
    addressLines: string[] | null;
    terminalSite: MraTerminalSiteDto | null;
    offlineLimit: MraOfflineLimit | null;
}

/**
 * Combined configuration from MRA activation
 */
export interface MraConfiguration {
    globalConfiguration: MraTaxConfiguration | null;
    terminalConfiguration: MraTerminalConfigurationResponse | null;
    taxpayerConfiguration: MraTaxpayerConfiguration | null;
}

/**
 * Response data from MRA terminal activation endpoint
 */
export interface MraTerminalActivationResponseData {
    activatedTerminal: MraActivatedTerminal | null;
    configuration: MraConfiguration | null;
}

/**
 * Response from MRA terminal activation endpoint
 * 
 * @see https://dev-eis-api.mra.mw/docs/terminal_activation.htm
 */
export interface MraTerminalActivationResponse {
    statusCode: number;
    remark: string | null;
    data: MraTerminalActivationResponseData;
    errors: MraErrorDetail[] | null;
}

/**
 * MRA API error detail
 */
export interface MraErrorDetail {
    errorCode: number;
    fieldName: string | null;
    errorMessage: string | null;
}

/**
 * Request to confirm terminal activation with MRA
 */
export interface MraActivationConfirmationRequest {
    terminalId: string;
}

/**
 * Response from MRA terminal activation confirmation endpoint
 */
export interface MraActivationConfirmationResponse {
    statusCode: number;
    remark: string | null;
    data: boolean;
    errors: MraErrorDetail[] | null;
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

// ==================== TERMINAL SITE PRODUCTS ====================

/**
 * Product/Service from MRA terminal site
 */
export interface MraTerminalProduct {
    productCode: string;
    productName: string;
    description?: string;
    categoryCode: string;
    categoryName: string;
    unitOfMeasure: string;
    unitPrice: number;
    taxCode: string;
    taxRate: number;
    hsCode?: string;
    isService: boolean;
    stockLevel?: number;
    isActive: boolean;
}

/**
 * Response from get terminal site products endpoint
 */
export interface MraTerminalProductsResponse {
    success: boolean;
    message?: string;
    data?: {
        products: MraTerminalProduct[];
        totalCount: number;
        lastUpdated: Date;
    };
    error?: MraErrorResponse;
}

// ==================== TIN VALIDATION ====================

/**
 * TIN validation request
 */
export interface MraTinValidationRequest {
    tin: string;               // Taxpayer Identification Number
}

/**
 * TIN validation response
 */
export interface MraTinValidationResponse {
    success: boolean;
    message?: string;
    data?: {
        tin: string;
        isValid: boolean;
        taxpayerName?: string;
        tradingName?: string;
        registrationStatus?: string;
        vatRegistered?: boolean;
        businessCategory?: string;
    };
    error?: MraErrorResponse;
}

// ==================== TERMINAL BLOCKING ====================

/**
 * Terminal blocking message response
 */
export interface MraBlockingMessageResponse {
    success: boolean;
    message?: string;
    data?: {
        isBlocked: boolean;
        blockingReason?: string;
        blockedAt?: Date;
        blockedBy?: string;
        instructions?: string;
    };
    error?: MraErrorResponse;
}

/**
 * Terminal unblock status response
 */
export interface MraUnblockStatusResponse {
    success: boolean;
    message?: string;
    data?: {
        isUnblocked: boolean;
        unblockedAt?: Date;
        previousBlockingReason?: string;
    };
    error?: MraErrorResponse;
}

// ==================== VAT CERTIFICATE VALIDATION ====================

/**
 * VAT 5 Certificate validation request
 */
export interface MraVat5ValidationRequest {
    certificateNumber: string;
    supplierTin?: string;
}

/**
 * VAT 5 Certificate validation response
 */
export interface MraVat5ValidationResponse {
    success: boolean;
    message?: string;
    data?: {
        certificateNumber: string;
        isValid: boolean;
        supplierTin?: string;
        supplierName?: string;
        issueDate?: Date;
        expiryDate?: Date;
        certificateType?: string;
        exemptions?: string[];
    };
    error?: MraErrorResponse;
}

// ==================== SERVICE HEALTH ====================

/**
 * Service health check result
 */
export interface MraServiceHealthResult {
    reachable: boolean;
    latencyMs?: number;
    serverTime?: Date;
    apiVersion?: string;
    status?: 'OK' | 'MAINTENANCE' | 'DEGRADED';
    errorMessage?: string;
}

// ==================== OFFLINE TRANSACTION ====================

/**
 * Offline transaction limits from configuration
 */
export interface MraOfflineLimits {
    maxTransactionAgeInHours: number;
    maxCumulativeAmount: number;
    maxTransactionCount?: number;
}

/**
 * Offline transaction status
 */
export interface MraOfflineTransactionStatus {
    isWithinLimits: boolean;
    currentAge: number;
    currentCumulativeAmount: number;
    transactionCount: number;
    limits: MraOfflineLimits;
    warnings?: string[];
}

// ==================== INVENTORY UPLOAD ====================

/**
 * Initial inventory upload item
 */
export interface MraInventoryItem {
    productCode: string;
    productName: string;
    description?: string;
    categoryCode: string;
    unitOfMeasure: string;
    unitPrice: number;
    taxCode: string;
    openingStock: number;
    hsCode?: string;
}

/**
 * Initial inventory upload request
 */
export interface MraInventoryUploadRequest {
    items: MraInventoryItem[];
    effectiveDate: Date;
}

/**
 * Initial inventory upload response
 */
export interface MraInventoryUploadResponse {
    success: boolean;
    message?: string;
    data?: {
        uploadId: string;
        itemsReceived: number;
        itemsAccepted: number;
        itemsRejected: number;
        rejectedItems?: Array<{
            productCode: string;
            reason: string;
        }>;
        status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    };
    error?: MraErrorResponse;
}
