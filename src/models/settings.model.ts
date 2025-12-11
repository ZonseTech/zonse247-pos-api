import { v4 as uuidv4 } from 'uuid';
import { SetupParams } from 'security';
import prisma from '../databases/prisma/client';
import { SecureSettingsService } from '../services/secure-settings.service';
import { CreateSettingRequest, TerminalSettings, UpdateSettingRequest } from 'settings';

export class SettingsModel {
    static async findByContext(tenantId: string, branchId: string, terminalId: string): Promise<TerminalSettings[]> {
        try {
            return await prisma.terminalSetting.findMany({
                where: {
                    tenantId,
                    branchId,
                    terminalId,
                    status: 'active',
                },
            });
        } catch (error) {
            console.error('Error finding settings by context:', error);
            throw error;
        }
    }

    static async findByKey(
        tenantId: string,
        branchId: string,
        terminalId: string,
    ): Promise<TerminalSettings | null> {
        try {
            return await prisma.terminalSetting.findFirst({
                where: {
                    tenantId,
                    branchId,
                    terminalId,
                    status: 'active',
                },
            });
        } catch (error) {
            console.error('Error finding setting by key:', error);
            throw error;
        }
    }

    static async findAll(): Promise<TerminalSettings[]> {
        try {
            return await prisma.terminalSetting.findMany();
        } catch (error) {
            console.error('Error finding all settings:', error);
            throw error;
        }
    }

    static async getAppSetup(): Promise<SetupParams | null> {
        try {
            return await SecureSettingsService.getAppSetup();
        } catch (error) {
            console.error('Error finding app setup:', error);
            throw error;
        }
    }

    static async saveAppSetup(params: SetupParams): Promise<void> {
        try {
            await SecureSettingsService.saveAppSetup(params);
        } catch (error) {
            console.error('Error saving app setup:', error);
            throw error;
        }
    }

    static async create(params: CreateSettingRequest): Promise<TerminalSettings> {
        try {
            const now = new Date();

            const setup = await this.getAppSetup();
            if (!setup) {
                throw new Error('No app setup found. Please configure terminal first.');
            }

            if (
                params.tenantId !== setup.tenantId ||
                params.branchId !== setup.branchId ||
                params.terminalId !== setup.terminalId
            ) {
                throw new Error('Settings params do not match configured setup');
            }

            const branch = await prisma.branch.findUnique({
                where: { branchId: params.branchId },
            });

            if (!branch) {
                throw new Error('Branch not found');
            }

            const setting = await prisma.terminalSetting.create({
                data: {
                    settingId: uuidv4(),
                    tenantId: params.tenantId,
                    branchId: params.branchId,
                    terminalId: params.terminalId,
                    addressLine1: branch.addressLine1 || null,
                    addressLine2: branch.addressLine2 || null,
                    city: branch.city || null,
                    tax: branch.taxRate || null,
                    symbol: branch.currencySymbol || null,
                    chargeTax: branch.chargeTax || null,
                    footer: branch.receiptFooter || null,
                    img: branch.logoUrl || null,
                    status: branch.status || 'active',
                    createdAt: now,
                    updatedAt: now,
                } as any,
            });

            return setting as TerminalSettings;
        } catch (error) {
            console.error('Error creating setting:', error);
            throw error;
        }
    }

    static async update(settingId: string, updateData: UpdateSettingRequest): Promise<boolean> {
        try {
            const result = await prisma.terminalSetting.update({
                where: { settingId },
                data: updateData,
            });
            return !!result;
        } catch (error) {
            console.error('Error updating setting:', error);
            throw error;
        }
    }

    static async delete(settingId: string): Promise<boolean> {
        try {
            const result = await prisma.terminalSetting.delete({
                where: { settingId },
            });
            return !!result;
        } catch (error) {
            console.error('Error deleting setting:', error);
            throw error;
        }
    }

    static async getSettingsGroup(): Promise<TerminalSettings | null> {
        try {
            const setting = await prisma.terminalSetting.findFirst();
            return setting as TerminalSettings | null;
        } catch (error) {
            console.error('Error getting settings group:', error);
            throw error;
        }
    }

    static async getSettingsByCategory(
        tenantId: string,
        branchId: string,
        terminalId: string,
    ): Promise<TerminalSettings[]> {
        try {
            return await prisma.terminalSetting.findMany({
                where: {
                    tenantId,
                    branchId,
                    terminalId,
                    status: 'active',
                },
            });
        } catch (error) {
            console.error('Error getting settings by category:', error);
            throw error;
        }
    }

    static async getVerificationToken(): Promise<string | null> {
        try {
            return await SecureSettingsService.getTenantSignature();
        } catch (error) {
            console.error('Error getting tenant signature: ', error);
            return null;
        }
    }

    static async clearAppSetup(): Promise<void> {
        try {
            await SecureSettingsService.clearAppSetup();
        } catch (error) {
            console.error('Error clearing app setup:', error);
            throw error;
        }
    }

    static async isConfigured(): Promise<boolean> {
        try {
            return await SecureSettingsService.hasAppSetup();
        } catch (error) {
            console.error('Error checking configuration:', error);
            return false;
        }
    }
}