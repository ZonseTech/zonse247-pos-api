import { v4 as uuidv4 } from 'uuid';
import { AuthScopeParams } from 'auth';
import { ValidationError } from '../utils/errors';
import { TenantModel } from '../models/tenant.model';
import { BranchModel } from "../models/branch.model";
import { TerminalModel } from "../models/terminal.model";
import { CreateTerminalRequest, Terminal, TerminalWithRelations } from "terminal";
import { SecureSettingsService } from './secure-settings.service';
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';

/**
 * @class   TerminalService
 * @desc    Business logic layer for terminal management operations
 */
export class TerminalService {
    /**
     * @method  getAllTerminals
     * @desc    Retrieve all terminals with scope filters
     *          For non-activated terminals (PENDING), includes activation code
     *          For activated terminals, activation code is hidden
     * @param   scope - Auth scope params with tenantId and optional branchId
     * @returns Promise<Terminal[]> - Array of terminals
     * @throws  Error - Failed to retrieve terminals
     */
    static async getAllTerminals(scope: AuthScopeParams = {}): Promise<Terminal[]> {
        try {
            const terminals = await TerminalModel.getAll(scope);

            // Only show activation code for non-activated terminals (PENDING status)
            return terminals.map(terminal => ({
                ...terminal,
                activationCode: terminal.activationStatus === 'PENDING' ? terminal.activationCode : null,
            }));
        } catch (error) {
            throw new Error(`Failed to retrieve terminals: ${error}`);
        }
    }

    static async listTerminals(
        scope: AuthScopeParams = {},
        pagination: PaginationParams,
    ): Promise<PaginatedResult<Terminal>> {
        try {
            const where: any = {};
            if (scope.tenantId) where.tenantId = scope.tenantId;
            if (scope.branchId) where.branchId = scope.branchId;

            const [terminals, total] = await Promise.all([
                prisma.terminal.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.terminal.count({ where }),
            ]);

            const mapped = (terminals as unknown as Terminal[]).map(terminal => ({
                ...terminal,
                activationCode: terminal.activationStatus === 'PENDING' ? terminal.activationCode : null,
            }));

            return {
                data: mapped,
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error) {
            throw new Error(`Failed to retrieve terminals: ${error}`);
        }
    }

    /**
     * @method  createTerminal
     * @desc    Create a new terminal with auto-generated activation code and terminal code
     * @param   data - Terminal creation data (tenantId, branchId, terminalLabel required)
     * @returns Promise<Terminal> - The created terminal with activation code
     * @throws  Error - Missing required field (terminalLabel, terminalCode)
     * @throws  Error - Tenant not found
     * @throws  Error - Branch not found
     */
    static async createTerminal(data: CreateTerminalRequest & { activationCode: string }): Promise<Terminal> {
        const validationError = ValidationError.validateRequired(data, ['terminalLabel']);
        if (validationError) {
            throw new Error(validationError);
        }

        const effectiveTenantId = data.tenantId;
        const effectiveBranchId = data.branchId;

        const tenant = await TenantModel.findById(effectiveTenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const branch = await BranchModel.findById(effectiveBranchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        const existingTerminals = await TerminalModel.findByBranchId(effectiveBranchId);
        const terminalNumber = existingTerminals.length + 1;
        data.terminalCode = `TR${String(terminalNumber).padStart(3, '0')}`;

        if (existingTerminals.length === 0) {
            data.isPrimary = true;
        }

        const terminalId = uuidv4()

        const activationCode = await SecureSettingsService.createActivationCode({
            tenantId: effectiveTenantId,
            branchId: effectiveBranchId,
            terminalId: terminalId
        })

        data.terminalId = terminalId;
        data.activationCode = activationCode;

        const terminal = TerminalModel.create({
            ...data,
            tenantId: effectiveTenantId,
            branchId: effectiveBranchId
        })

        return terminal;
    }

    /**
     * @method  getTerminalById
     * @desc    Retrieve a single terminal by ID
     * @param   terminalId - Unique terminal identifier
     * @returns Promise<Terminal | null> - Terminal data or null if not found
     * @throws  Error - Failed to retrieve terminal
     */
    static async getTerminalById(terminalId: string): Promise<Terminal | null> {
        try {
            const terminal = await TerminalModel.findById(terminalId);

            delete terminal?.activationCode;
            delete terminal?.mraTerminalId;

            return terminal;
        } catch (error) {
            throw new Error(`Failed to retrieve terminal: ${error}`);
        }
    }

    /**
     * @method  updateTerminal
     * @desc    Update an existing terminal's data
     * @param   terminalId - Unique terminal identifier
     * @param   data - Partial terminal data to update
     * @returns Promise<Terminal | null> - Updated terminal data or null if not found
     * @throws  Error - Terminal not found
     */
    static async updateTerminal(terminalId: string, data: Partial<Terminal>): Promise<Terminal | null> {
        const existingTerminal = await TerminalModel.findById(terminalId);
        if (!existingTerminal) {
            throw new Error('Terminal not found');
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

    /**
     * @method  regenerateActivationCode
     * @desc    Regenerate activation code for a terminal and reset its activation status
     * @param   terminalId - Unique terminal identifier
     * @returns Promise<{ terminal: Terminal; activationCode: string }> - Updated terminal with new activation code
     * @throws  Error - Terminal not found
     */
    static async regenerateActivationCode(terminalId: string): Promise<{ terminal: Terminal; activationCode: string }> {
        const existingTerminal = await TerminalModel.findById(terminalId);
        if (!existingTerminal) {
            throw new Error('Terminal not found');
        }

        const activationCode = await SecureSettingsService.createActivationCode({
            tenantId: existingTerminal.tenantId,
            branchId: existingTerminal.branchId,
            terminalId: terminalId
        });

        await TerminalModel.update(terminalId, {
            activationCode: activationCode,
            activationStatus: 'PENDING',
            activationDate: null,
            updatedAt: new Date()
        });

        const updatedTerminal = await TerminalModel.findById(terminalId);
        if (!updatedTerminal) {
            throw new Error('Failed to retrieve updated terminal');
        }

        return {
            terminal: updatedTerminal,
            activationCode: activationCode
        };
    }

    /**
     * @method  deleteTerminal
     * @desc    Delete a terminal by ID with tenant/branch scope validation
     * @param   terminalId - Unique terminal identifier
     * @param   tenantId - Tenant ID for scope validation
     * @param   branchId - Optional branch ID for scope validation
     * @returns Promise<boolean> - True if deleted successfully
     * @throws  Error - Terminal not found
     * @throws  Error - Failed to delete terminal
     */
    static async deleteTerminal(terminalId: string, tenantId: string, branchId?: string): Promise<boolean> {
        try {
            const terminal = await TerminalModel.findById(terminalId, tenantId, branchId);
            if (!terminal) {
                throw new Error('Terminal not found');
            }

            const numDeleted = await TerminalModel.delete(terminalId);
            return numDeleted > 0;
        } catch (error) {
            throw new Error(`Failed to delete terminal: ${error}`);
        }
    }

    /**
     * @method  activateTerminal
     * @desc    Activate a terminal using an activation code
     * @param   activationCode - Encrypted activation code containing terminalId
     * @returns Promise<TerminalWithRelations> - Terminal details with tenant, branch, and subscription
     * @throws  Error - Invalid activation code
     * @throws  Error - Terminal not found
     * @throws  Error - Terminal already activated
     * @throws  Error - No active subscription
     */
    static async activateTerminal(activationCode: string): Promise<TerminalWithRelations> {
        try {
            const { terminalId } = await SecureSettingsService.decryptActivationCode(activationCode);

            if (!terminalId) {
                throw new Error('Invalid activation code');
            }

            const activationDetails = await TerminalModel.findWithActivationDetails(terminalId);

            if (!activationDetails) {
                throw new Error('Terminal not found');
            }


            if (activationDetails.activationStatus === 'ACTIVATED') {
                throw new Error('Terminal is already activated');
            }

            if (activationDetails.isBlocked) {
                throw new Error('Terminal is blocked');
            }

            if (!activationDetails?.branch?.branchSubscription || activationDetails.branch.branchSubscription.status !== 'active') {
                throw new Error('No active subscription found for this tenant');
            }

            return activationDetails as TerminalWithRelations;
        } catch (error: any) {
            throw new Error(`Failed to activate terminal: ${error.message}`);
        }
    }

    /**
     * @method  setActivated
     * @desc    Set a terminal's activation status to ACTIVATED
     * @param   terminalId - The terminal ID to activate
     * @returns Promise<Terminal> - Updated terminal record
     * @throws  Error - Terminal not found
     * @throws  Error - Failed to update terminal
     */
    static async setActivated(terminalId: string): Promise<Terminal> {
        try {
            const terminal = await TerminalModel.findById(terminalId);

            if (!terminal) {
                throw new Error('Terminal not found');
            }

            await TerminalModel.update(terminalId, {
                activationStatus: 'ACTIVATED'
            });

            const updatedTerminal = await TerminalModel.findById(terminalId);
            return updatedTerminal as Terminal;
        } catch (error: any) {
            throw new Error(`Failed to set terminal as activated: ${error.message}`);
        }
    }
}