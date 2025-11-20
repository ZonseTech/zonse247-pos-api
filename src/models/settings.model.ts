import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from "../databases/local";
import {
    TERMINAL_SETTINGS_DB,
    BRANCHES_TABLE,
} from "../databases/local/tables";
import { SecureSettingsService } from '../services/secure-settings.service';
import { CreateSettingRequest, Setting, TerminalSettings, UpdateSettingRequest } from 'settings';
import { SetupParams } from 'security';
import { Branch } from 'branch';

export class SettingsModel {
    static async findByContext(tenantId: string, branchId: string, terminalId: string): Promise<Setting[]> {
        try {
            const conditions = {
                tenantId,
                branchId,
                terminalId,
                status: 'active'
            };

            return await sealDBModel.find<Setting[]>(TERMINAL_SETTINGS_DB, conditions);
        } catch (error) {
            console.error('Error finding settings by context:', error);
            throw error;
        }
    }

    static async findByKey(
        tenantId: string,
        branchId: string,
        terminalId: string,
        key: string
    ): Promise<Setting | null> {
        try {
            const conditions = {
                tenantId,
                branchId,
                terminalId,
                key,
                status: 'active'
            };

            return await sealDBModel.findById<Setting>(TERMINAL_SETTINGS_DB, conditions);
        } catch (error) {
            console.error('Error finding setting by key:', error);
            throw error;
        }
    }

    static async findAll(): Promise<Setting[]> {
        try {
            return await sealDBModel.findAll(TERMINAL_SETTINGS_DB);
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

            const branch = await sealDBModel.findById<Branch>(BRANCHES_TABLE, params.branchId);

            const setting = {
                uuid: uuidv4(),
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                addressLine1: branch?.addressLine1,
                addressLine2: branch?.addressLine2,
                city: branch?.city,
                tax: branch?.taxRate,
                symbol: branch?.currencySymbol,
                chargeTax: branch?.chargeTax,
                footer: branch?.receiptFooter,
                img: branch?.logoUrl,
                status: branch?.status,
                createdAt: now,
                updatedAt: now
            };

            return await sealDBModel.insert(TERMINAL_SETTINGS_DB, setting);
        } catch (error) {
            console.error('Error creating setting:', error);
            throw error;
        }
    }

    static async update(uuid: string, updateData: UpdateSettingRequest): Promise<boolean> {
        try {
            const numUpdated = await sealDBModel.update(TERMINAL_SETTINGS_DB, uuid, updateData);
            return numUpdated > 0;
        } catch (error) {
            console.error('Error updating setting:', error);
            throw error;
        }
    }

    static async delete(uuid: string): Promise<boolean> {
        try {
            const numDeleted = await sealDBModel.delete(TERMINAL_SETTINGS_DB, uuid);
            return numDeleted > 0;
        } catch (error) {
            console.error('Error deleting setting:', error);
            throw error;
        }
    }

    static async getSettingsGroup(): Promise<TerminalSettings> {
        try {
            const settings = await sealDBModel.findAll(TERMINAL_SETTINGS_DB);
            return settings[0];
        } catch (error) {
            console.error('Error getting settings group:', error);
            throw error;
        }
    }

    static async getSettingsByCategory(
        tenantId: string,
        branchId: string,
        terminalId: string,
        category: string
    ): Promise<Setting[]> {
        try {
            const conditions = {
                tenantId,
                branchId,
                terminalId,
                category,
                status: 'active'
            };

            return await sealDBModel.find<Setting[]>(TERMINAL_SETTINGS_DB, conditions);
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