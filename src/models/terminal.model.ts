import { sealDBModel } from '../databases/local';
import { TERMINALS_TABLE } from '../databases/local/tables';

export class TerminalModel {
    static async findByTenantId(tenantId: string): Promise<Terminal[]> {
        return sealDBModel.find(TERMINALS_TABLE, { tenantId });
    }

    static async findByBranchId(branchId: string): Promise<Terminal[]> {
        return sealDBModel.find(TERMINALS_TABLE, { branchId });
    }

    static async findByBranchCode(branchId: string): Promise<Terminal[]> {
        return sealDBModel.find(TERMINALS_TABLE, { branchId });
    }

    static async findByBranchIdAndTerminalCode(branchId: string, terminalCode: string): Promise<Terminal[]> {
        return sealDBModel.find(TERMINALS_TABLE, { branchId, terminalCode });
    }

    static async findPrimaryByBranchId(branchId: string): Promise<Terminal[]> {
        return sealDBModel.find(TERMINALS_TABLE, { branchId, isPrimary: true });
    }

    static async findAll(): Promise<Terminal[]> {
        return sealDBModel.findAll(TERMINALS_TABLE);
    }

    static async findById(terminalId: string): Promise<Terminal | null> {
        return sealDBModel.findById(TERMINALS_TABLE, terminalId);
    }

    static async create(data: CreateTerminalRequest): Promise<Terminal> {
        const terminalData = this.buildTerminalData(data);
        return sealDBModel.insert(TERMINALS_TABLE, terminalData);
    }

    static async update(terminalId: string, updateData: Partial<Terminal>): Promise<number> {
        return sealDBModel.update(TERMINALS_TABLE, terminalId, updateData);
    }

    static async delete(terminalId: string): Promise<number> {
        return sealDBModel.delete(TERMINALS_TABLE, terminalId);
    }

    static async count(conditions: any = {}): Promise<number> {
        return sealDBModel.count(TERMINALS_TABLE, conditions);
    }

    static buildTerminalData(data: CreateTerminalRequest): Omit<Terminal, 'terminalId'> {
        const now = new Date();
        return {
            tenantId: data.tenantId,
            branchId: data.branchId,
            mraTerminalId: null,
            terminalCode: data.terminalCode,
            terminalLabel: data.terminalLabel,
            terminalPosition: data.terminalPosition || null,
            deviceId: data.deviceId || null,
            osName: data.osName || null,
            osVersion: data.osVersion || null,
            osBuild: data.osBuild || null,
            macAddress: data.macAddress || null,
            posProductId: null,
            posProductVersion: null,
            terminalConfigVersion: null,
            offlineMaxTransactionAgeHours: null,
            offlineMaxCumulativeAmount: null,
            activationCode: null,
            activationStatus: 'PENDING',
            activationDate: null,
            isPrimary: data.isPrimary || false,
            isBlocked: false,
            blockingReason: null,
            blockedAt: null,
            mraApplicationStatus: undefined,
            mraApprovalDate: null,
            lastActivity: now,
            lastSync: null,
            lastSyncTimestamp: null,
            synced: 0,
            registeredAt: now,
            createdAt: now,
            updatedAt: now
        };
    }
}