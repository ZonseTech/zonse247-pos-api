import prisma from '../databases/prisma/client';
import { SecureSettingsService } from '../services/secure-settings.service';
import { SetupParams } from 'security';
import {
    TerminalSettings,
    CreateTerminalSettingsRequest,
    UpdateTerminalSettingsRequest,
    TerminalDisplaySettings,
    GeneralSettings,
    ReceiptDisplaySettings,
    BusinessSettings,
    SecurityDisplaySettings,
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

            const branch = await prisma.branch.findFirst({
                where: {
                    terminals: {
                        some: { terminalId: params.terminalId }
                    }
                }
            });

            const generalSettings = params.general || this.getDefaultGeneralSettings();
            const receiptSettings = params.receipt || this.getDefaultReceiptSettings(branch);
            const businessSettings = params.business || this.getDefaultBusinessSettings(branch);
            const securitySettings = params.security || this.getDefaultSecuritySettings();

            const settings = await prisma.terminalSettings.create({
                data: {
                    terminalId: params.terminalId,
                    generalSettings: toJsonValue(generalSettings),
                    receiptSettings: toJsonValue(receiptSettings),
                    businessSettings: toJsonValue(businessSettings),
                    securitySettings: toJsonValue(securitySettings),
                    settingsVersion: '3.0.0',
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
     * Update terminal settings with frontend-compatible structure
     */
    static async update(terminalId: string, updateData: UpdateTerminalSettingsRequest): Promise<TerminalSettings | null> {
        try {
            const existing = await this.findByTerminalId(terminalId);
            if (!existing) {
                throw new Error('Terminal settings not found');
            }

            const updatePayload: any = {
                updatedAt: new Date(),
            };

            if (updateData.general) {
                const existingGeneral = (existing.generalSettings as any) || {};
                updatePayload.generalSettings = toJsonValue({ ...existingGeneral, ...updateData.general });
            }

            if (updateData.receipt) {
                const existingReceipt = (existing.receiptSettings as any) || {};
                updatePayload.receiptSettings = toJsonValue({ ...existingReceipt, ...updateData.receipt });
            }

            if (updateData.business) {
                const existingBusiness = (existing.businessSettings as any) || {};
                updatePayload.businessSettings = toJsonValue({ ...existingBusiness, ...updateData.business });
            }

            if (updateData.security) {
                const existingSecurity = (existing.securitySettings as any) || {};
                updatePayload.securitySettings = toJsonValue({ ...existingSecurity, ...updateData.security });
            }

            const settings = await prisma.terminalSettings.update({
                where: { terminalId },
                data: updatePayload,
            });

            return settings as unknown as TerminalSettings;
        } catch (error) {
            console.error('Error updating terminal settings:', error);
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

    /**
     * Transform database settings to display format
     */
    static toDisplayFormat(dbSettings: TerminalSettings): TerminalDisplaySettings {
        // Extract settings from JSON columns or use defaults
        const generalSettings = (dbSettings.generalSettings as any) || {};
        const receiptSettings = (dbSettings.receiptSettings as any) || {};
        const businessSettings = (dbSettings.businessSettings as any) || {};
        const securitySettings = (dbSettings.securitySettings as any) || {};

        return {
            general: {
                dateFormat: generalSettings.dateFormat || 'DD/MM/YYYY',
                showProductImages: generalSettings.showProductImages ?? true,
                productDisplayMode: generalSettings.productDisplayMode || 'GRID',
                barcodeScanMode: generalSettings.barcodeScanMode || 'AUTO',
                enableStockAlerts: generalSettings.enableStockAlerts ?? true,
                enableVirtualKeyboard: generalSettings.enableVirtualKeyboard ?? false,
                virtualKeyboardLayout: generalSettings.virtualKeyboardLayout || 'qwerty',
                virtualKeyboardTheme: generalSettings.virtualKeyboardTheme || 'default',
                virtualKeyboardSound: generalSettings.virtualKeyboardSound ?? false,
                virtualKeyboardHaptic: generalSettings.virtualKeyboardHaptic ?? false,
            },
            receipt: {
                storeName: receiptSettings.storeName || 'My Store',
                storePhone: receiptSettings.storePhone || '',
                storeAddress: receiptSettings.storeAddress || '',
                storeWebsite: receiptSettings.storeWebsite || '',
                taxTitle: receiptSettings.taxTitle || 'VAT',
                businessTaxId: receiptSettings.businessTaxId || '',
                logoUrl: receiptSettings.logoUrl || '',
                receiptHeader: receiptSettings.receiptHeader || '',
                showPhoneOnReceipt: receiptSettings.showPhoneOnReceipt ?? true,
                showAddressOnReceipt: receiptSettings.showAddressOnReceipt ?? true,
                showTaxOnReceipt: receiptSettings.showTaxOnReceipt ?? true,
                showWebsiteOnReceipt: receiptSettings.showWebsiteOnReceipt ?? false,
                showStoreLogo: receiptSettings.showStoreLogo ?? false,
                showListPrice: receiptSettings.showListPrice ?? true,
                showRateInReceipt: receiptSettings.showRateInReceipt ?? true,
                showTotalMoneySaved: receiptSettings.showTotalMoneySaved ?? false,
                showCashierName: receiptSettings.showCashierName ?? true,
                showCustomerPhone: receiptSettings.showCustomerPhone ?? false,
                showCustomerAddress: receiptSettings.showCustomerAddress ?? false,
                thankYouNote: receiptSettings.thankYouNote || 'Thank you for your purchase!',
                useAppLanguage: receiptSettings.useAppLanguage ?? true,
                showTotalItemCount: receiptSettings.showTotalItemCount ?? true,
                showChangeReturn: receiptSettings.showChangeReturn ?? true,
                showPaymentDetails: receiptSettings.showPaymentDetails ?? true,
                showPoweredBy: receiptSettings.showPoweredBy ?? true,
                orderItemsBy: receiptSettings.orderItemsBy || 'orderAdded',
                messageTemplate: receiptSettings.messageTemplate || 'Total Bill Amount is #total',
                whatsappShareApp: receiptSettings.whatsappShareApp || 'whatsapp',
            },
            business: {
                receiptNumberPrefix: businessSettings.receiptNumberPrefix || 'RCP',
                autoApplyTax: businessSettings.autoApplyTax ?? true,
                taxInclusivePricing: businessSettings.taxInclusivePricing ?? false,
                taxRate: businessSettings.taxRate ?? 16.5,
                enableDiscounts: businessSettings.enableDiscounts ?? true,
                requirePinForDiscount: businessSettings.requirePinForDiscount ?? true,
                maxDiscountPercentage: businessSettings.maxDiscountPercentage ?? 20,
                roundingEnabled: businessSettings.roundingEnabled ?? true,
                tableManagementEnabled: businessSettings.tableManagementEnabled ?? false,
                inventoryHealthScoreEnabled: businessSettings.inventoryHealthScoreEnabled ?? true,
            },
            security: {
                autoSyncOnReconnect: securitySettings.autoSyncOnReconnect ?? true,
                requirePinForVoid: securitySettings.requirePinForVoid ?? true,
                requirePinForReturn: securitySettings.requirePinForReturn ?? true,
                enableNotifications: securitySettings.enableNotifications ?? true,
                apiBaseUrl: securitySettings.apiBaseUrl || 'http://127.0.0.1:3001/api/v1',
            },
        };
    }

    static getDefaultGeneralSettings(): GeneralSettings {
        return {
            dateFormat: 'DD/MM/YYYY',
            showProductImages: true,
            productDisplayMode: 'GRID',
            barcodeScanMode: 'AUTO',
            enableStockAlerts: true,
            enableVirtualKeyboard: false,
            virtualKeyboardLayout: 'qwerty',
            virtualKeyboardTheme: 'default',
            virtualKeyboardSound: false,
            virtualKeyboardHaptic: false,
        };
    }

    static getDefaultReceiptSettings(branch?: any): ReceiptDisplaySettings {
        return {
            storeName: branch?.branchName || 'My Store',
            storePhone: branch?.phoneNumber || '',
            storeAddress: branch?.addressLine1 || '',
            storeWebsite: '',
            taxTitle: 'VAT',
            businessTaxId: '',
            logoUrl: branch?.logoUrl || '',
            receiptHeader: '',
            showPhoneOnReceipt: true,
            showAddressOnReceipt: true,
            showTaxOnReceipt: true,
            showWebsiteOnReceipt: false,
            showStoreLogo: false,
            showListPrice: true,
            showRateInReceipt: true,
            showTotalMoneySaved: false,
            showCashierName: true,
            showCustomerPhone: false,
            showCustomerAddress: false,
            thankYouNote: branch?.receiptFooter || 'Thank you for your purchase!',
            useAppLanguage: true,
            showTotalItemCount: true,
            showChangeReturn: true,
            showPaymentDetails: true,
            showPoweredBy: true,
            orderItemsBy: 'orderAdded',
            messageTemplate: 'Total Bill Amount is #total',
            whatsappShareApp: 'whatsapp',
        };
    }

    static getDefaultBusinessSettings(branch?: any): BusinessSettings {
        return {
            receiptNumberPrefix: 'RCP',
            autoApplyTax: true,
            taxInclusivePricing: false,
            taxRate: branch?.taxRate ? Number(branch.taxRate) : 16.5,
            enableDiscounts: true,
            requirePinForDiscount: true,
            maxDiscountPercentage: 20,
            roundingEnabled: true,
            tableManagementEnabled: false,
            inventoryHealthScoreEnabled: true,
        };
    }

    static getDefaultSecuritySettings(): SecurityDisplaySettings {
        return {
            autoSyncOnReconnect: true,
            requirePinForVoid: true,
            requirePinForReturn: true,
            enableNotifications: true,
            apiBaseUrl: 'http://127.0.0.1:3001/api/v1',
        };
    }

    /**
     * Get default settings without persisting to database
     */
    static getDefaultDisplaySettings(branch?: any): TerminalDisplaySettings {
        return {
            general: this.getDefaultGeneralSettings(),
            receipt: this.getDefaultReceiptSettings(branch),
            business: this.getDefaultBusinessSettings(branch),
            security: this.getDefaultSecuritySettings(),
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

            // JSON Settings Groups with frontend-compatible defaults
            generalSettings: toJsonValue(this.getDefaultGeneralSettings()),
            receiptSettings: toJsonValue(this.getDefaultReceiptSettings()),
            businessSettings: toJsonValue(this.getDefaultBusinessSettings()),
            securitySettings: toJsonValue(this.getDefaultSecuritySettings()),

            // Metadata
            settingsVersion: '3.0.0',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        } as TerminalSettings;
    }
}
