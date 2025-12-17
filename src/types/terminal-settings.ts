import { Decimal } from '../databases/prisma/generated/prisma/internal/prismaNamespace';
import { JsonValue } from '../databases/prisma/generated/prisma/internal/prismaNamespace';

// ==========================================
// MAIN TERMINAL SETTINGS INTERFACE
// ==========================================

export interface TerminalSettings {
    id: string;
    terminalId: string;

    // General Information
    storeName: string | null;
    storeAddress: string | null;
    storePhone: string | null;
    storeEmail: string | null;
    currency: string;
    taxRate: Decimal;
    businessLicense: string | null;
    businessTaxId: string | null;

    // Localization & Display Settings
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;

    // Security & Access Control
    pinLength: number;
    sessionTimeoutMinutes: number;
    autoLogoutMinutes: number;
    serverUrl: string | null;

    // JSON Settings Groups
    localizationSettings: JsonValue | null;
    transactionSettings: JsonValue | null;
    customerSettings: JsonValue | null;
    receiptSettings: JsonValue | null;
    paymentSettings: JsonValue | null;
    mraComplianceSettings: JsonValue | null;
    inventorySettings: JsonValue | null;
    syncSettings: JsonValue | null;
    securitySettings: JsonValue | null;
    performanceSettings: JsonValue | null;
    hardwareSettings: JsonValue | null;
    integrationSettings: JsonValue | null;
    workflowSettings: JsonValue | null;
    backupSettings: JsonValue | null;
    displaySettings: JsonValue | null;
    taxFeeSettings: JsonValue | null;
    customerManagementSettings: JsonValue | null;
    reportingSettings: JsonValue | null;

    // Audit & Metadata
    settingsVersion: string;
    lastConfiguredBy: string | null;
    configurationDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==========================================
// JSON SETTINGS GROUP INTERFACES
// ==========================================

export interface LocalizationSettings {
    currencyDecimalPlaces: number;
    numberSeparator: 'comma' | 'period' | 'space';
    showCurrencySymbol: boolean;
    currencySymbolPosition: 'before' | 'after';
}

export interface TransactionSettings {
    autoApplyTax: boolean;
    taxInclusivePricing: boolean;
    roundTaxAmount: boolean;
    roundTotalAmount: boolean;
    roundToNearest: number;
    minimumTransactionAmount: number;
    maximumTransactionAmount: number;
    holdTransactionMinutes: number;
    saveDraftTransactions: boolean;
}

export interface CustomerSettings {
    requireCustomerDetails: boolean;
    defaultCustomerType: string;
    collectCustomerEmail: boolean;
    collectCustomerPhone: boolean;
    collectCustomerAddress: boolean;
    customerDisplayMode: 'SEARCH' | 'LIST' | 'BOTH';
}

export interface ReceiptSettings {
    receiptNumberPrefix: string;
    receiptNumberSuffix: string;
    receiptStartNumber: number;
    receiptResetDaily: boolean;
    printDuplicateReceipt: boolean;
    receiptCopies: number;
    printOrderKitchen: boolean;
    printOrderBar: boolean;
    kitchenPrinterName: string;
    barPrinterName: string;
    printItemizedReceipt: boolean;
    receiptFooter: string;
    receiptHeader: string;
    showStoreLogo: boolean;
    logoUrl: string;
    receiptWidth: number;
    showTaxBreakdown: boolean;
    showItemCodes: boolean;
    showCashierName: boolean;
    showTerminalId: boolean;
    qrCodeEnabled: boolean;
    qrCodeContent: 'receipt-id' | 'url' | 'none';
}

export interface PaymentSettings {
    cashPaymentDefault: boolean;
    cardPaymentDefault: boolean;
    splitPaymentEnabled: boolean;
    maxSplitWays: number;
    changeCalculationMode: 'AUTO' | 'MANUAL';
    suggestChangeAmounts: boolean;
    giftCardEnabled: boolean;
    loyaltyPointsEnabled: boolean;
    enableCash: boolean;
    enableCard: boolean;
    enableMobileMoney: boolean;
    enableCredit: boolean;
    enableGiftCard: boolean;
    roundingEnabled: boolean;
    roundingAmount: number;
}

export interface MraComplianceSettings {
    mraComplianceMode: 'STRICT' | 'RELAXED' | 'TEST';
    requireVatNumber: boolean;
    vatInclusiveDisplay: boolean;
    zReportAutoGenerate: boolean;
    zReportTime: string;
    dailySalesReportTime: string;
}

export interface InventorySettings {
    showProductImages: boolean;
    productDisplayMode: 'GRID' | 'LIST' | 'COMPACT';
    productsPerPage: number;
    quickProductSearch: boolean;
    barcodeScanMode: 'AUTO' | 'MANUAL' | 'BOTH';
    scaleIntegrationMode: 'DIRECT' | 'MANUAL';
    allowNegativeStock: boolean;
    lowStockThreshold: number;
    showStockLevels: boolean;
    enableStockAlerts: boolean;
    autoOrderEnabled: boolean;
}

export interface SyncSettings {
    enableOfflineMode: boolean;
    offlineDataRetentionDays: number;
    syncOnWifiOnly: boolean;
    autoSyncOnReconnect: boolean;
    syncBatchSize: number;
    syncTimeoutSeconds: number;
    enableCloudSync: boolean;
}

export interface SecuritySettings {
    maxLoginAttempts: number;
    lockoutMinutes: number;
    requirePinForSettings: boolean;
    requirePinForReports: boolean;
    requirePinForVoid: boolean;
    requirePinForDiscount: boolean;
    requirePinForReturn: boolean;
    auditLogEnabled: boolean;
}

export interface PerformanceSettings {
    cacheExpiryHours: number;
    maxCacheSizeMB: number;
    transactionHistoryDays: number;
    autoCleanupOldData: boolean;
    imageCompressionQuality: number;
}

export interface HardwareSettings {
    printerConnectionType: 'BLUETOOTH' | 'USB' | 'NETWORK';
    printerPaperWidth: number;
    cashDrawerOpenCode: string;
    scannerBeepEnabled: boolean;
    scannerVibrationEnabled: boolean;
    screenBrightness: number;
    screenTimeoutSeconds: number;
    printerType: 'thermal' | 'inkjet' | 'laser' | 'none';
    printerName: string;
    autoPrintReceipt: boolean;
    paperSize: '58mm' | '80mm' | 'A4';
    enableCashDrawer: boolean;
    cashDrawerOpenOn: 'sale' | 'payment' | 'manual';
    enableBarcodeScanner: boolean;
    barcodeScannerPrefix: string;
    enableCardReader: boolean;
    cardReaderType: 'stripe' | 'chip' | 'contactless' | 'all';
}

export interface IntegrationSettings {
    apiBaseUrl: string;
    mraApiTimeoutSeconds: number;
    mraRetryAttempts: number;
    webhookEnabled: boolean;
    webhookUrl: string;
    webhookSecret: string;
    apiKeyExpiryDays: number;
    enableApiAccess: boolean;
    apiRateLimit: number;
}

export interface WorkflowSettings {
    allowReturnWithoutReceipt: boolean;
    returnPeriodDays: number;
    requireManagerForVoid: boolean;
    managerOverridePin: string;
    autoCloseShift: boolean;
    shiftCloseTime: string;
    dailyOpeningTime: string;
    enableCashManagement: boolean;
    requireOpeningFloat: boolean;
    openingFloatAmount: number;
    enableShiftManagement: boolean;
    enableMultipleUsers: boolean;
    enableReturns: boolean;
    enableLayaway: boolean;
    enableDiscounts: boolean;
    maxDiscountPercentage: number;
}

export interface BackupSettings {
    backupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    autoBackupEnabled: boolean;
    backupIntervalHours: number;
    maxBackupFiles: number;
    backupLocation: 'LOCAL' | 'CLOUD' | 'BOTH';
}

export interface DisplaySettings {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    navigationMenuType: 'desktop' | 'web';
    showProductImages: boolean;
    enableAnimations: boolean;
    enableNotifications: boolean;
    enableVirtualKeyboard: boolean;
    virtualKeyboardLayout: 'qwerty' | 'numeric' | 'alphanumeric';
    virtualKeyboardTheme: 'default' | 'dark' | 'light';
    virtualKeyboardSound: boolean;
    virtualKeyboardHaptic: boolean;
}

export interface TaxFeeSettings {
    taxInclusive: boolean;
    showTaxOnReceipt: boolean;
    multiTaxEnabled: boolean;
    serviceFeeEnabled: boolean;
    serviceFeePercentage: number;
}

export interface CustomerManagementSettings {
    enableLoyaltyProgram: boolean;
    loyaltyPointsPerDollar: number;
    enableCustomerAccounts: boolean;
    enableCustomerCredit: boolean;
    maxCustomerCredit: number;
}

export interface ReportingSettings {
    eodReportEnabled: boolean;
    eodReportTime: string;
    emailReports: boolean;
    reportEmail: string;
}

// ==========================================
// REQUEST/RESPONSE INTERFACES
// ==========================================

export interface CreateTerminalSettingsRequest {
    terminalId: string;

    // General Information
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeEmail?: string;
    currency?: string;
    taxRate?: number;
    businessLicense?: string;
    businessTaxId?: string;

    // Localization & Display Settings
    language?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';

    // Security & Access Control
    pinLength?: number;
    sessionTimeoutMinutes?: number;
    autoLogoutMinutes?: number;
    serverUrl?: string;

    // JSON Settings Groups (optional - defaults will be used if not provided)
    localizationSettings?: LocalizationSettings;
    transactionSettings?: TransactionSettings;
    customerSettings?: CustomerSettings;
    receiptSettings?: ReceiptSettings;
    paymentSettings?: PaymentSettings;
    mraComplianceSettings?: MraComplianceSettings;
    inventorySettings?: InventorySettings;
    syncSettings?: SyncSettings;
    securitySettings?: SecuritySettings;
    performanceSettings?: PerformanceSettings;
    hardwareSettings?: HardwareSettings;
    integrationSettings?: IntegrationSettings;
    workflowSettings?: WorkflowSettings;
    backupSettings?: BackupSettings;
    displaySettings?: DisplaySettings;
    taxFeeSettings?: TaxFeeSettings;
    customerManagementSettings?: CustomerManagementSettings;
    reportingSettings?: ReportingSettings;

    // Audit
    lastConfiguredBy?: string;
}

export interface UpdateTerminalSettingsRequest {
    // General Information
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeEmail?: string;
    currency?: string;
    taxRate?: number;
    businessLicense?: string;
    businessTaxId?: string;

    // Localization & Display Settings
    language?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';

    // Security & Access Control
    pinLength?: number;
    sessionTimeoutMinutes?: number;
    autoLogoutMinutes?: number;
    serverUrl?: string;

    // JSON Settings Groups
    localizationSettings?: LocalizationSettings;
    transactionSettings?: TransactionSettings;
    customerSettings?: CustomerSettings;
    receiptSettings?: ReceiptSettings;
    paymentSettings?: PaymentSettings;
    mraComplianceSettings?: MraComplianceSettings;
    inventorySettings?: InventorySettings;
    syncSettings?: SyncSettings;
    securitySettings?: SecuritySettings;
    performanceSettings?: PerformanceSettings;
    hardwareSettings?: HardwareSettings;
    integrationSettings?: IntegrationSettings;
    workflowSettings?: WorkflowSettings;
    backupSettings?: BackupSettings;
    displaySettings?: DisplaySettings;
    taxFeeSettings?: TaxFeeSettings;
    customerManagementSettings?: CustomerManagementSettings;
    reportingSettings?: ReportingSettings;

    // Audit
    lastConfiguredBy?: string;
    isActive?: boolean;
}

// ==========================================
// LEGACY SUPPORT INTERFACES
// ==========================================

export interface InitializationState {
    isAccountVerified: boolean;
    isLoading: boolean;
    error: string | null;
    retryCount: number;
}

export interface InitializationResult {
    success: boolean;
    verified?: boolean;
    error?: string;
}

// Type for settings group names
export type SettingsGroupName =
    | 'localizationSettings'
    | 'transactionSettings'
    | 'customerSettings'
    | 'receiptSettings'
    | 'paymentSettings'
    | 'mraComplianceSettings'
    | 'inventorySettings'
    | 'syncSettings'
    | 'securitySettings'
    | 'performanceSettings'
    | 'hardwareSettings'
    | 'integrationSettings'
    | 'workflowSettings'
    | 'backupSettings'
    | 'displaySettings'
    | 'taxFeeSettings'
    | 'customerManagementSettings'
    | 'reportingSettings';
