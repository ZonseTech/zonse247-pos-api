import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from "../databases/local";
import { APP_SETUP_DB, CLIENTS_DB, SHOP_SETTINGS_DB, SHOPS_DB, WORKSTATIONS_DB } from "../databases/local/tables";

export class SettingsModel {
    static async findByContext(clientUuid: string, shopUuid: string, workstationUuid: string): Promise<Setting[]> {
        try {
            const conditions = {
                clientUuid,
                shopUuid,
                workstationUuid,
                status: 'active'
            };

            return await sealDBModel.find<Setting[]>(SHOP_SETTINGS_DB, conditions);
        } catch (error) {
            console.error('Error finding settings by context:', error);
            throw error;
        }
    }

    static async findByKey(
        clientUuid: string,
        shopUuid: string,
        workstationUuid: string,
        key: string
    ): Promise<Setting | null> {
        try {
            const conditions = {
                clientUuid,
                shopUuid,
                workstationUuid,
                key,
                status: 'active'
            };

            return await sealDBModel.findById<Setting>(SHOP_SETTINGS_DB, conditions);
        } catch (error) {
            console.error('Error finding setting by key:', error);
            throw error;
        }
    }

    static async findAll(): Promise<Setting[]> {
        try {
            return await sealDBModel.findAll(SHOP_SETTINGS_DB);
        } catch (error) {
            console.error('Error finding all settings:', error);
            throw error;
        }
    }

    static async getAppSetup(): Promise<SetupParams> {
        try {
            const setup = await sealDBModel.findById<SetupParams>(APP_SETUP_DB, '-1');
            return setup;
        } catch (error) {
            console.error('Error finding app setup:', error);
            throw error;
        }
    }

    static async create(params: CreateSettingRequest): Promise<WorkstatSettings> {
        try {
            const now = new Date();

            const client = await sealDBModel.findById<Client>(CLIENTS_DB, params.clientUuid);
            const shop = await sealDBModel.findById<IShop>(SHOPS_DB, params.shopUuid);
            const workstation = await sealDBModel.findById<WorkstatSettings>(WORKSTATIONS_DB, params.workstationUuid);

            const setting: WorkstatSettings = {
                uuid: uuidv4(),
                clientUuid: params.clientUuid,
                shopUuid: params.shopUuid,
                workstationUuid: params.workstationUuid,
                app: client.companyName,
                store: shop.name,
                addressLine1: shop.addressLine1,
                addressLine2: shop.addressLine2,
                country: shop.country,
                city: shop.city,
                contact: client.phone,
                tax: shop.taxRate,
                symbol: shop.currencySymbol,
                chargeTax: shop.chargeTax,
                footer: shop.receiptFooter,
                img: shop.logoUrl,
                tillName: workstation.tillName,
                status: shop.status,
                createdAt: now,
                updatedAt: now
            };

            return await sealDBModel.insert(SHOP_SETTINGS_DB, setting);
        } catch (error) {
            console.error('Error creating setting:', error);
            throw error;
        }
    }

    static async updateSetup(): Promise<boolean> {
        try {
            const uuid = '-1';
            const updateData = {
                isCompleted: true,
                accountActivated: true,
                shopConfigured: true,
                workstationSetup: true,
            }

            const numUpdated = await sealDBModel.update(APP_SETUP_DB, uuid, updateData);
            return numUpdated > 0;
        } catch (error) {
            console.error('Error updating setup setting:', error);
            throw error;
        }
    }

    static async update(uuid: string, updateData: UpdateSettingRequest): Promise<boolean> {
        try {
            const numUpdated = await sealDBModel.update(SHOP_SETTINGS_DB, uuid, updateData);
            return numUpdated > 0;
        } catch (error) {
            console.error('Error updating setting:', error);
            throw error;
        }
    }

    static async delete(uuid: string): Promise<boolean> {
        try {
            const numDeleted = await sealDBModel.delete(SHOP_SETTINGS_DB, uuid);
            return numDeleted > 0;
        } catch (error) {
            console.error('Error deleting setting:', error);
            throw error;
        }
    }

    static async getSettingsGroup(): Promise<WorkstatSettings> {
        try {
            const settings = await sealDBModel.findAll(SHOP_SETTINGS_DB);
            return settings[0]
        } catch (error) {
            console.error('Error getting settings group:', error);
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
            const conditions = {
                clientUuid,
                shopUuid,
                workstationUuid,
                category,
                status: 'active'
            };

            return await sealDBModel.find<Setting[]>(SHOP_SETTINGS_DB, conditions);
        } catch (error) {
            console.error('Error getting settings by category:', error);
            throw error;
        }
    }
}