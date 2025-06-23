import { SettingsModel } from "../models/settings.model";

export class SettingsService {
    static async checkAppSetup(): Promise<SetupParams> {
        try {
            return await SettingsModel.getAppSetup();
        } catch (error) {
            console.error('Error in app setup service - checkAppSetup:', error);
            throw error;
        }
    }

    static async getSettings(): Promise<WorkstatSettings> {
        try {
            return await SettingsModel.getSettingsGroup();
        } catch (error) {
            console.error('Error in settings service - getSettings:', error);
            throw error;
        }
    }

    static async store(settingsData: CreateSettingRequest): Promise<WorkstatSettings> {
        try {
            return await SettingsModel.create(settingsData);
        } catch (error) {
            console.error('Error in settings service - createOrUpdateSettings:', error);
            throw error;
        }
    }

    static async updateSetupConfigurations(): Promise<boolean> {
        try {
            return await SettingsModel.updateSetup();
        } catch (error) {
            console.error('Error in settings service - createOrUpdateSettings:', error);
            throw error;
        }
    }

    static async getSetting(
        clientUuid: string,
        shopUuid: string,
        workstationUuid: string,
        key: string
    ): Promise<Setting | null> {
        try {
            if (!clientUuid || !shopUuid || !workstationUuid || !key) {
                throw new Error('Client UUID, Shop UUID, Workstation UUID, and key are required');
            }

            return await SettingsModel.findByKey(clientUuid, shopUuid, workstationUuid, key);
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
        clientUuid: string,
        shopUuid: string,
        workstationUuid: string,
        category: string
    ): Promise<Setting[]> {
        try {
            if (!clientUuid || !shopUuid || !workstationUuid || !category) {
                throw new Error('Client UUID, Shop UUID, Workstation UUID, and category are required');
            }

            return await SettingsModel.getSettingsByCategory(clientUuid, shopUuid, workstationUuid, category);
        } catch (error) {
            console.error('Error in settings service - getSettingsByCategory:', error);
            throw error;
        }
    }
}
