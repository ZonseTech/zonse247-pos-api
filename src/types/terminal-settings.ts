import { JsonValue } from '../databases/prisma/generated/prisma/internal/prismaNamespace';

// ==========================================
// FRONTEND-COMPATIBLE SETTINGS INTERFACES
// ==========================================

/**
 * General Settings - Display and UI preferences
 */
export interface GeneralSettings {
    dateFormat: string;                    // e.g., "DD/MM/YYYY"
    showProductImages: boolean;
    productDisplayMode: 'GRID' | 'LIST' | 'COMPACT';
    barcodeScanMode: 'AUTO' | 'MANUAL' | 'BOTH';
    enableStockAlerts: boolean;
    enableVirtualKeyboard: boolean;
    virtualKeyboardLayout: 'qwerty' | 'numeric' | 'alphanumeric';
    virtualKeyboardTheme: 'default' | 'dark' | 'light';
    virtualKeyboardSound: boolean;
    virtualKeyboardHaptic: boolean;
}

/**
 * Receipt Settings - Store info and receipt display options
 */
export interface ReceiptDisplaySettings {
    storeName: string;
    storePhone: string;
    storeAddress: string;
    storeWebsite: string;
    taxTitle: string;                      // e.g., "VAT"
    businessTaxId: string;
    logoUrl: string;
    logoData?: string;                     // Base64 encoded monochrome logo for thermal printing
    receiptHeader: string;
    showPhoneOnReceipt: boolean;
    showAddressOnReceipt: boolean;
    showTaxOnReceipt: boolean;
    showWebsiteOnReceipt: boolean;
    showStoreLogo: boolean;
    showListPrice: boolean;
    showRateInReceipt: boolean;
    showTotalMoneySaved: boolean;
    showCashierName: boolean;
    showCustomerPhone: boolean;
    showCustomerAddress: boolean;
    thankYouNote: string;
    useAppLanguage: boolean;
    showTotalItemCount: boolean;
    showChangeReturn: boolean;
    showPaymentDetails: boolean;
    showPoweredBy: boolean;
    orderItemsBy: 'orderAdded' | 'name' | 'category';
    messageTemplate: string;               // e.g., "Total Bill Amount is #total"
    whatsappShareApp: 'whatsapp' | 'whatsappBusiness';
}

/**
 * Business Settings - Transaction and business rules
 */
export interface BusinessSettings {
    receiptNumberPrefix: string;
    autoApplyTax: boolean;
    taxInclusivePricing: boolean;
    taxRate: number;
    enableDiscounts: boolean;
    requirePinForDiscount: boolean;
    maxDiscountPercentage: number;
    roundingEnabled: boolean;
    tableManagementEnabled: boolean;
    inventoryHealthScoreEnabled: boolean;
}

/**
 * Security Settings - Authentication and sync settings
 */
export interface SecurityDisplaySettings {
    autoSyncOnReconnect: boolean;
    requirePinForVoid: boolean;
    requirePinForReturn: boolean;
    enableNotifications: boolean;
    apiBaseUrl: string;
}

/**
 * Combined Terminal Display Settings - API request/response format
 */
export interface TerminalDisplaySettings {
    general: GeneralSettings;
    receipt: ReceiptDisplaySettings;
    business: BusinessSettings;
    security: SecurityDisplaySettings;
}

// ==========================================
// DATABASE TERMINAL SETTINGS INTERFACE
// ==========================================

export interface TerminalSettings {
    id: string;
    terminalId: string;

    // JSON Settings Groups (4 main groups)
    generalSettings: JsonValue | null;
    receiptSettings: JsonValue | null;
    businessSettings: JsonValue | null;
    securitySettings: JsonValue | null;

    // Metadata
    settingsVersion: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==========================================
// REQUEST/RESPONSE INTERFACES
// ==========================================

export interface CreateTerminalSettingsRequest {
    terminalId: string;

    // Settings groups
    general?: GeneralSettings;
    receipt?: ReceiptDisplaySettings;
    business?: BusinessSettings;
    security?: SecurityDisplaySettings;
}

export interface UpdateTerminalSettingsRequest {
    // Settings groups
    general?: GeneralSettings;
    receipt?: ReceiptDisplaySettings;
    business?: BusinessSettings;
    security?: SecurityDisplaySettings;
}

// ==========================================
// SUPPORT INTERFACES
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
export type SettingsGroupName = 'general' | 'receipt' | 'business' | 'security';
