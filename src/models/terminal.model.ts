import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import type { CreateTerminalRequest, Terminal, TerminalQueryParams, TerminalWithRelations } from 'terminal';

/**
 * @class   TerminalModel
 * @desc    Data access layer for terminal database operations
 */
export class TerminalModel {
    /**
     * @method  getAll
     * @desc    Retrieve all terminals with optional conditions
     * @param   conditions - Query conditions for filtering (tenantId, branchId, etc.)
     * @returns Promise<Terminal[]> - Array of terminals ordered by createdAt desc
     * @throws  Error - Error finding terminals
     */
    static async getAll(conditions: TerminalQueryParams = {}): Promise<Terminal[]> {
        try {
            return await prisma.terminal.findMany({
                where: conditions,
                orderBy: { createdAt: 'desc' }
            }) as unknown as Terminal[];
        } catch (error) {
            throw new Error(`Error finding terminals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  create
     * @desc    Create a new terminal record
     * @param   data - Terminal creation data
     * @returns Promise<Terminal> - Created terminal
     * @throws  Error - Error creating terminal
     */
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

    /**
     * @method  findById
     * @desc    Find a single terminal by ID with optional scope validation
     * @param   terminalId - Unique terminal identifier
     * @param   tenantId - Optional tenant ID for scope validation
     * @param   branchId - Optional branch ID for scope validation
     * @returns Promise<Terminal | null> - Terminal data or null if not found/out of scope
     * @throws  Error - Error finding terminal by ID
     */
    static async findById(terminalId: string, tenantId?: string, branchId?: string): Promise<Terminal | null> {
        try {
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId }
            }) as unknown as Terminal | null;

            if (terminal) {
                if (tenantId && terminal.tenantId !== tenantId) return null;
                if (branchId && terminal.branchId !== branchId) return null;
            }

            return terminal;
        } catch (error) {
            throw new Error(`Error finding terminal by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  findByTenantId
     * @desc    Find all terminals belonging to a tenant
     * @param   tenantId - Unique tenant identifier
     * @returns Promise<Terminal[]> - Array of terminals for the tenant
     * @throws  Error - Error finding terminals by tenant ID
     */
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

    /**
     * @method  findByBranchId
     * @desc    Find all terminals belonging to a branch
     * @param   branchId - Unique branch identifier
     * @returns Promise<Terminal[]> - Array of terminals for the branch
     * @throws  Error - Error finding terminals by branch ID
     */
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

    /**
     * @method  findPrimaryByBranchId
     * @desc    Find the primary terminal for a branch (for web clients)
     * @param   branchId - Unique branch identifier
     * @param   tenantId - Optional tenant ID for scope validation
     * @returns Promise<Terminal | null> - Primary terminal or null if not found
     * @throws  Error - Error finding primary terminal
     */
    static async findPrimaryByBranchId(branchId: string, tenantId?: string): Promise<Terminal | null> {
        try {
            const where: any = { branchId, isPrimary: true };
            if (tenantId) {
                where.tenantId = tenantId;
            }

            return await prisma.terminal.findFirst({
                where,
                orderBy: { createdAt: 'asc' }
            }) as unknown as Terminal | null;
        } catch (error) {
            throw new Error(`Error finding primary terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  findWithActivationDetails
     * @desc    Find a terminal by ID with tenant, branch, and subscription details for activation
     * @param   terminalId - Unique terminal identifier
     * @returns Promise<object | null> - Terminal with relations or null if not found
     * @throws  Error - Error finding terminal with activation details
     */
    static async findWithActivationDetails(terminalId: string): Promise<TerminalWithRelations | null> {
        try {
            const terminal = await prisma.terminal.findUnique({
                where: { terminalId },
                include: {
                    tenant: true,
                    branch: {
                        include: {
                            branchSubscription: {
                                include: {
                                    subscriptionPlan: true
                                }
                            }
                        }
                    }
                }
            });

            if (!terminal) {
                return null;
            }

            return terminal as unknown as TerminalWithRelations;
        } catch (error) {
            throw new Error(`Error finding terminal with activation details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  update
     * @desc    Update an existing terminal record (terminalId, createdAt, registeredAt are protected)
     * @param   terminalId - Unique terminal identifier
     * @param   updateData - Partial terminal data to update
     * @returns Promise<number> - Number of records updated (1 on success)
     * @throws  Error - Error updating terminal
     */
    static async update(terminalId: string, updateData: Partial<Terminal>): Promise<number> {
        try {
            const dataToUpdate: any = {
                ...updateData,
                updatedAt: new Date()
            };

            delete dataToUpdate.terminalId;
            delete dataToUpdate.createdAt;
            delete dataToUpdate.registeredAt;

            await prisma.terminal.update({
                where: { terminalId },
                data: dataToUpdate
            });

            return 1;
        } catch (error) {
            throw new Error(`Error updating terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  delete
     * @desc    Delete a terminal record
     * @param   terminalId - Unique terminal identifier
     * @returns Promise<number> - Number of records deleted (1 on success)
     * @throws  Error - Error deleting terminal
     */
    static async delete(terminalId: string): Promise<number> {
        try {
            await prisma.terminal.delete({
                where: { terminalId }
            });

            return 1;
        } catch (error) {
            throw new Error(`Error deleting terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @method  buildTerminalData
     * @desc    Build complete terminal data object with defaults
     * @param   data - Input terminal creation request
     * @returns Terminal - Complete terminal data ready for insertion
     */
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
            activationCode: data.activationCode || null,
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
            registeredAt: now,
            createdAt: now,
            updatedAt: now
        };
    }
}