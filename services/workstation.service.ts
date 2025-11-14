import { ClientService } from "./client.service";
import { ShopModel } from "../models/shop.model";
import { WorkstationModel } from "../models/work-station.model";

export class WorkstationService {

    static async createWorkstation(data: CreateWorkstationRequest): Promise<Workstation> {
        const validationError = ClientService.validateRequired(data, ['shopCode', 'clientUuid', 'tillName', 'tillNumber']);
        if (validationError) {
            throw new Error(validationError);
        }

        const shop = await ShopModel.findByShopCode(data.shopCode);
        if (!shop) {
            throw new Error('Shop not found');
        }

        if (shop.clientUuid !== data.clientUuid) {
            throw new Error('Client does not own this shop');
        }

        const existingWorkstations = await WorkstationModel.findByShopCodeAndTillNumber(data.shopCode, data.tillNumber);
        if (existingWorkstations.length > 0) {
            throw new Error('Till number already exists for this shop');
        }

        if (data.isPrimary) {
            const primaryWorkstations = await WorkstationModel.findPrimaryByShopCode(data.shopCode);
            for (const workstation of primaryWorkstations) {
                await WorkstationModel.update(workstation.uuid, { isPrimary: false });
            }
        }

        const workstationData = WorkstationModel.buildWorkstationData(data);
        return WorkstationModel.create(workstationData);
    }

    static async getAllWorkstations(query: any = {}): Promise<Workstation[]> {
        try {
            if (query.clientUuid) {
                return await WorkstationModel.findByClientUuid(query.clientUuid);
            }

            if (query.shopCode) {
                return await WorkstationModel.findByShopCode(query.shopCode);
            }

            return await WorkstationModel.findAll();
        } catch (error) {
            throw new Error(`Failed to retrieve workstations: ${error}`);
        }
    }

    static async getWorkstationByShopCode(shopCode: string): Promise<Workstation[]> {
        try {
            return await WorkstationModel.findByShopCode(shopCode);
        } catch (error) {
            throw new Error(`Failed to retrieve workstations: ${error}`);
        }
    }

    static async getWorkstationById(id: string): Promise<Workstation | null> {
        try {
            return await WorkstationModel.findById(id);
        } catch (error) {
            throw new Error(`Failed to retrieve workstation: ${error}`);
        }
    }

    static async updateWorkstation(id: string, data: Partial<Workstation>): Promise<Workstation | null> {
        try {
            const existingWorkstation = await WorkstationModel.findById(id);
            if (!existingWorkstation) {
                throw new Error('Workstation not found');
            }

            if (data.tillNumber && data.tillNumber !== existingWorkstation.tillNumber) {
                const conflictingWorkstations = await WorkstationModel.findByShopCodeAndTillNumber(
                    existingWorkstation.shopCode,
                    data.tillNumber
                );
                if (conflictingWorkstations.length > 0) {
                    throw new Error('Till number already exists for this shop');
                }
            }

            if (data.isPrimary === true && !existingWorkstation.isPrimary) {
                const primaryWorkstations = await WorkstationModel.findPrimaryByShopCode(existingWorkstation.shopCode);
                for (const workstation of primaryWorkstations) {
                    await WorkstationModel.update(workstation.uuid, { isPrimary: false });
                }
            }

            const updateData = {
                ...data,
                lastActivity: new Date().toISOString()
            };

            const numUpdated = await WorkstationModel.update(id, updateData);
            if (numUpdated === 0) {
                return null;
            }

            return await WorkstationModel.findById(id);
        } catch (error) {
            throw error;
        }
    }

    static async deleteWorkstation(id: string): Promise<boolean> {
        try {
            const numDeleted = await WorkstationModel.delete(id);
            return numDeleted > 0;
        } catch (error) {
            throw new Error(`Failed to delete workstation: ${error}`);
        }
    }

    static async updateWorkstationStatus(id: string, status: 'active' | 'inactive' | 'maintenance'): Promise<Workstation | null> {
        try {
            const updateData = {
                status,
                lastActivity: new Date().toISOString()
            };

            const numUpdated = await WorkstationModel.update(id, updateData);
            if (numUpdated === 0) {
                return null;
            }

            return await WorkstationModel.findById(id);
        } catch (error) {
            throw new Error(`Failed to update workstation status: ${error}`);
        }
    }

    static async syncWorkstation(id: string): Promise<{ status: boolean; lastSync: string }> {
        try {
            const workstation = await WorkstationModel.findById(id);
            if (!workstation) {
                throw new Error('Workstation not found');
            }

            const lastSync = new Date().toISOString();
            await WorkstationModel.update(id, {
                lastSync: lastSync,
                lastActivity: lastSync
            });

            return {
                status: true,
                lastSync: lastSync
            };
        } catch (error) {
            throw error;
        }
    }
}