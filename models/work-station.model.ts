import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { TABLE_NAMES } from '../databases/local/tables';

export class WorkstationModel {

    static async findByClientUuid(clientUuid: string): Promise<Workstation[]> {
        return sealDBModel.find(TABLE_NAMES.WORKSTATIONS, { clientUuid });
    }

    static async findByShopUuid(shopUuid: string): Promise<Workstation[]> {
        return sealDBModel.find(TABLE_NAMES.WORKSTATIONS, { shopUuid });
    }

    static async findWhere(conditions: Record<string, any>): Promise<Workstation[]> {
        return sealDBModel.find(TABLE_NAMES.WORKSTATIONS, conditions);
    }

    static async findByShopCode(shopCode: string): Promise<Workstation[]> {
        return sealDBModel.find(TABLE_NAMES.WORKSTATIONS, { shopCode });
    }

    static async findByShopCodeAndTillNumber(shopCode: string, tillNumber: string): Promise<Workstation[]> {
        return sealDBModel.find(TABLE_NAMES.WORKSTATIONS, { shopCode, tillNumber });
    }

    static async findPrimaryByShopCode(shopCode: string): Promise<Workstation[]> {
        return sealDBModel.find(TABLE_NAMES.WORKSTATIONS, { shopCode, isPrimary: true });
    }

    static async findAll(): Promise<Workstation[]> {
        return sealDBModel.findAll(TABLE_NAMES.WORKSTATIONS);
    }

    static async findById(uuid: string): Promise<Workstation | null> {
        return sealDBModel.findById(TABLE_NAMES.WORKSTATIONS, uuid);
    }

    static async create(workstationData: Omit<Workstation, 'id'>): Promise<Workstation> {
        return sealDBModel.insert(TABLE_NAMES.WORKSTATIONS, workstationData);
    }

    static async update(uuid: string, updateData: Partial<Workstation>): Promise<number> {
        return sealDBModel.update(TABLE_NAMES.WORKSTATIONS, uuid, updateData);
    }

    static async delete(uuid: string): Promise<number> {
        return sealDBModel.delete(TABLE_NAMES.WORKSTATIONS, uuid);
    }

    static async count(conditions: any = {}): Promise<number> {
        return sealDBModel.count(TABLE_NAMES.WORKSTATIONS, conditions);
    }

    static buildWorkstationData(data: CreateWorkstationRequest): Omit<Workstation, 'id'> {
        return {
            uuid: uuidv4(),
            shopCode: data.shopCode,
            clientUuid: data.clientUuid,
            tillName: data.tillName,
            tillNumber: data.tillNumber,
            deviceId: data.deviceId || '',
            deviceType: data.deviceType || 'desktop',
            ipAddress: data.ipAddress || '',
            isPrimary: data.isPrimary || false,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            lastSync: null
        };
    }
}