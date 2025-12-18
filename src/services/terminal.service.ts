import { TenantService } from "./tenant.service";
import { BranchModel } from "../models/branch.model";
import { TerminalModel } from "../models/terminal.model";
import { CreateTerminalRequest, Terminal } from "terminal";
import { BaseService } from "./base.service";

export class TerminalService {

    static async createTerminal(data: CreateTerminalRequest): Promise<Terminal> {
        const validationError = TenantService.validateRequired(data, ['branchId', 'tenantId', 'terminalLabel', 'terminalCode']);
        if (validationError) {
            throw new Error(validationError);
        }

        const branch = await BranchModel.findByBranchCode(data.branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        if (branch.tenantId !== data.tenantId) {
            throw new Error('Tenant does not own this branch');
        }

        const existingTerminals = await TerminalModel.findByBranchIdAndTerminalCode(data.branchId, data.terminalCode);
        if (existingTerminals.length > 0) {
            throw new Error('Terminal code already exists for this branch');
        }

        if (data.isPrimary) {
            const primaryTerminals = await TerminalModel.findPrimaryByBranchId(data.branchId);
            for (const terminal of primaryTerminals) {
                await TerminalModel.update(terminal.terminalId, { isPrimary: false });
            }
        }

        return TerminalModel.create(data);
    }

    static async getAllTerminals(query: any = {}): Promise<Terminal[]> {
        try {
            if (query.tenantId) {
                return await TerminalModel.findByTenantId(query.tenantId);
            }

            if (query.branchId) {
                return await TerminalModel.findByBranchId(query.branchId);
            }

            return await TerminalModel.findAll();
        } catch (error) {
            throw new Error(`Failed to retrieve terminals: ${error}`);
        }
    }

    static async getTerminalsByBranchId(branchId: string): Promise<Terminal[]> {
        if (!branchId) {
            throw new Error('Branch ID is required');
        }

        const response = await BaseService.get<Array<Terminal>>(`/on-boarding/live/branch/${branchId}/terminals`);

        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch terminals. External application down');
        }

        const terminals = response.data;

        if (terminals && terminals.length > 0) {
            for (const terminal of terminals) {
                const terminalExists = await TerminalModel.exists(terminal.terminalId);
                if (!terminalExists) {
                    await TerminalModel.insert(terminal);
                }
            }
        }

        return terminals;
    }

    static async getAccountTerminalsByBranchId(branchId: string): Promise<Terminal[]> {
        if (!branchId) {
            throw new Error('Branch ID is required');
        }

        try {
            const terminals = await TerminalModel.findByBranchId(branchId);
            return terminals;
        } catch (error) {
            throw new Error(`Failed to retrieve terminals: ${error}`);
        }
    }

    static async getTerminalById(terminalId: string): Promise<Terminal | null> {
        try {
            return await TerminalModel.findById(terminalId);
        } catch (error) {
            throw new Error(`Failed to retrieve terminal: ${error}`);
        }
    }

    static async updateTerminal(terminalId: string, data: Partial<Terminal>): Promise<Terminal | null> {
        const existingTerminal = await TerminalModel.findById(terminalId);
        if (!existingTerminal) {
            throw new Error('Terminal not found');
        }

        if (data.terminalCode && data.terminalCode !== existingTerminal.terminalCode) {
            const conflictingTerminals = await TerminalModel.findByBranchIdAndTerminalCode(
                existingTerminal.branchId,
                data.terminalCode
            );
            if (conflictingTerminals.length > 0) {
                throw new Error('Terminal code already exists for this branch');
            }
        }

        if (data.isPrimary === true && !existingTerminal.isPrimary) {
            const primaryTerminals = await TerminalModel.findPrimaryByBranchId(existingTerminal.branchId);
            for (const terminal of primaryTerminals) {
                await TerminalModel.update(terminal.terminalId, { isPrimary: false });
            }
        }

        const updateData = {
            ...data,
            lastActivity: new Date(),
            updatedAt: new Date()
        };

        const numUpdated = await TerminalModel.update(terminalId, updateData);
        if (numUpdated === 0) {
            return null;
        }

        return await TerminalModel.findById(terminalId);
    }

    static async deleteTerminal(terminalId: string): Promise<boolean> {
        try {
            const numDeleted = await TerminalModel.delete(terminalId);
            return numDeleted > 0;
        } catch (error) {
            throw new Error(`Failed to delete terminal: ${error}`);
        }
    }

    static async updateTerminalStatus(terminalId: string, status: 'PENDING' | 'ACTIVATED' | 'DEACTIVATED' | 'SUSPENDED' | 'BLOCKED'): Promise<Terminal | null> {
        try {
            const updateData = {
                activationStatus: status,
                lastActivity: new Date(),
                updatedAt: new Date()
            };

            const numUpdated = await TerminalModel.update(terminalId, updateData);
            if (numUpdated === 0) {
                return null;
            }

            return await TerminalModel.findById(terminalId);
        } catch (error) {
            throw new Error(`Failed to update terminal status: ${error}`);
        }
    }

    static async syncTerminal(terminalId: string): Promise<{ status: boolean; lastSync: Date }> {
        const terminal = await TerminalModel.findById(terminalId);
        if (!terminal) {
            throw new Error('Terminal not found');
        }

        const lastSync = new Date();
        await TerminalModel.update(terminalId, {
            lastSync: lastSync,
            lastSyncTimestamp: lastSync,
            lastActivity: lastSync,
            updatedAt: lastSync
        });

        return {
            status: true,
            lastSync: lastSync
        };
    }

    static async createDefault(params: {
        terminalId: string,
        tenantId: string,
        branchId: string,
    }): Promise<Terminal> {
        const existingTerminals = await TerminalModel.findByBranchId(params.branchId);

        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        const terminalCode = `TERM-${timestamp}-${random}`;

        const terminalNumber = existingTerminals.length + 1;
        const appVersion = process.env.npm_package_version || '1.4.1';

        const deviceId = `DEVICE_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        const macAddress = Array.from({ length: 6 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':').toUpperCase();

        const activationCode = `ACT_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

        const data = {
            mraTerminalId: null,
            terminalCode,
            terminalLabel: `Terminal ${terminalNumber}`,
            terminalPosition: terminalNumber,
            deviceId,
            osName: 'Win',
            osVersion: '1.0',
            osBuild: 'build-001',
            macAddress,
            posProductId: 'POS001',
            posProductVersion: appVersion,
            terminalConfigVersion: 1,
            offlineMaxTransactionAgeHours: 24,
            offlineMaxCumulativeAmount: 100000,
            activationCode,
            activationStatus: 'ACTIVATED',
            activationDate: new Date(),
            isPrimary: existingTerminals.length === 0,
            isBlocked: false,
            blockingReason: null,
            blockedAt: null,
            mraApplicationStatus: 'APPROVED',
            mraApprovalDate: new Date(),
            lastActivity: new Date(),
            lastSync: new Date(),
            lastSyncTimestamp: new Date(),
            synced: 0,
            registeredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return TerminalModel.create({ ...data, ...params });
    }
}