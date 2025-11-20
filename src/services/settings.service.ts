import { CreateSettingRequest, Setting, TerminalSettings, UpdateSettingRequest } from "settings";
import { SettingsModel } from "../models/settings.model";

export class SettingsService {
    static async getSettings(): Promise<TerminalSettings> {
        try {
            return await SettingsModel.getSettingsGroup();
        } catch (error) {
            console.error('Error in settings service - getSettings:', error);
            throw error;
        }
    }

    static async store(settingsData: CreateSettingRequest): Promise<TerminalSettings> {
        try {
            const settings = await SettingsModel.create(settingsData);

            settings.tenantSignature = this.setTenantSignature(settings);

            return settings;
        } catch (error) {
            console.error('Error in settings service - createOrUpdateSettings:', error);
            throw error;
        }
    }

    private static setTenantSignature(settings: TerminalSettings): string {
        const dataString = `${settings.tenantId}|${settings.branchId}|${settings.terminalId}|${settings.verificationToken}`;
        return Buffer.from(dataString).toString('base64');
    }

    static async getSetting(
        tenantId: string,
        branchId: string,
        terminalId: string,
        key: string
    ): Promise<Setting | null> {
        try {
            if (!tenantId || !branchId || !terminalId || !key) {
                throw new Error('Client UUID, Shop UUID, Workstation UUID, and key are required');
            }

            return await SettingsModel.findByKey(tenantId, branchId, terminalId, key);
        } catch (error) {
            console.error('Error in settings service - getSetting:', error);
            throw error;
        }
    }

    static async updateSetting(uuid: string, updateData: UpdateSettingRequest): Promise<boolean> {
        try {
            if (!uuid) {
                throw new Error('Setting UUID is required');
            }

            return await SettingsModel.update(uuid, updateData);
        } catch (error) {
            console.error('Error in settings service - updateSetting:', error);
            throw error;
        }
    }

    static async deleteSetting(uuid: string): Promise<boolean> {
        try {
            if (!uuid) {
                throw new Error('Setting UUID is required');
            }

            return await SettingsModel.delete(uuid);
        } catch (error) {
            console.error('Error in settings service - deleteSetting:', error);
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
            if (!tenantId || !branchId || !terminalId || !category) {
                throw new Error('Client UUID, Shop UUID, Workstation UUID, and category are required');
            }

            return await SettingsModel.getSettingsByCategory(tenantId, branchId, terminalId, category);
        } catch (error) {
            console.error('Error in settings service - getSettingsByCategory:', error);
            throw error;
        }
    }
}
