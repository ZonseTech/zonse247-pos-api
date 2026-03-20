import { TerminalSettingsModel } from '../models/terminal-settings.model';
import {
    TerminalSettings,
    CreateTerminalSettingsRequest,
    UpdateTerminalSettingsRequest,
    TerminalDisplaySettings,
    SettingsGroupName,
    GeneralSettings,
    ReceiptDisplaySettings,
    BusinessSettings,
    SecurityDisplaySettings,
} from '../types/terminal-settings';
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';

export class TerminalSettingsService {
    /**
     * Get terminal settings by terminal ID
     * Returns settings in display format
     * If settings don't exist for the terminal, creates and saves default settings
     */
    static async getSettings(terminalId: string): Promise<TerminalDisplaySettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            let dbSettings = await TerminalSettingsModel.findByTerminalId(terminalId);

            if (!dbSettings) {
                // Create default settings for this terminal
                dbSettings = await TerminalSettingsModel.create({ terminalId });
            }

            // Transform to display format
            return TerminalSettingsModel.toDisplayFormat(dbSettings);
        } catch (error) {
            console.error('Error in terminal settings service - getSettings:', error);
            throw error;
        }
    }

    /**
     * Get raw database settings by terminal ID
     */
    static async getRawSettings(terminalId: string): Promise<TerminalSettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            return await TerminalSettingsModel.findByTerminalId(terminalId);
        } catch (error) {
            console.error('Error in terminal settings service - getRawSettings:', error);
            throw error;
        }
    }

    /**
     * Get all terminal settings in display format
     */
    static async getAllSettings(): Promise<Array<{ terminalId: string; settings: TerminalDisplaySettings }>> {
        try {
            const allSettings = await TerminalSettingsModel.findAll();
            return allSettings.map(dbSettings => ({
                terminalId: dbSettings.terminalId,
                settings: TerminalSettingsModel.toDisplayFormat(dbSettings),
            }));
        } catch (error) {
            console.error('Error in terminal settings service - getAllSettings:', error);
            throw error;
        }
    }

    static async listSettings(
        pagination: PaginationParams,
    ): Promise<PaginatedResult<{ terminalId: string; settings: TerminalDisplaySettings }>> {
        try {
            const where = { isActive: true };

            const [allSettings, total] = await Promise.all([
                prisma.terminalSettings.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                }),
                prisma.terminalSettings.count({ where }),
            ]);

            const data = allSettings.map((dbSettings: any) => ({
                terminalId: dbSettings.terminalId,
                settings: TerminalSettingsModel.toDisplayFormat(dbSettings),
            }));

            return {
                data,
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error) {
            console.error('Error in terminal settings service - listSettings:', error);
            throw error;
        }
    }

    /**
     * Create terminal settings
     */
    static async createSettings(data: CreateTerminalSettingsRequest): Promise<TerminalDisplaySettings> {
        try {
            if (!data.terminalId) {
                throw new Error('Terminal ID is required');
            }

            const existing = await TerminalSettingsModel.findByTerminalId(data.terminalId);
            if (existing) {
                throw new Error('Terminal settings already exist for this terminal');
            }

            const dbSettings = await TerminalSettingsModel.create(data);
            return TerminalSettingsModel.toDisplayFormat(dbSettings);
        } catch (error) {
            console.error('Error in terminal settings service - createSettings:', error);
            throw error;
        }
    }

    /**
     * Update terminal settings
     * Accepts format with general, receipt, business, security groups
     */
    static async updateSettings(
        terminalId: string,
        updateData: UpdateTerminalSettingsRequest
    ): Promise<TerminalDisplaySettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            let existing = await TerminalSettingsModel.findByTerminalId(terminalId);
            if (!existing) {
                // Auto-create settings if they don't exist
                existing = await TerminalSettingsModel.create({ terminalId });
            }

            const dbSettings = await TerminalSettingsModel.update(terminalId, updateData);
            if (!dbSettings) {
                return null;
            }

            return TerminalSettingsModel.toDisplayFormat(dbSettings);
        } catch (error) {
            console.error('Error in terminal settings service - updateSettings:', error);
            throw error;
        }
    }

    /**
     * Update a specific settings group (general, receipt, business, security)
     */
    static async updateSettingsGroup(
        terminalId: string,
        groupName: SettingsGroupName,
        data: GeneralSettings | ReceiptDisplaySettings | BusinessSettings | SecurityDisplaySettings
    ): Promise<TerminalDisplaySettings | null> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            if (!groupName) {
                throw new Error('Settings group name is required');
            }

            const existing = await TerminalSettingsModel.findByTerminalId(terminalId);
            if (!existing) {
                throw new Error('Terminal settings not found');
            }

            // Build update request based on group name
            const updateData: UpdateTerminalSettingsRequest = {};
            switch (groupName) {
                case 'general':
                    updateData.general = data as GeneralSettings;
                    break;
                case 'receipt':
                    updateData.receipt = data as ReceiptDisplaySettings;
                    break;
                case 'business':
                    updateData.business = data as BusinessSettings;
                    break;
                case 'security':
                    updateData.security = data as SecurityDisplaySettings;
                    break;
                default:
                    throw new Error(`Invalid settings group name: ${groupName}`);
            }

            const dbSettings = await TerminalSettingsModel.update(terminalId, updateData);
            if (!dbSettings) {
                return null;
            }

            return TerminalSettingsModel.toDisplayFormat(dbSettings);
        } catch (error) {
            console.error(`Error in terminal settings service - updateSettingsGroup (${groupName}):`, error);
            throw error;
        }
    }

    /**
     * Delete terminal settings
     */
    static async deleteSettings(terminalId: string): Promise<boolean> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            return await TerminalSettingsModel.delete(terminalId);
        } catch (error) {
            console.error('Error in terminal settings service - deleteSettings:', error);
            throw error;
        }
    }

    /**
     * Deactivate terminal settings (soft delete)
     */
    static async deactivateSettings(terminalId: string): Promise<boolean> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            return await TerminalSettingsModel.deactivate(terminalId);
        } catch (error) {
            console.error('Error in terminal settings service - deactivateSettings:', error);
            throw error;
        }
    }

    /**
     * Get or create terminal settings
     */
    static async getOrCreateSettings(data: CreateTerminalSettingsRequest): Promise<TerminalDisplaySettings> {
        try {
            if (!data.terminalId) {
                throw new Error('Terminal ID is required');
            }

            const existing = await TerminalSettingsModel.findByTerminalId(data.terminalId);
            if (existing) {
                return TerminalSettingsModel.toDisplayFormat(existing);
            }

            const dbSettings = await TerminalSettingsModel.create(data);
            return TerminalSettingsModel.toDisplayFormat(dbSettings);
        } catch (error) {
            console.error('Error in terminal settings service - getOrCreateSettings:', error);
            throw error;
        }
    }

    /**
     * Check if terminal is configured
     */
    static async isConfigured(): Promise<boolean> {
        try {
            return await TerminalSettingsModel.isConfigured();
        } catch (error) {
            console.error('Error in terminal settings service - isConfigured:', error);
            return false;
        }
    }

    /**
     * Get verification token
     */
    static async getVerificationToken(): Promise<string | null> {
        try {
            return await TerminalSettingsModel.getVerificationToken();
        } catch (error) {
            console.error('Error in terminal settings service - getVerificationToken:', error);
            return null;
        }
    }

    /**
     * Reset terminal settings to defaults
     * Deletes existing settings and creates new default settings
     */
    static async resetSettings(terminalId: string): Promise<TerminalDisplaySettings> {
        try {
            if (!terminalId) {
                throw new Error('Terminal ID is required');
            }

            // Delete existing settings if they exist
            try {
                await TerminalSettingsModel.delete(terminalId);
            } catch {
                // Ignore deletion errors (settings may not exist)
            }

            // Create fresh default settings
            const dbSettings = await TerminalSettingsModel.create({ terminalId });
            return TerminalSettingsModel.toDisplayFormat(dbSettings);
        } catch (error) {
            console.error('Error in terminal settings service - resetSettings:', error);
            throw error;
        }
    }

    /**
     * Get default settings without persisting
     */
    static getDefaultSettings(): TerminalDisplaySettings {
        return TerminalSettingsModel.getDefaultDisplaySettings();
    }
}
