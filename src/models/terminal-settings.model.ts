import prisma from '../databases/prisma/client';
import { Decimal } from '../databases/prisma/generated/prisma/internal/prismaNamespace';
import { SecureSettingsService } from '../services/secure-settings.service';
import { SetupParams } from 'security';
import {
    TerminalSettings,
    CreateTerminalSettingsRequest,
    UpdateTerminalSettingsRequest,
    LocalizationSettings,
    TransactionSettings,
    CustomerSettings,
    ReceiptSettings,
    PaymentSettings,
    MraComplianceSettings,
    InventorySettings,
    SyncSettings,
    SecuritySettings,
    PerformanceSettings,
    HardwareSettings,
    IntegrationSettings,
    WorkflowSettings,
    BackupSettings,
    DisplaySettings,
    TaxFeeSettings,
    CustomerManagementSettings,
    ReportingSettings,
} from '../types/terminal-settings';
import { toJsonValue } from '../utils';

export class TerminalSettingsModel {
    /**
     * Find terminal settings by terminal ID
     */
    static async findByTerminalId(terminalId: string): Promise<TerminalSettings | null> {
        try {
            const settings = await prisma.terminalSettings.findUnique({
                where: { terminalId },
            });
            return settings as unknown as TerminalSettings | null;
        } catch (error) {
            console.error('Error finding terminal settings by terminalId:', error);
            throw error;
        }
    }

    /**
     * Find all terminal settings
     */
    static async findAll(): Promise<TerminalSettings[]> {
        try {
            const settings = await prisma.terminalSettings.findMany({
                where: { isActive: true },
            });
            return settings as unknown as TerminalSettings[];
        } catch (error) {
            console.error('Error finding all terminal settings:', error);
            throw error;
        }
    }

    /**
     * Get app setup from secure settings
     */
    static async getAppSetup(): Promise<SetupParams | null> {
        try {
            return await SecureSettingsService.getAppSetup();
        } catch (error) {
            console.error('Error finding app setup:', error);
            throw error;
        }
    }

    /**
     * Save app setup to secure settings
     */
    static async saveAppSetup(params: SetupParams): Promise<void> {
        try {
            await SecureSettingsService.saveAppSetup(params);
        } catch (error) {
            console.error('Error saving app setup:', error);
            throw error;
        }
    }

    /**
     * Create terminal settings
     */
    static async create(params: CreateTerminalSettingsRequest): Promise<TerminalSettings> {
        try {
            const now = new Date();

            // Get branch info for default values
            const branch = await prisma.branch.findFirst({
                where: {
                    terminals: {
                        some: { terminalId: params.terminalId }
                    }
                }
            });

            const settings = await prisma.terminalSettings.create({
                data: {
                    terminalId: params.terminalId,

                    // General Information
                    storeName: params.storeName || branch?.branchName || null,
                    storeAddress: params.storeAddress || branch?.addressLine1 || null,
                    storePhone: params.storePhone || branch?.phoneNumber || null,
                    storeEmail: params.storeEmail || branch?.email || null,
                    currency: params.currency || branch?.currencyCode || 'MKW',
                    taxRate: params.taxRate ?? branch?.taxRate ?? 0.00,
                    businessLicense: params.businessLicense || null,
                    businessTaxId: params.businessTaxId || null,

                    // Localization & Display Settings
                    language: params.language || 'en_US',
                    timezone: params.timezone || 'Africa/Blantyre',
                    dateFormat: params.dateFormat || 'DD/MM/YYYY',
                    timeFormat: params.timeFormat || '24h',

                    // Security & Access Control
                    pinLength: params.pinLength || 4,
                    sessionTimeoutMinutes: params.sessionTimeoutMinutes || 15,
                    autoLogoutMinutes: params.autoLogoutMinutes || 30,
                    serverUrl: params.serverUrl || null,

                    // JSON Settings Groups
                    localizationSettings: toJsonValue(params.localizationSettings || this.getDefaultLocalizationSettings()),
                    transactionSettings: toJsonValue(params.transactionSettings || this.getDefaultTransactionSettings()),
                    customerSettings: toJsonValue(params.customerSettings || this.getDefaultCustomerSettings()),
                    receiptSettings: toJsonValue(params.receiptSettings || this.getDefaultReceiptSettings(branch)),
                    paymentSettings: toJsonValue(params.paymentSettings || this.getDefaultPaymentSettings()),
                    mraComplianceSettings: toJsonValue(params.mraComplianceSettings || this.getDefaultMraComplianceSettings()),
                    inventorySettings: toJsonValue(params.inventorySettings || this.getDefaultInventorySettings()),
                    syncSettings: toJsonValue(params.syncSettings || this.getDefaultSyncSettings()),
                    securitySettings: toJsonValue(params.securitySettings || this.getDefaultSecuritySettings()),
                    performanceSettings: toJsonValue(params.performanceSettings || this.getDefaultPerformanceSettings()),
                    hardwareSettings: toJsonValue(params.hardwareSettings || this.getDefaultHardwareSettings()),
                    integrationSettings: toJsonValue(params.integrationSettings || this.getDefaultIntegrationSettings()),
                    workflowSettings: toJsonValue(params.workflowSettings || this.getDefaultWorkflowSettings()),
                    backupSettings: toJsonValue(params.backupSettings || this.getDefaultBackupSettings()),
                    displaySettings: toJsonValue(params.displaySettings || this.getDefaultDisplaySettings()),
                    taxFeeSettings: toJsonValue(params.taxFeeSettings || this.getDefaultTaxFeeSettings()),
                    customerManagementSettings: toJsonValue(params.customerManagementSettings || this.getDefaultCustomerManagementSettings()),
                    reportingSettings: toJsonValue(params.reportingSettings || this.getDefaultReportingSettings()),

                    // Audit & Metadata
                    settingsVersion: '2.0.0',
                    lastConfiguredBy: params.lastConfiguredBy || null,
                    configurationDate: now,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                },
            });

            return settings as unknown as TerminalSettings;
        } catch (error) {
            console.error('Error creating terminal settings:', error);
            throw error;
        }
    }

    /**
     * Update terminal settings
     */
    static async update(terminalId: string, updateData: UpdateTerminalSettingsRequest): Promise<TerminalSettings | null> {
        try {
            const settings = await prisma.terminalSettings.update({
                where: { terminalId },
                data: {
                    ...updateData,
                    updatedAt: new Date(),
                } as any,
            });
            return settings as unknown as TerminalSettings;
        } catch (error) {
            console.error('Error updating terminal settings:', error);
            throw error;
        }
    }

    /**
     * Update a specific settings group (JSON column)
     */
    static async updateSettingsGroup<T extends object>(
        terminalId: string,
        groupName: keyof Pick<TerminalSettings,
            'localizationSettings' | 'transactionSettings' | 'customerSettings' |
            'receiptSettings' | 'paymentSettings' | 'mraComplianceSettings' |
            'inventorySettings' | 'syncSettings' | 'securitySettings' |
            'performanceSettings' | 'hardwareSettings' | 'integrationSettings' |
            'workflowSettings' | 'backupSettings' | 'displaySettings' |
            'taxFeeSettings' | 'customerManagementSettings' | 'reportingSettings'
        >,
        data: T
    ): Promise<TerminalSettings | null> {
        try {
            const settings = await prisma.terminalSettings.update({
                where: { terminalId },
                data: {
                    [groupName]: toJsonValue(data),
                    updatedAt: new Date(),
                },
            });
            return settings as unknown as TerminalSettings;
        } catch (error) {
            console.error(`Error updating ${groupName}:`, error);
            throw error;
        }
    }

    /**
     * Delete terminal settings
     */
    static async delete(terminalId: string): Promise<boolean> {
        try {
            await prisma.terminalSettings.delete({
                where: { terminalId },
            });
            return true;
        } catch (error) {
            console.error('Error deleting terminal settings:', error);
            throw error;
        }
    }

    /**
     * Soft delete (deactivate) terminal settings
     */
    static async deactivate(terminalId: string): Promise<boolean> {
        try {
            await prisma.terminalSettings.update({
                where: { terminalId },
                data: {
                    isActive: false,
                    updatedAt: new Date(),
                },
            });
            return true;
        } catch (error) {
            console.error('Error deactivating terminal settings:', error);
            throw error;
        }
    }

    /**
     * Get verification token
     */
    static async getVerificationToken(): Promise<string | null> {
        try {
            return await SecureSettingsService.getTenantSignature();
        } catch (error) {
            console.error('Error getting tenant signature:', error);
            return null;
        }
    }

    /**
     * Clear app setup
     */
    static async clearAppSetup(): Promise<void> {
        try {
            await SecureSettingsService.clearAppSetup();
        } catch (error) {
            console.error('Error clearing app setup:', error);
            throw error;
        }
    }

    /**
     * Check if app is configured
     */
    static async isConfigured(): Promise<boolean> {
        try {
            return await SecureSettingsService.hasAppSetup();
        } catch (error) {
            console.error('Error checking configuration:', error);
            return false;
        }
    }

    // ==========================================
    // DEFAULT SETTINGS GENERATORS
    // ==========================================

    private static getDefaultLocalizationSettings(): LocalizationSettings {
        return {
            currencyDecimalPlaces: 2,
            numberSeparator: 'comma',
            showCurrencySymbol: true,
            currencySymbolPosition: 'before',
        };
    }

    private static getDefaultTransactionSettings(): TransactionSettings {
        return {
            autoApplyTax: true,
            taxInclusivePricing: false,
            roundTaxAmount: false,
            roundTotalAmount: false,
            roundToNearest: 0.05,
            minimumTransactionAmount: 0,
            maximumTransactionAmount: 999999999,
            holdTransactionMinutes: 30,
            saveDraftTransactions: true,
        };
    }

    private static getDefaultCustomerSettings(): CustomerSettings {
        return {
            requireCustomerDetails: false,
            defaultCustomerType: 'WALK_IN',
            collectCustomerEmail: true,
            collectCustomerPhone: true,
            collectCustomerAddress: false,
            customerDisplayMode: 'SEARCH',
        };
    }

    private static getDefaultReceiptSettings(branch?: any): ReceiptSettings {
        return {
            receiptNumberPrefix: '',
            receiptNumberSuffix: '',
            receiptStartNumber: 1,
            receiptResetDaily: false,
            printDuplicateReceipt: false,
            receiptCopies: 1,
            printOrderKitchen: false,
            printOrderBar: false,
            kitchenPrinterName: '',
            barPrinterName: '',
            printItemizedReceipt: true,
            receiptFooter: branch?.receiptFooter || 'Thank you for your purchase!',
            receiptHeader: '',
            showStoreLogo: true,
            logoUrl: branch?.logoUrl || '',
            receiptWidth: 80,
            showTaxBreakdown: true,
            showItemCodes: false,
            showCashierName: true,
            showTerminalId: true,
            qrCodeEnabled: false,
            qrCodeContent: 'none',
        };
    }

    private static getDefaultPaymentSettings(): PaymentSettings {
        return {
            cashPaymentDefault: true,
            cardPaymentDefault: false,
            splitPaymentEnabled: true,
            maxSplitWays: 4,
            changeCalculationMode: 'AUTO',
            suggestChangeAmounts: true,
            giftCardEnabled: false,
            loyaltyPointsEnabled: false,
            enableCash: true,
            enableCard: true,
            enableMobileMoney: true,
            enableCredit: false,
            enableGiftCard: false,
            roundingEnabled: false,
            roundingAmount: 0.05,
        };
    }

    private static getDefaultMraComplianceSettings(): MraComplianceSettings {
        return {
            mraComplianceMode: 'STRICT',
            requireVatNumber: false,
            vatInclusiveDisplay: true,
            zReportAutoGenerate: true,
            zReportTime: '23:00',
            dailySalesReportTime: '22:00',
        };
    }

    private static getDefaultInventorySettings(): InventorySettings {
        return {
            showProductImages: true,
            productDisplayMode: 'GRID',
            productsPerPage: 20,
            quickProductSearch: true,
            barcodeScanMode: 'AUTO',
            scaleIntegrationMode: 'DIRECT',
            allowNegativeStock: false,
            lowStockThreshold: 10,
            showStockLevels: true,
            enableStockAlerts: true,
            autoOrderEnabled: false,
        };
    }

    private static getDefaultSyncSettings(): SyncSettings {
        return {
            enableOfflineMode: true,
            offlineDataRetentionDays: 7,
            syncOnWifiOnly: false,
            autoSyncOnReconnect: true,
            syncBatchSize: 50,
            syncTimeoutSeconds: 30,
            enableCloudSync: true,
        };
    }

    private static getDefaultSecuritySettings(): SecuritySettings {
        return {
            maxLoginAttempts: 3,
            lockoutMinutes: 30,
            requirePinForSettings: true,
            requirePinForReports: true,
            requirePinForVoid: true,
            requirePinForDiscount: false,
            requirePinForReturn: true,
            auditLogEnabled: true,
        };
    }

    private static getDefaultPerformanceSettings(): PerformanceSettings {
        return {
            cacheExpiryHours: 24,
            maxCacheSizeMB: 100,
            transactionHistoryDays: 90,
            autoCleanupOldData: true,
            imageCompressionQuality: 80,
        };
    }

    private static getDefaultHardwareSettings(): HardwareSettings {
        return {
            printerConnectionType: 'BLUETOOTH',
            printerPaperWidth: 80,
            cashDrawerOpenCode: 'ESC p m t1 t2',
            scannerBeepEnabled: true,
            scannerVibrationEnabled: false,
            screenBrightness: 80,
            screenTimeoutSeconds: 60,
            printerType: 'thermal',
            printerName: '',
            autoPrintReceipt: true,
            paperSize: '80mm',
            enableCashDrawer: true,
            cashDrawerOpenOn: 'sale',
            enableBarcodeScanner: true,
            barcodeScannerPrefix: '',
            enableCardReader: false,
            cardReaderType: 'all',
        };
    }

    private static getDefaultIntegrationSettings(): IntegrationSettings {
        return {
            apiBaseUrl: '',
            mraApiTimeoutSeconds: 10,
            mraRetryAttempts: 3,
            webhookEnabled: false,
            webhookUrl: '',
            webhookSecret: '',
            apiKeyExpiryDays: 90,
            enableApiAccess: false,
            apiRateLimit: 1000,
        };
    }

    private static getDefaultWorkflowSettings(): WorkflowSettings {
        return {
            allowReturnWithoutReceipt: false,
            returnPeriodDays: 30,
            requireManagerForVoid: false,
            managerOverridePin: '',
            autoCloseShift: true,
            shiftCloseTime: '23:59',
            dailyOpeningTime: '08:00',
            enableCashManagement: true,
            requireOpeningFloat: false,
            openingFloatAmount: 0,
            enableShiftManagement: true,
            enableMultipleUsers: true,
            enableReturns: true,
            enableLayaway: false,
            enableDiscounts: true,
            maxDiscountPercentage: 100,
        };
    }

    private static getDefaultBackupSettings(): BackupSettings {
        return {
            backupEnabled: true,
            backupFrequency: 'daily',
            autoBackupEnabled: true,
            backupIntervalHours: 24,
            maxBackupFiles: 7,
            backupLocation: 'LOCAL',
        };
    }

    private static getDefaultDisplaySettings(): DisplaySettings {
        return {
            theme: 'light',
            fontSize: 'medium',
            navigationMenuType: 'desktop',
            showProductImages: true,
            enableAnimations: true,
            enableNotifications: true,
            enableVirtualKeyboard: false,
            virtualKeyboardLayout: 'qwerty',
            virtualKeyboardTheme: 'default',
            virtualKeyboardSound: false,
            virtualKeyboardHaptic: false,
        };
    }

    private static getDefaultTaxFeeSettings(): TaxFeeSettings {
        return {
            taxInclusive: false,
            showTaxOnReceipt: true,
            multiTaxEnabled: false,
            serviceFeeEnabled: false,
            serviceFeePercentage: 0,
        };
    }

    private static getDefaultCustomerManagementSettings(): CustomerManagementSettings {
        return {
            enableLoyaltyProgram: false,
            loyaltyPointsPerDollar: 1,
            enableCustomerAccounts: true,
            enableCustomerCredit: false,
            maxCustomerCredit: 0,
        };
    }

    private static getDefaultReportingSettings(): ReportingSettings {
        return {
            eodReportEnabled: true,
            eodReportTime: '23:00',
            emailReports: false,
            reportEmail: '',
        };
    }

    /**
     * Get default terminal settings without persisting to database
     * Used for returning defaults to frontend when no settings exist
     */
    static getDefaultSettings(terminalId = '-1'): TerminalSettings {
        const now = new Date();

        return {
            id: '',
            terminalId,

            // General Information
            storeName: null,
            storeAddress: null,
            storePhone: null,
            storeEmail: null,
            currency: 'MKW',
            taxRate: new Decimal(0) as any,
            businessLicense: null,
            businessTaxId: null,

            // Localization & Display Settings
            language: 'en_US',
            timezone: 'Africa/Blantyre',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',

            // Security & Access Control
            pinLength: 4,
            sessionTimeoutMinutes: 15,
            autoLogoutMinutes: 30,
            serverUrl: null,

            // JSON Settings Groups
            localizationSettings: toJsonValue(this.getDefaultLocalizationSettings()),
            transactionSettings: toJsonValue(this.getDefaultTransactionSettings()),
            customerSettings: toJsonValue(this.getDefaultCustomerSettings()),
            receiptSettings: toJsonValue(this.getDefaultReceiptSettings()),
            paymentSettings: toJsonValue(this.getDefaultPaymentSettings()),
            mraComplianceSettings: toJsonValue(this.getDefaultMraComplianceSettings()),
            inventorySettings: toJsonValue(this.getDefaultInventorySettings()),
            syncSettings: toJsonValue(this.getDefaultSyncSettings()),
            securitySettings: toJsonValue(this.getDefaultSecuritySettings()),
            performanceSettings: toJsonValue(this.getDefaultPerformanceSettings()),
            hardwareSettings: toJsonValue(this.getDefaultHardwareSettings()),
            integrationSettings: toJsonValue(this.getDefaultIntegrationSettings()),
            workflowSettings: toJsonValue(this.getDefaultWorkflowSettings()),
            backupSettings: toJsonValue(this.getDefaultBackupSettings()),
            displaySettings: toJsonValue(this.getDefaultDisplaySettings()),
            taxFeeSettings: toJsonValue(this.getDefaultTaxFeeSettings()),
            customerManagementSettings: toJsonValue(this.getDefaultCustomerManagementSettings()),
            reportingSettings: toJsonValue(this.getDefaultReportingSettings()),

            // Audit & Metadata
            settingsVersion: '2.0.0',
            lastConfiguredBy: null,
            configurationDate: now,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        } as TerminalSettings;
    }
}
