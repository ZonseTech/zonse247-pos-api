import { v4 as uuidv4 } from 'uuid';
import type { CreateTerminalRequest, Terminal, TerminalQueryParams } from 'terminal';
import prisma from '../databases/prisma/client';
import type { TerminalActivationStatus, TerminalMRAApplicationStatus } from '../databases/prisma/generated/prisma/enums';

export class TerminalModel {
    static async findByTenantId(tenantId: string): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding terminals by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByBranchId(branchId: string): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: { branchId },
                orderBy: { createdAt: 'desc' }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding terminals by branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByBranchCode(branchId: string): Promise<Terminal[]> {
        return await this.findByBranchId(branchId);
    }

    static async findByBranchIdAndTerminalCode(branchId: string, terminalCode: string): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: {
                    branchId,
                    terminalCode
                }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding terminals by branch ID and terminal code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findPrimaryByBranchId(branchId: string): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: {
                    branchId,
                    isPrimary: true
                }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding primary terminals by branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findAll(conditions: TerminalQueryParams = {}): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: conditions,
                orderBy: { createdAt: 'desc' }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding terminals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(terminalId: string): Promise<Terminal | null> {
        try {
            return await prisma.terminal.findUnique({
                where: { terminalId }
            }) as unknown as Terminal | null;
        } catch (error) {
            throw new Error(`Error finding terminal by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByTerminalCode(terminalCode: string): Promise<Terminal | null> {
        try {
            return await prisma.terminal.findFirst({
                where: { terminalCode }
            }) as unknown as Terminal | null;
        } catch (error) {
            throw new Error(`Error finding terminal by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByDeviceId(deviceId: string): Promise<Terminal | null> {
        try {
            return await prisma.terminal.findFirst({
                where: { deviceId }
            }) as unknown as Terminal | null;
        } catch (error) {
            throw new Error(`Error finding terminal by device ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByActivationStatus(activationStatus: TerminalActivationStatus): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: { activationStatus }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding terminals by activation status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findBlocked(): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: { isBlocked: true }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding blocked terminals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUnsynced(): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: { synced: 0 }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding unsynced terminals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUnsyncedByTenant(tenantId: string): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: {
                    tenantId,
                    synced: 0
                }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding unsynced terminals by tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async create(data: CreateTerminalRequest): Promise<Terminal> {
        try {
            const terminalData = this.buildTerminalData(data);
            return await prisma.terminal.create({
                data: terminalData as any
            }) as unknown as Terminal;
        } catch (error) {
            throw new Error(`Error creating terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async exists(terminalId: string): Promise<boolean> {
        try {
            const count = await prisma.terminal.count({
                where: { terminalId }
            });
            return count > 0;
        } catch (error) {
            console.error('Error checking if terminal exists:', error);
            return false;
        }
    }

    static async existsByTerminalCode(terminalCode: string): Promise<boolean> {
        try {
            const count = await prisma.terminal.count({
                where: { terminalCode }
            });
            return count > 0;
        } catch (error) {
            console.error('Error checking if terminal exists by code:', error);
            return false;
        }
    }

    static async insert(data: Terminal): Promise<Terminal> {
        try {
            return await prisma.terminal.create({
                data: data as any
            }) as unknown as Terminal;
        } catch (error) {
            throw new Error(`Error inserting terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(terminalId: string, updateData: Partial<Terminal>): Promise<number> {
        try {
            const dataToUpdate: any = {
                ...updateData,
                updatedAt: new Date()
            };

            // Remove fields that shouldn't be updated directly
            delete dataToUpdate.terminalId;
            delete dataToUpdate.createdAt;
            delete dataToUpdate.registeredAt;

            await prisma.terminal.update({
                where: { terminalId },
                data: dataToUpdate
            });

            return 1; // Return 1 to indicate successful update
        } catch (error) {
            throw new Error(`Error updating terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(terminalId: string): Promise<number> {
        try {
            await prisma.terminal.delete({
                where: { terminalId }
            });

            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: TerminalQueryParams = {}): Promise<number> {
        try {
            return await prisma.terminal.count({
                where: conditions
            });
        } catch (error) {
            throw new Error(`Error counting terminals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async activate(terminalId: string, activationCode: string): Promise<number> {
        try {
            return await this.update(terminalId, {
                activationCode,
                activationStatus: 'ACTIVATED',
                activationDate: new Date()
            });
        } catch (error) {
            throw new Error(`Error activating terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async block(terminalId: string, reason: string): Promise<number> {
        try {
            return await this.update(terminalId, {
                isBlocked: true,
                blockingReason: reason,
                blockedAt: new Date()
            });
        } catch (error) {
            throw new Error(`Error blocking terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async unblock(terminalId: string): Promise<number> {
        try {
            return await this.update(terminalId, {
                isBlocked: false,
                blockingReason: null,
                blockedAt: null
            });
        } catch (error) {
            throw new Error(`Error unblocking terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async setPrimary(terminalId: string, branchId: string): Promise<number> {
        try {
            // First, unset all primary terminals in the branch
            await prisma.terminal.updateMany({
                where: {
                    branchId,
                    isPrimary: true
                },
                data: {
                    isPrimary: false,
                    updatedAt: new Date()
                }
            });

            // Then set this terminal as primary
            return await this.update(terminalId, { isPrimary: true });
        } catch (error) {
            throw new Error(`Error setting primary terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateLastActivity(terminalId: string): Promise<number> {
        try {
            return await this.update(terminalId, {
                lastActivity: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating last activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateLastSync(terminalId: string): Promise<number> {
        try {
            const now = new Date();
            return await this.update(terminalId, {
                lastSync: now,
                lastSyncTimestamp: now
            });
        } catch (error) {
            throw new Error(`Error updating last sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async markAsSynced(terminalId: string): Promise<number> {
        try {
            return await this.update(terminalId, { synced: 1 });
        } catch (error) {
            throw new Error(`Error marking terminal as synced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async markAsUnsynced(terminalId: string): Promise<number> {
        try {
            return await this.update(terminalId, { synced: 0 });
        } catch (error) {
            throw new Error(`Error marking terminal as unsynced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateMraStatus(
        terminalId: string,
        status: TerminalMRAApplicationStatus,
        approvalDate?: Date
    ): Promise<number> {
        try {
            const updateData: Partial<Terminal> = {
                mraApplicationStatus: status
            };

            if (approvalDate) {
                updateData.mraApprovalDate = approvalDate;
            }

            return await this.update(terminalId, updateData);
        } catch (error) {
            throw new Error(`Error updating MRA status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildTerminalData(data: CreateTerminalRequest): Terminal {
        const now = new Date();
        return {
            terminalId: data.terminalId || uuidv4(),
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

    static validateCreateRequest(data: CreateTerminalRequest): string[] {
        const errors: string[] = [];

        if (!data.tenantId || data.tenantId.trim().length === 0) {
            errors.push('Tenant ID is required');
        }

        if (!data.branchId || data.branchId.trim().length === 0) {
            errors.push('Branch ID is required');
        }

        if (!data.terminalCode || data.terminalCode.trim().length === 0) {
            errors.push('Terminal code is required');
        }

        if (data.terminalCode && data.terminalCode.length > 50) {
            errors.push('Terminal code must be less than 50 characters');
        }

        if (!data.terminalLabel || data.terminalLabel.trim().length === 0) {
            errors.push('Terminal label is required');
        }

        if (data.terminalLabel && data.terminalLabel.length > 100) {
            errors.push('Terminal label must be less than 100 characters');
        }

        if (data.macAddress && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(data.macAddress)) {
            errors.push('MAC address must be in valid format (e.g., 00:1B:44:11:3A:B7)');
        }

        return errors;
    }

    static validateUpdateRequest(data: Partial<Terminal>): string[] {
        const errors: string[] = [];

        if (data.terminalCode !== undefined) {
            if (!data.terminalCode || data.terminalCode.trim().length === 0) {
                errors.push('Terminal code cannot be empty');
            }

            if (data.terminalCode && data.terminalCode.length > 50) {
                errors.push('Terminal code must be less than 50 characters');
            }
        }

        if (data.terminalLabel !== undefined) {
            if (!data.terminalLabel || data.terminalLabel.trim().length === 0) {
                errors.push('Terminal label cannot be empty');
            }

            if (data.terminalLabel && data.terminalLabel.length > 100) {
                errors.push('Terminal label must be less than 100 characters');
            }
        }

        if (data.macAddress !== undefined && data.macAddress &&
            !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(data.macAddress)) {
            errors.push('MAC address must be in valid format (e.g., 00:1B:44:11:3A:B7)');
        }

        if (data.synced !== undefined && ![0, 1].includes(data.synced)) {
            errors.push('Synced status must be 0 or 1');
        }

        if (data.activationStatus !== undefined &&
            !['PENDING', 'ACTIVATED', 'DEACTIVATED'].includes(data.activationStatus)) {
            errors.push('Activation status must be one of: PENDING, ACTIVATED, DEACTIVATED');
        }

        return errors;
    }
}